#!/bin/bash

# PostgreSQL Quick Setup Script for Caro Game
# This script automates the PostgreSQL setup process

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🎮 Caro Game - PostgreSQL Setup Script${NC}\n"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}PostgreSQL is not installed.${NC}"
    echo "Installing PostgreSQL..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if ! command -v brew &> /dev/null; then
            echo -e "${RED}Homebrew is not installed. Please install Homebrew first.${NC}"
            echo "Visit: https://brew.sh"
            exit 1
        fi
        brew install postgresql@14
        brew services start postgresql@14
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        sudo apt update
        sudo apt install -y postgresql postgresql-contrib
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
    else
        echo -e "${RED}Unsupported OS. Please install PostgreSQL manually.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ PostgreSQL installed successfully${NC}\n"
else
    echo -e "${GREEN}✓ PostgreSQL is already installed${NC}\n"
fi

# Get database credentials
echo "Enter database configuration:"
read -p "Database name [caro_game_db]: " DB_NAME
DB_NAME=${DB_NAME:-caro_game_db}

read -p "Database user [caro_user]: " DB_USER
DB_USER=${DB_USER:-caro_user}

read -sp "Database password: " DB_PASSWORD
echo
if [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}Password cannot be empty${NC}"
    exit 1
fi

# Create database and user
echo -e "\n${YELLOW}Creating database and user...${NC}"

if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS - connect as current user
    psql postgres <<EOF
-- Create user if not exists
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '$DB_USER') THEN
        CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
    END IF;
END
\$\$;

-- Create database if not exists
SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- Configure user
ALTER ROLE $DB_USER SET client_encoding TO 'utf8';
ALTER ROLE $DB_USER SET default_transaction_isolation TO 'read committed';
ALTER ROLE $DB_USER SET timezone TO 'UTC';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF

    # Connect to the database and grant schema privileges
    psql $DB_NAME <<EOF
GRANT ALL ON SCHEMA public TO $DB_USER;
EOF

elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux - use sudo to connect as postgres user
    sudo -u postgres psql <<EOF
-- Create user if not exists
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '$DB_USER') THEN
        CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
    END IF;
END
\$\$;

-- Create database if not exists
SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- Configure user
ALTER ROLE $DB_USER SET client_encoding TO 'utf8';
ALTER ROLE $DB_USER SET default_transaction_isolation TO 'read committed';
ALTER ROLE $DB_USER SET timezone TO 'UTC';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF

    sudo -u postgres psql $DB_NAME <<EOF
GRANT ALL ON SCHEMA public TO $DB_USER;
EOF
fi

echo -e "${GREEN}✓ Database and user created successfully${NC}\n"

# Test connection
echo -e "${YELLOW}Testing database connection...${NC}"
if PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -h localhost -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Database connection successful${NC}\n"
else
    echo -e "${RED}✗ Database connection failed${NC}"
    exit 1
fi

# Update .env file
ENV_FILE="backend/.env"
if [ -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}Updating $ENV_FILE...${NC}"
    
    # Backup existing .env
    cp $ENV_FILE "${ENV_FILE}.backup"
    
    # Update database settings
    sed -i.tmp "s/^DB_NAME=.*/DB_NAME=$DB_NAME/" $ENV_FILE
    sed -i.tmp "s/^DB_USER=.*/DB_USER=$DB_USER/" $ENV_FILE
    sed -i.tmp "s/^DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" $ENV_FILE
    sed -i.tmp "s/^DB_HOST=.*/DB_HOST=localhost/" $ENV_FILE
    sed -i.tmp "s/^DB_PORT=.*/DB_PORT=5432/" $ENV_FILE
    rm -f "${ENV_FILE}.tmp"
    
    echo -e "${GREEN}✓ .env file updated${NC}\n"
else
    echo -e "${YELLOW}Creating $ENV_FILE from template...${NC}"
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example $ENV_FILE
        sed -i.tmp "s/^DB_NAME=.*/DB_NAME=$DB_NAME/" $ENV_FILE
        sed -i.tmp "s/^DB_USER=.*/DB_USER=$DB_USER/" $ENV_FILE
        sed -i.tmp "s/^DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" $ENV_FILE
        sed -i.tmp "s/^DB_HOST=.*/DB_HOST=localhost/" $ENV_FILE
        sed -i.tmp "s/^DB_PORT=.*/DB_PORT=5432/" $ENV_FILE
        rm -f "${ENV_FILE}.tmp"
        echo -e "${GREEN}✓ .env file created${NC}\n"
    else
        echo -e "${RED}✗ .env.example not found${NC}"
    fi
fi

# Run Django migrations
echo -e "${YELLOW}Setting up Django...${NC}"
cd backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install/upgrade psycopg2-binary
echo "Installing PostgreSQL driver..."
pip install -q psycopg2-binary

# Run migrations
echo "Running Django migrations..."
python manage.py makemigrations
python manage.py migrate

echo -e "${GREEN}✓ Django setup complete${NC}\n"

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 PostgreSQL Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Database Configuration:"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  Host: localhost"
echo "  Port: 5432"
echo ""
echo "Connection String:"
echo "  postgresql://$DB_USER:****@localhost:5432/$DB_NAME"
echo ""
echo "Next Steps:"
echo "  1. Create a Django superuser:"
echo "     cd backend && source venv/bin/activate"
echo "     python manage.py createsuperuser"
echo ""
echo "  2. Start the development server:"
echo "     python manage.py runserver"
echo ""
echo "  3. Access Django admin:"
echo "     http://localhost:8000/admin"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
