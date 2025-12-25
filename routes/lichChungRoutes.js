const express = require('express');
const router = express.Router();
const lichChungController = require('../controller/lichChungController');
const { authenticate } = require('../middlewares/auth');
router.use(authenticate);

router.get('/:id_benh_nhan', lichChungController.getLichChung);

router.get('/:id_benh_nhan/phan-trang', lichChungController.getLichChungPhanTrang);

router.get('/:id_benh_nhan/gan-nhat', lichChungController.getLichChungGanNhat);

router.get('/:id_benh_nhan/trong-tuan',lichChungController.getLichChungTrongTuan);

module.exports = router;