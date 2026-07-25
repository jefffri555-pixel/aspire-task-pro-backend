const PDFDocument = require('pdfkit');

/**
 * Generates a styled PDF report for Aspire Holidays users
 * @param {NodeJS.WritableStream} res - Express response stream
 * @param {Array} users - List of users
 */
const generateUsersPDF = (res, users) => {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  // Stream directly to response
  doc.pipe(res);

  // Set response headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=Aspire_Users_Directory_${Date.now()}.pdf`
  );

  // 1. Header Section
  doc.fillColor('#082340')
     .fontSize(22)
     .text('ASPIRE HOLIDAYS', { align: 'center', bold: true })
     .fontSize(14)
     .text('Users Directory & Contact Ledger', { align: 'center' })
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
     .text(`Total Accounts Listed: ${users.length}`)
     .moveDown();

  // 3. Users Table
  doc.fillColor('#082340')
     .fontSize(12)
     .text('EMPLOYEE INVENTORY', { bold: true })
     .moveDown(0.5);

  // Table Headers
  const tableTop = doc.y;
  doc.fillColor('#082340').fontSize(9);
  doc.text('ID', 50, tableTop, { bold: true, width: 60 });
  doc.text('Name', 110, tableTop, { bold: true, width: 120 });
  doc.text('Email / Phone', 230, tableTop, { bold: true, width: 140 });
  doc.text('Role / Designation', 370, tableTop, { bold: true, width: 110 });
  doc.text('Status', 490, tableTop, { bold: true, width: 55 });

  doc.strokeColor('#CBD5E1')
     .lineWidth(1)
     .moveTo(50, tableTop + 15)
     .lineTo(545, tableTop + 15)
     .stroke();

  let nextY = tableTop + 22;
  doc.fillColor('#333333');

  users.forEach((user) => {
    // Check page boundaries
    if (nextY > 730) {
      doc.addPage();
      nextY = 50;
    }

    doc.text(user.employee_id || '', 50, nextY, { width: 60 });
    doc.text(user.name || '', 110, nextY, { width: 120, ellipsis: true });
    doc.text(`${user.email || ''}\n${user.phone || ''}`, 230, nextY, { width: 140 });
    doc.text(`${(user.role || '').toUpperCase()}\n${user.designation || ''}`, 370, nextY, { width: 110 });
    doc.text((user.status || 'active').toUpperCase(), 490, nextY, { width: 55 });

    nextY += 32; // slightly taller to fit wrapping fields
  });

  // Footer Branding
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    doc.fontSize(8)
       .fillColor('#94A3B8')
       .text('Confidential - Aspire Holidays User Management Directory', 50, 780, { align: 'center' });
  }

  doc.end();
};

module.exports = {
  generateUsersPDF
};
