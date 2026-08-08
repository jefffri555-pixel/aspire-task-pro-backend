const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateJWT } = require('../middleware/authMiddleware');

// Protect all routes
router.use(authenticateJWT);

router.get('/dashboard', reportController.getDashboardStats);

// New Scope-based Report Endpoints
router.get('/departments', reportController.getDepartmentsForReports);

router.get('/department/:departmentId/data', reportController.getDepartmentReportData);
router.get(
  '/department/:departmentId/pdf',
  (req, res, next) => {
    console.log('DEPARTMENT PDF ROUTE HIT', {
      departmentId: req.params.departmentId,
      user: req.user
    });
    next();
  },
  reportController.exportDepartmentPDF
);
router.get(
  '/department/:departmentId/excel',
  (req, res, next) => {
    console.log('DEPARTMENT EXCEL ROUTE HIT', {
      departmentId: req.params.departmentId,
      user: req.user
    });
    next();
  },
  reportController.exportDepartmentExcel
);

router.get('/all/data', reportController.getAllDepartmentsReportData);
router.get(
  '/all/pdf',
  (req, res, next) => {
    console.log('ALL DEPARTMENTS PDF ROUTE HIT', {
      user: req.user
    });
    next();
  },
  reportController.exportAllDepartmentsPDF
);
router.get(
  '/all/excel',
  (req, res, next) => {
    console.log('ALL DEPARTMENTS EXCEL ROUTE HIT', {
      user: req.user
    });
    next();
  },
  reportController.exportAllDepartmentsExcel
);

// Legacy routes for backward compatibility
router.get('/export/pdf', reportController.exportPDF);
router.get('/export/excel', reportController.exportExcel);

module.exports = router;
