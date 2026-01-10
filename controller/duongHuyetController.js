const DuongHuyetModel = require('../models/duongHuyet');

class DuongHuyetController {

  static async create(req, res) {
    try {
        const { 
            id_benh_nhan, 
            gia_tri_duong_huyet,  
            vi_tri_lay_mau,
            trieu_chung_kem_theo,
            thoi_gian_do,
            thoi_diem_do  
        } = req.body;
        
        // Validate dữ liệu đầu vào
        if (!id_benh_nhan || gia_tri_duong_huyet === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp đầy đủ thông tin: id_benh_nhan, gia_tri_duong_huyet'
            });
        }

        // // Kiểm tra giá trị đường huyết hợp lệ 
        // if (gia_tri_duong_huyet < 18 || gia_tri_duong_huyet > 600) {
        //     return res.status(400).json({
        //         success: false,
        //         message: 'Giá trị đường huyết không hợp lệ (18 - 600 mg/dL)'
        //     });
        // }

        // Tự động đánh giá đường huyết 
        const evaluation = await DuongHuyetModel.evaluateBloodSugar(gia_tri_duong_huyet);
        
        console.log('📊 Kết quả đánh giá từ model:', JSON.stringify(evaluation, null, 2));
        
        const data = {
            ...req.body,
            danh_gia_chi_tiet: evaluation.danh_gia_chi_tiet,
            muc_do: evaluation.muc_do,
            noi_dung_canh_bao: evaluation.noi_dung_canh_bao,
            id_cau_hinh_chi_so_canh_bao: evaluation.id_cau_hinh,
            thoi_gian_do: thoi_gian_do || new Date(),
            vi_tri_lay_mau: vi_tri_lay_mau || 'ngon_tay'
        };

        const result = await DuongHuyetModel.create(data);
        
        // Lấy thông tin cấu hình đầy đủ từ kết quả đánh giá
        let configLimits = {
            thap: null,
            binh_thuong: null,
            cao: null,
            nguy_hiem: null
        };
        
        let configInfo = {
            id: evaluation.id_cau_hinh,
            name: null,
            description: null,
            used_from_db: false
        };
        
        // Biến theo dõi xem có lấy được cấu hình từ DB không
        let hasConfigFromDB = false;
        
        if (evaluation && evaluation.id_cau_hinh) {
            console.log(`🔍 Đang lấy cấu hình từ database với ID: ${evaluation.id_cau_hinh}`);
            try {
                // Lấy chi tiết cấu hình từ database
                const db = require('../config/database');
                const [configRows] = await db.execute(
                    'SELECT * FROM cau_hinh_chi_so_canh_bao WHERE id = ?',
                    [evaluation.id_cau_hinh]
                );
                
                if (configRows.length > 0) {
                    const config = configRows[0];
                    configInfo.name = config.ten_chi_so;
                    configInfo.description = config.mo_ta || null;
                    configInfo.used_from_db = true;
                    
                    console.log(`✅ Tìm thấy cấu hình: ${config.ten_chi_so}`);
                    
                    let gioiHan = null;
                    
                    try {
                        gioiHan = typeof config.gioi_han_canh_bao === 'string' 
                            ? JSON.parse(config.gioi_han_canh_bao) 
                            : config.gioi_han_canh_bao;
                        
                        // Lấy tất cả các giới hạn từ cấu hình
                        if (gioiHan) {
                            console.log('📋 Giới hạn cấu hình từ DB:', JSON.stringify(gioiHan, null, 2));
                            
                            // Giới hạn thấp
                            if (gioiHan.thap && gioiHan.thap.min !== undefined) {
                                configLimits.thap = {
                                    min: gioiHan.thap.min,
                                    max: gioiHan.thap.max,
                                };
                            }
                            
                            // Giới hạn bình thường
                            if (gioiHan.binh_thuong && gioiHan.binh_thuong.min !== undefined) {
                                configLimits.binh_thuong = {
                                    min: gioiHan.binh_thuong.min,
                                    max: gioiHan.binh_thuong.max,
                                };
                            }
                            
                            // Giới hạn cao
                            if (gioiHan.cao && gioiHan.cao.min !== undefined) {
                                configLimits.cao = {
                                    min: gioiHan.cao.min,
                                    max: gioiHan.cao.max,
                                };
                            }
                            
                            // Giới hạn nguy hiểm
                            if (gioiHan.nguy_hiem) {
                                configLimits.nguy_hiem = {
                                    description: gioiHan.nguy_hiem.danh_gia || 'Nguy hiểm',
                                    message: gioiHan.nguy_hiem.message || 'Giá trị nguy hiểm! Cần can thiệp ngay.',
                                };
                            }
                            
                            hasConfigFromDB = true;
                            console.log('✅ Đã lấy và parse cấu hình thành công từ database');
                        }
                    } catch (parseError) {
                        console.error('❌ Lỗi parse cấu hình JSON:', parseError);
                        console.error('Nội dung gioi_han_canh_bao:', config.gioi_han_canh_bao);
                    }
                } else {
                    console.log(`❌ Không tìm thấy cấu hình với ID: ${evaluation.id_cau_hinh}`);
                }
            } catch (dbError) {
                console.error('❌ Lỗi truy vấn database:', dbError);
            }
        } else {
            console.log('ℹ️ Không có ID cấu hình trong kết quả đánh giá');
        }
        
