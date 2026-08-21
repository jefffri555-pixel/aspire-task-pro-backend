const db = require('../config/database');
const { sendPushNotification } = require('../utils/pushNotification');

const isDbOffline = () => db.isConnectionFailed && db.isConnectionFailed();

// In-memory fallback
const MOCK_ATTENDANCE = [];

/**
 * GET /api/attendance
 */
const getAttendance = async (req, res) => {
  const { date, userId } = req.query;

  if (isDbOffline()) {
    let list = [...MOCK_ATTENDANCE];
    if (date) list = list.filter(a => a.date === date);
    if (userId) list = list.filter(a => a.user_id === userId);
    return res.json(list);
  }

  try {
    let query = `
      SELECT a.*, u.name as employee_name, u.employee_id, d.name as department_name
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE 1=1
    `;
    const params = [];
    let count = 1;

    // Filter by role: staff can only see their own attendance logs
    if (req.user.role === 'staff') {
      query += ` AND a.user_id = $${count}`;
      params.push(req.user.id);
      count++;
    } else if (userId) {
      query += ` AND a.user_id = $${count}`;
      params.push(userId);
      count++;
    }

    if (date) {
      query += ` AND a.date = $${count}`;
      params.push(date);
      count++;
    }

    query += ` ORDER BY a.date DESC, a.check_in_time DESC`;

    const result = await db.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    console.error('Get Attendance Error:', err);
    return res.status(500).json({ error: 'Internal server error listing attendance' });
  }
};

/**
 * GET /api/attendance/settings
 * Retrieve office location settings for geofencing
 */
const fetchAllSettings = async () => {
  const settings = {
    shift_start_time: '09:30',
    shift_end_time: '18:30',
    grace_period_minutes: 15,
    half_day_cutoff_time: '12:00',
    min_working_hours: 8,
    min_half_day_hours: 4,
    attendance_closing_time: '23:59',
    auto_mark_absent: 'true',
    enable_punch_in: 'true',
    enable_punch_out: 'true',
    require_punch_in_selfie: 'true',
    require_punch_out_selfie: 'true',
    require_punch_in_gps: 'true',
    require_punch_out_gps: 'true',
    office_name: 'Aspire HQ',
    office_latitude: 37.4220,
    office_longitude: -122.0841,
    office_radius: 200,
    enable_punch_in_reminder: 'true',
    punch_in_reminder_time: '09:40',
    enable_late_check_in_notification: 'true',
    enable_punch_out_reminder: 'true',
    punch_out_reminder_time: '17:45',
    enable_missed_punch_out_reminder: 'true',
    enable_absent_notification: 'true'
  };
  
  if (isDbOffline()) return settings;

  try {
    const keys = Object.keys(settings);
    const result = await db.query('SELECT key, value FROM system_settings WHERE key = ANY($1)', [keys]);
    
    result.rows.forEach(row => {
      if (settings.hasOwnProperty(row.key) && row.value !== null) {
        // Parse numerical values
        if (['grace_period_minutes', 'min_working_hours', 'min_half_day_hours', 'office_latitude', 'office_longitude', 'office_radius'].includes(row.key)) {
          settings[row.key] = parseFloat(row.value);
        } else {
          settings[row.key] = row.value;
        }
      }
    });
  } catch (e) {
    console.error('Error fetching system settings:', e);
  }
  
  return settings;
};

/**
 * GET /api/attendance/settings
 * Retrieve all attendance settings
 */
const getAttendanceSettings = async (req, res) => {
  try {
    const settings = await fetchAllSettings();
    return res.json(settings);
  } catch (err) {
    console.error('Get Attendance Settings Error:', err);
    return res.status(500).json({ error: 'Internal server error fetching attendance settings' });
  }
};

/**
 * GET /api/attendance/history
 * Retrieve attendance history and summary for a given date range
 */
