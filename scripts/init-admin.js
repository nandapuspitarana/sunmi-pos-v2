/**
 * Admin initialization script
 * Creates admin user based on environment variables
 */
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

// Create a PostgreSQL connection pool
const pool = new pg.Pool({
  // In Docker environment, use postgres as host (service name)
  host: process.env.NODE_ENV === 'production' ? 'postgres' : (process.env.DB_HOST || 'localhost'),
  // In Docker, PostgreSQL runs on standard port 5432
  port: parseInt(process.env.NODE_ENV === 'production' ? '5432' : (process.env.DB_PORT || '5432')),
  database: process.env.DB_NAME || 'sunmi_pos',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function initializeAdmin() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Initializing admin user from environment variables...');
    
    // Get admin credentials from environment variables
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@pos.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminName = process.env.ADMIN_NAME || 'System Administrator';
    
    // Check if admin already exists
    const existingAdmin = await client.query(
      'SELECT id FROM admins WHERE email = $1',
      [adminEmail]
    );
    
    if (existingAdmin.rows.length > 0) {
      console.log(`⚠️ Admin with email ${adminEmail} already exists. Updating password...`);
      
      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
      const passwordHash = await bcrypt.hash(adminPassword, saltRounds);
      
      // Update admin password
      await client.query(
        'UPDATE admins SET password_hash = $1 WHERE email = $2',
        [passwordHash, adminEmail]
      );
      
      console.log('✅ Admin password updated successfully!');
    } else {
      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
      const passwordHash = await bcrypt.hash(adminPassword, saltRounds);
      
      // Insert new admin
      await client.query(
        'INSERT INTO admins (email, password_hash, name) VALUES ($1, $2, $3)',
        [adminEmail, passwordHash, adminName]
      );
      
      console.log(`✅ Admin user created with email: ${adminEmail}`);
    }
    
  } catch (error) {
    console.error('❌ Admin initialization failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run initialization if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeAdmin()
    .then(() => {
      console.log('🎉 Admin initialization completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Initialization failed:', error);
      process.exit(1);
    });
}

export default initializeAdmin;