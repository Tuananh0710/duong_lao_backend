const express = require('express');
const router = express.Router();
const vatTuTieuHaoController = require('../controller/vatTuTieuHaoController');
const { authenticate, authorize, checkAppPermission } = require('../middlewares/auth');

router.use(authenticate);

// Chặn tài khoản người nhà: các endpoint này ghi vào sổ tiêu hao và trừ tồn kho thật.
router.use(checkAppPermission('dieu_duong_app'));

// Ghi sổ tiêu hao là việc của người trực tiếp chăm sóc.
const chamSoc = authorize('super_admin', 'quan_ly_y_te', 'dieu_duong', 'dieu_duong_truong');

router.get('/', vatTuTieuHaoController.getDanhSach);
router.post('/', chamSoc, vatTuTieuHaoController.them);
router.get('/:id', vatTuTieuHaoController.getChiTiet);
router.put('/:id/trang-thai', chamSoc, vatTuTieuHaoController.doiTrangThai);
router.delete('/:id', chamSoc, vatTuTieuHaoController.xoa);

module.exports = router;
