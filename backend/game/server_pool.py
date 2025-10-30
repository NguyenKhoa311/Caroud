"""
Redis-based Game Server Pool
Tracks available game servers for load balancing and scaling
"""

import redis
import json
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


class GameServerPool:
    """
    Redis-based game server pool for load balancing.
    
    Redis Data Structures:
    - game_servers (Hash): {server_id: server_info_json}
    - game_server:{server_id}:health (String): Health status
    - active_games:{server_id} (Set): Active game IDs on server
    """
    
    SERVERS_KEY = 'game_servers'
    HEALTH_PREFIX = 'game_server'
    GAMES_PREFIX = 'active_games'
    
    # TTL settings
    HEALTH_TTL = 60  # 60 seconds (server must heartbeat)
    
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
            logger.info(f"✅ Game Server Pool connected to Redis")
        except redis.ConnectionError as e:
            logger.error(f"❌ Redis connection failed: {e}")
            raise
    
    def register_server(self, server_id, host, port, capacity=100, region='ap-southeast-1', metadata=None):
        """
        Register a game server in the pool.
        
        Args:
            server_id (str): Unique server identifier
            host (str): Server host/IP
            port (int): Server port
            capacity (int): Max concurrent games
            region (str): AWS region
            metadata (dict): Additional server metadata
            
        Returns:
            bool: True if registered
        """
        try:
            server_info = {
                'server_id': server_id,
                'host': host,
                'port': port,
                'capacity': capacity,
                'region': region,
                'registered_at': timezone.now().isoformat(),
                'last_heartbeat': timezone.now().isoformat(),
                'status': 'available',
                'active_games': 0,
            }
            
            # Add metadata
            if metadata:
                server_info.update(metadata)
            
            # Store server info
            self.redis.hset(self.SERVERS_KEY, server_id, json.dumps(server_info))
            
            # Set health check
            health_key = f'{self.HEALTH_PREFIX}:{server_id}:health'
            self.redis.set(health_key, 'healthy', ex=self.HEALTH_TTL)
            
            logger.info(f"✅ Server registered: {server_id} ({host}:{port}) in {region}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error registering server {server_id}: {e}")
            return False
    
    def unregister_server(self, server_id):
        """
        Remove a server from the pool.
        
        Args:
            server_id (str): Server identifier
            
        Returns:
            bool: True if removed
        """
        try:
            # Remove server info
            self.redis.hdel(self.SERVERS_KEY, server_id)
            
            # Remove health check
            health_key = f'{self.HEALTH_PREFIX}:{server_id}:health'
            self.redis.delete(health_key)
            
            # Remove active games set
            games_key = f'{self.GAMES_PREFIX}:{server_id}'
            self.redis.delete(games_key)
            
            logger.info(f"✅ Server unregistered: {server_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error unregistering server {server_id}: {e}")
            return False
    
    def heartbeat(self, server_id, cpu_usage=None, memory_usage=None, active_games=None):
        """
        Send heartbeat to keep server alive and update metrics.
        
        Args:
            server_id (str): Server identifier
            cpu_usage (float): CPU usage percentage
            memory_usage (float): Memory usage percentage
            active_games (int): Number of active games
            
        Returns:
            bool: True if heartbeat recorded
        """
        try:
            # Check if server exists
            server_data_str = self.redis.hget(self.SERVERS_KEY, server_id)
            if not server_data_str:
                logger.warning(f"⚠️ Server {server_id} not registered")
                return False
            
            # Update server info
            server_data = json.loads(server_data_str)
            server_data['last_heartbeat'] = timezone.now().isoformat()
            
            if cpu_usage is not None:
                server_data['cpu_usage'] = cpu_usage
            if memory_usage is not None:
                server_data['memory_usage'] = memory_usage
            if active_games is not None:
                server_data['active_games'] = active_games
            
            self.redis.hset(self.SERVERS_KEY, server_id, json.dumps(server_data))
            
            # Refresh health check TTL
            health_key = f'{self.HEALTH_PREFIX}:{server_id}:health'
            self.redis.set(health_key, 'healthy', ex=self.HEALTH_TTL)
            
            logger.debug(f"💓 Heartbeat from {server_id}: CPU {cpu_usage}%, Mem {memory_usage}%, Games {active_games}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error recording heartbeat for {server_id}: {e}")
            return False
    
    def get_best_server(self, region=None, min_capacity=1):
        """
        Find the best available server for a new game.
        Selects server with lowest active_games count.
        
        Args:
            region (str): Preferred region (None = any region)
            min_capacity (int): Minimum free capacity required
            
        Returns:
            dict or None: Server info if found
        """
        try:
            servers = self.get_all_servers(healthy_only=True)
            
            if not servers:
                logger.warning("⚠️ No servers available in pool")
                return None
            
            # Filter by region if specified
            if region:
                servers = [s for s in servers if s.get('region') == region]
            
            # Filter by capacity
            available_servers = [
                s for s in servers 
                if (s.get('capacity', 0) - s.get('active_games', 0)) >= min_capacity
            ]
            
            if not available_servers:
                logger.warning(f"⚠️ No servers with capacity >= {min_capacity}")
                return None
            
            # Sort by active_games (ascending) - least loaded first
            best_server = min(available_servers, key=lambda s: s.get('active_games', 0))
            
            logger.info(f"✅ Best server: {best_server['server_id']} ({best_server.get('active_games', 0)}/{best_server.get('capacity', 0)} games)")
            return best_server
            
        except Exception as e:
            logger.error(f"❌ Error finding best server: {e}")
            return None
    
    def assign_game_to_server(self, game_id, server_id=None, region=None):
        """
        Assign a game to a server (auto-select if server_id not provided).
        
        Args:
            game_id (str): Game/Match ID
            server_id (str): Specific server ID (optional)
            region (str): Preferred region (optional)
            
        Returns:
            dict or None: Server info if assigned
        """
        try:
            # Auto-select server if not specified
            if not server_id:
                server = self.get_best_server(region=region)
                if not server:
                    return None
                server_id = server['server_id']
            else:
                server = self.get_server_info(server_id)
                if not server:
                    logger.error(f"❌ Server {server_id} not found")
                    return None
            
            # Add game to server's active games
            games_key = f'{self.GAMES_PREFIX}:{server_id}'
            self.redis.sadd(games_key, game_id)
            
            # Increment active_games counter
            server_data = json.loads(self.redis.hget(self.SERVERS_KEY, server_id))
            server_data['active_games'] = self.redis.scard(games_key)
            self.redis.hset(self.SERVERS_KEY, server_id, json.dumps(server_data))
            
            logger.info(f"🎮 Game {game_id} assigned to server {server_id}")
            return server
            
        except Exception as e:
            logger.error(f"❌ Error assigning game {game_id}: {e}")
            return None
    
    def remove_game_from_server(self, game_id, server_id):
        """
        Remove a game from server when it ends.
        
        Args:
            game_id (str): Game/Match ID
            server_id (str): Server identifier
            
        Returns:
            bool: True if removed
        """
        try:
            # Remove from active games set
            games_key = f'{self.GAMES_PREFIX}:{server_id}'
            removed = self.redis.srem(games_key, game_id)
            
            if removed:
                # Update active_games counter
                server_data_str = self.redis.hget(self.SERVERS_KEY, server_id)
                if server_data_str:
                    server_data = json.loads(server_data_str)
                    server_data['active_games'] = self.redis.scard(games_key)
                    self.redis.hset(self.SERVERS_KEY, server_id, json.dumps(server_data))
                
                logger.info(f"✅ Game {game_id} removed from server {server_id}")
                return True
            else:
                logger.warning(f"⚠️ Game {game_id} not found on server {server_id}")
                return False
            
        except Exception as e:
            logger.error(f"❌ Error removing game {game_id} from server {server_id}: {e}")
            return False
    
    def get_server_info(self, server_id):
        """
        Get information about a specific server.
        
        Args:
            server_id (str): Server identifier
            
        Returns:
            dict or None: Server info
        """
        try:
            server_data_str = self.redis.hget(self.SERVERS_KEY, server_id)
            if server_data_str:
                return json.loads(server_data_str)
            return None
        except Exception as e:
            logger.error(f"❌ Error getting server info for {server_id}: {e}")
            return None
    
    def get_all_servers(self, healthy_only=False):
        """
        Get all registered servers.
        
        Args:
            healthy_only (bool): Return only healthy servers
            
        Returns:
            list: List of server info dicts
        """
        try:
            servers_data = self.redis.hgetall(self.SERVERS_KEY)
            servers = [json.loads(data) for data in servers_data.values()]
            
            if healthy_only:
                # Filter by health status
                healthy_servers = []
                for server in servers:
                    health_key = f'{self.HEALTH_PREFIX}:{server["server_id"]}:health'
                    if self.redis.exists(health_key):
                        healthy_servers.append(server)
                return healthy_servers
            
            return servers
            
        except Exception as e:
            logger.error(f"❌ Error getting all servers: {e}")
            return []
    
    def get_pool_stats(self):
        """
        Get game server pool statistics.
        
        Returns:
            dict: Pool statistics
        """
        try:
            all_servers = self.get_all_servers()
            healthy_servers = self.get_all_servers(healthy_only=True)
            
            total_capacity = sum(s.get('capacity', 0) for s in all_servers)
            total_active_games = sum(s.get('active_games', 0) for s in all_servers)
            
            # Group by region
            regions = {}
            for server in all_servers:
                region = server.get('region', 'unknown')
                if region not in regions:
                    regions[region] = {
                        'servers': 0,
                        'capacity': 0,
                        'active_games': 0
                    }
                regions[region]['servers'] += 1
                regions[region]['capacity'] += server.get('capacity', 0)
                regions[region]['active_games'] += server.get('active_games', 0)
            
            return {
                'total_servers': len(all_servers),
                'healthy_servers': len(healthy_servers),
                'unhealthy_servers': len(all_servers) - len(healthy_servers),
                'total_capacity': total_capacity,
                'total_active_games': total_active_games,
                'utilization_rate': round(total_active_games / total_capacity * 100, 2) if total_capacity > 0 else 0,
                'regions': regions
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting pool stats: {e}")
            return {}
    
    def cleanup_dead_servers(self):
        """
        Remove servers that haven't sent heartbeat (health check expired).
        
        Returns:
            int: Number of servers removed
        """
        try:
            removed_count = 0
            all_servers = self.get_all_servers()
            
            for server in all_servers:
                server_id = server['server_id']
                health_key = f'{self.HEALTH_PREFIX}:{server_id}:health'
                
                # Check if health key exists (TTL expired = dead server)
                if not self.redis.exists(health_key):
                    self.unregister_server(server_id)
                    removed_count += 1
                    logger.warning(f"⚠️ Dead server removed: {server_id}")
            
            if removed_count > 0:
                logger.info(f"🧹 Cleaned up {removed_count} dead servers")
            
            return removed_count
            
        except Exception as e:
            logger.error(f"❌ Error cleaning up dead servers: {e}")
            return 0
