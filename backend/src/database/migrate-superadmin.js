require('dotenv').config();
const { query } = require('./connection');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

async function migrateSuperadmin() {
  logger.info('🔄 Running superadmin migration...');

  try {
    // 1. Allow tenant_id to be NULL (superadmin has no tenant)
    await query(`ALTER TABLE users ALTER COLUMN tenant_id DROP NOT NULL`);
    logger.info('✅ Allowed NULL tenant_id');

    // 2. Drop the composite UNIQUE(tenant_id, email) constraint and replace with
    //    a partial unique index so NULL tenant rows are handled correctly
    await query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'users_tenant_id_email_key'
          AND conrelid = 'users'::regclass
        ) THEN
          ALTER TABLE users DROP CONSTRAINT users_tenant_id_email_key;
        END IF;
      END $$
    `);

    // Unique email per tenant (tenant users)
    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_tenant_email
      ON users(tenant_id, email)
      WHERE tenant_id IS NOT NULL
    `);

    // Unique email for superadmins (no tenant)
    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_superadmin_email
      ON users(email)
      WHERE tenant_id IS NULL
    `);
    logger.info('✅ Recreated unique indexes');

    // 3. Add admin_set_password column to store last admin-assigned password
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_set_password TEXT`);
    logger.info('✅ Added admin_set_password column');

    // 4. Create / update the superadmin account
    const email = 'helvinotechltd@gmail.com';
    const password = 'Mycat@95';
    const passwordHash = await bcrypt.hash(password, 12);

    const existing = await query(
      `SELECT id FROM users WHERE email = $1 AND tenant_id IS NULL`,
      [email]
    );

    if (!existing.rows.length) {
      await query(
        `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, is_active, is_verified)
         VALUES (NULL, $1, $2, 'Helvino', 'Technologies', 'super_admin', true, true)`,
        [email, passwordHash]
      );
      logger.info('✅ Superadmin account created:', email);
    } else {
      await query(
        `UPDATE users SET password_hash = $1, role = 'super_admin', is_active = true
         WHERE email = $2 AND tenant_id IS NULL`,
        [passwordHash, email]
      );
      logger.info('✅ Superadmin account updated:', email);
    }

    logger.info('✅ Superadmin migration completed!');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Superadmin migration failed:', error);
    process.exit(1);
  }
}

migrateSuperadmin();
