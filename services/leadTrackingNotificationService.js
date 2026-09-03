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
    let secret = process.env.TASK_SYNC_SECRET;
    if (secret && secret.startsWith('"') && secret.endsWith('"')) {
      secret = secret.slice(1, -1);
    }

    if (!webhookUrl || !secret) {
      console.warn('Lead tracking webhook configuration is missing. Skipping notification.');
      return;
    }

    console.log('[TaskSync] Task assigned');
    console.log(`[TaskSync] task_id: ${task.task_id || task.id}`);

    // Fetch the assigned user's employee_id
    const targetUserId = task.assigned_to;
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

    console.log(`[TaskSync] employee_id: ${employeeId || 'UNKNOWN'}`);
    console.log('[TaskSync] sending webhook...');

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
    }).then(async response => {
      console.log(`[TaskSync] response status: ${response.status}`);
      if (!response.ok) {
        const text = await response.text();
        console.log(`[TaskSync] failure reason: ${response.statusText} ${text}`);
        console.error(`Lead Tracking Webhook Error: ${response.status} ${response.statusText}`);
      } else {
        console.log(`[TaskSync] success reason: Webhook accepted`);
        console.log(`Lead Tracking Webhook sent successfully for event: ${event}, task: ${payload.task_id}`);
      }
    }).catch(err => {
      console.log(`[TaskSync] failure reason: ${err.message}`);
      console.error(`Lead Tracking Webhook Network Error:`, err.message);
    });

  } catch (error) {
    console.error('Error preparing Lead Tracking webhook payload:', error);
  }
};

module.exports = {
  notifyLeadTrackingSystem
};
