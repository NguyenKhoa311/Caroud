"""
Management command to clean up stale/broken game rooms
"""
from django.core.management.base import BaseCommand
from users.room_models import GameRoom
from game.models import Match
from django.utils import timezone
from datetime import timedelta


class Command(BaseCommand):
    help = 'Clean up stale, finished, or broken game rooms'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Delete all rooms regardless of status',
        )
        parser.add_argument(
            '--older-than',
            type=int,
            default=24,
            help='Delete rooms older than N hours (default: 24)',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        delete_all = options['all']
        older_than_hours = options['older_than']
        
        cutoff_time = timezone.now() - timedelta(hours=older_than_hours)
        
        self.stdout.write(self.style.WARNING(
            f'\n{"=" * 60}'
        ))
        self.stdout.write(self.style.WARNING(
            'Game Room Cleanup Utility'
        ))
        self.stdout.write(self.style.WARNING(
            f'{"=" * 60}\n'
        ))
        
        if dry_run:
            self.stdout.write(self.style.NOTICE('🔍 DRY RUN MODE - No changes will be made\n'))
        
        # Get all rooms
        all_rooms = GameRoom.objects.all()
        total_rooms = all_rooms.count()
        
        self.stdout.write(f'📊 Total rooms in database: {total_rooms}\n')
        
        if total_rooms == 0:
            self.stdout.write(self.style.SUCCESS('✅ No rooms to clean up!\n'))
            return
        
        # Categories of rooms to delete
        rooms_to_delete = []
        
        # 1. Finished/Closed rooms
        finished_rooms = all_rooms.filter(status__in=['finished', 'closed'])
        if finished_rooms.exists():
            self.stdout.write(f'🏁 Found {finished_rooms.count()} finished/closed rooms')
            rooms_to_delete.extend(list(finished_rooms))
        
        # 2. Rooms with finished matches
        rooms_with_finished_matches = []
        for room in all_rooms:
            if room.game:
                try:
                    match = Match.objects.get(id=room.game.id)
                    if match.status in ['finished', 'completed']:
                        rooms_with_finished_matches.append(room)
                except Match.DoesNotExist:
                    pass
        
        if rooms_with_finished_matches:
            self.stdout.write(f'🎮 Found {len(rooms_with_finished_matches)} rooms with finished matches')
            rooms_to_delete.extend(rooms_with_finished_matches)
        
        # 3. Old inactive rooms
        old_rooms = all_rooms.filter(created_at__lt=cutoff_time)
        if old_rooms.exists():
            self.stdout.write(f'⏰ Found {old_rooms.count()} rooms older than {older_than_hours} hours')
            rooms_to_delete.extend(list(old_rooms))
        
        # 4. Rooms with null/invalid game reference
        broken_rooms = all_rooms.filter(game__isnull=True)
        if broken_rooms.exists():
            self.stdout.write(f'💔 Found {broken_rooms.count()} rooms with no game reference')
            rooms_to_delete.extend(list(broken_rooms))
        
        # 5. Delete all if --all flag is set
        if delete_all:
            self.stdout.write(self.style.WARNING(f'⚠️  --all flag set, will delete ALL {total_rooms} rooms'))
            rooms_to_delete = list(all_rooms)
        
        # Remove duplicates
        rooms_to_delete = list(set(rooms_to_delete))
        
        if not rooms_to_delete:
            self.stdout.write(self.style.SUCCESS('\n✅ No rooms need cleaning!\n'))
            return
        
        self.stdout.write(f'\n📋 Summary of rooms to delete:')
        self.stdout.write(f'{"=" * 60}')
        
        for room in rooms_to_delete:
            status_icon = '🟢' if room.status == 'open' else '🔴' if room.status == 'finished' else '🟡'
            match_status = 'N/A'
            if room.game:
                try:
                    match = Match.objects.get(id=room.game.id)
                    match_status = match.status
                except Match.DoesNotExist:
                    match_status = 'BROKEN'
            
            age = timezone.now() - room.created_at
            age_str = f'{age.days}d {age.seconds // 3600}h' if age.days > 0 else f'{age.seconds // 3600}h {(age.seconds % 3600) // 60}m'
            
            self.stdout.write(
                f'{status_icon} Room {room.code}: '
                f'Status={room.status}, '
                f'Match={match_status}, '
                f'Age={age_str}, '
                f'Host={room.host.username if room.host else "None"}'
            )
        
        self.stdout.write(f'{"=" * 60}')
        self.stdout.write(f'\n🗑️  Total rooms to delete: {len(rooms_to_delete)}\n')
        
        if dry_run:
            self.stdout.write(self.style.NOTICE(
                '🔍 DRY RUN - No rooms were deleted. Run without --dry-run to actually delete.\n'
            ))
            return
        
        # Confirm deletion
        if not delete_all:
            confirm = input(f'\n⚠️  Are you sure you want to delete {len(rooms_to_delete)} rooms? (yes/no): ')
            if confirm.lower() != 'yes':
                self.stdout.write(self.style.WARNING('❌ Deletion cancelled.\n'))
                return
        
        # Delete rooms
        deleted_count = 0
        for room in rooms_to_delete:
            try:
                room.delete()
                deleted_count += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'❌ Error deleting room {room.code}: {e}'))
        
        self.stdout.write(self.style.SUCCESS(
            f'\n✅ Successfully deleted {deleted_count} rooms!\n'
        ))
        
        remaining = GameRoom.objects.count()
        self.stdout.write(f'📊 Rooms remaining: {remaining}\n')
