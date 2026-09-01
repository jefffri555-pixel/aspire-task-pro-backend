const cron = require('node-cron');
const db = require('../config/database');
const { notifyLeadTrackingSystem } = require('../services/leadTrackingNotificationService');

const initTaskCron = () => {
  // Run daily at midnight to check for overdue tasks
  cron.schedule('0 0 * * *', async () => {
    console.log('Running daily task overdue check...');
    try {
      if (db.isConnectionFailed && db.isConnectionFailed()) {
        console.log('DB offline, skipping task cron.');
        return;
      }

      // Find tasks that are not completed/rejected and are past their due date
      const overdueRes = await db.query(`
        SELECT t.*, 
               creator.name AS assigned_by_name, 
               assignee.name AS assigned_to_name
        FROM tasks t
        LEFT JOIN users creator ON t.assigned_by = creator.id
        LEFT JOIN users assignee ON t.assigned_to = assignee.id
        WHERE t.status NOT IN ('completed', 'rejected', 'overdue') 
          AND t.due_date < CURRENT_TIMESTAMP
      `);

      for (const task of overdueRes.rows) {
        // Update task status to overdue
        await db.query(`UPDATE tasks SET status = 'overdue', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [task.id]);
        
        // Log history
        await db.query(`
          INSERT INTO task_history (task_id, action, old_value, new_value)
          VALUES ($1, $2, $3, $4)
        `, [task.id, 'status_changed', task.status, 'overdue']);

        // Set the updated status for the webhook payload
        task.status = 'overdue';

        // Trigger Lead Tracking Webhook
        notifyLeadTrackingSystem('TASK_OVERDUE', task);
      }

      if (overdueRes.rows.length > 0) {
        console.log(`Nightly task cron completed. Marked ${overdueRes.rows.length} tasks as overdue.`);
      }
    } catch (err) {
      console.error('Error running daily task overdue cron:', err);
    }
  });
};

module.exports = { initTaskCron };
