const NhanVien = require('../models/nhanVien');

class NhanVienController {

    static async layDanhSachNhanVien(req, res) {
        try {
            const { idBenhNhan } = req.params;

            // Validate
            if (!idBenhNhan) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng cung cấp id bệnh nhân'
                });
            }

            if (isNaN(idBenhNhan)) {
                return res.status(400).json({
                    success: false,
                    message: 'id bệnh nhân không hợp lệ'
                });
            }

            const nhan_vien = await NhanVien.layDanhSachNhanVien(idBenhNhan);

            return res.status(200).json({
                success: true,
                nhan_vien
            });

        } catch (error) {
            console.error('Lỗi controller lấy danh sách nhân viên:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server'
            });
        }
    }

    static async layChiTietNhanVien(req, res) {
        try {
            const { idDieuDuong } = req.params;

            // Validate
            if (!idDieuDuong) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng cung cấp id điều dưỡng'
                });
            }

            if (isNaN(idDieuDuong)) {
                return res.status(400).json({
                    success: false,
                    message: 'id điều dưỡng không hợp lệ'
                });
            }

            const nhan_vien = await NhanVien.layChiTietNhanVien(idDieuDuong);

            if (!nhan_vien) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy nhân viên'
                });
            }

            return res.status(200).json({
                success: true,
                nhan_vien
            });

        } catch (error) {
            console.error('Lỗi controller lấy chi tiết nhân viên:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server'
            });
        }
    }
}

module.exports = NhanVienController;
