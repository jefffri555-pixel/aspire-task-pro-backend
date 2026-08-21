require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'aspire_task_pro',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function runUpdate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Creating attendance_breaks table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance_breaks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        attendance_id UUID REFERENCES attendance(id) ON DELETE CASCADE,
        break_type VARCHAR(50) NOT NULL,
        start_time TIMESTAMP WITH TIME ZONE NOT NULL,
        end_time TIMESTAMP WITH TIME ZONE,
        duration_minutes INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query('COMMIT');
    console.log('Update v14 completed successfully.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error during update v14:', e);
  } finally {
    client.release();
    pool.end();
  }
}

runUpdate();
