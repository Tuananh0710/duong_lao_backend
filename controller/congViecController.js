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
}
module.exports=congViecController;
