const express = require('express');
const router = express.Router();
const canhBaoChiSoController = require('../controller/canhBaoChiSoController');
const { authenticate, authorize } = require('../middlewares/auth');

router.get('/loai', authenticate, canhBaoChiSoController.getDanhSachLoai);

// Chỉ nhân viên y tế mới được gửi cảnh báo chỉ số
router.post(
    '/',
    authenticate,
    authorize('super_admin', 'quan_ly_y_te', 'dieu_duong', 'dieu_duong_truong'),
    canhBaoChiSoController.create
);

module.exports = router;
