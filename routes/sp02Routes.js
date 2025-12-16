const express = require('express');
const router = express.Router();
const SpO2Controller = require('../controller/sp02Controller');
const { authenticate } = require('../middlewares/auth');

router.post('/', authenticate, SpO2Controller.create); 
router.get('/:id', authenticate, SpO2Controller.getById); 
router.put('/:id', authenticate, SpO2Controller.update); 
router.delete('/:id', authenticate, SpO2Controller.delete); 

router.get('/benh_nhan/:idBenhNhan', authenticate, SpO2Controller.getByBenhNhan); 
router.get('/benh_nhan/:idBenhNhan/lastest', authenticate, SpO2Controller.getLatestByBenhNhan); 



module.exports = router;