const multer = require('multer');

// Configure memory storage since we send files to Cloudinary/Mock API
const storage = multer.memoryStorage();

const path = require('path');

// File filters to support common business attachments (docs, sheets, images, pdfs)
const fileFilter = (req, file, cb) => {
  console.log('UPLOAD FILE DEBUG', {
    originalname: file.originalname,
    mimetype: file.mimetype,
    fieldname: file.fieldname
  });

  const ext = path.extname(file.originalname).toLowerCase();

  const allowedExtensions = [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.txt'
  ];

  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/octet-stream'
  ];

  const extensionAllowed = allowedExtensions.includes(ext);
  const mimeAllowed =
    allowedMimeTypes.includes(file.mimetype?.toLowerCase()) ||
    file.mimetype === 'application/octet-stream';
  console.log({
    extension: ext,
    mimeType: file.mimetype,
    extensionAllowed,
    mimeAllowed
  });
  if (extensionAllowed && mimeAllowed) {
    return cb(null, true);
  }

  return cb(
    new Error(
      'Invalid file type. Supported types: JPEG, PNG, GIF, PDF, DOC, DOCX, XLS, XLSX, TXT'
    ),
    false
  );
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB maximum file size limit
  }
});

module.exports = upload;
