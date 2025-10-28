#!/usr/bin/env python
"""
Test AWS RDS PostgreSQL Connection using Django
"""
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'caroud.settings')
django.setup()

from django.db import connection
from django.core.management import execute_from_command_line

def test_connection():
    """Test database connection"""
    print("🔍 Testing AWS RDS PostgreSQL Connection via Django...")
    print("=" * 60)
    
    try:
        # Test connection
        with connection.cursor() as cursor:
            # Get database info
            cursor.execute("SELECT version();")
            version = cursor.fetchone()[0]
            
            cursor.execute("SELECT current_database();")
            database = cursor.fetchone()[0]
            
            cursor.execute("SELECT current_user;")
            user = cursor.fetchone()[0]
            
            cursor.execute("SELECT inet_server_addr();")
            host = cursor.fetchone()[0]
            
            print("\n✅ Connection successful!")
            print("\n📋 Database Information:")
            print(f"   Database: {database}")
            print(f"   User: {user}")
            print(f"   Host: {host}")
            print(f"\n📊 PostgreSQL Version:")
            print(f"   {version}")
            
            # Count tables
            cursor.execute("""
                SELECT COUNT(*) 
                FROM information_schema.tables 
                WHERE table_schema = 'public';
            """)
            table_count = cursor.fetchone()[0]
            
            print(f"\n📁 Tables: {table_count} tables found")
            
            if table_count > 0:
                cursor.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public'
                    ORDER BY table_name;
                """)
                tables = cursor.fetchall()
                print("\n📋 Table List:")
                for table in tables:
                    print(f"   - {table[0]}")
            else:
                print("\n⚠️  No tables found. Run migrations:")
                print("   python manage.py migrate")
            
            # Test query performance
            import time
            start = time.time()
            cursor.execute("SELECT 1;")
            elapsed = (time.time() - start) * 1000
            print(f"\n⚡ Query Performance: {elapsed:.2f}ms")
            
            print("\n" + "=" * 60)
            print("✨ All tests passed!")
            return True
            
    except Exception as e:
        print(f"\n❌ Connection failed!")
        print(f"\n🐛 Error: {e}")
        print("\n📝 Troubleshooting:")
        print("1. Check .env file has correct RDS credentials")
        print("2. Verify Security Group allows your IP (port 5432)")
        print("3. Ensure RDS instance status is 'Available'")
        print("4. Check if Public access is enabled (for local dev)")
        print("\n💡 Run this to verify settings:")
        print("   python manage.py check --database default")
        return False

if __name__ == "__main__":
    success = test_connection()
    sys.exit(0 if success else 1)