const _fetchAttendanceData = async (req) => {
  const { startDate, endDate, userId, departmentId } = req.query;
  const role = req.user.role;
  const settings = await fetchAllSettings();
  
  const shiftStartStr = settings.shift_start_time || '09:30';
  const shiftStartParts = shiftStartStr.split(':');
  const cutoffMinsLimit = parseInt(shiftStartParts[0]) * 60 + parseInt(shiftStartParts[1] || '0') + (settings.grace_period_minutes || 15);

  let query = `
    SELECT a.*, u.name as employee_name, u.employee_id, d.name as department_name,
    COALESCE((SELECT SUM(duration_minutes) FROM attendance_breaks b WHERE b.attendance_id = a.id), 0) as total_break_minutes
    FROM attendance a
    JOIN users u ON a.user_id = u.id
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE 1=1
  `;
  const params = [];
  let count = 1;

  // Filter by date range
  if (startDate) {
    query += ` AND a.date >= $${count}`;
    params.push(startDate);
    count++;
  }
  if (endDate) {
    query += ` AND a.date <= $${count}`;
    params.push(endDate);
    count++;
  }

  // Role-based access control
  if (role === 'staff') {
    query += ` AND a.user_id = $${count}`;
    params.push(req.user.id);
    count++;
  } else if (role === 'team_leader') {
    if (userId && userId !== req.user.id) {
      // Must belong to team leader's department
      query += ` AND u.department_id = $${count}`;
      params.push(req.user.department_id);
      count++;
      query += ` AND a.user_id = $${count}`;
      params.push(userId);
      count++;
    } else {
      // Can view own attendance or entire department
      query += ` AND (a.user_id = $${count} OR u.department_id = $${count + 1})`;
      params.push(req.user.id, req.user.department_id);
      count += 2;
    }
  } else if (role === 'manager' || role === 'managing_director') {
    if (req.user.department_id) {
      query += ` AND u.department_id = $${count}`;
      params.push(req.user.department_id);
      count++;
    }
    if (userId) {
      query += ` AND a.user_id = $${count}`;
      params.push(userId);
      count++;
    }
  } else { // admin or super_admin
    if (departmentId) {
      query += ` AND u.department_id = $${count}`;
      params.push(departmentId);
      count++;
    }
    if (userId) {
      query += ` AND a.user_id = $${count}`;
      params.push(userId);
      count++;
    }
  }

  query += ` ORDER BY a.date DESC, a.check_in_time DESC`;

  const result = await db.query(query, params);
  const rows = result.rows;

  const summary = {
    totalWorkingDays: 0,
    presentDays: 0,
    lateDays: 0,
    halfDays: 0,
    absentDays: 0,
    leaveDays: 0,
    workFromHomeDays: 0,
    onDutyDays: 0,
    holidayDays: 0,
    weeklyOffDays: 0,
    totalWorkingHours: 0,
    averageWorkingHours: 0,
    totalLateMinutes: 0
  };

  let totalMinutes = 0;
  
  // Group records by unique date + user combinations
  const uniqueDays = new Set();

  rows.forEach(row => {
    uniqueDays.add(`${row.date}_${row.user_id}`);
    const status = row.status ? row.status.toLowerCase() : null;
    if (status === 'present') summary.presentDays++;
    else if (status === 'late') summary.lateDays++;
    else if (status === 'half day') summary.halfDays++;
    else if (status === 'absent') summary.absentDays++;
    else if (status === 'leave') summary.leaveDays++;
    else if (status === 'work from home') summary.workFromHomeDays++;
    else if (status === 'on duty') summary.onDutyDays++;
    else if (status === 'holiday' || status === 'worked on holiday') summary.holidayDays++;
    else if (status === 'weekly off' || status === 'worked on weekly off') summary.weeklyOffDays++;

    if (row.check_in_time && row.check_out_time) {
      const inTime = new Date(row.check_in_time);
      const outTime = new Date(row.check_out_time);
      if (!isNaN(inTime) && !isNaN(outTime)) {
        let diffMins = Math.floor((outTime - inTime) / 60000);
        // Productive Working Hours = Punch Out - Punch In - Total Break Duration
        if (row.total_break_minutes) {
           diffMins -= parseInt(row.total_break_minutes);
        }
        if (diffMins < 0) diffMins = 0;
        totalMinutes += diffMins;
      }
    }

    if (row.check_in_time) {
      const inTime = new Date(row.check_in_time);
      if (!isNaN(inTime)) {
        const hours = inTime.getHours();
        const mins = inTime.getMinutes();
        const checkInTotalMins = hours * 60 + mins;
        if (checkInTotalMins > cutoffMinsLimit) {
          summary.totalLateMinutes += (checkInTotalMins - cutoffMinsLimit);
        }
      }
    }
  });

  summary.totalWorkingDays = Math.max(0, uniqueDays.size - summary.holidayDays - summary.weeklyOffDays);
  summary.totalWorkingHours = (totalMinutes / 60).toFixed(2);
  if (summary.totalWorkingDays > 0) {
    summary.averageWorkingHours = (totalMinutes / 60 / summary.totalWorkingDays).toFixed(2);
  }

  return { summary, history: rows };
};

/**
 * GET /api/attendance/history
 * Retrieve attendance history and summary for a given date range
 */
