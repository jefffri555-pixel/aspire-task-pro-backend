const cron = require('node-cron');
const db = require('../config/database');
const { sendPushNotification } = require('../utils/pushNotification');

const initAttendanceCron = () => {
  // Run at 23:59 (11:59 PM) every day
  cron.schedule('59 23 * * *', async () => {
    console.log('Running nightly attendance cron job...');
    try {
      if (db.isConnectionFailed && db.isConnectionFailed()) {
        console.log('DB offline, skipping cron.');
        return;
      }

      // Get all active staff/users
      const usersRes = await db.query("SELECT id FROM users WHERE status = 'active'");
      const users = usersRes.rows;

      let absentCount = 0;
      let leaveCount = 0;

      // Check for Holiday
      const holidayRes = await db.query('SELECT * FROM holidays WHERE date = CURRENT_DATE');
      const isHoliday = holidayRes.rows.length > 0;
      
      // Check for Weekly Off
      const settingsRes = await db.query('SELECT * FROM system_settings');
      const settings = {};
      settingsRes.rows.forEach(r => settings[r.key] = r.value);
      
      let isWeeklyOff = false;
      const todayDate = new Date();
      const dayName = todayDate.toLocaleDateString('en-US', { weekday: 'long' });
      try {
        const weeklyOffDays = JSON.parse(settings.weekly_off_days || '["Sunday"]');
        if (weeklyOffDays.includes(dayName)) {
          isWeeklyOff = true;
        }
        
        // Handle Saturday Rules if today is Saturday
        if (dayName === 'Saturday' && settings.saturday_off_rule) {
          const rule = settings.saturday_off_rule;
          const weekOfMonth = Math.ceil(todayDate.getDate() / 7);
          
          if (rule === 'Every Saturday Off') isWeeklyOff = true;
          else if (rule === '1st Saturday Off' && weekOfMonth === 1) isWeeklyOff = true;
          else if (rule === '2nd Saturday Off' && weekOfMonth === 2) isWeeklyOff = true;
          else if (rule === '3rd Saturday Off' && weekOfMonth === 3) isWeeklyOff = true;
          else if (rule === '4th Saturday Off' && weekOfMonth === 4) isWeeklyOff = true;
          else if (rule === 'Alternate Saturdays' && (weekOfMonth % 2 === 0)) isWeeklyOff = true; // Assume 2nd and 4th
          else isWeeklyOff = false; // Override if not matching rule
        }
      } catch(e) {
        console.error('Error parsing weekly off settings:', e);
      }

      for (const user of users) {
        // Check if attendance already marked for today
        const attRes = await db.query('SELECT id FROM attendance WHERE user_id = $1 AND date = CURRENT_DATE', [user.id]);
        
        if (attRes.rows.length === 0) {
          // Check if they have an approved leave for today
          const leaveRes = await db.query(`
            SELECT leave_type, reason FROM leave_requests 
            WHERE user_id = $1 AND status = 'approved' AND CURRENT_DATE >= start_date AND CURRENT_DATE <= end_date
          `, [user.id]);

          let status = 'Absent';
          let reason = 'Absent - No Punch In Recorded';

          if (leaveRes.rows.length > 0) {
            const leave = leaveRes.rows[0];
            status = leave.leave_type.toLowerCase() === 'wfh' ? 'Work From Home' : 
                     leave.leave_type.toLowerCase() === 'on_duty' ? 'On Duty' : 'Leave';
            reason = leave.reason || 'Approved ' + status;
            leaveCount++;
          } else if (isHoliday) {
            status = 'Holiday';
            reason = holidayRes.rows[0].name;
          } else if (isWeeklyOff) {
            status = 'Weekly Off';
            reason = 'Configured Weekly Off';
          } else {
            absentCount++;
          }

          await db.query(`
            INSERT INTO attendance (user_id, date, status, reason)
            VALUES ($1, CURRENT_DATE, $2, $3)
          `, [user.id, status, reason]);

          if (status === 'Absent') {
            try {
              await db.query(`
                INSERT INTO attendance_notifications_log (user_id, date, notification_type) 
                VALUES ($1, CURRENT_DATE, $2) ON CONFLICT DO NOTHING
              `, [user.id, 'ABSENT_NOTIFICATION']);
              sendPushNotification(user.id, 'Attendance Not Marked', 'Your attendance has been marked absent for today.');
            } catch (err) {
              console.error('Error sending absent notification:', err);
            }
          }
        }
      }

      console.log(`Nightly cron completed. Marked ${absentCount} as Absent, ${leaveCount} as Leave.`);
    } catch (err) {
      console.error('Error running nightly attendance cron:', err);
    }
  });

  // Dynamic Every 5 Minutes Cron
  cron.schedule('*/5 * * * *', async () => {
    if (db.isConnectionFailed && db.isConnectionFailed()) return;
    try {
      const { fetchAllSettings } = require('../controllers/attendanceController');
      const settings = await fetchAllSettings();
      
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMins = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${currentHours}:${currentMins}`;
      
      // 1. Punch In Reminder
      if (settings.enable_punch_in_reminder === 'true' && currentTime === (settings.punch_in_reminder_time || '09:40')) {
        console.log('Running Punch In Reminder...');
        const usersRes = await db.query("SELECT id FROM users WHERE status = 'active'");
        for (const user of usersRes.rows) {
          const attRes = await db.query('SELECT id FROM attendance WHERE user_id = $1 AND date = CURRENT_DATE', [user.id]);
          if (attRes.rows.length === 0) {
            const leaveRes = await db.query(`SELECT id FROM leave_requests WHERE user_id = $1 AND status = 'approved' AND CURRENT_DATE >= start_date AND CURRENT_DATE <= end_date`, [user.id]);
            if (leaveRes.rows.length === 0) {
              const logRes = await db.query(`INSERT INTO attendance_notifications_log (user_id, date, notification_type) VALUES ($1, CURRENT_DATE, $2) ON CONFLICT DO NOTHING RETURNING id`, [user.id, 'PUNCH_IN_REMINDER']);
              if (logRes.rowCount > 0) {
                sendPushNotification(user.id, 'Attendance Reminder', 'You have not punched in yet. Please mark your attendance.');
              }
            }
          }
        }
      }

      // 2. Punch Out Reminder
      if (settings.enable_punch_out_reminder === 'true' && currentTime === (settings.punch_out_reminder_time || '17:45')) {
        console.log('Running Punch Out Reminder...');
        const attRes = await db.query('SELECT user_id FROM attendance WHERE date = CURRENT_DATE AND check_out_time IS NULL');
        for (const row of attRes.rows) {
          const logRes = await db.query(`INSERT INTO attendance_notifications_log (user_id, date, notification_type) VALUES ($1, CURRENT_DATE, $2) ON CONFLICT DO NOTHING RETURNING id`, [row.user_id, 'PUNCH_OUT_REMINDER']);
          if (logRes.rowCount > 0) {
            sendPushNotification(row.user_id, 'Punch Out Reminder', 'Your shift is ending soon. Please remember to punch out.');
          }
        }
      }

      // 3. Missed Punch Out Reminder
      // Wait, is there a specific setting for missed punch out time? The requirement says "Enable Missed Punch Out Reminder", but didn't specify "Missed Punch Out Reminder Time". Let's assume shift end + 30 mins.
      const shiftEndStr = settings.shift_end || '18:30';
      const shiftEndParts = shiftEndStr.split(':');
      let missedTime = new Date();
      missedTime.setHours(parseInt(shiftEndParts[0]), parseInt(shiftEndParts[1] || '0') + 30, 0, 0);
      const missedHours = String(missedTime.getHours()).padStart(2, '0');
      const missedMins = String(missedTime.getMinutes()).padStart(2, '0');
      const missedTimeString = `${missedHours}:${missedMins}`;

      if (settings.enable_missed_punch_out_reminder === 'true' && currentTime === missedTimeString) {
        console.log('Running Missed Punch Out Reminder...');
        const attRes = await db.query('SELECT user_id FROM attendance WHERE date = CURRENT_DATE AND check_out_time IS NULL');
        for (const row of attRes.rows) {
          const logRes = await db.query(`INSERT INTO attendance_notifications_log (user_id, date, notification_type) VALUES ($1, CURRENT_DATE, $2) ON CONFLICT DO NOTHING RETURNING id`, [row.user_id, 'MISSED_PUNCH_OUT']);
          if (logRes.rowCount > 0) {
            sendPushNotification(row.user_id, 'Punch Out Pending', 'You have not punched out for today.');
          }
        }
      }

    } catch (err) {
      console.error('Error in Dynamic Attendance Cron:', err);
    }
  });
};

module.exports = { initAttendanceCron };