        // Nếu không có cấu hình từ database, sử dụng giới hạn mặc định
        if (!hasConfigFromDB) {
            console.log('⚠️ Sử dụng giới hạn mặc định do không lấy được cấu hình từ DB');
            
            // Mặc định (chung)
            configLimits = {
                thap: {
                    min: 0,
                    max: 3.9,
                    unit: 'mmol/L'
                },
                binh_thuong: {
                    min: 3.9,
                    max: 6.1,
                    unit: 'mmol/L'
                },
                cao: {
                    min: 6.2,
                    max: 11.0,
                    unit: 'mmol/L'
                },
                nguy_hiem: {
                    description: 'Đường huyết rất cao',
                    message: 'Nguy cơ biến chứng nghiêm trọng',
                    unit: 'mmol/L'
                }
            };
            
            configInfo.used_from_db = false;
        }
        
        // Thêm thông tin chuyển đổi đơn vị
        const conversions = {
            mg_dl: gia_tri_duong_huyet,
            mmol_l: DuongHuyetModel.convertGlucoseUnit(gia_tri_duong_huyet, 'mg/dl', 'mmol/l').toFixed(1)
        };
        
        // Xác định vị trí của giá trị hiện tại trong các giới hạn
        let currentRange = 'nguy_hiem'; // Mặc định
        const valueInMgDl = gia_tri_duong_huyet;
        const valueInMmolL = parseFloat(conversions.mmol_l);
        
        console.log(`📈 Giá trị hiện tại: ${valueInMgDl} mg/dL = ${valueInMmolL} mmol/L`);
        
        if (configLimits.thap && valueInMmolL >= configLimits.thap.min && valueInMmolL <= configLimits.thap.max) {
            currentRange = 'thap';
        } else if (configLimits.binh_thuong && valueInMmolL >= configLimits.binh_thuong.min && valueInMmolL <= configLimits.binh_thuong.max) {
            currentRange = 'binh_thuong';
        } else if (configLimits.cao && valueInMmolL >= configLimits.cao.min && valueInMmolL <= configLimits.cao.max) {
            currentRange = 'cao';
        }
        
        console.log(`🎯 Phân loại: ${currentRange}`);
        console.log(`📋 Cấu hình sử dụng: ${hasConfigFromDB ? 'Từ DB' : 'Mặc định'}`);
        
        res.status(201).json({
            success: true,
            message: result.message,
            ...result.data,
            // conversions: conversions,
            config_limits: configLimits,
            // config_info: configInfo,
            // evaluation_summary: {
            //     used_config_id: evaluation.id_cau_hinh,
            //     config_from_db: hasConfigFromDB,
            //     current_range: currentRange,
            //     current_range_details: configLimits[currentRange] || {},
            //     value_mg_dl: valueInMgDl,
            //     value_mmol_l: valueInMmolL,
            //     is_normal: currentRange === 'binh_thuong',
            //     is_warning: currentRange === 'thap' || currentRange === 'cao',
            //     is_danger: currentRange === 'nguy_hiem'
            // }
        });
    } catch (error) {
        console.error('❌ Lỗi trong controller create:', error);
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
            const data = await DuongHuyetModel.findById(id);
            
            if (!data) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy dữ liệu đường huyết'
                });
            }
            
            res.status(200).json({
                success: true,
                duong_huyet: data
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
            
            const data = await DuongHuyetModel.findByBenhNhan(idBenhNhan, filters);
            
            if (data.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy dữ liệu đường huyết cho bệnh nhân này'
                });
            }
            
            res.status(200).json({
                success: true,
                duong_huyet: data,
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
            const data = await DuongHuyetModel.findLatestByBenhNhan(idBenhNhan);
            
            if (!data) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy dữ liệu đường huyết'
                });
            }
            
            res.status(200).json({
                success: true,
                duong_huyet: data
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
            
            // Nếu có thay đổi giá trị đường huyết, tự động đánh giá lại 
            if (updateData.gia_tri_duong_huyet !== undefined) {
                const currentData = await DuongHuyetModel.findById(id);
                if (currentData) {
                    const glucose = updateData.gia_tri_duong_huyet; 
                    // Giả sử đo trước ăn nếu không có thông tin
                    const evaluation = DuongHuyetModel.evaluateBloodSugar(glucose);
                    updateData.danh_gia_chi_tiet = evaluation.danh_gia_chi_tiet;
                    updateData.muc_do = evaluation.muc_do;
                    updateData.noi_dung_canh_bao = evaluation.noi_dung_canh_bao;
                }
            }
            
            const result = await DuongHuyetModel.update(id, updateData);
            
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
            const result = await DuongHuyetModel.delete(id);
            
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
   
    static async evaluate(req, res) {
        try {
            const { 
                gia_tri_duong_huyet,  
                measurement_time = 'truoc_an'
            } = req.body;
            
            if (gia_tri_duong_huyet === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng cung cấp gia_tri_duong_huyet'
                });
            }

            // Kiểm tra giá trị hợp lệ 
            if (gia_tri_duong_huyet < 18 || gia_tri_duong_huyet > 600) {
                return res.status(400).json({
                    success: false,
                    message: 'Giá trị đường huyết không hợp lệ (18 - 600 mg/dL)'
                });
            }
            
            const evaluation = DuongHuyetModel.evaluateBloodSugar(gia_tri_duong_huyet, measurement_time);
            
            // Thêm thông tin chuyển đổi để hiển thị
            const conversions = {
                mg_dl: gia_tri_duong_huyet,
                mmol_l: DuongHuyetModel.convertGlucoseUnit(gia_tri_duong_huyet, 'mg/dl', 'mmol/l').toFixed(1)
            };
            
            res.status(200).json({
                success: true,
                data: {
                    ...evaluation,
                    conversions,
                    measurement_time: measurement_time
                }
            });
        } catch (error) {
            console.error('Lỗi trong controller evaluate:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server',
                error: error.message
            });
        }
    }

}

module.exports = DuongHuyetController;