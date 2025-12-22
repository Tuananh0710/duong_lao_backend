const express = require('express');
const router = express.Router();
const nhanVienController = require('../controller/nhanVienController')
const { authenticate,checkAppPermission } = require('../middlewares/auth');

router.get('/:idBenhNhan', authenticate, nhanVienController.layDanhSachNhanVien);
router.get('/ds/:idDieuDuong', authenticate,nhanVienController.layChiTietNhanVien);

module.exports = router;