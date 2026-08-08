const multer = require('multer');
const path = require('path');

// Configure memory storage
const storage = multer.memoryStorage();

// File filters to support audio
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  const allowedExtensions = [
    '.webm',
    '.ogg',
    '.mp3',
    '.mp4',
    '.m4a',
    '.aac',
    '.wav'
  ];

  const allowedMimeTypes = [
    'audio/webm',
    'audio/ogg',
    'audio/mpeg',
    'audio/mp3',
    'audio/mp4',
    'audio/m4a',
    'audio/aac',
    'audio/x-m4a',
    'audio/wav',
    'application/octet-stream' // sometimes sent by browsers
  ];

  const extensionAllowed = allowedExtensions.includes(ext);
  const mimeAllowed = allowedMimeTypes.includes(file.mimetype?.toLowerCase());

  if (extensionAllowed && mimeAllowed) {
    return cb(null, true);
  }

  return cb(
    new Error(
      'Invalid audio file type. Supported types: WEBM, OGG, MP3, MP4, M4A, AAC, WAV'
    ),
    false
  );
};

const audioUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB maximum file size limit
  }
});

module.exports = audioUpload;
