#!/bin/bash
# Test AWS RDS PostgreSQL Connection
# Usage: ./test_rds_connection.sh

echo "🔍 Testing AWS RDS PostgreSQL Connection..."
echo "================================================"

# Load environment variables from .env
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Loaded .env file"
else
    echo "❌ .env file not found!"
    echo "Please create .env from .env.example"
    exit 1
fi

# Check required variables
if [ -z "$DB_HOST" ] || [ -z "$DB_NAME" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
    echo "❌ Missing required database environment variables!"
    echo "Required: DB_HOST, DB_NAME, DB_USER, DB_PASSWORD"
    exit 1
fi

echo ""
echo "📋 Connection Details:"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo ""

# Test 1: Check if psql is installed
echo "🔧 Checking psql installation..."
if command -v psql &> /dev/null; then
    PSQL_VERSION=$(psql --version)
    echo "✅ psql is installed: $PSQL_VERSION"
else
    echo "❌ psql is not installed!"
    echo "Install with: brew install postgresql"
    exit 1
fi

echo ""

# Test 2: Test connection with psql
echo "🌐 Testing connection with psql..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT -c "SELECT version();" &> /dev/null

if [ $? -eq 0 ]; then
    echo "✅ Connection successful!"
    echo ""
    
    # Get PostgreSQL version
    echo "📊 PostgreSQL Version:"
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT -t -c "SELECT version();"
    echo ""
    
    # List databases
    echo "📁 Available Databases:"
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT -c "\l" | grep -E "^\s*\w+\s+\|"
    echo ""
    
    # List tables in current database
    echo "📋 Tables in '$DB_NAME' database:"
    TABLE_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
    
    if [ "$TABLE_COUNT" -gt 0 ]; then
        PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT -c "\dt"
    else
        echo "   No tables found. Run 'python manage.py migrate' to create tables."
    fi
    echo ""
    
else
    echo "❌ Connection failed!"
    echo ""
    echo "Possible issues:"
    echo "1. Security Group not allowing your IP (port 5432)"
    echo "2. Wrong credentials (check DB_PASSWORD)"
    echo "3. RDS instance not running"
    echo "4. Public access disabled"
    echo ""
    echo "Troubleshooting:"
    echo "- Check Security Group inbound rules"
    echo "- Verify RDS endpoint and credentials"
    echo "- Ensure RDS status is 'Available'"
    exit 1
fi

# Test 3: Test Django connection
echo "🐍 Testing Django database connection..."
cd "$(dirname "$0")"
if [ -f "manage.py" ]; then
    python manage.py dbshell --command="\q" &> /dev/null
    if [ $? -eq 0 ]; then
        echo "✅ Django can connect to database!"
    else
        echo "⚠️  Django connection test failed. Check settings.py"
    fi
else
    echo "⚠️  manage.py not found. Skipping Django test."
fi

echo ""
echo "================================================"
echo "✨ Connection test complete!"
