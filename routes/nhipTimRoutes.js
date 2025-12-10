const express =require('express');
const router= express.Router();
const nhipTimController=require('../controller/nhipTimController');
const { authenticate } = require('../middlewares/auth');

router.post('/',authenticate,nhipTimController.create);
router.get('/:idBenhNhan',authenticate,nhipTimController.getById);
router.get('/:idBenhNhan/lastest', authenticate,nhipTimController.getLastestByBenhNhan);
router.put('/:id',authenticate,nhipTimController.update);
router.delete('/:id',authenticate,nhipTimController.delete);
module.exports=router;