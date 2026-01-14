const express= require('express');
const router= express.Router();
const congViecController= require('../controller/congViecController');
const {authenticate}= require('../middlewares/auth');


router.get('/:id',authenticate,congViecController.getThongKeCongViecDieuDuong);
router.put('/:id',authenticate,congViecController.capNhatNhieuCongViec);
router.get('/ds/:id',authenticate,congViecController.getDsCongViecByDieuDuong);

module.exports= router;