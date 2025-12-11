const lichThamBenhModel = require('../models/lichThamBenh');  // ✅ Đổi tên biến

class lichThamBenhController {
    static async getThongKeLichThamBenhByDieuDuong(req, res) {
        try {
            const { idDieuDuong } = req.params;
            
            if (!idDieuDuong || isNaN(idDieuDuong)) {
                return res.status(400).json({ 
                    success: false,
                    message: 'ID điều dưỡng không hợp lệ'
                });
            }
      
            const lichThamBenhData = await lichThamBenhModel.getThongKeLichThamBenhByDieuDuong(parseInt(idDieuDuong));
            
            return res.status(200).json({
                success: true,
                lich_tham_benh: lichThamBenhData,
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
            
  
            if (!idDieuDuong || isNaN(idDieuDuong)) {
                return res.status(400).json({  
                    success: false,
                    message: 'ID điều dưỡng không hợp lệ'
                });
            }
            
            const tongSo = await lichThamBenhModel.getTongSoLichHen(parseInt(idDieuDuong));
            
            return res.status(200).json({
                success: true,
                ...tongSo,
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