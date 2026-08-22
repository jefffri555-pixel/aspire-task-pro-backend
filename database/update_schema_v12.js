require('dotenv').config();
const { Pool } = require('pg');

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_DATABASE || 'aspire_task_pro',
      password: process.env.DB_PASSWORD || 'postgres',
      port: parseInt(process.env.DB_PORT || '5432'),
      ssl:
        process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false,
    });

async function runUpdate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Altering leave_requests table...');
    await client.query(`
      ALTER TABLE leave_requests
      ADD COLUMN IF NOT EXISTS duration_type VARCHAR(20) DEFAULT 'full_day',
      ADD COLUMN IF NOT EXISTS attachment_url VARCHAR(255),
      ADD COLUMN IF NOT EXISTS location VARCHAR(255),
      ADD COLUMN IF NOT EXISTS purpose VARCHAR(255),
      ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);
    `);

    console.log('Creating leave_request_audits table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS leave_request_audits (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        leave_request_id UUID REFERENCES leave_requests(id) ON DELETE CASCADE,
        reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(20) NOT NULL,
        remarks TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query('COMMIT');
    console.log('Update v12 completed successfully.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error during update v12:', e);
  } finally {
    client.release();
    pool.end();
  }
}

runUpdate();
