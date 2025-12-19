const express = require('express');
const {login,getProfile,loginNguoiNha}= require('../controller/authcontroller');
const {authenticate}= require('../middlewares/auth');
const router= express.Router();

router.post('/login',login);
router.get('/profile', authenticate,getProfile);
router.post('/login-nguoi-nha', loginNguoiNha);

module.exports=router;
