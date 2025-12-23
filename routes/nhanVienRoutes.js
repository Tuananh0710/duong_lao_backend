const express = require('express');
const router = express.Router();
const nhanVienController = require('../controller/nhanVienController')
const { authenticate,checkAppPermission } = require('../middlewares/auth');

router.get('/ds/:idBenhNhan', authenticate, nhanVienController.layDanhSachNhanVien);
router.get('/thong-tin/:idNhanVien', authenticate,nhanVienController.layChiTietNhanVien)

module.exports = router;