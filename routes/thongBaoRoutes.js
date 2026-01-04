const express= require('express');
const router= express.Router();
const thongBaoController = require('../controller/thongBaoController');
const {authenticate, authorize}= require('../middlewares/auth');
router.get('/loai/:loai',authenticate,thongBaoController.getThongBaoTheoLoai);
router.get('/:id',authenticate,thongBaoController.getChiTietThongBao);
router.get('/count/:loai',authenticate,thongBaoController.getSoThongBaoTheoLoai);
router.get('/',authenticate,thongBaoController.getByUser);

module.exports= router;