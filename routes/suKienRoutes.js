const express =require('express');
const router=express.Router();
const suKienController=require('../controller/suKienController');
const { authenticate } = require('../middlewares/auth');

router.use(authenticate);
router.get('/',suKienController.getDsSuKien);
router.get('/trong-tuan', suKienController.getDsSuKienTrongTuan);

module.exports=router