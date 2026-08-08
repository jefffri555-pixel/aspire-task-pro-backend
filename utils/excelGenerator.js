const ExcelJS = require('exceljs');

/**
 * Generates a styled Excel workbook with metrics and item lists
 * @param {NodeJS.WritableStream} res - Express response stream
 * @param {Object} data - Contains title, summary, tasks list, leads list
 */
const generateReportExcel = async (res, data) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Aspire';
  workbook.lastModifiedBy = 'Aspire';
  workbook.created = new Date();

  const type = data.type || 'all';

  if (type === 'employee') {
    const sheet = workbook.addWorksheet('Employees Report');
    sheet.columns = [
      { header: 'Employee ID', key: 'employee_id', width: 15 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'Role', key: 'role', width: 15 },
      { header: 'Designation', key: 'designation', width: 22 },
      { header: 'Department', key: 'department_name', width: 25 },
      { header: 'Status', key: 'status', width: 15 }
    ];
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { name: 'Arial', family: 2, size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF082340' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    data.employees.forEach(emp => {
      sheet.addRow({
        employee_id: emp.employee_id,
        name: emp.name,
        email: emp.email,
        phone: emp.phone,
        role: emp.role.toUpperCase(),
        designation: emp.designation,
        department_name: emp.department_name || 'N/A',
        status: emp.status.toUpperCase()
      });
    });
  } else if (type === 'project') {
    const sheet = workbook.addWorksheet('Projects Report');
    sheet.columns = [
      { header: 'Project ID', key: 'project_id', width: 15 },
      { header: 'Project Name', key: 'name', width: 30 },
      { header: 'Client', key: 'client_name', width: 25 },
      { header: 'Progress (%)', key: 'progress_percentage', width: 15 },
      { header: 'Status', key: 'status', width: 18 },
      { header: 'Start Date', key: 'start_date', width: 18 },
      { header: 'Due Date', key: 'due_date', width: 18 },
      { header: 'Assigned Team', key: 'department_name', width: 25 }
    ];
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { name: 'Arial', family: 2, size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF082340' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    data.projects.forEach(proj => {
      sheet.addRow({
        project_id: proj.project_id,
        name: proj.name,
        client_name: proj.client_name,
        progress_percentage: proj.progress_percentage,
        status: proj.status.toUpperCase().replace(/_/g, ' '),
        start_date: new Date(proj.start_date).toLocaleDateString(),
        due_date: new Date(proj.due_date).toLocaleDateString(),
        department_name: proj.department_name || 'N/A'
      });
    });
  } else if (type === 'department') {
    const sheet = workbook.addWorksheet('Departments Report');
    sheet.columns = [
      { header: 'ID', key: 'id', width: 40 },
      { header: 'Department Name', key: 'name', width: 30 },
      { header: 'Total Employees', key: 'employee_count', width: 18 },
      { header: 'Active Projects', key: 'project_count', width: 18 }
    ];
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { name: 'Arial', family: 2, size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF082340' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    data.departments.forEach(dept => {
      sheet.addRow({
        id: dept.id,
        name: dept.name,
        employee_count: parseInt(dept.employee_count),
        project_count: parseInt(dept.project_count)
      });
    });
  } else if (type === 'attendance') {
    const sheet = workbook.addWorksheet('Attendance Report');
    sheet.columns = [
      { header: 'Employee', key: 'employee_name', width: 25 },
      { header: 'EMP ID', key: 'employee_id', width: 15 },
      { header: 'Date', key: 'date', width: 18 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Check In', key: 'check_in_time', width: 20 },
      { header: 'Check Out', key: 'check_out_time', width: 20 }
    ];
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { name: 'Arial', family: 2, size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF082340' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    data.attendance.forEach(att => {
      sheet.addRow({
        employee_name: att.employee_name || 'N/A',
        employee_id: att.employee_id || 'N/A',
        date: new Date(att.date).toLocaleDateString(),
        status: att.status.toUpperCase(),
        check_in_time: att.check_in_time ? new Date(att.check_in_time).toLocaleTimeString() : 'N/A',
        check_out_time: att.check_out_time ? new Date(att.check_out_time).toLocaleTimeString() : 'N/A'
      });
    });
  } else if (type === 'performance') {
    const sheet = workbook.addWorksheet('Performance Report');
    sheet.columns = [
      { header: 'Rank', key: 'rank', width: 10 },
      { header: 'EMP ID', key: 'employee_id', width: 15 },
      { header: 'Employee Name', key: 'name', width: 25 },
      { header: 'Designation', key: 'designation', width: 25 },
      { header: 'Performance Score (%)', key: 'performance_score', width: 25 }
    ];
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { name: 'Arial', family: 2, size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF082340' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    data.performance.forEach((perf, idx) => {
      sheet.addRow({
        rank: idx + 1,
        employee_id: perf.employee_id,
        name: perf.name,
        designation: perf.designation,
        performance_score: parseFloat(perf.performance_score)
      });
    });
  } else if (type === 'lead') {
    const leadSheet = workbook.addWorksheet('Leads Summary');
    leadSheet.columns = [
      { header: 'Lead Name', key: 'lead_name', width: 22 },
      { header: 'Mobile Number', key: 'mobile_number', width: 18 },
      { header: 'Destination', key: 'destination', width: 20 },
      { header: 'Package interested', key: 'package_interested', width: 30 },
      { header: 'Budget ($)', key: 'budget', width: 15 },
      { header: 'Source', key: 'source', width: 18 },
      { header: 'Status', key: 'status', width: 20 },
      { header: 'Assigned Executive', key: 'assigned_staff_name', width: 25 }
    ];
    leadSheet.getRow(1).eachCell((cell) => {
      cell.font = { name: 'Arial', family: 2, size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D6EFD' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    data.leads.forEach((lead) => {
      leadSheet.addRow({
        lead_name: lead.lead_name,
        mobile_number: lead.mobile_number,
        destination: lead.destination,
        package_interested: lead.package_interested,
        budget: parseFloat(lead.budget || 0),
        source: lead.source,
        status: lead.status.replace(/_/g, ' ').toUpperCase(),
        assigned_staff_name: lead.assigned_staff_name || 'Unassigned'
      });
    });
  } else if (type === 'task') {
    const taskSheet = workbook.addWorksheet('Tasks Report');
    taskSheet.columns = [
      { header: 'Task ID', key: 'task_id', width: 15 },
      { header: 'Title', key: 'title', width: 35 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Status', key: 'status', width: 18 },
      { header: 'Progress (%)', key: 'progress_percentage', width: 15 },
      { header: 'Assigned To', key: 'assigned_to_name', width: 25 },
      { header: 'Due Date', key: 'due_date', width: 20 }
    ];
    taskSheet.getRow(1).eachCell((cell) => {
      cell.font = { name: 'Arial', family: 2, size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF082340' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    data.tasks.forEach((task) => {
      taskSheet.addRow({
        task_id: task.task_id,
        title: task.title,
        priority: task.priority.toUpperCase(),
        status: task.status.replace(/_/g, ' ').toUpperCase(),
        progress_percentage: task.progress_percentage,
        assigned_to_name: task.assigned_to_name || 'Unassigned',
        due_date: new Date(task.due_date).toLocaleDateString()
      });
    });
  } else {
    const taskSheet = workbook.addWorksheet('Tasks Report');
    taskSheet.columns = [
      { header: 'Task ID', key: 'task_id', width: 15 },
      { header: 'Title', key: 'title', width: 35 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Status', key: 'status', width: 18 },
      { header: 'Progress (%)', key: 'progress_percentage', width: 15 },
      { header: 'Assigned To', key: 'assigned_to_name', width: 25 },
      { header: 'Due Date', key: 'due_date', width: 20 }
    ];
    taskSheet.getRow(1).eachCell((cell) => {
      cell.font = { name: 'Arial', family: 2, size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF082340' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    data.tasks.forEach((task) => {
      taskSheet.addRow({
        task_id: task.task_id,
        title: task.title,
        priority: task.priority.toUpperCase(),
        status: task.status.replace(/_/g, ' ').toUpperCase(),
        progress_percentage: task.progress_percentage,
        assigned_to_name: task.assigned_to_name || 'Unassigned',
        due_date: new Date(task.due_date).toLocaleDateString()
      });
    });

    const leadSheet = workbook.addWorksheet('Leads Summary');
    leadSheet.columns = [
      { header: 'Lead Name', key: 'lead_name', width: 22 },
      { header: 'Mobile Number', key: 'mobile_number', width: 18 },
      { header: 'Destination', key: 'destination', width: 20 },
      { header: 'Package interested', key: 'package_interested', width: 30 },
      { header: 'Budget ($)', key: 'budget', width: 15 },
      { header: 'Source', key: 'source', width: 18 },
      { header: 'Status', key: 'status', width: 20 },
      { header: 'Assigned Executive', key: 'assigned_staff_name', width: 25 }
    ];
    leadSheet.getRow(1).eachCell((cell) => {
      cell.font = { name: 'Arial', family: 2, size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D6EFD' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    if (data.leads && data.leads.length > 0) {
      data.leads.forEach((lead) => {
        leadSheet.addRow({
          lead_name: lead.lead_name,
          mobile_number: lead.mobile_number,
          destination: lead.destination,
          package_interested: lead.package_interested,
          budget: parseFloat(lead.budget || 0),
          source: lead.source,
          status: lead.status.replace(/_/g, ' ').toUpperCase(),
          assigned_staff_name: lead.assigned_staff_name || 'Unassigned'
        });
      });
    }
  }

  // Write to Response Stream
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=Aspire_Report_${Date.now()}.xlsx`
  );

  await workbook.xlsx.write(res);
  res.end();
};

const _setupExcelSheets = (workbook) => {
  const deptSheet = workbook.addWorksheet('Department Summary');
  deptSheet.columns = [
    { header: 'Department', key: 'department', width: 25 },
    { header: 'Employee Count', key: 'employee_count', width: 18 },
    { header: 'Total Tasks', key: 'total_tasks', width: 15 },
    { header: 'Completed Tasks', key: 'completed_tasks', width: 18 },
    { header: 'Pending Tasks', key: 'pending_tasks', width: 15 },
    { header: 'In Progress Tasks', key: 'in_progress_tasks', width: 18 },
    { header: 'In Review Tasks', key: 'in_review_tasks', width: 18 },
    { header: 'Completion Percentage', key: 'completion_percentage', width: 22 }
  ];

  const empSheet = workbook.addWorksheet('Employee Summary');
  empSheet.columns = [
    { header: 'Employee ID', key: 'employee_id', width: 15 },
    { header: 'Employee Name', key: 'employee_name', width: 25 },
    { header: 'Department', key: 'department', width: 25 },
    { header: 'Role', key: 'role', width: 15 },
    { header: 'Designation', key: 'designation', width: 22 },
    { header: 'Total Tasks', key: 'total_tasks', width: 15 },
    { header: 'Completed', key: 'completed', width: 15 },
    { header: 'Pending', key: 'pending', width: 15 },
    { header: 'In Progress', key: 'in_progress', width: 15 },
    { header: 'In Review', key: 'in_review', width: 15 },
    { header: 'Completion Percentage', key: 'completion_percentage', width: 22 }
  ];

  const taskSheet = workbook.addWorksheet('Task Details');
  taskSheet.columns = [
    { header: 'Department', key: 'department', width: 25 },
    { header: 'Employee ID', key: 'employee_id', width: 15 },
    { header: 'Employee Name', key: 'employee_name', width: 25 },
    { header: 'Task ID', key: 'task_code', width: 15 },
    { header: 'Task Title', key: 'title', width: 35 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Priority', key: 'priority', width: 15 },
    { header: 'Status', key: 'status', width: 18 },
    { header: 'Assigned By', key: 'assigned_by', width: 20 },
    { header: 'Assigned Date', key: 'assigned_date', width: 18 },
    { header: 'Start Date', key: 'start_date', width: 18 },
    { header: 'Due Date', key: 'due_date', width: 18 },
    { header: 'Completed Date', key: 'completed_date', width: 18 }
  ];

  [deptSheet, empSheet, taskSheet].forEach(sheet => {
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF082340' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: sheet.columns.length }
    };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
  });

  return { deptSheet, empSheet, taskSheet };
};

const _populateExcelData = (sheets, data) => {
  const { deptSheet, empSheet, taskSheet } = sheets;
  const dept = data.department;
  const sum = data.summary;

  deptSheet.addRow({
    department: dept.name,
    employee_count: sum.employee_count,
    total_tasks: sum.total_tasks,
    completed_tasks: sum.completed_tasks,
    pending_tasks: sum.pending_tasks,
    in_progress_tasks: sum.in_progress_tasks,
    in_review_tasks: sum.in_review_tasks,
    completion_percentage: sum.completion_percentage / 100
  }).getCell('completion_percentage').numFmt = '0.00%';

  if (data.employees) {
    for (const emp of data.employees) {
      empSheet.addRow({
        employee_id: emp.employee_code,
        employee_name: emp.name,
        department: dept.name,
        role: emp.role.toUpperCase(),
        designation: emp.designation,
        total_tasks: emp.summary.total_tasks,
        completed: emp.summary.completed_tasks,
        pending: emp.summary.pending_tasks,
        in_progress: emp.summary.in_progress_tasks,
        in_review: emp.summary.in_review_tasks,
        completion_percentage: emp.summary.completion_percentage / 100
      }).getCell('completion_percentage').numFmt = '0.00%';

      if (emp.tasks) {
        for (const t of emp.tasks) {
          taskSheet.addRow({
            department: dept.name,
            employee_id: emp.employee_code,
            employee_name: emp.name,
            task_code: t.task_code,
            title: t.title,
            description: t.description || '',
            priority: t.priority.toUpperCase(),
            status: t.status.replace(/_/g, ' ').toUpperCase(),
            assigned_by: t.assigned_by || '',
            assigned_date: t.assigned_date ? new Date(t.assigned_date) : null,
            start_date: t.start_date ? new Date(t.start_date) : null,
            due_date: t.due_date ? new Date(t.due_date) : null,
            completed_date: t.completed_date ? new Date(t.completed_date) : null
          });
        }
      }
    }
  }
};

const generateDepartmentExcel = async (res, data) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Aspire';
  const sheets = _setupExcelSheets(workbook);
  
  _populateExcelData(sheets, data);

  await workbook.xlsx.write(res);
  res.end();
};

const generateAllDepartmentsExcel = async (res, allData) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Aspire';
  const sheets = _setupExcelSheets(workbook);

  for (const deptData of allData) {
    _populateExcelData(sheets, deptData);
  }

  await workbook.xlsx.write(res);
  res.end();
};

module.exports = {
  generateReportExcel,
  generateDepartmentExcel,
  generateAllDepartmentsExcel
};
