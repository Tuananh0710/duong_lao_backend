const express = require('express');
const router = express.Router();
const vatTuTieuHaoController = require('../controller/vatTuTieuHaoController');
const { authenticate } = require('../middlewares/auth');

router.use(authenticate);

router.get('/', vatTuTieuHaoController.getDanhSach);
router.post('/', vatTuTieuHaoController.them);
router.put('/:id/trang-thai', vatTuTieuHaoController.doiTrangThai);

module.exports = router;
