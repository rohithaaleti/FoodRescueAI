-- Migration: 001_add_ngo_matching_foundation.sql
-- Description: Smart NGO Matching Phase 1 - Database/Schema Foundation
-- Target Database: MySQL 8.0+

-- ============================================================
-- 1. Create ngo_profiles Table
-- ============================================================
CREATE TABLE IF NOT EXISTS ngo_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    latitude DECIMAL(10, 7) NULL,
    longitude DECIMAL(10, 7) NULL,
    max_capacity INT NOT NULL DEFAULT 100,
    supported_food_types VARCHAR(255) NOT NULL DEFAULT 'Veg,Non-Veg,Vegan,Other',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    max_active_donations INT NOT NULL DEFAULT 3,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ngo_profiles_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_ngo_latitude CHECK (latitude IS NULL OR (latitude >= -90.0000000 AND latitude <= 90.0000000)),
    CONSTRAINT chk_ngo_longitude CHECK (longitude IS NULL OR (longitude >= -180.0000000 AND longitude <= 180.0000000)),
    CONSTRAINT chk_ngo_max_capacity CHECK (max_capacity > 0),
    CONSTRAINT chk_ngo_max_active_donations CHECK (max_active_donations > 0)
);

-- ============================================================
-- 2. Extend food_items Table with Pickup Coordinates
-- ============================================================
ALTER TABLE food_items
    ADD COLUMN pickup_latitude DECIMAL(10, 7) NULL,
    ADD COLUMN pickup_longitude DECIMAL(10, 7) NULL,
    ADD CONSTRAINT chk_food_pickup_latitude CHECK (pickup_latitude IS NULL OR (pickup_latitude >= -90.0000000 AND pickup_latitude <= 90.0000000)),
    ADD CONSTRAINT chk_food_pickup_longitude CHECK (pickup_longitude IS NULL OR (pickup_longitude >= -180.0000000 AND pickup_longitude <= 180.0000000));
