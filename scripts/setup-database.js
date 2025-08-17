/**
 * Database setup script
 * Run this script to create database schema and initial data
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import pool from '../api/config/database.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Setting up database schema...');
    
    // Read and execute migration file
    const migrationPath = path.join(__dirname, '../migrations/001_initial_schema.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    // Split SQL commands by semicolon and execute each one
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    for (const command of commands) {
      if (command.trim()) {
        try {
          await client.query(command);
          console.log('✅ Executed:', command.substring(0, 50) + '...');
        } catch (error) {
          // Skip errors for existing objects
          if (error.code === '42P07' || error.code === '42710' || error.code === '23505') {
            console.log('⚠️  Skipped (already exists):', command.substring(0, 50) + '...');
          } else {
            console.error('❌ Error executing:', command.substring(0, 50) + '...');
            console.error('Error:', error.message);
          }
        }
      }
    }
    
    console.log('✅ Database setup completed successfully!');
    
    // Test database connection
    const testResult = await client.query('SELECT COUNT(*) FROM admins');
    console.log(`📊 Admin users in database: ${testResult.rows[0].count}`);
    
    const productResult = await client.query('SELECT COUNT(*) FROM products');
    console.log(`📦 Products in database: ${productResult.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupDatabase()
    .then(() => {
      console.log('🎉 Database setup completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Setup failed:', error);
      process.exit(1);
    });
}

export default setupDatabase;