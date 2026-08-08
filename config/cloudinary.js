require('dotenv').config();

const cloudinaryConfigured = 
  process.env.CLOUDINARY_CLOUD_NAME && 
  process.env.CLOUDINARY_API_KEY && 
  process.env.CLOUDINARY_API_SECRET;

let cloudinaryInstance = null;

if (cloudinaryConfigured) {
  try {
    const cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    cloudinaryInstance = cloudinary;
    console.log('Cloudinary storage engine configured successfully.');
  } catch (err) {
    console.warn('Failed to initialize Cloudinary library. Falling back to local file storage.', err.message);
  }
} else {
  console.log('Cloudinary credentials missing. Defaulting to local storage mock simulator.');
}

/**
 * Upload helper that handles both Cloudinary and Local mock fallback
 * @param {Object} fileMulter - Multer file object
 * @returns {Promise<{url: string, public_id: string}>}
 */
const uploadAttachment = async (fileMulter) => {
  if (cloudinaryInstance) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinaryInstance.uploader.upload_stream(
        { folder: 'aspire_task_pro_attachments' },
        (error, result) => {
          if (error) return reject(error);
          resolve({
            url: result.secure_url,
            public_id: result.public_id
          });
        }
      );
      uploadStream.end(fileMulter.buffer);
    });
  } else {
    // Return mock URL for local testing and save it locally
    const fs = require('fs');
    const path = require('path');
    const simulatedFileName = `${Date.now()}-${fileMulter.originalname.replace(/\s+/g, '_')}`;
    try {
      const uploadDir = path.join(__dirname, '../uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      fs.writeFileSync(path.join(uploadDir, simulatedFileName), fileMulter.buffer);
    } catch (e) {
      console.error('Error saving local mock upload:', e);
    }
    return {
      url: `/uploads/${simulatedFileName}`,
      public_id: `mock_id_${Date.now()}`
    };
  }
};

const uploadAudio = async (fileMulter) => {
  if (cloudinaryInstance) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinaryInstance.uploader.upload_stream(
        { folder: 'aspire_task_pro_voice', resource_type: 'video' },
        (error, result) => {
          if (error) return reject(error);
          resolve({
            url: result.secure_url,
            public_id: result.public_id
          });
        }
      );
      uploadStream.end(fileMulter.buffer);
    });
  } else {
    // Return mock URL for local testing and save it locally
    const fs = require('fs');
    const path = require('path');
    const simulatedFileName = `${Date.now()}-${fileMulter.originalname.replace(/\s+/g, '_')}`;
    try {
      const uploadDir = path.join(__dirname, '../uploads/voice');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      fs.writeFileSync(path.join(uploadDir, simulatedFileName), fileMulter.buffer);
    } catch (e) {
      console.error('Error saving local mock voice upload:', e);
    }
    return {
      url: `/uploads/voice/${simulatedFileName}`,
      public_id: `mock_voice_id_${Date.now()}`
    };
  }
};

module.exports = {
  cloudinary: cloudinaryInstance,
  uploadAttachment,
  uploadAudio
};
