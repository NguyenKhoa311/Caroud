@echo off
REM PostgreSQL Quick Setup Script for Caro Game (Windows)
REM This script automates the PostgreSQL setup process on Windows

setlocal enabledelayedexpansion

echo.
echo =========================================
echo  Caro Game - PostgreSQL Setup (Windows)
echo =========================================
echo.

REM Check if PostgreSQL is installed
where psql >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] PostgreSQL is not installed.
    echo Please install PostgreSQL from: https://www.postgresql.org/download/windows/
    echo After installation, add PostgreSQL bin directory to PATH.
    pause
    exit /b 1
)

echo [OK] PostgreSQL is installed
echo.

REM Get database credentials
set DB_NAME=caro_game_db
set DB_USER=caro_user

set /p "DB_NAME=Enter database name [caro_game_db]: "
if "!DB_NAME!"=="" set DB_NAME=caro_game_db

set /p "DB_USER=Enter database user [caro_user]: "
if "!DB_USER!"=="" set DB_USER=caro_user

set /p "DB_PASSWORD=Enter database password: "
if "!DB_PASSWORD!"=="" (
    echo [ERROR] Password cannot be empty
    pause
    exit /b 1
)

echo.
echo Creating database and user...
echo.

REM Create a temporary SQL script
echo DO $$ > temp_setup.sql
echo BEGIN >> temp_setup.sql
echo     IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '%DB_USER%') THEN >> temp_setup.sql
echo         CREATE USER %DB_USER% WITH PASSWORD '%DB_PASSWORD%'; >> temp_setup.sql
echo     END IF; >> temp_setup.sql
echo END >> temp_setup.sql
echo $$; >> temp_setup.sql
echo. >> temp_setup.sql
echo SELECT 'CREATE DATABASE %DB_NAME% OWNER %DB_USER%' >> temp_setup.sql
echo WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '%DB_NAME%')\gexec >> temp_setup.sql
echo. >> temp_setup.sql
echo ALTER ROLE %DB_USER% SET client_encoding TO 'utf8'; >> temp_setup.sql
echo ALTER ROLE %DB_USER% SET default_transaction_isolation TO 'read committed'; >> temp_setup.sql
echo ALTER ROLE %DB_USER% SET timezone TO 'UTC'; >> temp_setup.sql
echo GRANT ALL PRIVILEGES ON DATABASE %DB_NAME% TO %DB_USER%; >> temp_setup.sql

REM Execute SQL script
psql -U postgres -f temp_setup.sql

REM Grant schema privileges
echo GRANT ALL ON SCHEMA public TO %DB_USER%; > temp_grant.sql
set PGPASSWORD=%DB_PASSWORD%
psql -U %DB_USER% -d %DB_NAME% -h localhost -f temp_grant.sql

REM Clean up temporary files
del temp_setup.sql
del temp_grant.sql

echo.
echo [OK] Database and user created successfully
echo.

REM Test connection
echo Testing database connection...
set PGPASSWORD=%DB_PASSWORD%
psql -U %DB_USER% -d %DB_NAME% -h localhost -c "SELECT 1;" >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Database connection successful
) else (
    echo [ERROR] Database connection failed
    pause
    exit /b 1
)
echo.

REM Update .env file
set ENV_FILE=backend\.env
if exist "%ENV_FILE%" (
    echo Updating %ENV_FILE%...
    copy "%ENV_FILE%" "%ENV_FILE%.backup" >nul
    
    REM Update using PowerShell
    powershell -Command "(Get-Content '%ENV_FILE%') -replace '^DB_NAME=.*', 'DB_NAME=%DB_NAME%' | Set-Content '%ENV_FILE%'"
    powershell -Command "(Get-Content '%ENV_FILE%') -replace '^DB_USER=.*', 'DB_USER=%DB_USER%' | Set-Content '%ENV_FILE%'"
    powershell -Command "(Get-Content '%ENV_FILE%') -replace '^DB_PASSWORD=.*', 'DB_PASSWORD=%DB_PASSWORD%' | Set-Content '%ENV_FILE%'"
    powershell -Command "(Get-Content '%ENV_FILE%') -replace '^DB_HOST=.*', 'DB_HOST=localhost' | Set-Content '%ENV_FILE%'"
    powershell -Command "(Get-Content '%ENV_FILE%') -replace '^DB_PORT=.*', 'DB_PORT=5432' | Set-Content '%ENV_FILE%'"
    
    echo [OK] .env file updated
) else (
    echo Creating %ENV_FILE% from template...
    if exist "backend\.env.example" (
        copy "backend\.env.example" "%ENV_FILE%" >nul
        powershell -Command "(Get-Content '%ENV_FILE%') -replace '^DB_NAME=.*', 'DB_NAME=%DB_NAME%' | Set-Content '%ENV_FILE%'"
        powershell -Command "(Get-Content '%ENV_FILE%') -replace '^DB_USER=.*', 'DB_USER=%DB_USER%' | Set-Content '%ENV_FILE%'"
        powershell -Command "(Get-Content '%ENV_FILE%') -replace '^DB_PASSWORD=.*', 'DB_PASSWORD=%DB_PASSWORD%' | Set-Content '%ENV_FILE%'"
        powershell -Command "(Get-Content '%ENV_FILE%') -replace '^DB_HOST=.*', 'DB_HOST=localhost' | Set-Content '%ENV_FILE%'"
        powershell -Command "(Get-Content '%ENV_FILE%') -replace '^DB_PORT=.*', 'DB_PORT=5432' | Set-Content '%ENV_FILE%'"
        echo [OK] .env file created
    ) else (
        echo [ERROR] .env.example not found
    )
)
echo.

REM Setup Django
echo Setting up Django...
cd backend

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install psycopg2-binary
echo Installing PostgreSQL driver...
pip install -q psycopg2-binary

REM Run migrations
echo Running Django migrations...
python manage.py makemigrations
python manage.py migrate

echo.
echo [OK] Django setup complete
echo.

REM Summary
echo ========================================
echo  Setup Complete!
echo ========================================
echo.
echo Database Configuration:
echo   Database: %DB_NAME%
echo   User: %DB_USER%
echo   Host: localhost
echo   Port: 5432
echo.
echo Connection String:
echo   postgresql://%DB_USER%:****@localhost:5432/%DB_NAME%
echo.
echo Next Steps:
echo   1. Create a Django superuser:
echo      cd backend
echo      venv\Scripts\activate.bat
echo      python manage.py createsuperuser
echo.
echo   2. Start the development server:
echo      python manage.py runserver
echo.
echo   3. Access Django admin:
echo      http://localhost:8000/admin
echo.
echo Happy coding!
echo.

pause
