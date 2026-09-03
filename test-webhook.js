const fetch = require('node-fetch'); // or global fetch if node 18+

async function testWebhook() {
  const url = 'http://localhost:3000/api/integrations/task-pro/notifications';
  // Note: the secret in .env has quotes, let's remove them for the test if they exist.
  const secret = 'AspireTaskLeadSync_2026_X9m4K7p2';
  
  const payload = {
    "event": "TASK_ASSIGNED",
    "source": "ASPIRE_TASK_PRO",
    "task_id": "test-task-123",
    "employee_id": "EMP-1005",
    "task_title": "Test Webhook",
    "task_description": "Testing from script",
    "assigned_by": "System",
    "status": "PENDING",
    "due_date": new Date().toISOString(),
    "timestamp": new Date().toISOString()
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-task-sync-secret': secret
      },
      body: JSON.stringify(payload)
    });
    
    console.log('HTTP status:', res.status);
    const body = await res.text();
    console.log('Response body:', body);
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

testWebhook();
