const express = require('express');
const router = express.Router();
const lichKhamController = require('../controller/lichKhamComtroller');
const { authenticate } = require('../middlewares/auth');
router.use(authenticate);

router.get('/benh_nhan/:id', lichKhamController.getLichKhamByBenhNhan);

module.exports = router;