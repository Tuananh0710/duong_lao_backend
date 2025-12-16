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
    static async getLichThamBenhGanNhat(req, res) {
        try {
            // Lấy id từ param
            const { id_benh_nhan, id_nguoi_than } = req.params;
            
            // Kiểm tra tham số
            if (!id_benh_nhan || !id_nguoi_than) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng cung cấp id_benh_nhan và id_nguoi_than trong URL'
                });
            }
            
            // Kiểm tra định dạng ID
            if (isNaN(id_benh_nhan) || isNaN(id_nguoi_than)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID không hợp lệ, phải là số'
                });
            }
            
            // Chuyển đổi sang số nguyên
            const benhNhanId = parseInt(id_benh_nhan);
            const nguoiThanId = parseInt(id_nguoi_than);
            
            // Gọi hàm model
            const lichGanNhat = await lichThamBenhModel.getLichLastestByNguoiThanBenhNhan(
                nguoiThanId,
                benhNhanId
            );
            
            if (!lichGanNhat) {
                return res.status(200).json({
                    success: true,
                    message: 'Không tìm thấy lịch hẹn nào đã được duyệt',
                    data: null
                });
            }
            
            // Định dạng dữ liệu trả về
            const formattedData = {
                id_benh_nhan: lichGanNhat.id_benh_nhan,
                id_nguoi_than: lichGanNhat.id_nguoi_than,
                ngay_tham: lichGanNhat.ngay,
                khung_gio: lichGanNhat.khung_gio,
            };
            
            return res.status(200).json({
                success: true,
                message: 'Lấy lịch hẹn gần nhất thành công',
                ...formattedData
            });
            
        } catch (error) {
            console.error('Lỗi controller lịch thăm bệnh:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server: ' + error.message
            });
        }
    }
    
}

module.exports = lichThamBenhController;