require('dotenv').config();
const { query } = require('./connection');
const logger = require('../utils/logger');

async function migrate() {
  logger.info('🔄 Starting database migration...');

  try {
    // Enable UUID extension
    await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);

    // ===================== TENANTS =====================
    await query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        address TEXT,
        city VARCHAR(100),
        country VARCHAR(100) DEFAULT 'Kenya',
        logo_url TEXT,
        website VARCHAR(255),
        subscription_plan VARCHAR(50) DEFAULT 'free' CHECK (subscription_plan IN ('free','starter','professional','enterprise')),
        subscription_status VARCHAR(50) DEFAULT 'active' CHECK (subscription_status IN ('active','suspended','cancelled','trial')),
        trial_ends_at TIMESTAMPTZ,
        max_users INTEGER DEFAULT 5,
        max_cases INTEGER DEFAULT 50,
        max_storage_gb DECIMAL(10,2) DEFAULT 5.0,
        custom_domain VARCHAR(255),
        branding JSONB DEFAULT '{}',
        settings JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ===================== USERS =====================
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        phone VARCHAR(50),
        role VARCHAR(50) NOT NULL DEFAULT 'advocate' CHECK (role IN ('super_admin','admin','advocate','paralegal','accountant','client')),
        specialization VARCHAR(255),
        bar_number VARCHAR(100),
        avatar_url TEXT,
        bio TEXT,
        is_active BOOLEAN DEFAULT true,
        is_verified BOOLEAN DEFAULT false,
        two_factor_enabled BOOLEAN DEFAULT false,
        two_factor_secret VARCHAR(255),
        last_login TIMESTAMPTZ,
        password_reset_token VARCHAR(255),
        password_reset_expires TIMESTAMPTZ,
        email_verify_token VARCHAR(255),
        refresh_token TEXT,
        notification_preferences JSONB DEFAULT '{"email":true,"sms":false,"push":true}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(tenant_id, email)
      )
    `);

    // ===================== AUDIT LOGS =====================
    await query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(100),
        resource_id UUID,
        old_values JSONB,
        new_values JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ===================== CLIENTS =====================
    await query(`
      CREATE TABLE IF NOT EXISTS clients (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        client_type VARCHAR(20) DEFAULT 'individual' CHECK (client_type IN ('individual','organization')),
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        organization_name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        secondary_phone VARCHAR(50),
        id_number VARCHAR(100),
        kra_pin VARCHAR(50),
        address TEXT,
        city VARCHAR(100),
        county VARCHAR(100),
        country VARCHAR(100) DEFAULT 'Kenya',
        date_of_birth DATE,
        gender VARCHAR(20),
        occupation VARCHAR(255),
        notes TEXT,
        tags TEXT[],
        status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active','inactive','blacklisted')),
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ===================== CASES =====================
    await query(`
      CREATE TABLE IF NOT EXISTS cases (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        case_number VARCHAR(100),
        title VARCHAR(500) NOT NULL,
        description TEXT,
        case_type VARCHAR(100),
        court_name VARCHAR(255),
        court_station VARCHAR(255),
        jurisdiction VARCHAR(255),
        judge_name VARCHAR(255),
        opposing_party VARCHAR(255),
        opposing_counsel VARCHAR(255),
        opposing_counsel_contacts VARCHAR(255),
        client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
        lead_advocate_id UUID REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new','active','pending','on_hold','closed','won','lost','settled')),
        priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
        tags TEXT[],
        date_filed DATE,
        next_hearing_date TIMESTAMPTZ,
        closed_date DATE,
        estimated_value DECIMAL(15,2),
        billing_type VARCHAR(50) DEFAULT 'hourly' CHECK (billing_type IN ('hourly','fixed','retainer','contingency','pro_bono')),
        hourly_rate DECIMAL(10,2),
        fixed_fee DECIMAL(15,2),
        retainer_amount DECIMAL(15,2),
        is_pro_bono BOOLEAN DEFAULT false,
        metadata JSONB DEFAULT '{}',
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ===================== CASE ASSIGNMENTS =====================
    await query(`
      CREATE TABLE IF NOT EXISTS case_assignments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'advocate',
        assigned_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(case_id, user_id)
      )
    `);

    // ===================== CASE NOTES =====================
    await query(`
      CREATE TABLE IF NOT EXISTS case_notes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        author_id UUID REFERENCES users(id) ON DELETE SET NULL,
        content TEXT NOT NULL,
        is_private BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ===================== CASE MILESTONES =====================
    await query(`
      CREATE TABLE IF NOT EXISTS case_milestones (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        milestone_date DATE,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending','completed','missed')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ===================== HEARINGS =====================
    await query(`
      CREATE TABLE IF NOT EXISTS hearings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        hearing_date TIMESTAMPTZ NOT NULL,
        hearing_type VARCHAR(100),
        venue VARCHAR(255),
        judge_name VARCHAR(255),
        notes TEXT,
        outcome TEXT,
        next_hearing_date TIMESTAMPTZ,
        status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','adjourned','cancelled')),
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ===================== TASKS =====================
    await query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
        client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        category VARCHAR(100) DEFAULT 'general' CHECK (category IN ('court_appearance','document_drafting','client_follow_up','research','filing','billing','meeting','other','general')),
        status VARCHAR(50) DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed','deferred','cancelled')),
        priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
        assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
        assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
        due_date TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        reminder_at TIMESTAMPTZ,
        tags TEXT[],
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ===================== DOCUMENTS =====================
    await query(`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
        client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        file_name VARCHAR(255) NOT NULL,
        file_path TEXT NOT NULL,
        file_size BIGINT,
        file_type VARCHAR(100),
        mime_type VARCHAR(100),
        category VARCHAR(100) DEFAULT 'general' CHECK (category IN ('pleading','evidence','contract','court_order','correspondence','invoice','general','other')),
        version INTEGER DEFAULT 1,
        parent_id UUID REFERENCES documents(id) ON DELETE SET NULL,
        is_shared BOOLEAN DEFAULT false,
        shared_with UUID[],
        tags TEXT[],
        uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ===================== INVOICES =====================
    await query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        invoice_number VARCHAR(100) NOT NULL,
        client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
        case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
        invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
        due_date DATE,
        status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','partially_paid','overdue','cancelled','void')),
        billing_type VARCHAR(50) DEFAULT 'fixed' CHECK (billing_type IN ('hourly','fixed','retainer','mixed')),
        subtotal DECIMAL(15,2) DEFAULT 0,
        tax_rate DECIMAL(5,2) DEFAULT 0,
        tax_amount DECIMAL(15,2) DEFAULT 0,
        discount_amount DECIMAL(15,2) DEFAULT 0,
        total_amount DECIMAL(15,2) DEFAULT 0,
        amount_paid DECIMAL(15,2) DEFAULT 0,
        balance_due DECIMAL(15,2) DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'KES',
        notes TEXT,
        terms TEXT,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ===================== INVOICE ITEMS =====================
    await query(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        quantity DECIMAL(10,2) DEFAULT 1,
        unit_price DECIMAL(15,2) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        item_date DATE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ===================== PAYMENTS =====================
    await query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
        client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
        amount DECIMAL(15,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'KES',
        payment_method VARCHAR(50) CHECK (payment_method IN ('mpesa','bank_transfer','cash','cheque','stripe','paypal','other')),
        transaction_id VARCHAR(255),
        mpesa_code VARCHAR(100),
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
        payment_date TIMESTAMPTZ DEFAULT NOW(),
        notes TEXT,
        received_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ===================== EXPENSES =====================
    await query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
        client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
        category VARCHAR(100) CHECK (category IN ('court_fees','travel','filing','research','printing','accommodation','meals','other')),
        description TEXT NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'KES',
        expense_date DATE DEFAULT CURRENT_DATE,
        receipt_url TEXT,
        is_billable BOOLEAN DEFAULT true,
        is_billed BOOLEAN DEFAULT false,
        recorded_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ===================== NOTIFICATIONS =====================
    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info','warning','error','success','reminder','alert')),
        category VARCHAR(50) CHECK (category IN ('case','task','billing','court_date','document','system')),
        resource_type VARCHAR(100),
        resource_id UUID,
        is_read BOOLEAN DEFAULT false,
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ===================== MESSAGES (Internal Chat) =====================
    await query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
        case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
        content TEXT NOT NULL,
        message_type VARCHAR(50) DEFAULT 'direct' CHECK (message_type IN ('direct','case_thread','announcement')),
        is_read BOOLEAN DEFAULT false,
        read_at TIMESTAMPTZ,
        attachments JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ===================== TIME ENTRIES =====================
    await query(`
      CREATE TABLE IF NOT EXISTS time_entries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        hours DECIMAL(6,2) NOT NULL,
        hourly_rate DECIMAL(10,2),
        amount DECIMAL(15,2),
        entry_date DATE DEFAULT CURRENT_DATE,
        is_billable BOOLEAN DEFAULT true,
        is_billed BOOLEAN DEFAULT false,
        invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ===================== SUBSCRIPTIONS =====================
    await query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID UNIQUE NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        plan VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        price_monthly DECIMAL(10,2),
        billing_cycle VARCHAR(20) DEFAULT 'monthly',
        started_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ,
        stripe_customer_id VARCHAR(255),
        stripe_subscription_id VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ===================== INDEXES =====================
    await query(`CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_clients_tenant ON clients(tenant_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_cases_tenant ON cases(tenant_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_cases_client ON cases(client_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_tasks_tenant ON tasks(tenant_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_documents_case ON documents(case_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_hearings_case ON hearings(case_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_hearings_date ON hearings(hearing_date)`);

    // ===================== UPDATED_AT TRIGGER =====================
    await query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    const tablesWithUpdatedAt = ['tenants', 'users', 'clients', 'cases', 'tasks', 'documents', 'invoices', 'subscriptions', 'case_notes'];
    for (const table of tablesWithUpdatedAt) {
      await query(`
        DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
        CREATE TRIGGER update_${table}_updated_at
        BEFORE UPDATE ON ${table}
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `);
    }

    logger.info('✅ Database migration completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
