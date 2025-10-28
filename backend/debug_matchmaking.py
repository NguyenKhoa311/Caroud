#!/usr/bin/env python
"""
Debug matchmaking issues
"""
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'caroud.settings')
django.setup()

from matchmaking.models import MatchmakingQueue
from users.models import User
from django.utils import timezone

def debug_matchmaking():
    """Debug current matchmaking state"""
    print("=" * 60)
    print("🔍 MATCHMAKING DEBUG")
    print("=" * 60)
    
    # Check queue entries
    print("\n📋 Current Queue Entries:")
    queue_entries = MatchmakingQueue.objects.all().order_by('-joined_at')
    
    if not queue_entries.exists():
        print("   ❌ Queue is empty!")
    else:
        for entry in queue_entries:
            elapsed = (timezone.now() - entry.joined_at).seconds
            print(f"\n   Player: {entry.player.username}")
            print(f"   ELO: {entry.elo_rating}")
            print(f"   Status: {entry.status}")
            print(f"   Joined: {entry.joined_at}")
            print(f"   Waiting: {elapsed}s")
            if entry.matched_with:
                print(f"   Matched with: {entry.matched_with.username}")
    
    # Check specific users
    print("\n\n👥 User ELO Ratings:")
    try:
        tangerine = User.objects.get(username='tangerine')
        print(f"   tangerine: ELO {tangerine.elo_rating}")
    except User.DoesNotExist:
        print("   ❌ User 'tangerine' not found")
    
    try:
        testuser = User.objects.get(username='testuser')
        print(f"   testuser: ELO {testuser.elo_rating}")
    except User.DoesNotExist:
        print("   ❌ User 'testuser' not found")
    
    # Calculate ELO difference
    try:
        tangerine = User.objects.get(username='tangerine')
        testuser = User.objects.get(username='testuser')
        diff = abs(tangerine.elo_rating - testuser.elo_rating)
        print(f"\n   ELO Difference: {diff}")
        print(f"   Initial Range: ±100")
        
        if diff <= 100:
            print("   ✅ Within initial range - should match immediately")
        else:
            wait_time = ((diff - 100) // 10) * 10
            print(f"   ⚠️  Need to wait ~{wait_time}s for range expansion")
    except:
        pass
    
    # Check waiting entries
    print("\n\n⏱️  Waiting Entries:")
    waiting = MatchmakingQueue.objects.filter(status='waiting')
    print(f"   Count: {waiting.count()}")
    
    if waiting.count() >= 2:
        print("\n   🔍 Checking if they can match:")
        entries = list(waiting)
        for i, e1 in enumerate(entries):
            for e2 in entries[i+1:]:
                diff = abs(e1.elo_rating - e2.elo_rating)
                elapsed = max(
                    (timezone.now() - e1.joined_at).seconds,
                    (timezone.now() - e2.joined_at).seconds
                )
                expanded_range = 100 + min((elapsed // 10) * 10, 500)
                
                print(f"\n   {e1.player.username} (ELO {e1.elo_rating}) vs {e2.player.username} (ELO {e2.elo_rating})")
                print(f"   Difference: {diff}")
                print(f"   Expanded Range: ±{expanded_range}")
                print(f"   Waited: {elapsed}s")
                
                if diff <= expanded_range:
                    print(f"   ✅ CAN MATCH!")
                else:
                    need_wait = ((diff - 100) // 10) * 10
                    print(f"   ⏳ Need {need_wait}s more")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    debug_matchmaking()
