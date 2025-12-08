const BenhNhan = require('../models/BenhNhan');

class BenhNhanController{
    static async getTongSoBenhNhan(req,res){
        try {
            const tong_so= await BenhNhan.getTongSoBenhNhan();
            res.json({
                success:true,
                message: 'lấy tông số bệnh nhân',
                data:{
                    tong_so_benh_nhan: tong_so
                }
            })
        } catch (error) {
            console.error('Error in getTongSoBenhNhan:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server',
                error: error.message
            });
        }
    };

    static async getDsBenhNhan(req,res){
        try {
            const page= parseInt(req.query.page) || 1;
            const limit= parseInt(req.query.limit) || 10;
            const search = req.query.search || ' ';
            if(page<1 || limit<1){
                return res.status(400).json({
                    success:false,
                    message:'Không tồn tại bệnh nhân'
                });
            }
            const result = await BenhNhan.getDsBenhNhan(page,limit,search);
            res.json({
                success:true,
                message:'Danh sách bệnh nhân : ',
                data:result.data,
                pagination: result.pagination
            });
        } catch (error) {
            console.error('Error in getDanhSachBenhNhan:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server',
                error: error.message
            });
        }
    };
    static async getThongTinBenhNhan(req,res){
        try {
            const {id}= req.params;
            if(!id|| isNaN(id)){
                return res.status(400).json({
                    success:false,
                    message: 'Id bệnh nhân ko hợp lệ'
                });
            }
            const benhNhan = await BenhNhan.getThongTinChiTietBenhNhan(id);
            if(!benhNhan){
                return res.status(400).json({
                    success:false,
                    message:'Không tìm thấy bệnh nhân'
                });
            }
            res.json({
                success:true,
                message:"Thông tin bệnh nhân",
                data:benhNhan
            })
        } catch (error) {
             console.error('Error in getBenhNhanById:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server',
                error: error.message
            });
        }
    }
}
module.exports = BenhNhanController;