const PDFDocument = require('pdfkit');

/**
 * Generates a styled PDF report for Aspire Holidays task performance metrics
 * @param {NodeJS.WritableStream} res - Express response stream
 * @param {Object} data - Contains title, summary, tasks list, performance scores
 */
const generateReportPDF = (res, data) => {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  // Stream directly to response
  doc.pipe(res);

  // 1. Header Section
  doc.fillColor('#082340')
     .fontSize(22)
     .text('ASPIRE HOLIDAYS', { align: 'center', bold: true })
     .fontSize(14)
     .text('Aspire Task Pro - Productivity Report', { align: 'center' })
     .moveDown();

  doc.strokeColor('#0D6EFD')
     .lineWidth(2)
     .moveTo(50, 110)
     .lineTo(545, 110)
     .stroke()
     .moveDown(1.5);

  // 2. Metadata Section
  doc.fillColor('#333333')
     .fontSize(10)
     .text(`Report Generated On: ${new Date().toLocaleDateString()}`)
     .text(`Role Context: ${data.role || 'Manager'}`)
     .text(`Scope: ${data.scope || 'Monthly Summary'}`)
     .moveDown();

  // 3. Stats Summary Cards
  doc.fillColor('#082340')
     .fontSize(12)
     .text('PERFORMANCE HIGHLIGHTS', { bold: true })
     .moveDown(0.5);

  const startY = doc.y;
  // Card 1
  doc.rect(50, startY, 150, 60).fillAndStroke('#F1F5F9', '#CBD5E1');
  doc.fillColor('#082340').fontSize(8).text('TOTAL TASKS', 60, startY + 12);
  doc.fontSize(16).text(String(data.summary.totalTasks), 60, startY + 28);

  // Card 2
  doc.rect(210, startY, 150, 60).fillAndStroke('#F1F5F9', '#CBD5E1');
  doc.fillColor('#082340').fontSize(8).text('COMPLETED TASKS', 220, startY + 12);
  doc.fontSize(16).text(String(data.summary.completedTasks), 220, startY + 28);

  // Card 3
  doc.rect(370, startY, 175, 60).fillAndStroke('#E8F5E9', '#A5D6A7');
  doc.fillColor('#2E7D32').fontSize(8).text('PRODUCTIVITY SCORE', 380, startY + 12);
  doc.fontSize(16).text(`${data.summary.productivityScore}%`, 380, startY + 28);

  doc.y = startY + 80;

  // 4. Report Contents Table
  const type = data.type || 'all';
  doc.fillColor('#082340')
     .fontSize(12)
     .text(`${type.toUpperCase()} REPORT CONTENTS`, { bold: true })
     .moveDown(0.5);

  const tableTop = doc.y;
  doc.fillColor('#082340').fontSize(9);
  
  if (type === 'employee') {
    doc.text('EMP ID', 50, tableTop, { bold: true, width: 60 });
    doc.text('Name', 110, tableTop, { bold: true, width: 140 });
    doc.text('Designation', 260, tableTop, { bold: true, width: 100 });
    doc.text('Role', 370, tableTop, { bold: true, width: 80 });
    doc.text('Score', 460, tableTop, { bold: true, width: 80 });
    
    doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke();
    let nextY = tableTop + 22;
    doc.fillColor('#333333');
    data.employees.forEach((emp) => {
      if (nextY > 750) { doc.addPage(); nextY = 50; }
      doc.text(emp.employee_id, 50, nextY, { width: 60 });
      doc.text(emp.name, 110, nextY, { width: 140, ellipsis: true });
      doc.text(emp.designation, 260, nextY, { width: 100, ellipsis: true });
      doc.text(emp.role.toUpperCase(), 370, nextY, { width: 80 });
      doc.text(`${emp.performance_score}%`, 460, nextY, { width: 80 });
      nextY += 18;
    });
  } else if (type === 'project') {
    doc.text('Code', 50, tableTop, { bold: true, width: 70 });
    doc.text('Project Name', 130, tableTop, { bold: true, width: 160 });
    doc.text('Client', 300, tableTop, { bold: true, width: 100 });
    doc.text('Progress', 410, tableTop, { bold: true, width: 60 });
    doc.text('Status', 480, tableTop, { bold: true, width: 70 });
    
    doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke();
    let nextY = tableTop + 22;
    doc.fillColor('#333333');
    data.projects.forEach((proj) => {
      if (nextY > 750) { doc.addPage(); nextY = 50; }
      doc.text(proj.project_id || 'N/A', 50, nextY, { width: 70 });
      doc.text(proj.name, 130, nextY, { width: 160, ellipsis: true });
      doc.text(proj.client_name, 300, nextY, { width: 100, ellipsis: true });
      doc.text(`${proj.progress_percentage}%`, 410, nextY, { width: 60 });
      doc.text(proj.status.toUpperCase().replace(/_/g, ' '), 480, nextY, { width: 70 });
      nextY += 18;
    });
  } else if (type === 'department') {
    doc.text('Department Name', 50, tableTop, { bold: true, width: 200 });
    doc.text('Total Employees', 270, tableTop, { bold: true, width: 120 });
    doc.text('Active Projects', 410, tableTop, { bold: true, width: 120 });
    
    doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke();
    let nextY = tableTop + 22;
    doc.fillColor('#333333');
    data.departments.forEach((dept) => {
      if (nextY > 750) { doc.addPage(); nextY = 50; }
      doc.text(dept.name, 50, nextY, { width: 200 });
      doc.text(String(dept.employee_count), 270, nextY, { width: 120 });
      doc.text(String(dept.project_count), 410, nextY, { width: 120 });
      nextY += 18;
    });
  } else if (type === 'lead') {
    doc.text('Lead Name', 50, tableTop, { bold: true, width: 120 });
    doc.text('Destination', 180, tableTop, { bold: true, width: 110 });
    doc.text('Budget', 300, tableTop, { bold: true, width: 80 });
    doc.text('Source', 390, tableTop, { bold: true, width: 80 });
    doc.text('Status', 480, tableTop, { bold: true, width: 70 });
    
    doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke();
    let nextY = tableTop + 22;
    doc.fillColor('#333333');
    data.leads.forEach((lead) => {
      if (nextY > 750) { doc.addPage(); nextY = 50; }
      doc.text(lead.lead_name, 50, nextY, { width: 120, ellipsis: true });
      doc.text(lead.destination, 180, nextY, { width: 110, ellipsis: true });
      doc.text(`$${parseFloat(lead.budget).toLocaleString()}`, 300, nextY, { width: 80 });
      doc.text(lead.source, 390, nextY, { width: 80, ellipsis: true });
      doc.text(lead.status.replace(/_/g, ' '), 480, nextY, { width: 70 });
      nextY += 18;
    });
  } else if (type === 'attendance') {
    doc.text('Employee', 50, tableTop, { bold: true, width: 120 });
    doc.text('Date', 180, tableTop, { bold: true, width: 90 });
    doc.text('Check-In', 280, tableTop, { bold: true, width: 90 });
    doc.text('Check-Out', 380, tableTop, { bold: true, width: 90 });
    doc.text('Status', 480, tableTop, { bold: true, width: 70 });
    
    doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke();
    let nextY = tableTop + 22;
    doc.fillColor('#333333');
    data.attendance.forEach((att) => {
      if (nextY > 750) { doc.addPage(); nextY = 50; }
      doc.text(att.employee_name || 'N/A', 50, nextY, { width: 120, ellipsis: true });
      doc.text(new Date(att.date).toLocaleDateString(), 180, nextY, { width: 90 });
      doc.text(att.check_in_time ? new Date(att.check_in_time).toLocaleTimeString() : 'N/A', 280, nextY, { width: 90 });
      doc.text(att.check_out_time ? new Date(att.check_out_time).toLocaleTimeString() : 'N/A', 380, nextY, { width: 90 });
      doc.text(att.status.toUpperCase(), 480, nextY, { width: 70 });
      nextY += 18;
    });
  } else if (type === 'performance') {
    doc.text('Rank', 50, tableTop, { bold: true, width: 50 });
    doc.text('Employee Name', 110, tableTop, { bold: true, width: 160 });
    doc.text('Designation', 280, tableTop, { bold: true, width: 160 });
    doc.text('Score', 450, tableTop, { bold: true, width: 90 });
    
    doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke();
    let nextY = tableTop + 22;
    doc.fillColor('#333333');
    data.performance.forEach((perf, idx) => {
      if (nextY > 750) { doc.addPage(); nextY = 50; }
      doc.text(`#${idx + 1}`, 50, nextY, { width: 50 });
      doc.text(perf.name, 110, nextY, { width: 160, ellipsis: true });
      doc.text(perf.designation, 280, nextY, { width: 160, ellipsis: true });
      doc.text(`${perf.performance_score}%`, 450, nextY, { width: 90 });
      nextY += 18;
    });
  } else {
    // Default task inventory overview (legacy)
    doc.text('ID', 50, tableTop, { bold: true, width: 60 });
    doc.text('Task Title', 110, tableTop, { bold: true, width: 180 });
    doc.text('Priority', 300, tableTop, { bold: true, width: 60 });
    doc.text('Status', 370, tableTop, { bold: true, width: 90 });
    doc.text('Progress', 470, tableTop, { bold: true, width: 75 });
    
    doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke();
    let nextY = tableTop + 22;
    doc.fillColor('#333333');
    data.tasks.forEach((task) => {
      if (nextY > 750) { doc.addPage(); nextY = 50; }
      doc.text(task.task_id, 50, nextY, { width: 60 });
      doc.text(task.title, 110, nextY, { width: 180, ellipsis: true });
      doc.text(task.priority.toUpperCase(), 300, nextY, { width: 60 });
      doc.text(task.status.replace(/_/g, ' '), 370, nextY, { width: 90 });
      doc.text(`${task.progress_percentage}%`, 470, nextY, { width: 75 });
      nextY += 18;
    });
  }

  // Footer Branding
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    doc.fontSize(8)
       .fillColor('#94A3B8')
       .text('Confidential - Aspire Holidays Internal Workflow Application', 50, 780, { align: 'center' });
  }

  doc.end();
};

module.exports = {
  generateReportPDF
};
