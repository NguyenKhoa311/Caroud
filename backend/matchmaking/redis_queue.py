"""
Redis-based Matchmaking Queue
Uses Redis sorted sets for ELO-based player matching
"""

import redis
import json
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


class RedisMatchmakingQueue:
    """
    Redis-based matchmaking queue with ELO sorting.
    
    Redis Data Structures:
    - matchmaking:queue (Sorted Set): {user_id: elo_rating}
    - matchmaking:user:{user_id} (Hash): User details
    - matchmaking:stats (Hash): Queue statistics
    """
    
    QUEUE_KEY = 'matchmaking:queue'
    USER_PREFIX = 'matchmaking:user'
    STATS_KEY = 'matchmaking:stats'
    MATCH_PREFIX = 'matchmaking:match'
    
    # TTL settings
    USER_ENTRY_TTL = 300  # 5 minutes
    MATCH_TTL = 3600  # 1 hour
    
    def __init__(self):
        """Initialize Redis connection"""
        try:
            self.redis = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                password=settings.REDIS_PASSWORD,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True
            )
            # Test connection
            self.redis.ping()
            logger.info(f"✅ Connected to Redis at {settings.REDIS_HOST}:{settings.REDIS_PORT}")
        except redis.ConnectionError as e:
            logger.error(f"❌ Redis connection failed: {e}")
            raise
    
    def join_queue(self, user_id, elo_rating, user_data=None):
        """
        Add user to matchmaking queue.
        
        Args:
            user_id (int): User ID
            elo_rating (int): User's ELO rating
            user_data (dict): Optional user metadata
            
        Returns:
            bool: True if successfully added
        """
        try:
            # Add to sorted set (score = ELO rating)
            self.redis.zadd(self.QUEUE_KEY, {f'user:{user_id}': elo_rating})
            
            # Store user details
            user_key = f'{self.USER_PREFIX}:{user_id}'
            user_info = {
                'user_id': user_id,
                'elo_rating': elo_rating,
                'joined_at': timezone.now().isoformat(),
                'last_active': timezone.now().isoformat(),
            }
            
            # Add optional metadata
            if user_data:
                user_info.update(user_data)
            
            self.redis.hset(user_key, mapping=user_info)
            
            # Set TTL to auto-cleanup stale entries
            self.redis.expire(user_key, self.USER_ENTRY_TTL)
            
            # Update stats
            self.redis.hincrby(self.STATS_KEY, 'total_joins', 1)
            
            logger.info(f"✅ User {user_id} (ELO: {elo_rating}) joined queue")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error joining queue for user {user_id}: {e}")
            return False
    
    def leave_queue(self, user_id):
        """
        Remove user from matchmaking queue.
        
        Args:
            user_id (int): User ID
            
        Returns:
            bool: True if successfully removed
        """
        try:
            # Remove from sorted set
            removed = self.redis.zrem(self.QUEUE_KEY, f'user:{user_id}')
            
            # Delete user details
            user_key = f'{self.USER_PREFIX}:{user_id}'
            self.redis.delete(user_key)
            
            if removed:
                self.redis.hincrby(self.STATS_KEY, 'total_leaves', 1)
                logger.info(f"✅ User {user_id} left queue")
                return True
            else:
                logger.warning(f"⚠️ User {user_id} not in queue")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error leaving queue for user {user_id}: {e}")
            return False
    
    def update_heartbeat(self, user_id):
        """
        Update user's last active timestamp (heartbeat).
        
        Args:
            user_id (int): User ID
            
        Returns:
            bool: True if updated
        """
        try:
            user_key = f'{self.USER_PREFIX}:{user_id}'
            
            # Check if user still in queue
            if not self.redis.exists(user_key):
                return False
            
            # Update last_active timestamp
            self.redis.hset(user_key, 'last_active', timezone.now().isoformat())
            
            # Refresh TTL
            self.redis.expire(user_key, self.USER_ENTRY_TTL)
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Error updating heartbeat for user {user_id}: {e}")
            return False
    
    def find_match(self, user_id, elo_rating, elo_range=None):
        """
        Find an opponent with similar ELO rating.
        
        Args:
            user_id (int): User ID
            elo_rating (int): User's ELO rating
            elo_range (int): ELO range for matching (default: settings.MATCHMAKING_ELO_RANGE)
            
        Returns:
            dict or None: Opponent data if found, None otherwise
        """
        if elo_range is None:
            elo_range = settings.MATCHMAKING_ELO_RANGE
        
        try:
            # Find candidates within ELO range
            min_elo = elo_rating - elo_range
            max_elo = elo_rating + elo_range
            
            candidates = self.redis.zrangebyscore(
                self.QUEUE_KEY,
                min_elo,
                max_elo,
                withscores=True
            )
            
            # Filter out self
            for member, score in candidates:
                opponent_id = member.replace('user:', '')
                
                if str(opponent_id) != str(user_id):
                    # Get opponent details
                    opponent_key = f'{self.USER_PREFIX}:{opponent_id}'
                    opponent_data = self.redis.hgetall(opponent_key)
                    
                    if opponent_data:
                        logger.info(f"✅ Match found: User {user_id} (ELO: {elo_rating}) vs User {opponent_id} (ELO: {score})")
                        return {
                            'user_id': int(opponent_id),
                            'elo_rating': int(score),
                            **opponent_data
                        }
            
            logger.debug(f"🔍 No match found for user {user_id} (ELO: {elo_rating}, range: ±{elo_range})")
            return None
            
        except Exception as e:
            logger.error(f"❌ Error finding match for user {user_id}: {e}")
            return None
    
    def create_match(self, user1_id, user2_id):
        """
        Create a match record and remove both users from queue.
        
        Args:
            user1_id (int): First user ID
            user2_id (int): Second user ID
            
        Returns:
            str: Match ID (UUID)
        """
        try:
            import uuid
            match_id = str(uuid.uuid4())
            
            # Store match details
            match_key = f'{self.MATCH_PREFIX}:{match_id}'
            match_data = {
                'match_id': match_id,
                'user1_id': user1_id,
                'user2_id': user2_id,
                'created_at': timezone.now().isoformat(),
                'status': 'created'
            }
            
            self.redis.hset(match_key, mapping=match_data)
            self.redis.expire(match_key, self.MATCH_TTL)
            
            # Remove both users from queue
            self.leave_queue(user1_id)
            self.leave_queue(user2_id)
            
            # Update stats
            self.redis.hincrby(self.STATS_KEY, 'total_matches', 1)
            
            logger.info(f"🎮 Match created: {match_id} (User {user1_id} vs User {user2_id})")
            return match_id
            
        except Exception as e:
            logger.error(f"❌ Error creating match: {e}")
            return None
    
    def get_queue_position(self, user_id):
        """
        Get user's position in queue (by ELO rank).
        
        Args:
            user_id (int): User ID
            
        Returns:
            int or None: Position (0-indexed), None if not in queue
        """
        try:
            # Get rank in sorted set (highest ELO = rank 0)
            rank = self.redis.zrevrank(self.QUEUE_KEY, f'user:{user_id}')
            return rank
            
        except Exception as e:
            logger.error(f"❌ Error getting queue position for user {user_id}: {e}")
            return None
    
    def get_queue_size(self):
        """
        Get total number of users in queue.
        
        Returns:
            int: Queue size
        """
        try:
            return self.redis.zcard(self.QUEUE_KEY)
        except Exception as e:
            logger.error(f"❌ Error getting queue size: {e}")
            return 0
    
    def get_queue_stats(self):
        """
        Get queue statistics.
        
        Returns:
            dict: Queue statistics
        """
        try:
            stats = self.redis.hgetall(self.STATS_KEY)
            current_size = self.get_queue_size()
            
            return {
                'current_size': current_size,
                'total_joins': int(stats.get('total_joins', 0)),
                'total_leaves': int(stats.get('total_leaves', 0)),
                'total_matches': int(stats.get('total_matches', 0)),
                'elo_distribution': self._get_elo_distribution()
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting queue stats: {e}")
            return {}
    
    def _get_elo_distribution(self):
        """
        Get ELO rating distribution in queue.
        
        Returns:
            dict: ELO ranges and counts
        """
        try:
            # Get all users with scores
            users = self.redis.zrange(self.QUEUE_KEY, 0, -1, withscores=True)
            
            if not users:
                return {}
            
            # Group by ELO ranges
            distribution = {
                'below_1000': 0,
                '1000_1199': 0,
                '1200_1399': 0,
                '1400_1599': 0,
                '1600_1799': 0,
                '1800_plus': 0
            }
            
            for member, score in users:
                elo = int(score)
                if elo < 1000:
                    distribution['below_1000'] += 1
                elif elo < 1200:
                    distribution['1000_1199'] += 1
                elif elo < 1400:
                    distribution['1200_1399'] += 1
                elif elo < 1600:
                    distribution['1400_1599'] += 1
                elif elo < 1800:
                    distribution['1600_1799'] += 1
                else:
                    distribution['1800_plus'] += 1
            
            return distribution
            
        except Exception as e:
            logger.error(f"❌ Error getting ELO distribution: {e}")
            return {}
    
    def cleanup_stale_entries(self, max_age_seconds=300):
        """
        Remove stale entries (users who stopped heartbeat).
        Redis TTL handles this automatically, but this is for manual cleanup.
        
        Args:
            max_age_seconds (int): Max age in seconds (default: 5 minutes)
            
        Returns:
            int: Number of entries removed
        """
        try:
            removed_count = 0
            cutoff_time = timezone.now() - timedelta(seconds=max_age_seconds)
            
            # Get all users in queue
            users = self.redis.zrange(self.QUEUE_KEY, 0, -1)
            
            for member in users:
                user_id = member.replace('user:', '')
                user_key = f'{self.USER_PREFIX}:{user_id}'
                
                # Check if user entry exists
                if not self.redis.exists(user_key):
                    # Entry expired, remove from queue
                    self.redis.zrem(self.QUEUE_KEY, member)
                    removed_count += 1
                    continue
                
                # Check last_active timestamp
                last_active_str = self.redis.hget(user_key, 'last_active')
                if last_active_str:
                    from dateutil import parser
                    last_active = parser.isoparse(last_active_str)
                    
                    if last_active < cutoff_time:
                        # Stale entry, remove
                        self.leave_queue(user_id)
                        removed_count += 1
            
            if removed_count > 0:
                logger.info(f"🧹 Cleaned up {removed_count} stale queue entries")
            
            return removed_count
            
        except Exception as e:
            logger.error(f"❌ Error cleaning up stale entries: {e}")
            return 0
    
    def clear_queue(self):
        """
        Clear entire matchmaking queue (admin only).
        WARNING: This removes all users from queue!
        
        Returns:
            bool: True if cleared
        """
        try:
            # Delete queue
            self.redis.delete(self.QUEUE_KEY)
            
            # Delete all user entries
            user_keys = self.redis.keys(f'{self.USER_PREFIX}:*')
            if user_keys:
                self.redis.delete(*user_keys)
            
            # Reset stats
            self.redis.delete(self.STATS_KEY)
            
            logger.warning("⚠️ Matchmaking queue cleared!")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error clearing queue: {e}")
            return False
