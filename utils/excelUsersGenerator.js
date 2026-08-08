const ExcelJS = require('exceljs');

/**
 * Generates a styled Excel workbook for all system users
 * @param {NodeJS.WritableStream} res - Express response stream
 * @param {Array} users - List of users
 */
const generateUsersExcel = async (res, users) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Aspire';
  workbook.lastModifiedBy = 'Aspire';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('System Users');

  // Columns definition
  sheet.columns = [
    { header: 'Employee ID', key: 'employee_id', width: 15 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Phone', key: 'phone', width: 18 },
    { header: 'Role', key: 'role', width: 15 },
    { header: 'Department', key: 'department_name', width: 25 },
    { header: 'Designation', key: 'designation', width: 25 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Joining Date', key: 'joining_date', width: 18 }
  ];

  // Header row formatting
  sheet.getRow(1).eachCell((cell) => {
    cell.font = { name: 'Arial', family: 2, size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF082340' } // Corporate dark blue
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Populate data rows
  users.forEach((user) => {
    sheet.addRow({
      employee_id: user.employee_id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role.toUpperCase(),
      department_name: user.department_name || 'General',
      designation: user.designation,
      status: (user.status || 'active').toUpperCase(),
      joining_date: user.joining_date ? new Date(user.joining_date).toLocaleDateString() : 'N/A'
    });
  });

  // Align cells
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.getCell('employee_id').alignment = { horizontal: 'center' };
      row.getCell('role').alignment = { horizontal: 'center' };
      row.getCell('status').alignment = { horizontal: 'center' };
      row.getCell('joining_date').alignment = { horizontal: 'center' };
    }
  });

  // Set response headers
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=Aspire_Users_Directory_${Date.now()}.xlsx`
  );

  await workbook.xlsx.write(res);
  res.end();
};

module.exports = {
  generateUsersExcel
};