const getAttendanceHistory = async (req, res) => {
  try {
    const data = await _fetchAttendanceData(req);
    return res.json(data);
  } catch (err) {
    console.error('Get Attendance History Error:', err);
    return res.status(500).json({ error: 'Internal server error listing attendance history' });
  }
};

const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const exportAttendanceCSV = async (req, res) => {
  try {
    const data = await _fetchAttendanceData(req);
    
    res.header('Content-Type', 'text/csv');
    res.attachment('Attendance_Report.csv');
    
    let csvStr = 'Date,Employee Name,Employee ID,Department,Punch In,Punch Out,Status,Reason\\n';
    
    data.history.forEach(row => {
      const date = row.date || '';
      const name = `"${row.employee_name || ''}"`;
      const empId = row.employee_id || '';
      const dept = `"${row.department_name || ''}"`;
      const pIn = row.check_in_time ? new Date(row.check_in_time).toLocaleTimeString() : '';
      const pOut = row.check_out_time ? new Date(row.check_out_time).toLocaleTimeString() : '';
      const status = row.status || '';
      const reason = `"${row.reason || ''}"`;
      
      csvStr += `${date},${name},${empId},${dept},${pIn},${pOut},${status},${reason}\\n`;
    });
    
    return res.send(csvStr);
  } catch (err) {
    console.error('Export CSV Error:', err);
    return res.status(500).json({ error: 'Internal server error exporting CSV' });
  }
};

const exportAttendanceExcel = async (req, res) => {
  try {
    const data = await _fetchAttendanceData(req);
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Report');
    
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Employee Name', key: 'name', width: 25 },
      { header: 'Employee ID', key: 'empId', width: 15 },
      { header: 'Department', key: 'dept', width: 20 },
      { header: 'Punch In', key: 'pIn', width: 15 },
      { header: 'Punch Out', key: 'pOut', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Reason', key: 'reason', width: 20 },
    ];
    
    data.history.forEach(row => {
      worksheet.addRow({
        date: row.date,
        name: row.employee_name,
        empId: row.employee_id,
        dept: row.department_name,
        pIn: row.check_in_time ? new Date(row.check_in_time).toLocaleTimeString() : '',
        pOut: row.check_out_time ? new Date(row.check_out_time).toLocaleTimeString() : '',
        status: row.status,
        reason: row.reason,
      });
    });
    
    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.attachment('Attendance_Report.xlsx');
    
    await workbook.xlsx.write(res);
    return res.end();
  } catch (err) {
    console.error('Export Excel Error:', err);
    return res.status(500).json({ error: 'Internal server error exporting Excel' });
  }
};

