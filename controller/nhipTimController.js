const nhipTim=require('../models/nhipTim');
class nhipTimController{
    static async create(req,res){
        try {
            const{
                id_benh_nhan, 
                gia_tri_nhip_tim,
                tinh_trang_benh_nhan_khi_do,
                ghi_chu  // Optional field
            }=req.body;
             if (!id_benh_nhan || !gia_tri_nhip_tim || !tinh_trang_benh_nhan_khi_do) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng cung cấp đầy đủ thông tin: id_benh_nhan, gia_tri_nhip_tim, tinh_trang_benh_nhan_khi_do'
                });
            }
            const evaluation= nhipTim.evaluateHeartRate(gia_tri_nhip_tim);
            const data={
                ...req.body,
                ...evaluation,
                thoi_gian_do: req.body.thoi_gian_do || new Date(),
                tinh_trang_benh_nhan_khi_do: tinh_trang_benh_nhan_khi_do || 'nghi_ngoi',
                ghi_chu: ghi_chu || null  // Optional: có thể có hoặc không
            };
            const result =await nhipTim.create(data);
             res.status(201).json({
                success: true,
                message: result.message,
                data: result.data,
                ...evaluation
            });
        } catch (error) {
             console.error('Lỗi trong controller create:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server',
                error: error.message
            });
        }
    }
    static async getById(req,res){
        try {
            const {idBenhNhan}= req.params;
            const data= await nhipTim.findById(idBenhNhan);
            if(!data){
                return res.status(401).json({
                    success:false,
                    message:'Không tìm thấy dữ liệu nhịp tim'
                });
            }
            return res.status(200).json({
                success:true,
                nhip_tim:data,
            })
        } catch (error) {
            console.error('Lỗi trong controller getById:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server',
                error: error.message
            });
        }
    }
    static async getLastestByBenhNhan(req,res){
        try {
            const {idBenhNhan}=req.params;
            const data= await nhipTim.findLastestByBenhNhan(idBenhNhan);
            if(!data){
                return res.status(401).json({
                    success:false,
                    message:'Không tìm thấy dữ liệu nhịp tim'
                });
            }
             return res.status(200).json({
                success:true,
                nhip_tim:data,
            })
        } catch (error) {
             console.error('Lỗi trong controller getLatestByBenhNhan:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server',
                error: error.message
            });
        }
    }
    static async update(req,res){
        try {
            const {id}=req.params;
            const updateData= req.body;
            if(updateData.gia_tri_nhip_tim){
                const heartRate = updateData.gia_tri_nhip_tim;
                const evaluation = NhipTimModel.evaluateHeartRate(heartRate);
                updateData.danh_gia = evaluation.danh_gia;
                updateData.muc_do = evaluation.muc_do;
                updateData.noi_dung_canh_bao = evaluation.noi_dung_canh_bao;
            }
            const result= await nhipTim.update(id,updateData);
            if(!result.success){
                return res.status(404).json(result);
            }
             res.status(200).json(result);
        } catch (error) {
            console.error('Lỗi trong controller update:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server',
                error: error.message
            });
        }
    }
     static async delete(req, res) {
        try {
            const { id } = req.params;
            const result = await nhipTim.delete(id);
            
            if (!result.success) {
                return res.status(404).json(result);
            }
            
            res.status(200).json(result);
        } catch (error) {
            console.error('Lỗi trong controller delete:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server',
                error: error.message
            });
        }
    }
}
module.exports= nhipTimController;