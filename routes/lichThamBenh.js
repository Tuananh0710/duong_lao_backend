
const express = require('express');
const router = express.Router();
const lichThamBenhController = require('../controller/lichThamBenhController');
const VisitController = require('../controller/visitController');
const { authenticate } = require('../middlewares/auth');

router.get('/ds/:idDieuDuong', authenticate, lichThamBenhController.getThongKeLichThamBenhByDieuDuong);
router.get('/thong_ke/:idDieuDuong', authenticate, lichThamBenhController.getTongSoLichHen);
router.get(
    '/benh-nhan/:id_benh_nhan/nguoi-than/:id_nguoi_than',authenticate,
    lichThamBenhController.getLichThamBenhGanNhat
);
router.post('/', authenticate, VisitController.createVisit);


router.put('/:id/status', authenticate, VisitController.updateVisitStatus);


router.get('/', authenticate, VisitController.getVisits);

router.post('/themlich',lichThamBenhController.themLichThamMoiTheoBenhNhan )

module.exports = router;