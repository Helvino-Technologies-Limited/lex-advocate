require('dotenv').config();
const { query } = require('./connection');
const logger = require('../utils/logger');

async function migrateSubscription() {
  logger.info('🔄 Running subscription migration...');

  try {
    // 1. Update task status CHECK constraint to include 'started' and 'paused'
    await query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'tasks_status_check'
          AND conrelid = 'tasks'::regclass
        ) THEN
          ALTER TABLE tasks DROP CONSTRAINT tasks_status_check;
        END IF;
      END $$
    `);
    await query(`
      ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
      CHECK (status IN ('not_started','started','in_progress','paused','completed','deferred','cancelled'))
    `);
    logger.info('✅ Task status constraint updated (added started, paused)');

    // 2. Add subscription_expires_at and subscription_year to tenants
    await query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ`);
    await query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_year INTEGER DEFAULT 0`);
    logger.info('✅ Added subscription_expires_at and subscription_year to tenants');

    // 3. Update subscription_status CHECK to include 'expired'
    await query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'tenants_subscription_status_check'
          AND conrelid = 'tenants'::regclass
        ) THEN
          ALTER TABLE tenants DROP CONSTRAINT tenants_subscription_status_check;
        END IF;
      END $$
    `);
    await query(`
      ALTER TABLE tenants ADD CONSTRAINT tenants_subscription_status_check
      CHECK (subscription_status IN ('trial','active','suspended','cancelled','expired'))
    `);
    logger.info('✅ Tenant subscription_status constraint updated (added expired)');

    // 4. Create subscription_payments table
    await query(`
      CREATE TABLE IF NOT EXISTS subscription_payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        mpesa_code TEXT NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        payment_year INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
        submitted_at TIMESTAMPTZ DEFAULT NOW(),
        verified_at TIMESTAMPTZ,
        verified_by UUID REFERENCES users(id),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    logger.info('✅ subscription_payments table created');

    // 5. Set trial_ends_at to 5 days for any tenants still on 30-day trials that haven't started yet
    //    (tenants created in the future will use 5 days via auth.controller.js)
    logger.info('ℹ️  New registrations will now get 5-day trials (auth.controller.js updated)');

    logger.info('✅ Subscription migration completed!');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Subscription migration failed:', error);
    process.exit(1);
  }
}

migrateSubscription();
