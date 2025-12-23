const express =require('express');
const router=express.Router();
const { authenticate } = require('../middlewares/auth');
const TaiKhoanController =require('../controller/taiKhoanController');

router.use(authenticate);
router.get('/nguoi_than',TaiKhoanController.getThongTinTaiKhoanByNguoiNha);

module.exports=router;