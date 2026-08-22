const { Client } = require('pg');
require('dotenv').config();

async function runMigration() {
  const client = process.env.DATABASE_URL
    ? new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      })
    : new Client({
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

  try {
    await client.connect();
    console.log('Connected to PostgreSQL Database.');

    const sql = `
      CREATE TABLE IF NOT EXISTS regularization_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        attendance_id UUID REFERENCES attendance(id) ON DELETE SET NULL,
        date DATE NOT NULL,
        correction_type VARCHAR(255) NOT NULL,
        current_value VARCHAR(255),
        requested_value VARCHAR(255) NOT NULL,
        reason TEXT,
        attachment_url VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMP WITH TIME ZONE,
        remarks TEXT
      );
    `;

    console.log('Executing migration...');
    await client.query(sql);
    console.log('Migration update_schema_v15 completed successfully.');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

runMigration();
