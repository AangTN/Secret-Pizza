const { requireAdmin } = require('../../middleware/auth.middleware');
const express = require('express');
const router = express.Router();
const branchController = require('./branch.controller');

router.get('/', branchController.getBranches);

module.exports = router;
