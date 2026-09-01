const db = require('../config/database');

/**
 * Sends a webhook notification to the Lead Tracking System.
 * 
 * @param {string} event - The event type (e.g., TASK_ASSIGNED, TASK_UPDATED)
 * @param {Object} task - The task object from the database
 */
const notifyLeadTrackingSystem = async (event, task) => {
  try {
    const webhookUrl = process.env.LEAD_TRACKING_WEBHOOK_URL;
    const secret = process.env.TASK_SYNC_SECRET;

    if (!webhookUrl || !secret) {
      console.warn('Lead tracking webhook configuration is missing. Skipping notification.');
      return;
    }

    // Default to the assigned user, fallback to assigner if not assigned
    const targetUserId = task.assigned_to || task.assigned_by;
    
    let employeeId = null;
    let assignedByName = 'System';

    if (targetUserId) {
      const userRes = await db.query('SELECT employee_id FROM users WHERE id = $1', [targetUserId]);
      if (userRes.rows.length > 0) {
        employeeId = userRes.rows[0].employee_id;
      }
    }

    if (task.assigned_by) {
      const assignerRes = await db.query('SELECT name FROM users WHERE id = $1', [task.assigned_by]);
      if (assignerRes.rows.length > 0) {
        assignedByName = assignerRes.rows[0].name;
      }
    }

    const payload = {
      event: event,
      source: "ASPIRE_TASK_PRO",
      task_id: task.task_id || task.id, // Fallback to uuid if task_id not present
      employee_id: employeeId || 'UNKNOWN',
      task_title: task.title,
      task_description: task.description || '',
      assigned_by: task.assigned_by_name || assignedByName,
      status: (task.status || 'PENDING').toUpperCase(),
      due_date: task.due_date,
      timestamp: new Date().toISOString()
    };

    // Use native fetch (Node 18+)
    fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-task-sync-secret': secret
      },
      body: JSON.stringify(payload)
    }).then(response => {
      if (!response.ok) {
        console.error(`Lead Tracking Webhook Error: ${response.status} ${response.statusText}`);
      } else {
        console.log(`Lead Tracking Webhook sent successfully for event: ${event}, task: ${payload.task_id}`);
      }
    }).catch(err => {
      console.error(`Lead Tracking Webhook Network Error:`, err.message);
    });

  } catch (error) {
    console.error('Error preparing Lead Tracking webhook payload:', error);
  }
};

module.exports = {
  notifyLeadTrackingSystem
};
