const express = require('express');
const {login,getProfile}= require('../controller/authcontroller');
const {authenticate}= require('../middlewares/auth');
const router= express.Router();

router.post('/login',login);
router.get('/profile', authenticate,getProfile);
module.exports=router;
