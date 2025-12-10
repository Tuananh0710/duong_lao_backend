const huyetAp= require('../models/huyetApp');

class huyetApController{
    static async create(req,res){
        try {
            const {id_benh_nhan, tam_thu, tam_truong,thoi_gian_do,vi_tri_do,tu_the_khi_do}= req.body;

            if(!id_benh_nhan || !tam_thu || !tam_truong || !thoi_gian_do || !vi_tri_do || !tu_the_khi_do){
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng cung cấp đầy đủ thông tin'
                });
            }
            const evaluation= huyetAp.evaluateBloodPressure(tam_thu,tam_truong);
            const data = {
                ...req.body,
                ...evaluation,
                thoi_gian_do: req.body.thoi_gian_do || new Date()
            };
            const result = await huyetAp.create(data);

            res.status(201).json({
                success:true,
        });
        } catch (error) {
            console.error('Lỗi trong controller create:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server',
                error: error.message
            });
        }
    };
    static async getById(req,res){
        try {
            const {idBenhNhan} =req.params;
            const data= await huyetAp.findById(idBenhNhan);
            if(!data){
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy dữ liệu huyết áp'
                });
            }
            res.status(200).json({
                success: true,
                huyet_ap: data
            });
        } catch (error) {
            console.error('Lỗi trong controller getById:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server',
                error: error.message
            });
        }
    }
    static async getLastestByid(req,res){
        try {
            const {id}= req.params;
            const data= await huyetAp.findLastestById(id);
            if (!data) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy dữ liệu huyết áp'
                });
            }
            
            res.status(200).json({
                success: true,
                huyet_ap: data
            });
        } catch (error) {
            console.error('Lỗi trong controller getLatestByBenhNhan:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server',
                error: error.message
            });
        }
    }
}
module.exports=huyetApController;