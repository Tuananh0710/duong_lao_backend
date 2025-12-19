const express = require('express');
const router = express.Router();
const BenhNhanController = require('../controller/benhNhanController')
const { authenticate,checkAppPermission } = require('../middlewares/auth');

router.get('/tong_so/:idDieuDuong', authenticate, BenhNhanController.getTongSoBenhNhan);
router.get('/ds/:idDieuDuong', authenticate, BenhNhanController.getDsBenhNhan);
router.get('/:id', authenticate, BenhNhanController.getThongTinBenhNhan);
router.get('/nguoi-nha/ds', authenticate, BenhNhanController.getDsBenhNhanByNguoiNha);

module.exports = router;