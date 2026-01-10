
const express = require('express');
const router = express.Router();
const doDungCaNhanController = require('../controller/doDungCaNhanController');
const { authenticate } = require('../middlewares/auth');
router.use(authenticate);
router.post('/', doDungCaNhanController.themDoDung);
router.get('/loai', doDungCaNhanController.getDsLoaiDoDung);
router.get('/tim-kiem', doDungCaNhanController.timKiemDoDung);
router.get('/thong-ke', doDungCaNhanController.thongKeDoDung);
router.put('/:id', doDungCaNhanController.capNhatDoDung);
router.delete('/:id', doDungCaNhanController.xoaDoDung);
router.get('/:idBenhNhan', doDungCaNhanController.getDsByBenhNhan);



module.exports = router;