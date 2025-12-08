const express= require('express');
const router= express.Router();
const congViecController= require('../controller/congViecController');
const {authenticate}= require('../middlewares/auth');


router.get('/:id',authenticate,congViecController.getThongKeCongViecDieuDuong);

module.exports= router;