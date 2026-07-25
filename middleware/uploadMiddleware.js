const multer = require('multer');

// Configure memory storage since we send files to Cloudinary/Mock API
const storage = multer.memoryStorage();

// File filters to support common business attachments (docs, sheets, images, pdfs)
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Supported types: JPEG, PNG, GIF, PDF, DOC, DOCX, XLS, XLSX, TXT'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB maximum file size limit
  }
});

module.exports = upload;
