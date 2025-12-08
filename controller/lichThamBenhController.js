const lichThamBenhModel = require('../models/lichThamBenh');  // ✅ Đổi tên biến

class lichThamBenhController {
    static async getThongKeLichThamBenhByDieuDuong(req, res) {
        try {
            const { idDieuDuong } = req.params;
            
            // Sửa: Thêm return sau khi gửi response lỗi
            if (!idDieuDuong || isNaN(idDieuDuong)) {
                return res.status(400).json({  // ✅ THÊM RETURN
                    success: false,
                    message: 'ID điều dưỡng không hợp lệ'
                });
            }
            
            // Sửa: Đổi tên biến để tránh trùng
            const lichThamBenhData = await lichThamBenhModel.getThongKeLichThamBenhByDieuDuong(parseInt(idDieuDuong));
            
            return res.status(200).json({
                success: true,
                data: lichThamBenhData,
                message: 'Lấy danh sách lịch thăm bệnh thành công'
            });
        } catch (error) {
            console.error('Lỗi trong getThongKeLichThamBenhByDieuDuong:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server khi lấy lịch thăm bệnh'
            });
        }
    }

    static async getTongSoLichHen(req, res) {
        try {
            const { idDieuDuong } = req.params;
            
            // Sửa: Thêm return
            if (!idDieuDuong || isNaN(idDieuDuong)) {
                return res.status(400).json({  // ✅ THÊM RETURN
                    success: false,
                    message: 'ID điều dưỡng không hợp lệ'
                });
            }
            
            const tongSo = await lichThamBenhModel.getTongSoLichHen(parseInt(idDieuDuong));
            
            return res.status(200).json({
                success: true,
                data: tongSo,
                message: 'Lấy thống kê thành công'
            });
        } catch (error) {
            console.error('Lỗi trong getTongSoLichHen:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server khi lấy thống kê'
            });
        }
    }
}

module.exports = lichThamBenhController;