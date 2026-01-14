const { messaging } = require('firebase-admin');
const CongViecModel = require('../models/congViec');
class congViecController{
    static async getThongKeCongViecDieuDuong (req, res) {
    try {
        const { id } = req.params; 
        const data = await CongViecModel.getCongViecByDieuDuong(id);
        
        res.json({
            success: true,
            id_dieu_duong: id,
            thoi_gian: new Date().toISOString().split('T')[0],
            ...data
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thống kê công việc'
        });
    }
};
static async getDsCongViecByDieuDuong(req,res){
    try {
        const {id}= req.params;

        const data = await CongViecModel.getDsCongViecByDieuDuong(id);
        res.json({
            success: true,
            id_dieu_duong: id,
            thoi_gian: new Date().toISOString().split('T')[0],
            ds_cong_viec:data
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thống kê công việc'
        });
    }
};
static async capNhatNhieuCongViec(req, res) {
    try {
        const { danh_sach_cong_viec } = req.body; 
        const { id } =  req.params;
        
        if (!Array.isArray(danh_sach_cong_viec) || danh_sach_cong_viec.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Danh sách công việc không hợp lệ'
            });
        }
        
        // Kiểm tra dữ liệu đầu vào
        for (const item of danh_sach_cong_viec) {
            if (!item.id_phan_cong || !item.trang_thai) {
                return res.status(400).json({
                    success: false,
                    message: 'Mỗi công việc cần có id_phan_cong và trang_thai'
                });
            }
            
            if (!['chua_lam', 'dang_lam', 'hoan_thanh'].includes(item.trang_thai)) {
                return res.status(400).json({
                    success: false,
                    message: `Trạng thái "${item.trang_thai}" không hợp lệ. Chấp nhận: chua_lam, dang_lam, hoan_thanh`
                });
            }
        }
        
        const result = await CongViecModel.capNhatTrangThaiCongViec(
            danh_sach_cong_viec,
            id // id điều dưỡng để kiểm tra quyền sở hữu
        );
        
        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                data: {
                    tong_so: danh_sach_cong_viec.length,
                    ket_qua: result.ket_qua
                }
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật nhiều công việc'
        });
    }
}
}

module.exports=congViecController;
