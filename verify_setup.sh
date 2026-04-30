#!/bin/bash
# Verification script to check PostgreSQL setup

echo "Checking PostgreSQL setup..."
echo ""

# Check if user exists
echo "Checking if user 'sryan' exists..."
/Library/PostgreSQL/18/bin/psql -U postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='sryan';" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✓ User 'sryan' exists"
else
    echo "✗ User 'sryan' does not exist - you need to run setup_postgres.sql"
fi

# Check if database exists
echo ""
echo "Checking if database 'inspire_hub' exists..."
/Library/PostgreSQL/18/bin/psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='inspire_hub';" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✓ Database 'inspire_hub' exists"
else
    echo "✗ Database 'inspire_hub' does not exist - you need to run setup_postgres.sql"
fi

echo ""
echo "To set up, run: /Library/PostgreSQL/18/bin/psql -U postgres -f setup_postgres.sql"



