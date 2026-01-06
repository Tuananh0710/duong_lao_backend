const express =require('express');
const router= express.Router();
const dashBoardController= require('../controller/dashBoardController');
const { authenticate }=require('../middlewares/auth');

router.get('/',authenticate,dashBoardController.getAll);
router.get('/:idBenhNhan',authenticate,dashBoardController.getChiSoByBenhNhan);

module.exports=router;