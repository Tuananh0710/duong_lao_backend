const sp02 = require('../models/sp02');

class sp02Controller {
    static async create(req, res) {
        try {
            const {
                id_benh_nhan,
                gia_tri_spo2,
                vi_tri_do,
                trieu_chung_ho_hap,
                thoi_gian_do
            } = req.body;

            // Validation cơ bản
            const errors = [];

            if (!id_benh_nhan) errors.push('id_benh_nhan là bắt buộc');
            if (gia_tri_spo2 === undefined || gia_tri_spo2 === null) errors.push('gia_tri_spo2 là bắt buộc');
            if (vi_tri_do === undefined || vi_tri_do === null) errors.push('vi_tri_do là bắt buộc');
            if (trieu_chung_ho_hap === undefined || trieu_chung_ho_hap === null) errors.push('trieu_chung_ho_hap là bắt buộc');

            if (errors.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Thông tin không hợp lệ',
                    errors: errors
                });
            }

            // Kiểm tra giá trị SpO2
            if (typeof gia_tri_spo2 !== 'number' || isNaN(gia_tri_spo2)) {
                return res.status(400).json({
                    success: false,
                    message: 'Giá trị SpO2 phải là số'
                });
            }

            if (gia_tri_spo2 < 70 || gia_tri_spo2 > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'Giá trị SpO2 phải nằm trong khoảng 70% - 100%'
                });
            }

            // Kiểm tra thời gian đo
            let thoiGianDo = thoi_gian_do;
            if (thoi_gian_do) {
                const date = new Date(thoi_gian_do);
                if (isNaN(date.getTime())) {
                    return res.status(400).json({
                        success: false,
                        message: 'Định dạng thời gian không hợp lệ'
                    });
                }
                thoiGianDo = date;
            } else {
                thoiGianDo = new Date();
            }

            // Đánh giá triệu chứng hô hấp
            const hasRespiratorySymptoms = trieu_chung_ho_hap ?
                (trieu_chung_ho_hap.toLowerCase().includes('khó thở') ||
                    trieu_chung_ho_hap.toLowerCase().includes('thở nhanh') ||
                    trieu_chung_ho_hap.toLowerCase().includes('tức ngực') ||
                    trieu_chung_ho_hap.toLowerCase().includes('thở khó') ||
                    trieu_chung_ho_hap.toLowerCase().includes('hụt hơi')) : false;

            // Đánh giá SpO2
            const evaluation = sp02.evaluateSpO2(gia_tri_spo2, hasRespiratorySymptoms);

            // Chuẩn bị dữ liệu
            const data = {
                id_benh_nhan: parseInt(id_benh_nhan),
                gia_tri_spo2: parseFloat(gia_tri_spo2),
                pi: req.body.pi || null,
                thoi_gian_do: thoiGianDo,
                vi_tri_do: vi_tri_do.trim() || 'ngon_tay_tro',
                tinh_trang_ho_hap: evaluation.tinh_trang_ho_hap,
                ghi_chu: req.body.ghi_chu || null,
                muc_do: evaluation.muc_do,
                noi_dung_canh_bao: evaluation.noi_dung_canh_bao,
                id_cau_hinh_chi_so_canh_bao: req.body.id_cau_hinh_chi_so_canh_bao || null,
                danh_gia_chi_tiet: evaluation.danh_gia_chi_tiet
            };

            // Gọi model để tạo
            const result = await sp02.create(data);

            res.status(201).json({
                success: true,
                message: result.message,
                data: result.data
            });

        } catch (error) {
            console.error('Lỗi trong controller create:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi tạo dữ liệu SpO2',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    static async getById(req, res) {
        try {
            const { id } = req.params;

            if (!id || isNaN(parseInt(id))) {
                return res.status(400).json({
                    success: false,
                    message: 'ID không hợp lệ'
                });
            }

            const data = await sp02.findById(parseInt(id));

            if (!data) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy dữ liệu SpO2 với ID này'
                });
            }

            res.status(200).json({
                success: true,
                data: data
            });
        } catch (error) {
            console.error('Lỗi trong controller getById:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi lấy dữ liệu SpO2',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    static async getByBenhNhan(req, res) {
        try {
            const { idBenhNhan } = req.params;

            if (!idBenhNhan || isNaN(parseInt(idBenhNhan))) {
                return res.status(400).json({
                    success: false,
                    message: 'ID bệnh nhân không hợp lệ'
                });
            }

            // Xử lý filters từ query params
            const filters = {};
            const query = req.query;

            if (query.from_date) {
                const date = new Date(query.from_date);
                if (!isNaN(date.getTime())) {
                    filters.from_date = date.toISOString().split('T')[0];
                }
            }

            if (query.to_date) {
                const date = new Date(query.to_date);
                if (!isNaN(date.getTime())) {
                    filters.to_date = date.toISOString().split('T')[0];
                }
            }

            if (query.vi_tri_do) {
                filters.vi_tri_do = query.vi_tri_do;
            }

            if (query.tinh_trang_ho_hap) {
                filters.tinh_trang_ho_hap = query.tinh_trang_ho_hap;
            }

            if (query.muc_do) {
                filters.muc_do = query.muc_do;
            }

            if (query.limit && !isNaN(parseInt(query.limit)) && parseInt(query.limit) > 0) {
                filters.limit = parseInt(query.limit);
            }

            const data = await sp02.findByBenhNhan(parseInt(idBenhNhan), filters);

            res.status(200).json({
                success: true,
                data: data,
                total: data.length,
                filters: filters
            });
        } catch (error) {
            console.error('Lỗi trong controller getByBenhNhan:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi lấy dữ liệu SpO2 của bệnh nhân',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    static async getLatestByBenhNhan(req, res) {
        try {
            const { idBenhNhan } = req.params;

            if (!idBenhNhan || isNaN(parseInt(idBenhNhan))) {
                return res.status(400).json({
                    success: false,
                    message: 'ID bệnh nhân không hợp lệ'
                });
            }

            const data = await sp02.findLatestByBenhNhan(parseInt(idBenhNhan));

            if (!data) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy dữ liệu SpO2 gần nhất cho bệnh nhân này'
                });
            }

            res.status(200).json({
                success: true,
                data: data
            });
        } catch (error) {
            console.error('Lỗi trong controller getLatestByBenhNhan:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi lấy dữ liệu SpO2 gần nhất',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            if (!id || isNaN(parseInt(id))) {
                return res.status(400).json({
                    success: false,
                    message: 'ID không hợp lệ'
                });
            }

            // Lấy dữ liệu hiện tại
            const currentData = await sp02.findById(parseInt(id));
            if (!currentData) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy bản ghi SpO2 để cập nhật'
                });
            }

            // Nếu có cập nhật giá trị SpO2, đánh giá lại
            if (updateData.gia_tri_spo2 !== undefined) {
                const spo2Value = parseFloat(updateData.gia_tri_spo2);
                
                // Kiểm tra giá trị SpO2
                if (spo2Value < 70 || spo2Value > 100) {
                    return res.status(400).json({
                        success: false,
                        message: 'Giá trị SpO2 phải nằm trong khoảng 70% - 100%'
                    });
                }

                // Kiểm tra triệu chứng
                const hasSymptoms = updateData.trieu_chung_ho_hap ?
                    (updateData.trieu_chung_ho_hap.toLowerCase().includes('khó thở') ||
                        updateData.trieu_chung_ho_hap.toLowerCase().includes('thở nhanh') ||
                        updateData.trieu_chung_ho_hap.toLowerCase().includes('tức ngực')) :
                    (currentData.tinh_trang_ho_hap && 
                     (currentData.tinh_trang_ho_hap === 'kho_tho' || 
                      currentData.tinh_trang_ho_hap === 'tho_nhanh'));

                const evaluation = sp02.evaluateSpO2(spo2Value, hasSymptoms);
                
                updateData.danh_gia_chi_tiet = evaluation.danh_gia_chi_tiet;
                updateData.muc_do = evaluation.muc_do;
                updateData.noi_dung_canh_bao = evaluation.noi_dung_canh_bao;
                updateData.tinh_trang_ho_hap = evaluation.tinh_trang_ho_hap;
            }

            // Chuyển đổi kiểu dữ liệu nếu cần
            if (updateData.id_benh_nhan) {
                updateData.id_benh_nhan = parseInt(updateData.id_benh_nhan);
            }

            if (updateData.gia_tri_spo2) {
                updateData.gia_tri_spo2 = parseFloat(updateData.gia_tri_spo2);
            }

            // Gọi model để cập nhật
            const result = await sp02.update(parseInt(id), updateData);

            res.status(200).json(result);
        } catch (error) {
            console.error('Lỗi trong controller update:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi cập nhật dữ liệu SpO2',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;

            if (!id || isNaN(parseInt(id))) {
                return res.status(400).json({
                    success: false,
                    message: 'ID không hợp lệ'
                });
            }

            const result = await sp02.delete(parseInt(id));

            if (!result.success) {
                return res.status(404).json(result);
            }

            res.status(200).json(result);
        } catch (error) {
            console.error('Lỗi trong controller delete:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi xóa dữ liệu SpO2',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Thêm endpoint để đánh giá SpO2 mà không lưu vào DB
    static async evaluate(req, res) {
        try {
            const { gia_tri_spo2, trieu_chung_ho_hap } = req.body;

            if (gia_tri_spo2 === undefined || gia_tri_spo2 === null) {
                return res.status(400).json({
                    success: false,
                    message: 'gia_tri_spo2 là bắt buộc'
                });
            }

            if (typeof gia_tri_spo2 !== 'number' || isNaN(gia_tri_spo2)) {
                return res.status(400).json({
                    success: false,
                    message: 'Giá trị SpO2 phải là số'
                });
            }

            if (gia_tri_spo2 < 70 || gia_tri_spo2 > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'Giá trị SpO2 phải nằm trong khoảng 70% - 100%'
                });
            }

            // Đánh giá triệu chứng
            const hasRespiratorySymptoms = trieu_chung_ho_hap ?
                (trieu_chung_ho_hap.toLowerCase().includes('khó thở') ||
                    trieu_chung_ho_hap.toLowerCase().includes('thở nhanh') ||
                    trieu_chung_ho_hap.toLowerCase().includes('tức ngực') ||
                    trieu_chung_ho_hap.toLowerCase().includes('thở khó')) : false;

            const evaluation = sp02.evaluateSpO2(gia_tri_spo2, hasRespiratorySymptoms);

            res.status(200).json({
                success: true,
                data: evaluation,
                input: {
                    gia_tri_spo2: gia_tri_spo2,
                    trieu_chung_ho_hap: trieu_chung_ho_hap
                }
            });
        } catch (error) {
            console.error('Lỗi trong controller evaluate:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi đánh giá SpO2',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

module.exports = sp02Controller;