const express =require('express');
const router= express.Router();
const huyetApController= require('../controller/huyetApController');
const {authenticate}= require('../middlewares/auth');

router.post('/',authenticate,huyetApController.create);
router.get('/:idBenhNhan',authenticate,huyetApController.getById);
router.get('/:id/lastest',authenticate,huyetApController.getLastestByid);

module.exports=router;