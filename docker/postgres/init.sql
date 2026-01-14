-- docker/postgres/init.sql
-- Initialize CityPulse database with required extensions

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "h3";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE citypulse TO citypulse;