const exportAttendancePDF = async (req, res) => {
  try {
    const data = await _fetchAttendanceData(req);
    
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    
    res.header('Content-Type', 'application/pdf');
    res.attachment('Attendance_Report.pdf');
    
    doc.pipe(res);
    
    doc.fontSize(20).text('Aspire Task Pro - Attendance Report', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(12).text(`Total Working Days: ${data.summary.totalWorkingDays}`);
    doc.text(`Present Days: ${data.summary.presentDays}`);
    doc.text(`Late Days: ${data.summary.lateDays}`);
    doc.text(`Absent Days: ${data.summary.absentDays}`);
    doc.text(`Total Hours: ${data.summary.totalWorkingHours} hrs`);
    doc.moveDown();
    
    data.history.forEach(row => {
      const pIn = row.check_in_time ? new Date(row.check_in_time).toLocaleTimeString() : 'N/A';
      const pOut = row.check_out_time ? new Date(row.check_out_time).toLocaleTimeString() : 'N/A';
      doc.fontSize(10).text(`${row.date} | ${row.employee_name} | ${row.status} | In: ${pIn} | Out: ${pOut}`);
      doc.moveDown(0.5);
    });
    
    doc.end();
  } catch (err) {
    console.error('Export PDF Error:', err);
    return res.status(500).json({ error: 'Internal server error exporting PDF' });
  }
};

/**
 * GET /api/attendance/dashboard
 * Retrieve dashboard summary and attendance list for a specific date
 */
const getAttendanceDashboard = async (req, res) => {
  if (req.user.role === 'staff') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const dateStr = req.query.date || new Date().toISOString().split('T')[0];

  if (isDbOffline()) {
    // Mock response
    return res.json({
      summary: {
        totalEmployees: 1,
        present: 0,
        late: 0,
        halfDay: 0,
        absent: 0,
        leave: 0,
        workFromHome: 0,
        onDuty: 0,
        notMarkedYet: 1,
      },
      attendanceList: []
    });
  }

  try {
    let query = `
      SELECT u.id as user_id, u.name as employee_name, u.employee_id, d.name as department_name,
             a.id, a.date, a.status, a.check_in_time, a.check_out_time, a.reason,
             a.punch_in_selfie, a.punch_out_selfie,
             a.punch_in_lat, a.punch_in_lng, a.punch_out_lat, a.punch_out_lng,
             a.created_at, a.updated_at
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN attendance a ON u.id = a.user_id AND a.date = $1
      WHERE 1=1
    `;
    const params = [dateStr];
    let count = 2;

    // Filter by department if manager/managing_director and they have a department
    if ((req.user.role === 'manager' || req.user.role === 'managing_director') && req.user.department_id) {
      query += ` AND u.department_id = $${count}`;
      params.push(req.user.department_id);
      count++;
    }

    query += ` ORDER BY u.name ASC`;

    const result = await db.query(query, params);
    const rows = result.rows;

    const summary = {
      totalEmployees: rows.length,
      present: 0,
      late: 0,
      halfDay: 0,
      absent: 0,
      leave: 0,
      workFromHome: 0,
      onDuty: 0,
      notMarkedYet: 0,
    };

    rows.forEach(row => {
      const status = row.status ? row.status.toLowerCase() : null;
      if (!status) summary.notMarkedYet++;
      else if (status === 'present') summary.present++;
      else if (status === 'late') summary.late++;
      else if (status === 'half day') summary.halfDay++;
      else if (status === 'absent') summary.absent++;
      else if (status === 'leave') summary.leave++;
      else if (status === 'work from home') summary.workFromHome++;
      else if (status === 'on duty') summary.onDuty++;
      else summary.notMarkedYet++; // fallback
    });

    return res.json({
      summary,
      attendanceList: rows
    });
  } catch (err) {
    console.error('Get Attendance Dashboard Error:', err);
    return res.status(500).json({ error: 'Internal server error fetching dashboard' });
  }
};

/**
 * GET /api/attendance/today
 * Check today's status for currently logged-in user
 */
const getTodayStatus = async (req, res) => {
  const userId = req.user.id;
  const todayStr = new Date().toISOString().split('T')[0];

  if (isDbOffline()) {
    const record = MOCK_ATTENDANCE.find(a => a.user_id === userId && a.date === todayStr);
    return res.json(record || null);
  }

  try {
    // Check for approved leaves today
    const leaveQuery = `
      SELECT leave_type, reason FROM leave_requests 
      WHERE user_id = $1 AND status = 'approved' AND CURRENT_DATE >= start_date AND CURRENT_DATE <= end_date
    `;
    const leaveRes = await db.query(leaveQuery, [userId]);

    const attQuery = `
      SELECT * FROM attendance 
      WHERE user_id = $1 AND date = CURRENT_DATE
    `;
    const attRes = await db.query(attQuery, [userId]);

    let record = attRes.rows[0] || null;

    if (leaveRes.rows.length > 0) {
      const leave = leaveRes.rows[0];
      const leaveStatus = leave.leave_type.toLowerCase() === 'wfh' ? 'Work From Home' : 
                          leave.leave_type.toLowerCase() === 'on_duty' ? 'On Duty' : 'Leave';
      
      if (record) {
        record.status = leaveStatus;
        record.reason = leave.reason || 'Approved ' + leaveStatus;
      } else {
        record = {
          user_id: userId,
          date: todayStr,
          status: leaveStatus,
          reason: leave.reason || 'Approved ' + leaveStatus,
          check_in_time: null,
          check_out_time: null
        };
      }
    } else if (!record) {
      // If not punched in, check for holiday / weekly off
      const settings = await fetchAllSettings();
      const holidayRes = await db.query('SELECT * FROM holidays WHERE date = CURRENT_DATE');
      let isHoliday = holidayRes.rows.length > 0;
      let isWeeklyOff = false;
      const todayDate = new Date();
      const dayName = todayDate.toLocaleDateString('en-US', { weekday: 'long' });
      try {
        const weeklyOffDays = JSON.parse(settings.weekly_off_days || '["Sunday"]');
        if (weeklyOffDays.includes(dayName)) isWeeklyOff = true;
        if (dayName === 'Saturday' && settings.saturday_off_rule) {
          const rule = settings.saturday_off_rule;
          const weekOfMonth = Math.ceil(todayDate.getDate() / 7);
          if (rule === 'Every Saturday Off') isWeeklyOff = true;
          else if (rule === '1st Saturday Off' && weekOfMonth === 1) isWeeklyOff = true;
          else if (rule === '2nd Saturday Off' && weekOfMonth === 2) isWeeklyOff = true;
          else if (rule === '3rd Saturday Off' && weekOfMonth === 3) isWeeklyOff = true;
          else if (rule === '4th Saturday Off' && weekOfMonth === 4) isWeeklyOff = true;
          else if (rule === 'Alternate Saturdays' && (weekOfMonth % 2 === 0)) isWeeklyOff = true;
          else isWeeklyOff = false;
        }
      } catch(e) {}

      if (isHoliday) {
        record = {
          user_id: userId, date: todayStr, status: 'Holiday', reason: holidayRes.rows[0].name,
          check_in_time: null, check_out_time: null
        };
      } else if (isWeeklyOff) {
        record = {
          user_id: userId, date: todayStr, status: 'Weekly Off', reason: 'Configured Weekly Off',
          check_in_time: null, check_out_time: null
        };
      }
    }

    if (record && record.id) {
      // Fetch breaks
      const breaksRes = await db.query('SELECT * FROM attendance_breaks WHERE attendance_id = $1 ORDER BY start_time ASC', [record.id]);
      record.breaks = breaksRes.rows;
      
      let totalBreakMinutes = 0;
      let isOnBreak = false;
      for (const b of record.breaks) {
        totalBreakMinutes += b.duration_minutes || 0;
        if (!b.end_time) {
          isOnBreak = true;
          // Calculate ongoing duration
          const diff = (new Date() - new Date(b.start_time)) / 60000;
          totalBreakMinutes += diff;
        }
      }
      
      record.total_break_minutes = Math.round(totalBreakMinutes);
      record.activity_status = isOnBreak ? 'On Break' : (record.check_out_time ? 'Punched Out' : (record.check_in_time ? 'Working' : 'Not Punched In'));
    }

    return res.json(record);
  } catch (err) {
    console.error('Get Today Status Error:', err);
    return res.status(500).json({ error: 'Internal server error checking today\'s attendance status' });
  }
};

/**
 * POST /api/attendance/mark
 * Mark clock-in or clock-out
 */
const markAttendance = async (req, res) => {
  const userId = req.user.id;
  const { action, lat, lng } = req.body; // 'clock_in' or 'clock_out'
  const todayStr = new Date().toISOString().split('T')[0];

  if (action !== 'clock_in' && action !== 'clock_out') {
    return res.status(400).json({ error: 'Action must be clock_in or clock_out' });
  }

  if (isDbOffline()) {
    return res.status(400).json({ error: 'Cannot mark attendance in offline mock mode.' });
  }

  // Require selfie for punch in and punch out
  if (!req.file) {
    return res.status(400).json({ error: 'Selfie is required for attendance.' });
  }

  try {
    const fs = require('fs');
    const path = require('path');
    const filename = `selfie_${action}_${Date.now()}_${req.file.originalname.replace(/\\s+/g, '_')}`;
    const uploadPath = path.join(__dirname, '../uploads', filename);
    fs.writeFileSync(uploadPath, req.file.buffer);
    const selfieUrl = `/uploads/${filename}`;

    // Check if they have an approved leave
    const leaveRes = await db.query(`
      SELECT leave_type FROM leave_requests 
      WHERE user_id = $1 AND status = 'approved' AND CURRENT_DATE >= start_date AND CURRENT_DATE <= end_date
    `, [userId]);
    const hasLeave = leaveRes.rows.length > 0;
    const leaveStatus = hasLeave ? (leaveRes.rows[0].leave_type.toLowerCase() === 'wfh' ? 'Work From Home' : 
                                  leaveRes.rows[0].leave_type.toLowerCase() === 'on_duty' ? 'On Duty' : 'Leave') : null;

    if (action === 'clock_in') {
      // Check if already checked in today
      const checkRes = await db.query('SELECT id FROM attendance WHERE user_id = $1 AND date = CURRENT_DATE', [userId]);
      if (checkRes.rows.length > 0) {
        return res.status(400).json({ error: 'Already clocked in today' });
      }

      // Get dynamic settings
      const settings = await fetchAllSettings();
      
      const now = new Date();
      let status = 'present';
      let reason = null;

      const halfDayCutoffStr = settings.half_day_cutoff_time || '12:00';
      const cutoffTimeParts = halfDayCutoffStr.split(':');
      const cutoffHours = parseInt(cutoffTimeParts[0]);
      const cutoffMins = parseInt(cutoffTimeParts[1] || '0');

      const shiftStartStr = settings.shift_start_time || '09:30';
      const shiftStartParts = shiftStartStr.split(':');
      const lateLimitMins = parseInt(shiftStartParts[0]) * 60 + parseInt(shiftStartParts[1] || '0') + (settings.grace_period_minutes || 15);
      
      const nowMins = now.getHours() * 60 + now.getMinutes();

      if (now.getHours() > cutoffHours || (now.getHours() === cutoffHours && now.getMinutes() >= cutoffMins)) {
        status = 'Half Day';
        reason = 'Half Day - Late Punch In';
      } else if (nowMins > lateLimitMins) {
        status = 'Late';
      }

      // Check for Holiday
      const holidayRes = await db.query('SELECT * FROM holidays WHERE date = CURRENT_DATE');
      const isHoliday = holidayRes.rows.length > 0;
      
      // Check for Weekly Off
      let isWeeklyOff = false;
      const todayDate = new Date();
      const dayName = todayDate.toLocaleDateString('en-US', { weekday: 'long' });
      try {
        const weeklyOffDays = JSON.parse(settings.weekly_off_days || '["Sunday"]');
        if (weeklyOffDays.includes(dayName)) {
          isWeeklyOff = true;
        }
        if (dayName === 'Saturday' && settings.saturday_off_rule) {
          const rule = settings.saturday_off_rule;
          const weekOfMonth = Math.ceil(todayDate.getDate() / 7);
          if (rule === 'Every Saturday Off') isWeeklyOff = true;
          else if (rule === '1st Saturday Off' && weekOfMonth === 1) isWeeklyOff = true;
          else if (rule === '2nd Saturday Off' && weekOfMonth === 2) isWeeklyOff = true;
          else if (rule === '3rd Saturday Off' && weekOfMonth === 3) isWeeklyOff = true;
          else if (rule === '4th Saturday Off' && weekOfMonth === 4) isWeeklyOff = true;
          else if (rule === 'Alternate Saturdays' && (weekOfMonth % 2 === 0)) isWeeklyOff = true;
          else isWeeklyOff = false;
        }
      } catch(e) {}

      // Override status if they have leave, else if holiday/weekly off
      if (hasLeave) {
        status = leaveStatus;
        reason = 'Approved ' + leaveStatus;
      } else if (isHoliday) {
        status = 'Worked on Holiday';
        reason = 'Working on ' + holidayRes.rows[0].name;
      } else if (isWeeklyOff) {
        status = 'Worked on Weekly Off';
        reason = 'Working on configured Weekly Off';
      }

      const insertQuery = `
        INSERT INTO attendance (user_id, date, status, check_in_time, reason, punch_in_selfie, punch_in_lat, punch_in_lng)
        VALUES ($1, CURRENT_DATE, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6)
        RETURNING *
      `;
      const result = await db.query(insertQuery, [userId, status, reason, selfieUrl, lat || null, lng || null]);
      const newAttendance = result.rows[0];

      // Dispatch push notifications for Punch In
      try {
        const timeStr = new Date(newAttendance.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        await db.query(`
          INSERT INTO attendance_notifications_log (user_id, date, notification_type) 
          VALUES ($1, CURRENT_DATE, $2) ON CONFLICT DO NOTHING
        `, [userId, 'PUNCH_IN_SUCCESS']);
        
        if (status === 'Late' || status === 'Half Day') {
          // Send Late Check-In
          sendPushNotification(userId, 'Late Check-In', `Your attendance was marked late at ${timeStr}.`);
          
          // Notify Manager/Super Admin
          const managerRes = await db.query(`SELECT reporting_manager_id FROM users WHERE id = $1`, [userId]);
          const reportingManagerId = managerRes.rows.length > 0 ? managerRes.rows[0].reporting_manager_id : null;
          
          const userNameRes = await db.query('SELECT name FROM users WHERE id = $1', [userId]);
          const employeeName = userNameRes.rows.length > 0 ? userNameRes.rows[0].name : 'Employee';
          
          if (reportingManagerId) {
             sendPushNotification(reportingManagerId, 'Late Check-In Alert', `${employeeName} checked in late at ${timeStr}.`);
          }
          
          // Notify super admin/admin
          const adminsRes = await db.query(`SELECT id FROM users WHERE role IN ('admin', 'super_admin')`);
          for (const admin of adminsRes.rows) {
             if (admin.id !== reportingManagerId) {
                 sendPushNotification(admin.id, 'Late Check-In Alert', `${employeeName} checked in late at ${timeStr}.`);
             }
          }
        } else {
          sendPushNotification(userId, 'Attendance Marked', `Punch In successful at ${timeStr}.`);
        }
      } catch (notifErr) {
        console.error('Error sending punch in notification:', notifErr);
      }

      return res.status(201).json(newAttendance);
      
    } else {
      // Clock out
      const checkRes = await db.query('SELECT id, check_in_time, check_out_time, status FROM attendance WHERE user_id = $1 AND date = CURRENT_DATE', [userId]);
      if (checkRes.rows.length === 0) {
        return res.status(400).json({ error: 'Cannot clock out without clocking in first' });
      }
      if (checkRes.rows[0].check_out_time) {
        return res.status(400).json({ error: 'Already clocked out today' });
      }

      const settings = await fetchAllSettings();
      let minWorkingHours = settings.min_working_hours || 8;

      const checkInTime = new Date(checkRes.rows[0].check_in_time);
      const now = new Date();
      let diffHours = (now - checkInTime) / (1000 * 60 * 60);

      const forceEndBreak = req.body.force_end_break === true || req.body.force_end_break === 'true';

      // Check for active break
      const activeBreakRes = await db.query('SELECT id, start_time FROM attendance_breaks WHERE attendance_id = $1 AND end_time IS NULL', [checkRes.rows[0].id]);
      if (activeBreakRes.rows.length > 0) {
        if (!forceEndBreak) {
           return res.status(400).json({ error: 'You have an active break. Please end it or confirm to end it automatically.' });
        } else {
           // End active break
           const activeBreak = activeBreakRes.rows[0];
           const breakMins = Math.round((now - new Date(activeBreak.start_time)) / 60000);
           await db.query('UPDATE attendance_breaks SET end_time = CURRENT_TIMESTAMP, duration_minutes = $1 WHERE id = $2', [breakMins, activeBreak.id]);
        }
      }

      // Calculate productive working hours
      const breaksRes = await db.query('SELECT SUM(duration_minutes) as total_break FROM attendance_breaks WHERE attendance_id = $1', [checkRes.rows[0].id]);
      const totalBreakMins = parseInt(breaksRes.rows[0].total_break) || 0;
      const productiveHours = diffHours - (totalBreakMins / 60);

      let newStatus = checkRes.rows[0].status;
      let newReason = null;

      if (!hasLeave && productiveHours < minWorkingHours) {
        newStatus = 'Half Day';
        newReason = 'Half Day - Insufficient Working Hours';
      } else if (hasLeave) {
        newStatus = leaveStatus;
        newReason = 'Approved ' + leaveStatus;
      }

      let updateQuery = `
        UPDATE attendance
        SET check_out_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP, punch_out_selfie = $2, punch_out_lat = $3, punch_out_lng = $4
        WHERE user_id = $1 AND date = CURRENT_DATE
        RETURNING *
      `;
      let params = [userId, selfieUrl, lat || null, lng || null];

      if (newReason) {
        updateQuery = `
          UPDATE attendance
          SET check_out_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP, status = $2, reason = $3, punch_out_selfie = $4, punch_out_lat = $5, punch_out_lng = $6
          WHERE user_id = $1 AND date = CURRENT_DATE
          RETURNING *
        `;
        params = [userId, newStatus, newReason, selfieUrl, lat || null, lng || null];
      }

      const result = await db.query(updateQuery, params);
      const updatedAttendance = result.rows[0];

      // Dispatch push notification for Punch Out
      try {
        await db.query(`
          INSERT INTO attendance_notifications_log (user_id, date, notification_type) 
          VALUES ($1, CURRENT_DATE, $2) ON CONFLICT DO NOTHING
        `, [userId, 'PUNCH_OUT_SUCCESS']);

        const inTime = new Date(updatedAttendance.check_in_time);
        const outTime = new Date(updatedAttendance.check_out_time);
        const diffHrs = ((outTime - inTime) / 3600000);
        const prodHrs = (diffHrs - (totalBreakMins / 60)).toFixed(2);
        const timeStr = outTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        sendPushNotification(userId, 'Punch Out Successful', `You punched out at ${timeStr}. Productive working hours: ${prodHrs}h.`);
      } catch (notifErr) {
        console.error('Error sending punch out notification:', notifErr);
      }

      return res.json(updatedAttendance);
    }
  } catch (err) {
    console.error('Mark Attendance Error:', err);
    return res.status(500).json({ error: 'Internal server error marking attendance' });
  }
};

/**
 * PUT /api/attendance/:id
 * Admin updates attendance manually
 */
const updateAttendance = async (req, res) => {
  const { id } = req.params;
  const { status, check_in_time, check_out_time } = req.body;

  if (isDbOffline()) {
    const record = MOCK_ATTENDANCE.find(a => a.id === id);
    if (!record) {
      return res.status(404).json({ error: 'Attendance record not found in mock database' });
    }
    if (status) record.status = status;
    if (check_in_time) record.check_in_time = check_in_time;
    if (check_out_time) record.check_out_time = check_out_time;
    return res.json(record);
  }

  try {
    const checkRes = await db.query('SELECT * FROM attendance WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    const existing = checkRes.rows[0];
    const finalStatus = status !== undefined ? status : existing.status;
    const finalCheckIn = check_in_time !== undefined ? check_in_time : existing.check_in_time;
    const finalCheckOut = check_out_time !== undefined ? check_out_time : existing.check_out_time;

    const query = `
      UPDATE attendance
      SET status = $1, check_in_time = $2, check_out_time = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;
    const result = await db.query(query, [finalStatus, finalCheckIn, finalCheckOut, id]);
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Update Attendance Error:', err);
    return res.status(500).json({ error: 'Internal server error updating attendance' });
  }
};

/**
 * POST /api/attendance/breaks/start
 * Start a break
 */
const startBreak = async (req, res) => {
  const userId = req.user.id;
  const { break_type } = req.body;

  if (!break_type) {
    return res.status(400).json({ error: 'Break type is required' });
  }

  try {
    // 1. Check if user is punched in today and not punched out
    const checkRes = await db.query('SELECT id, check_out_time FROM attendance WHERE user_id = $1 AND date = CURRENT_DATE', [userId]);
    if (checkRes.rows.length === 0) {
      return res.status(400).json({ error: 'You must be punched in to start a break' });
    }
    if (checkRes.rows[0].check_out_time) {
      return res.status(400).json({ error: 'Cannot start a break after punching out' });
    }
    const attendanceId = checkRes.rows[0].id;

    // 2. Check if there is already an active break
    const activeBreakRes = await db.query('SELECT id FROM attendance_breaks WHERE attendance_id = $1 AND end_time IS NULL', [attendanceId]);
    if (activeBreakRes.rows.length > 0) {
      return res.status(400).json({ error: 'You already have an active break. Please end it first.' });
    }

    // 3. Insert new break
    const insertQuery = `
      INSERT INTO attendance_breaks (attendance_id, break_type, start_time)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const result = await db.query(insertQuery, [attendanceId, break_type]);

    return res.status(201).json({ message: 'Break started successfully', break: result.rows[0] });
  } catch (err) {
    console.error('Start Break Error:', err);
    return res.status(500).json({ error: 'Internal server error starting break' });
  }
};

/**
 * PUT /api/attendance/breaks/end
 * End an active break
 */
const endBreak = async (req, res) => {
  const userId = req.user.id;

  try {
    // 1. Find today's attendance
    const checkRes = await db.query('SELECT id FROM attendance WHERE user_id = $1 AND date = CURRENT_DATE', [userId]);
    if (checkRes.rows.length === 0) {
      return res.status(400).json({ error: 'No attendance record found for today' });
    }
    const attendanceId = checkRes.rows[0].id;

    // 2. Find active break
    const activeBreakRes = await db.query('SELECT id, start_time FROM attendance_breaks WHERE attendance_id = $1 AND end_time IS NULL', [attendanceId]);
    if (activeBreakRes.rows.length === 0) {
      return res.status(400).json({ error: 'No active break found to end' });
    }
    const activeBreak = activeBreakRes.rows[0];

    // 3. Calculate duration and end break
    const now = new Date();
    const startTime = new Date(activeBreak.start_time);
    const durationMins = Math.round((now - startTime) / 60000);

    const updateQuery = `
      UPDATE attendance_breaks 
      SET end_time = CURRENT_TIMESTAMP, duration_minutes = $1 
      WHERE id = $2 
      RETURNING *
    `;
    const result = await db.query(updateQuery, [durationMins, activeBreak.id]);

    return res.json({ message: 'Break ended successfully', break: result.rows[0] });
  } catch (err) {
    console.error('End Break Error:', err);
    return res.status(500).json({ error: 'Internal server error ending break' });
  }
};

module.exports = {
  getAttendance,
  getTodayStatus,
  getAttendanceSettings,
  getAttendanceHistory,
  exportAttendanceCSV,
  exportAttendanceExcel,
  exportAttendancePDF,
  getAttendanceDashboard,
  markAttendance,
  updateAttendance,
  fetchAllSettings,
  startBreak,
  endBreak
};
