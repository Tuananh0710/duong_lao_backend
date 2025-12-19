const express = require('express');
const router = express.Router();
const lichChungController = require('../controller/lichChungController');

router.get('/:id_benh_nhan', lichChungController.getLichChung);

router.get('/:id_benh_nhan/phan-trang', lichChungController.getLichChungPhanTrang);

module.exports = router;