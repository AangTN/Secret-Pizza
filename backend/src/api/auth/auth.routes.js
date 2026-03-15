const express = require('express');
const controller = require('./auth.controller');
const { requireAuth, requireAdmin } = require('../../middleware/auth.middleware');

const router = express.Router();

router.post('/register', controller.register);
router.post('/verify-email', controller.verifyEmail);
router.post('/login', controller.login);
router.post('/google/login', controller.googleLogin);
router.post('/admin/login', controller.adminLogin);
router.get('/me', requireAuth, controller.getMe);
router.get('/admin/me', requireAdmin, controller.getAdminMe);
router.post('/refresh', controller.refreshTokens);
router.post('/admin/refresh', controller.refreshAdminTokens);
router.post('/logout', controller.logout);
router.post('/admin/logout', controller.adminLogout);

module.exports = router;
