const sp02= require('../models/sp02');

class sp02Controller{
    static async create(req,res){
        try {
            const{
                id_benh_nhan, 
                gia_tri_spo2,
                vi_tri_do,
                trieu_chung_ho_hap
            }=req.body;
             if (!id_benh_nhan || !vi_tri_do || !trieu_chung_ho_hap || !gia_tri_spo2 === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng cung cấp đầy đủ thông tin'
                });
            }
            if (gia_tri_spo2 < 70 || gia_tri_spo2 > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'Giá trị SpO2 không hợp lệ (70% - 100%)'
                });
            }
             const hasRespiratorySymptoms = trieu_chung_ho_hap ? 
                (trieu_chung_ho_hap.toLowerCase().includes('khó thở') || 
                 trieu_chung_ho_hap.toLowerCase().includes('thở nhanh') ||
                 trieu_chung_ho_hap.toLowerCase().includes('tức ngực')) : false;

            const evaluation = sp02.evaluateSpO2(gia_tri_spo2, hasRespiratorySymptoms);

            const data = {
                ...req.body,
                ...evaluation,
                thoi_gian_do: req.body.thoi_gian_do || new Date(),
                vi_tri_do: vi_tri_do || 'ngon_tay_tro',
                tinh_trang_ho_hap: evaluation.tinh_trang_ho_hap
            };
            const result = await sp02.create(data);

            res.status(201).json({
                success: true,
                message: result.message,
                // data: result.data
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
    static async getById(req, res) {
        try {
            const { id } = req.params;
            const data = await sp02.findById(id);
            
            if (!data) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy dữ liệu SpO2'
                });
            }
            
            res.status(200).json({
                success: true,
                sp02: data
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
    static async getByBenhNhan(req, res) {
        try {
            const { idBenhNhan } = req.params;
            const filters = req.query;
            
            const data = await sp02.findByBenhNhan(idBenhNhan, filters);
            
            if (data.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy dữ liệu SpO2 cho bệnh nhân này'
                });
            }
            
            res.status(200).json({
                success: true,
                sp02: data,
                total: data.length
            });
        } catch (error) {
            console.error('Lỗi trong controller getByBenhNhan:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server',
                error: error.message
            });
        }
    }
    static async getLatestByBenhNhan(req, res) {
        try {
            const { idBenhNhan } = req.params;
            const data = await sp02.findLatestByBenhNhan(idBenhNhan);
            
            if (!data) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy dữ liệu SpO2'
                });
            }
            
            res.status(200).json({
                success: true,
                sp02: data
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
    static async update(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            
            // Nếu có thay đổi giá trị SpO2, tự động đánh giá lại
            if (updateData.gia_tri_spo2 !== undefined) {
                const currentData = await sp02.findById(id);
                if (currentData) {
                    const spo2Value = updateData.gia_tri_spo2;
                    const hasSymptoms = updateData.trieu_chung_ho_hap || 
                                      (currentData.trieu_chung_kem_theo ? 
                                       currentData.trieu_chung_kem_theo.toLowerCase().includes('khó thở') : false);
                    
                    const evaluation = sp02.evaluateSpO2(spo2Value, hasSymptoms);
                    updateData.danh_gia = evaluation.danh_gia;
                    updateData.muc_do = evaluation.muc_do;
                    updateData.noi_dung_canh_bao = evaluation.noi_dung_canh_bao;
                    updateData.tinh_trang_ho_hap = evaluation.tinh_trang_ho_hap;
                }
            }
            
            const result = await sp02.update(id, updateData);
            
            if (!result.success) {
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
            const result = await sp02.delete(id);
            
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

module.exports= sp02Controller;