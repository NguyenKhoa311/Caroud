#!/usr/bin/env python
"""
Automated migration from local PostgreSQL to AWS RDS
"""
import os
import sys
import shutil
import glob
from datetime import datetime

def print_header(title):
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60 + "\n")

def backup_env_file():
    """Backup current .env file"""
    print("📝 Backing up .env file...")
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_name = f'.env.backup_{timestamp}'
    shutil.copy('.env', backup_name)
    print(f"✅ Backed up to {backup_name}")
    return backup_name

def update_env_to_rds():
    """Update .env to use RDS credentials"""
    print("🔄 Updating .env to use RDS...")
    
    # Read current .env
    with open('.env', 'r') as f:
        content = f.read()
    
    # Check if already using RDS
    if 'DB_HOST=localhost' not in content and 'DB_USER=caro_user' not in content:
        print("✅ .env already configured for RDS")
        return True
    
    # Replace local DB config with RDS
    lines = content.split('\n')
    new_lines = []
    skip_next = False
    local_db_section = False
    
    for i, line in enumerate(lines):
        # Detect local DB section
        if '# Database - PostgreSQL' in line and i > 5:
            local_db_section = True
            continue
        
        # Skip local DB config lines
        if local_db_section:
            if line.strip().startswith('DB_') and 'caro_game_db' in line:
                continue
            if line.strip().startswith('DB_') and 'caro_user' in line:
                continue
            if line.strip().startswith('DB_') and line.strip().endswith('localhost'):
                continue
            if 'DB_PASSWORD=admin' in line and local_db_section:
                continue
            if line.strip() == '':
                local_db_section = False
                continue
        
        new_lines.append(line)
    
    # Write updated .env
    with open('.env', 'w') as f:
        f.write('\n'.join(new_lines))
    
    print("✅ .env updated to use RDS credentials")
    print("   Using: caroud-db.chyo8scokfws.ap-southeast-1.rds.amazonaws.com")
    return True

def run_command(command, description):
    """Run shell command and handle errors"""
    print(f"🔄 {description}...")
    result = os.system(command)
    if result != 0:
        print(f"❌ Failed: {description}")
        return False
    print(f"✅ {description} completed")
    return True

def verify_migration():
    """Verify migration was successful"""
    print("🔍 Verifying migration...")
    
    try:
        # Setup Django
        sys.path.append(os.path.dirname(os.path.abspath(__file__)))
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'caroud.settings')
        import django
        django.setup()
        
        from users.models import User
        from django.db import connection
        
        # Check connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT current_database(), inet_server_addr();")
            db_name, host = cursor.fetchone()
            print(f"✅ Connected to: {db_name} at {host}")
        
        # Count users
        user_count = User.objects.count()
        print(f"✅ Users migrated: {user_count}")
        
        if user_count > 0:
            users = User.objects.all().order_by('-elo_rating')[:5]
            print("\n📊 Top users:")
            for u in users:
                print(f"   - {u.username}: ELO {u.elo_rating}, {u.wins}W/{u.losses}L")
        
        return user_count > 0
        
    except Exception as e:
        print(f"❌ Verification failed: {e}")
        return False

def main():
    print_header("🎮 Caro Game - Migration to AWS RDS")
    
    print("This will migrate your local database to AWS RDS.")
    print("\n⚠️  Prerequisites:")
    print("   1. AWS RDS instance is running")
    print("   2. Security Group allows your IP (port 5432)")
    print("   3. RDS credentials in .env are correct:")
    print("      - Host: caroud-db.chyo8scokfws.ap-southeast-1.rds.amazonaws.com")
    print("      - User: postgres")
    print("      - Password: realsomot")
    print("      - Database: caroud-db")
    print()
    
    confirm = input("📝 Continue with migration? (yes/no): ").strip().lower()
    if confirm != 'yes':
        print("❌ Migration cancelled")
        return
    
    # Step 1: Backup local database
    print_header("Step 1/6: Backup Local Database")
    if not run_command('venv/bin/python backup_local_db.py', 'Backup local data'):
        print("❌ Backup failed. Aborting migration.")
        return
    
    # Find backup file
    backup_files = glob.glob('backup_local_*.json')
    if not backup_files:
        print("❌ No backup file found! Aborting.")
        return
    latest_backup = max(backup_files, key=os.path.getctime)
    print(f"✅ Using backup: {latest_backup}")
    
    # Step 2: Test RDS connection
    print_header("Step 2/6: Test RDS Connection")
    print("Testing with current .env configuration...")
    if not run_command('venv/bin/python test_rds_connection.py', 'Test RDS connection'):
        print("❌ Cannot connect to RDS.")
        print("\n🔧 Please check:")
        print("   1. Security Group allows your IP")
        print("   2. Database 'caroud-db' exists on RDS")
        print("   3. Credentials are correct")
        return
    
    # Step 3: Backup .env
    print_header("Step 3/6: Backup Configuration")
    env_backup = backup_env_file()
    
    # Step 4: Update .env to RDS
    print_header("Step 4/6: Switch to RDS Configuration")
    if not update_env_to_rds():
        print("❌ Failed to update .env")
        print(f"Restoring from backup: {env_backup}")
        shutil.copy(env_backup, '.env')
        return
    
    # Step 5: Run migrations on RDS
    print_header("Step 5/6: Create Database Schema on RDS")
    print("This will create all tables on RDS...")
    if not run_command('venv/bin/python manage.py migrate', 'Create tables on RDS'):
        print("❌ Migration failed")
        print(f"Restoring .env from: {env_backup}")
        shutil.copy(env_backup, '.env')
        return
    
    # Step 6: Load data to RDS
    print_header("Step 6/6: Load Data to RDS")
    print(f"Loading data from {latest_backup}...")
    if not run_command(f'venv/bin/python manage.py loaddata {latest_backup}', 
                       'Load data to RDS'):
        print("⚠️  Data loading failed but tables are created.")
        print("You may need to manually fix data conflicts.")
        print(f"\nTo retry: venv/bin/python manage.py loaddata {latest_backup}")
    
    # Step 7: Verify migration
    print_header("Verification")
    if verify_migration():
        print_header("✅ Migration Completed Successfully!")
        print("🎉 Your database is now running on AWS RDS!")
        print()
        print("📝 Next steps:")
        print("1. Test your application:")
        print("   venv/bin/python manage.py runserver")
        print()
        print("2. Connect DBeaver to RDS:")
        print("   Host: caroud-db.chyo8scokfws.ap-southeast-1.rds.amazonaws.com")
        print("   Database: caroud-db")
        print("   User: postgres")
        print("   Password: realsomot")
        print()
        print("3. Deploy backend to AWS (EC2/ECS/Elastic Beanstalk)")
        print()
        print(f"💾 Backups saved:")
        print(f"   - Data: {latest_backup}")
        print(f"   - Config: {env_backup}")
    else:
        print("⚠️  Migration completed but verification failed.")
        print("Please check the database manually.")

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n❌ Migration cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
