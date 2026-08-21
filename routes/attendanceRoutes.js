const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/adminMiddleware');

router.use(authenticateJWT);

const upload = require('../middleware/uploadMiddleware');

router.get('/', attendanceController.getAttendance);
router.get('/settings', attendanceController.getAttendanceSettings);
router.get('/history', attendanceController.getAttendanceHistory);
router.get('/export/csv', attendanceController.exportAttendanceCSV);
router.get('/export/excel', attendanceController.exportAttendanceExcel);
router.get('/export/pdf', attendanceController.exportAttendancePDF);
router.get('/today', attendanceController.getTodayStatus);
router.get('/dashboard', attendanceController.getAttendanceDashboard);
router.post('/mark', upload.single('selfie'), attendanceController.markAttendance);
router.post('/breaks/start', attendanceController.startBreak);
router.put('/breaks/end', attendanceController.endBreak);
router.put('/:id', isAdmin, attendanceController.updateAttendance);

module.exports = router;
