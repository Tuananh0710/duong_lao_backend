const express = require('express');
const {login,getProfile,loginNguoiNha,changePassword}= require('../controller/authcontroller');
const {authenticate}= require('../middlewares/auth');
const router= express.Router();

router.post('/login',login);
router.get('/profile', authenticate,getProfile);
router.post('/login-nguoi-nha', loginNguoiNha);
router.post('/change-password',changePassword)
module.exports=router;
