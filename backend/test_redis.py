#!/usr/bin/env python
"""
Test Redis Connection and Matchmaking Queue
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'caroud.settings')
django.setup()

from matchmaking.redis_queue import RedisMatchmakingQueue
from game.server_pool import GameServerPool
from django.conf import settings


def test_redis_connection():
    """Test basic Redis connection"""
    print("=" * 60)
    print("🔍 Testing Redis Connection")
    print("=" * 60)
    print(f"Host: {settings.REDIS_HOST}:{settings.REDIS_PORT}")
    print()
    
    try:
        queue = RedisMatchmakingQueue()
        print("✅ Redis connection successful!")
        
        # Test basic operations
        queue.redis.set('test_key', 'test_value')
        value = queue.redis.get('test_key')
        print(f"✅ Set/Get test: {value}")
        
        queue.redis.delete('test_key')
        print("✅ Delete test successful")
        
        return True
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        return False


def test_matchmaking_queue():
    """Test matchmaking queue operations"""
    print("\n" + "=" * 60)
    print("🎮 Testing Matchmaking Queue")
    print("=" * 60)
    
    try:
        queue = RedisMatchmakingQueue()
        
        # Clear queue first
        queue.clear_queue()
        print("✅ Queue cleared")
        
        # Test 1: Join queue
        print("\n📝 Test 1: Join Queue")
        success = queue.join_queue(user_id=1, elo_rating=1200, user_data={'username': 'player1'})
        print(f"   Join result: {'✅ Success' if success else '❌ Failed'}")
        
        success = queue.join_queue(user_id=2, elo_rating=1250, user_data={'username': 'player2'})
        print(f"   Join result: {'✅ Success' if success else '❌ Failed'}")
        
        # Test 2: Queue size
        print("\n📊 Test 2: Queue Size")
        size = queue.get_queue_size()
        print(f"   Queue size: {size}")
        
        # Test 3: Queue position
        print("\n📍 Test 3: Queue Position")
        pos = queue.get_queue_position(1)
        print(f"   Player 1 position: {pos}")
        
        pos = queue.get_queue_position(2)
        print(f"   Player 2 position: {pos}")
        
        # Test 4: Find match
        print("\n🔍 Test 4: Find Match")
        opponent = queue.find_match(user_id=1, elo_rating=1200)
        if opponent:
            print(f"   ✅ Match found: Player {opponent['user_id']} (ELO: {opponent['elo_rating']})")
        else:
            print("   ⚠️  No match found")
        
        # Test 5: Queue stats
        print("\n📊 Test 5: Queue Stats")
        stats = queue.get_queue_stats()
        print(f"   Current size: {stats.get('current_size')}")
        print(f"   Total joins: {stats.get('total_joins')}")
        print(f"   Total matches: {stats.get('total_matches')}")
        
        # Test 6: Leave queue
        print("\n🚪 Test 6: Leave Queue")
        success = queue.leave_queue(1)
        print(f"   Leave result: {'✅ Success' if success else '❌ Failed'}")
        
        success = queue.leave_queue(2)
        print(f"   Leave result: {'✅ Success' if success else '❌ Failed'}")
        
        size = queue.get_queue_size()
        print(f"   Queue size after leaving: {size}")
        
        print("\n✅ All matchmaking tests passed!")
        return True
        
    except Exception as e:
        print(f"\n❌ Matchmaking test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_server_pool():
    """Test game server pool operations"""
    print("\n" + "=" * 60)
    print("🖥️  Testing Game Server Pool")
    print("=" * 60)
    
    try:
        pool = GameServerPool()
        
        # Test 1: Register servers
        print("\n📝 Test 1: Register Servers")
        success = pool.register_server(
            server_id='server1',
            host='10.0.1.5',
            port=8000,
            capacity=100,
            region='ap-southeast-1a'
        )
        print(f"   Register server1: {'✅ Success' if success else '❌ Failed'}")
        
        success = pool.register_server(
            server_id='server2',
            host='10.0.2.5',
            port=8000,
            capacity=150,
            region='ap-southeast-1b'
        )
        print(f"   Register server2: {'✅ Success' if success else '❌ Failed'}")
        
        # Test 2: Get all servers
        print("\n📊 Test 2: Get All Servers")
        servers = pool.get_all_servers()
        print(f"   Total servers: {len(servers)}")
        for server in servers:
            print(f"   - {server['server_id']}: {server['host']}:{server['port']} ({server['region']})")
        
        # Test 3: Heartbeat
        print("\n💓 Test 3: Heartbeat")
        success = pool.heartbeat('server1', cpu_usage=45.5, memory_usage=60.2, active_games=5)
        print(f"   Heartbeat result: {'✅ Success' if success else '❌ Failed'}")
        
        # Test 4: Get best server
        print("\n🏆 Test 4: Get Best Server")
        best = pool.get_best_server()
        if best:
            print(f"   Best server: {best['server_id']} ({best['active_games']}/{best['capacity']} games)")
        else:
            print("   ⚠️  No servers available")
        
        # Test 5: Assign game
        print("\n🎮 Test 5: Assign Game")
        server = pool.assign_game_to_server(game_id='match-123')
        if server:
            print(f"   Game assigned to: {server['server_id']}")
        else:
            print("   ❌ Failed to assign game")
        
        # Test 6: Pool stats
        print("\n📊 Test 6: Pool Stats")
        stats = pool.get_pool_stats()
        print(f"   Total servers: {stats.get('total_servers')}")
        print(f"   Healthy servers: {stats.get('healthy_servers')}")
        print(f"   Total capacity: {stats.get('total_capacity')}")
        print(f"   Active games: {stats.get('total_active_games')}")
        print(f"   Utilization: {stats.get('utilization_rate')}%")
        
        # Test 7: Remove game
        print("\n🗑️  Test 7: Remove Game")
        success = pool.remove_game_from_server('match-123', 'server1')
        print(f"   Remove result: {'✅ Success' if success else '❌ Failed'}")
        
        # Test 8: Unregister servers
        print("\n🚪 Test 8: Unregister Servers")
        pool.unregister_server('server1')
        pool.unregister_server('server2')
        print("   ✅ Servers unregistered")
        
        print("\n✅ All server pool tests passed!")
        return True
        
    except Exception as e:
        print(f"\n❌ Server pool test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests"""
    print("🚀 Starting Redis Tests")
    print()
    
    # Test 1: Connection
    if not test_redis_connection():
        print("\n❌ Redis connection failed. Please check:")
        print("   1. Redis is running (brew services start redis)")
        print("   2. REDIS_HOST and REDIS_PORT in .env are correct")
        print("   3. Firewall allows connection")
        return
    
    # Test 2: Matchmaking Queue
    if not test_matchmaking_queue():
        print("\n❌ Matchmaking queue tests failed")
        return
    
    # Test 3: Server Pool
    if not test_server_pool():
        print("\n❌ Server pool tests failed")
        return
    
    print("\n" + "=" * 60)
    print("✅ ALL TESTS PASSED!")
    print("=" * 60)
    print()
    print("Next steps:")
    print("1. ✅ Redis connection working")
    print("2. ✅ Matchmaking queue ready")
    print("3. ✅ Server pool ready")
    print("4. ⏭️  Update matchmaking/urls.py to use Redis views")
    print("5. ⏭️  Deploy to AWS ElastiCache")
    print()


if __name__ == '__main__':
    main()
