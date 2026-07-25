const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const { authenticateJWT } = require('../middleware/authMiddleware');

// Protect all routes
router.use(authenticateJWT);

router.get('/', leadController.getLeads);
router.get('/:id', leadController.getLeadById);
router.post('/', leadController.createLead);
router.put('/:id', leadController.updateLead);
router.post('/:id/follow-up', leadController.addFollowUp);

module.exports = router;
