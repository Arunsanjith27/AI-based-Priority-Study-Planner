
const express = require('express');
const router = express.Router();

const {
  generateDaily,
  generateWeekly,
} = require('../controllers/plannerController');

const { authenticate } = require('../middleware/auth');

router.post('/daily', authenticate, generateDaily);
router.post('/weekly', authenticate, generateWeekly);

module.exports = router;

