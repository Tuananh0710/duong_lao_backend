
const express = require('express');
const router = express.Router();
const lichThamBenhController = require('../controller/lichThamBenhController');
const { authenticate } = require('../middlewares/auth');

router.get('/ds/:idDieuDuong', authenticate, lichThamBenhController.getThongKeLichThamBenhByDieuDuong);
router.get('/thong_ke/:idDieuDuong', authenticate, lichThamBenhController.getTongSoLichHen);

module.exports = router;