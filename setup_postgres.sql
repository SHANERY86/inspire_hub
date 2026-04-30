-- PostgreSQL Setup Script for Inspire Hub
-- Run this script as the postgres superuser

-- Create the user (if it doesn't exist)
-- Replace 'your_password_here' with your desired password
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'sryan') THEN
        CREATE USER sryan WITH PASSWORD 'your_password_here';
    ELSE
        -- User exists, update password
        ALTER USER sryan WITH PASSWORD 'your_password_here';
    END IF;
END
$$;

-- Create the database (if it doesn't exist)
-- This will fail if database already exists, which is fine
SELECT 'CREATE DATABASE inspire_hub OWNER sryan'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'inspire_hub')\gexec

-- Grant all privileges on the database
GRANT ALL PRIVILEGES ON DATABASE inspire_hub TO sryan;

-- Connect to the inspire_hub database to grant schema privileges
\c inspire_hub

-- Grant privileges on the public schema
GRANT ALL ON SCHEMA public TO sryan;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO sryan;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO sryan;



