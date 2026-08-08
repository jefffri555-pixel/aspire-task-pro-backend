const db = require('./config/database');

async function updateEnum() {
  try {
    await db.query(`ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'in_review'`);
    console.log('Enum updated successfully');
  } catch (error) {
    console.error('Error updating enum:', error.message);
    if (error.message.includes('does not exist')) {
       console.log('task_status type does not exist, assuming VARCHAR');
    }
  } finally {
    process.exit(0);
  }
}

updateEnum();
