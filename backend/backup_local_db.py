#!/usr/bin/env python
"""
Backup local PostgreSQL database before migration
"""
import os
import sys
import django
from datetime import datetime

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'caroud.settings')
django.setup()

from django.core.management import call_command

def backup_database():
    """Backup current database to JSON file"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_file = f'backup_local_{timestamp}.json'
    
    print(f"🔄 Starting backup to {backup_file}...")
    
    try:
        # Dump all data to JSON
        with open(backup_file, 'w') as f:
            call_command('dumpdata', 
                        '--natural-foreign',
                        '--natural-primary',
                        '--indent', '2',
                        stdout=f,
                        exclude=[
                            'contenttypes',
                            'auth.permission',
                            'admin.logentry',
                            'sessions.session',
                        ])
        
        # Get file size
        size = os.path.getsize(backup_file)
        size_mb = size / (1024 * 1024)
        
        print(f"✅ Backup completed successfully!")
        print(f"📁 File: {backup_file}")
        print(f"📊 Size: {size_mb:.2f} MB")
        
        return backup_file
    
    except Exception as e:
        print(f"❌ Backup failed: {e}")
        return None

if __name__ == '__main__':
    print("=" * 60)
    print("🎮 Caro Game - Database Backup Tool")
    print("=" * 60)
    print()
    
    backup_file = backup_database()
    
    if backup_file:
        print()
        print("📝 Next steps:")
        print(f"1. Verify backup file: head -20 {backup_file}")
        print("2. Test RDS connection: venv/bin/python test_rds_connection.py")
        print("3. Run migration: venv/bin/python migrate_to_rds.py")
        print()
