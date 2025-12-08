const ThongBao= require ('../models/ThongBao');

class thongBaoController{
    static async getThongBaoTheoLoai(req,res){
        try {
            const {loai} = req.params;
            const {page =1, limit=20}= req.query;
            const offset = (page -1)*limit;

            const thongBaos = await ThongBao.getByType(loai,limit,offset);
            const tong_so= await ThongBao.countByType(loai);
            const so_trang= Math.ceil(tong_so/limit);

            res.json({
                success : true,
                data: thongBaos,
                pagination:{
                    trang_hien_tai: parseInt(page),
                    so_trang,
                    so_thong_bao: tong_so,
                }
            })
        } catch (error) {
            console.error('Error getting notifications by type:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server khi lấy thông báo',
                error: error.message
            });
        }
    }
    static async getChiTietThongBao(req,res){
        try {
            const  {id} =req.params;
            const thongBao= await ThongBao.getById(id);
            if(!thongBao){
                return res.status(404).json({
                    success:false,
                    message: 'ko tim thay thong bao',
                });
            }
            res.json({
                success: true,
                data: thongBao
            })
        } catch (error) {
            console.error('Error getting notification detail:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server khi lấy chi tiết thông báo',
                error: error.message
            });
        }
    }
    static async getSoThongBaoTheoLoai(req,res){
        try {
            const {loai}= req.params;
            const tong_so= await ThongBao.countByType(loai);
            res.json({
                success:true,
                data:tong_so
            });
        } catch (error) {
            console.error('Error :', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server khi lấy số thông báo',
                error: error.message
            });
        }
    }
}
module.exports= thongBaoController;