const express = require('express');
const router = express.Router();
const DuongHuyetController = require('../controller/duongHuyetController');
const { authenticate } = require('../middlewares/auth');

router.post('/', authenticate, DuongHuyetController.create); 
router.get('/:id', authenticate, DuongHuyetController.getById); 
router.put('/:id', authenticate, DuongHuyetController.update); 
router.delete('/:id', authenticate, DuongHuyetController.delete); 


router.get('/benh_nhan/:idBenhNhan', authenticate, DuongHuyetController.getByBenhNhan); 
router.get('/benh_nhan/:idBenhNhan/lastest', authenticate, DuongHuyetController.getLatestByBenhNhan); 



module.exports = router;