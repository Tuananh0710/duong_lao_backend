const TaiKhoan= require('../models/TaiKhoan')
class TaiKhoanController{
    static async getThongTinTaiKhoanByNguoiNha(req,res){
        try {
            const idTaiKhoan = req.user.id_tai_khoan;
            const result=await TaiKhoan.getThongTinTaiKhoanByNguoiThan(idTaiKhoan);
            return res.status(200).json({
            success: true,
            message: 'Đăng nhập thành công!',
            ...result
        }
        )
        } catch (error) {
            console.error('Error in controller getThongTinTaiKhoanByNguoiThan:', error);
             res.status(500).json({
                success: false,
                message: 'Lỗi server khi lấy thông tin tk',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}
module.exports=TaiKhoanController;