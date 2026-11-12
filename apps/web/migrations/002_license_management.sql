-- HyperNexus License & Account Management Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    password_hash VARCHAR(255),
    oauth_provider VARCHAR(50),  -- 'github', 'google', 'microsoft'
    oauth_id VARCHAR(255),
    api_key VARCHAR(64) UNIQUE,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Licenses table
CREATE TABLE IF NOT EXISTS licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users (id) ON DELETE CASCADE,
    license_key VARCHAR(64) UNIQUE NOT NULL,
    -- 'trial', 'personal', 'team', 'enterprise'
    license_type VARCHAR(50) NOT NULL,
    -- 'active', 'expired', 'revoked', 'suspended'
    status VARCHAR(20) DEFAULT 'active',
    max_seats INTEGER DEFAULT 1,
    used_seats INTEGER DEFAULT 0,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users (id) ON DELETE CASCADE,
    license_id UUID REFERENCES licenses (id) ON DELETE CASCADE,
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    plan_id VARCHAR(50) NOT NULL,  -- 'personal', 'team', 'enterprise'
    -- 'active', 'canceled', 'past_due', 'trialing'
    status VARCHAR(20) DEFAULT 'active',
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Devices table (for license activation)
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users (id) ON DELETE CASCADE,
    license_id UUID REFERENCES licenses (id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL,
    device_name VARCHAR(255),
    device_type VARCHAR(50),  -- 'windows', 'macos', 'linux'
    last_seen_at TIMESTAMP DEFAULT now(),
    created_at TIMESTAMP DEFAULT now(),
    UNIQUE (license_id, device_id)
);

-- Memory sync table
CREATE TABLE IF NOT EXISTS memory_sync (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users (id) ON DELETE CASCADE,
    memory_key VARCHAR(255) NOT NULL,
    memory_value TEXT,
    encrypted BOOLEAN DEFAULT FALSE,
    synced_at TIMESTAMP DEFAULT now(),
    created_at TIMESTAMP DEFAULT now(),
    UNIQUE (user_id, memory_key)
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users (id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(255),
    metadata JSONB,
    ip_address INET,
    created_at TIMESTAMP DEFAULT now()
);

-- Indexes
CREATE INDEX idx_licenses_user_id ON licenses (user_id);
CREATE INDEX idx_licenses_license_key ON licenses (license_key);
CREATE INDEX idx_subscriptions_user_id ON subscriptions (user_id);
CREATE INDEX idx_subscriptions_stripe_id ON subscriptions (
    stripe_subscription_id
);
CREATE INDEX idx_devices_user_id ON devices (user_id);
CREATE INDEX idx_devices_license_id ON devices (license_id);
CREATE INDEX idx_memory_sync_user_id ON memory_sync (user_id);
CREATE INDEX idx_audit_log_user_id ON audit_log (user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log (created_at);
