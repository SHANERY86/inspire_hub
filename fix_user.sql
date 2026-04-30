-- Quick fix script to ensure user and database are set up correctly
-- Run this as: /Library/PostgreSQL/18/bin/psql -U postgres -f fix_user.sql

-- Drop and recreate user to ensure clean state
DROP USER IF EXISTS sryan;
CREATE USER sryan WITH PASSWORD 'sAmsung86';

-- Drop and recreate database
DROP DATABASE IF EXISTS inspire_hub;
CREATE DATABASE inspire_hub OWNER sryan;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE inspire_hub TO sryan;

-- Connect to the database and grant schema privileges
\c inspire_hub
GRANT ALL ON SCHEMA public TO sryan;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO sryan;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO sryan;

\q



