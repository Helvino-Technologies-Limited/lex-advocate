require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query } = require('./connection');
const logger = require('../utils/logger');

async function seed() {
  logger.info('🌱 Starting database seeding...');
  try {
    // Create demo tenant
    const tenantResult = await query(`
      INSERT INTO tenants (name, slug, email, phone, address, city, subscription_plan, subscription_status, max_users, max_cases)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, ['Helvino Law Firm', 'helvino-law', 'helvinotechltd@gmail.com', '0703445756', 'Nairobi CBD, Kencom House', 'Nairobi', 'professional', 'active', 20, 500]);

    const tenantId = tenantResult.rows[0].id;
    logger.info(`Tenant created: ${tenantId}`);

    // Create super admin
    const hashedPassword = await bcrypt.hash('Admin@2024!', 12);
    await query(`
      INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, phone, role, is_active, is_verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (tenant_id, email) DO NOTHING
    `, [tenantId, 'admin@helvino.co.ke', hashedPassword, 'System', 'Administrator', '0703445756', 'admin', true, true]);

    // Create sample advocate
    const advocatePassword = await bcrypt.hash('Advocate@2024!', 12);
    await query(`
      INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, phone, role, specialization, bar_number, is_active, is_verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (tenant_id, email) DO NOTHING
    `, [tenantId, 'advocate@helvino.co.ke', advocatePassword, 'Jane', 'Mwangi', '0712345678', 'advocate', 'Corporate Law', 'LSK/2019/001234', true, true]);

    logger.info('✅ Seeding completed!');
    logger.info('📧 Admin login: admin@helvino.co.ke / Admin@2024!');
    logger.info('📧 Advocate login: advocate@helvino.co.ke / Advocate@2024!');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
