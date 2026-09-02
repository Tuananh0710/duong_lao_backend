const express = require('express');
const router = express.Router();
const tuThuocController = require('../controller/tuThuocController');
const { authenticate } = require('../middlewares/auth');

router.use(authenticate);

router.get('/phan-loai', tuThuocController.getDsPhanLoai);
router.get('/thong-ke', tuThuocController.thongKe);
router.get('/', tuThuocController.getDsThuoc);
router.get('/:id', tuThuocController.getChiTiet);

module.exports = router;
