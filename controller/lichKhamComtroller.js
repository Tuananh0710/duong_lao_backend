const lichKham= require('../models/lichKham');

class lichKhamController{
    static async  getLichKhamByBenhNhan(req, res){
        try {
            const { id } = req.params;
            
            // Validation
            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng cung cấp ID bệnh nhân'
                });
            }
            
            if (isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID bệnh nhân không hợp lệ'
                });
            }
            
            const idBenhNhan = parseInt(id);
            
            // Gọi model
            const danhSachLichKham = await lichKham.getLichKhamByBenhNhan(idBenhNhan);
            
            // Kiểm tra nếu không có lịch khám
            if (!danhSachLichKham || danhSachLichKham.length === 0) {
                return res.status(200).json({
                    success: true,
                    message: 'Không có lịch khám nào đang chờ',
                    data: {
                        tong_so: 0,
                        danh_sach: []
                    }
                });
            }
            
            return res.status(200).json({
                success: true,
                message: 'Lấy danh sách lịch khám thành công',
                tong_so: danhSachLichKham.length,
                danh_sach: danhSachLichKham
            });
            
        } catch (error) {
            console.error('Lỗi controller lấy lịch khám (param):', error);
            return res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi hệ thống'
            });
        }
    }
}
module.exports=lichKhamController;