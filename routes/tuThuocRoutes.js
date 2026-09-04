const express = require('express');
const router = express.Router();
const tuThuocController = require('../controller/tuThuocController');
const { authenticate, authorize, checkAppPermission } = require('../middlewares/auth');

router.use(authenticate);

// Xem kho: mọi vai trò dùng app điều dưỡng.
const xemKho = checkAppPermission('dieu_duong_app');

// Sửa kho: chỉ quản lý. Điều dưỡng thường làm tồn kho thay đổi gián tiếp
// qua bàn giao vật tư, không sửa kho trực tiếp.
const quanLyKho = authorize('super_admin', 'quan_ly_y_te', 'dieu_duong_truong');

// --- Phân loại (đặt trước /:id để không bị route động nuốt mất) ---
router.get('/phan-loai', xemKho, tuThuocController.getDsPhanLoai);
router.post('/phan-loai', quanLyKho, tuThuocController.themPhanLoai);
router.put('/phan-loai/:id', quanLyKho, tuThuocController.capNhatPhanLoai);
router.delete('/phan-loai/:id', quanLyKho, tuThuocController.xoaPhanLoai);

// --- Thống kê & tiện ích ---
router.get('/thong-ke', xemKho, tuThuocController.thongKe);
router.post('/dong-bo-trang-thai', quanLyKho, tuThuocController.dongBoTrangThai);

// --- Danh sách & tạo mới ---
router.get('/', xemKho, tuThuocController.getDsThuoc);
router.post('/', quanLyKho, tuThuocController.themThuoc);

// --- Thao tác trên một mục ---
router.get('/:id', xemKho, tuThuocController.getChiTiet);
router.put('/:id', quanLyKho, tuThuocController.capNhatThuoc);
router.post('/:id/nhap-kho', quanLyKho, tuThuocController.nhapKho);
router.delete('/:id', quanLyKho, tuThuocController.xoaThuoc);

module.exports = router;
