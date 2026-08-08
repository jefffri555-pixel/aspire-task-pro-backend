const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const db = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend cross-origin requests
app.use(cors({
  origin: true,
  credentials: true,
  exposedHeaders: [
    'Content-Disposition',
    'Content-Type',
    'Content-Length'
  ]
}));

// Parse requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure mock upload directory exists for local fallback uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Ensure audio MIME types are recognized
express.static.mime.define({
  'audio/webm': ['webm'],
  'audio/ogg': ['ogg'],
  'audio/mpeg': ['mp3'],
  'audio/mp4': ['m4a', 'mp4'],
});

// Serve uploads statically so the frontend can retrieve mock files
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Accept-Ranges', 'bytes');
  next();
});
app.use('/uploads', express.static(uploadDir));

// Serve backups statically so the admin can download the SQL file directly
const backupDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}
app.use('/backups', express.static(backupDir));

// Route Mountings
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/leads', require('./routes/leadRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/departments', require('./routes/departmentRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/leaves', require('./routes/leaveRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));


// Root Health Check Route
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    timestamp: new Date(),
    service: 'Aspire Task Pro API Server'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('UPLOAD ERROR:', err);

  if (
    err.message &&
    err.message.startsWith('Invalid file type')
  ) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File size exceeds the allowed limit'
    });
  }

  return res.status(500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// Test DB Connection and Launch
const startServer = async () => {
  try {
    // Quick query test
    const dbTest = await db.query('SELECT NOW()');
    if (!dbTest || !dbTest.rows || dbTest.rows.length === 0 || (db.isConnectionFailed && db.isConnectionFailed())) {
      if (db.setConnectionFailed) db.setConnectionFailed(true);
      throw new Error('Database connection failed (mock mode active)');
    }
    console.log(`Database connected successfully at: ${dbTest.rows[0].now}`);

    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(` Aspire Task Pro Backend listening on port ${PORT}`);
      console.log(` Mode: ${process.env.NODE_ENV || 'development'}`);
      console.log(` Health check: http://localhost:${PORT}/health`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('Fatal: Could not connect to PostgreSQL database.', err.message);
    console.log('Ensure PostgreSQL is running and credentials in .env are correct.');
    console.log('Starting API server anyway to allow mock server operation...');

    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(` Aspire Task Pro Backend running with database fallback`);
      console.log(` listening on port ${PORT}`);
      console.log(`====================================================`);
    });
  }
};

startServer();
