-- Create database and user (run as postgres superuser)
-- CREATE DATABASE sunmi_pos_system;
-- CREATE USER pos_app WITH PASSWORD 'Sinau314';
-- GRANT ALL PRIVILEGES ON DATABASE sunmi_pos_system TO pos_app;

-- Connect to sunmi_pos_system database and run the following:

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for admins
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);

-- Create visitors table
CREATE TABLE IF NOT EXISTS visitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_data TEXT UNIQUE NOT NULL,
    qr_code TEXT UNIQUE NOT NULL,
    permissions JSONB DEFAULT '["gate_entry", "gate_exit"]',
    entry_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    exit_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'exited')),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for visitors
CREATE INDEX IF NOT EXISTS idx_visitors_qr_data ON visitors(qr_data);
CREATE INDEX IF NOT EXISTS idx_visitors_qr_code ON visitors(qr_code);
CREATE INDEX IF NOT EXISTS idx_visitors_entry_time ON visitors(entry_time DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_status ON visitors(status);
CREATE INDEX IF NOT EXISTS idx_visitors_active ON visitors(is_active);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    stock INTEGER DEFAULT 0,
    category VARCHAR(100) NOT NULL,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for products
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'approved', 'rejected')),
    payment_proof_url TEXT,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    validated_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_visitor ON orders(visitor_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL
);

-- Create indexes for order_items
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- Create gate_logs table
CREATE TABLE IF NOT EXISTS gate_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
    qr_data TEXT NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('entry', 'exit')),
    success BOOLEAN NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for gate_logs
CREATE INDEX IF NOT EXISTS idx_gate_logs_visitor ON gate_logs(visitor_id);
CREATE INDEX IF NOT EXISTS idx_gate_logs_qr_data ON gate_logs(qr_data);
CREATE INDEX IF NOT EXISTS idx_gate_logs_timestamp ON gate_logs(timestamp DESC);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin (password: admin123)
-- Password hash for 'admin123' using bcrypt with salt rounds 10
INSERT INTO admins (email, password_hash, name) VALUES 
('admin@pos.com', '$2b$10$aYS84ZeaMAxEHTY6Al3BR.Bck3iu5efQH7hIYczErsiNhpiiHWW5m', 'System Administrator')
ON CONFLICT (email) DO NOTHING;

-- Grant permissions to pos_app user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO pos_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO pos_app;
GRANT USAGE ON SCHEMA public TO pos_app;

-- Insert sample products
INSERT INTO products (name, price, stock, category, image_url) VALUES 
('Kopi Americano', 25000.00, 50, 'Beverages', '/images/americano.jpg'),
('Nasi Goreng Spesial', 35000.00, 30, 'Food', '/images/nasi-goreng.jpg'),
('Sandwich Club', 28000.00, 25, 'Food', '/images/sandwich.jpg'),
('Jus Jeruk Segar', 18000.00, 40, 'Beverages', '/images/orange-juice.jpg'),
('Pasta Carbonara', 42000.00, 20, 'Food', '/images/carbonara.jpg')
ON CONFLICT DO NOTHING;