const db = require('../config/database');

class DuongHuyetModel {
   static async create(data) {
        try {
            const {
                id_benh_nhan,
                gia_tri_duong_huyet,  
                thoi_gian_do,
                thoi_diem_do,
                vi_tri_lay_mau,
                trieu_chung_kem_theo,
                ghi_chu,
                muc_do,
                noi_dung_canh_bao,
                id_cau_hinh_chi_so_canh_bao,
                danh_gia_chi_tiet
            } = data;

            console.log('=== BẮT ĐẦU THÊM DỮ LIỆU ĐƯỜNG HUYẾT ===');
            console.log(`Bệnh nhân ID: ${id_benh_nhan}`);
            console.log(`Giá trị đường huyết: ${gia_tri_duong_huyet}`);
            console.log(`Thời điểm đo: ${thoi_diem_do || 'khac'}`);
            
            // Nếu chưa có đánh giá, tự động đánh giá dựa trên cấu hình
            let evaluationResult = null;
            if (gia_tri_duong_huyet !== undefined && gia_tri_duong_huyet !== null) {
                if (!danh_gia_chi_tiet || !muc_do) {
                    console.log('Tự động đánh giá đường huyết...');
                    evaluationResult = await this.evaluateBloodSugar(
                        gia_tri_duong_huyet, 
                        thoi_diem_do || 'khac'
                    );
                } else {
                    console.log('Đã có đánh giá từ người dùng, bỏ qua tự động đánh giá');
                }
            }

            const query = `
                INSERT INTO duong_huyet 
                (id_benh_nhan, gia_tri_duong_huyet, thoi_gian_do, thoi_diem_do, 
                 vi_tri_lay_mau, trieu_chung_kem_theo, ghi_chu, muc_do, 
                 noi_dung_canh_bao, id_cau_hinh_chi_so_canh_bao, danh_gia_chi_tiet)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const values = [
                id_benh_nhan,
                gia_tri_duong_huyet,
                thoi_gian_do || new Date(),
                thoi_diem_do || 'khac',
                vi_tri_lay_mau || 'ngon_tay',
                trieu_chung_kem_theo || null,
                ghi_chu || null,
                evaluationResult ? evaluationResult.muc_do : (muc_do || null),
                evaluationResult ? evaluationResult.noi_dung_canh_bao : (noi_dung_canh_bao || null),
                evaluationResult ? evaluationResult.id_cau_hinh : (id_cau_hinh_chi_so_canh_bao || null),
                evaluationResult ? evaluationResult.danh_gia_chi_tiet : (danh_gia_chi_tiet || null)
            ];

            console.log('Kết quả đánh giá:', JSON.stringify(evaluationResult, null, 2));
            
            const [result] = await db.execute(query, values);
            
            const newRecord = await this.findById(result.insertId);
            
            console.log('=== KẾT THÚC THÊM DỮ LIỆU ĐƯỜNG HUYẾT ===\n');
            
            return {
                success: true,
                message: 'Thêm dữ liệu đường huyết thành công',
                data: newRecord
            };
        } catch (error) {
            console.error('Lỗi khi thêm dữ liệu đường huyết:', error);
            throw new Error('Không thể thêm dữ liệu đường huyết: ' + error.message);
        }
    }

    static async findById(id) {
        try {
            const query = `
                SELECT dh.*, bn.ho_ten, bn.ngay_sinh, bn.gioi_tinh
                FROM duong_huyet dh
                LEFT JOIN benh_nhan bn ON dh.id_benh_nhan = bn.id
                WHERE dh.id = ?
            `;
            const [rows] = await db.execute(query, [id]);
            return rows[0] || null;
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu đường huyết theo ID:', error);
            throw new Error('Không thể lấy dữ liệu đường huyết: ' + error.message);
        }
    }

    static async findByBenhNhan(idBenhNhan, filters = {}) {
        try {
            let query = `
                SELECT dh.*, bn.ho_ten, bn.ngay_sinh, bn.gioi_tinh
                FROM duong_huyet dh
                LEFT JOIN benh_nhan bn ON dh.id_benh_nhan = bn.id
                WHERE dh.id_benh_nhan = ?
            `;
            
            const values = [idBenhNhan];

            if (filters.from_date) {
                query += ' AND DATE(dh.thoi_gian_do) >= ?';
                values.push(filters.from_date);
            }

            if (filters.to_date) {
                query += ' AND DATE(dh.thoi_gian_do) <= ?';
                values.push(filters.to_date);
            }

            if (filters.vi_tri_lay_mau) {
                query += ' AND dh.vi_tri_lay_mau = ?';
                values.push(filters.vi_tri_lay_mau);
            }

            if (filters.danh_gia_chi_tiet) {
                query += ' AND dh.danh_gia_chi_tiet = ?';
                values.push(filters.danh_gia_chi_tiet);
            }

            if (filters.thoi_diem) {
                const hour = parseInt(filters.thoi_diem);
                if (!isNaN(hour) && hour >= 0 && hour <= 23) {
                    query += ' AND HOUR(dh.thoi_gian_do) = ?';
                    values.push(hour);
                }
            }

            query += ' ORDER BY dh.thoi_gian_do DESC';

            if (filters.limit) {
                query += ' LIMIT ?';
                values.push(parseInt(filters.limit));
            }

            const [rows] = await db.execute(query, values);
            return rows;
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu đường huyết theo bệnh nhân:', error);
            throw new Error('Không thể lấy dữ liệu đường huyết của bệnh nhân: ' + error.message);
        }
    }

    static async findLatestByBenhNhan(idBenhNhan) {
        try {
            const query = `
                SELECT dh.*, bn.ho_ten, bn.ngay_sinh, bn.gioi_tinh
                FROM duong_huyet dh
                LEFT JOIN benh_nhan bn ON dh.id_benh_nhan = bn.id
                WHERE dh.id_benh_nhan = ?
                ORDER BY dh.thoi_gian_do DESC
                LIMIT 1
            `;
            const [rows] = await db.execute(query, [idBenhNhan]);
            return rows[0] || null;
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu đường huyết gần nhất:', error);
            throw new Error('Không thể lấy dữ liệu đường huyết gần nhất: ' + error.message);
        }
    }

     static async findLatestByBenhNhanToday(idBenhNhan) {
        try {
            const query = `
                SELECT dh.*, bn.ho_ten, bn.ngay_sinh, bn.gioi_tinh
                FROM duong_huyet dh
                LEFT JOIN benh_nhan bn ON dh.id_benh_nhan = bn.id
                WHERE dh.id_benh_nhan = ? AND DATE(dh.thoi_gian_do) = CURDATE()
                ORDER BY dh.thoi_gian_do DESC
                LIMIT 1
            `;
            const [rows] = await db.execute(query, [idBenhNhan]);
            return rows[0] || null;
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu đường huyết gần nhất:', error);
            throw new Error('Không thể lấy dữ liệu đường huyết gần nhất: ' + error.message);
        }
    }

   static async update(id, data) {
    try {
        const fields = [];
        const values = [];

        Object.keys(data).forEach(key => {
            if (data[key] !== undefined) {
                fields.push(`${key} = ?`);
                values.push(data[key]);
            }
        });

        if (fields.length === 0) {
            return { success: false, message: 'Không có dữ liệu để cập nhật' };
        }

        values.push(id);

        const query = `UPDATE duong_huyet SET ${fields.join(', ')} WHERE id = ?`;
        
        const [result] = await db.execute(query, values);
        
        if (result.affectedRows === 0) {
            return { success: false, message: 'Không tìm thấy bản ghi để cập nhật' };
        }

        const updatedRecord = await this.findById(id);
        
        return {
            success: true,
            message: 'Cập nhật dữ liệu đường huyết thành công',
            data: updatedRecord
        };
    } catch (error) {
        console.error('Lỗi khi cập nhật dữ liệu đường huyết:', error);
        throw new Error('Không thể cập nhật dữ liệu đường huyết: ' + error.message);
    }
}

    static async delete(id) {
        try {
            const query = 'DELETE FROM duong_huyet WHERE id = ?';
            const [result] = await db.execute(query, [id]);
            
            if (result.affectedRows === 0) {
                return { success: false, message: 'Không tìm thấy bản ghi để xóa' };
            }

            return {
                success: true,
                message: 'Xóa dữ liệu đường huyết thành công',
                affectedRows: result.affectedRows
            };
        } catch (error) {
            console.error('Lỗi khi xóa dữ liệu đường huyết:', error);
            throw new Error('Không thể xóa dữ liệu đường huyết: ' + error.message);
        }
    }

    
   static async evaluateBloodSugar(glucoseValue) {
        try {
            console.log('=== BẮT ĐẦU ĐÁNH GIÁ ĐƯỜNG HUYẾT ===');
            console.log(`Giá trị: ${glucoseValue}`);
            
            let tenChiSo = 'Đường huyết';
            console.log(`Tìm cấu hình cho: "${tenChiSo}"`);
            
            // Tìm cấu hình mới nhất theo tên chỉ số
            let cauHinh = null;
            let idCauHinh = null;
            
            // Ưu tiên tìm theo tên chỉ số cụ thể
            const [configs] = await db.execute(
                'SELECT * FROM cau_hinh_chi_so_canh_bao WHERE ten_chi_so = ? ORDER BY ngay_tao DESC LIMIT 1',
                [tenChiSo]
            );
            
            console.log(`Số cấu hình tìm thấy cho "${tenChiSo}": ${configs.length}`);
            
            // Nếu không tìm thấy tên chỉ số cụ thể, tìm chung
            if (configs.length === 0) {
                console.log('Tìm cấu hình chung cho "Duong_huyet"...');
                const [generalConfigs] = await db.execute(
                    'SELECT * FROM cau_hinh_chi_so_canh_bao WHERE ten_chi_so LIKE ? ORDER BY ngay_tao DESC LIMIT 1',
                    ['%Đường huyết%']
                );
                
                console.log(`Số cấu hình chung tìm thấy: ${generalConfigs.length}`);
                
                if (generalConfigs.length > 0) {
                    cauHinh = generalConfigs[0];
                    idCauHinh = cauHinh.id;
                    console.log(`Sử dụng cấu hình chung ID: ${idCauHinh}`);
                    console.log(`Tên cấu hình: ${cauHinh.ten_chi_so}`);
                }
            } else {
                cauHinh = configs[0];
                idCauHinh = cauHinh.id;
                console.log(`Sử dụng cấu hình cụ thể ID: ${idCauHinh}`);
                console.log(`Tên cấu hình: ${cauHinh.ten_chi_so}`);
            }

            // Nếu không có cấu hình, sử dụng đánh giá mặc định
            if (!cauHinh || !cauHinh.gioi_han_canh_bao) {
                console.log('Không tìm thấy cấu hình, sử dụng tiêu chuẩn mặc định (ADA)');
                const result = this.evaluateBloodSugarDefault(glucoseValue, idCauHinh);
                console.log('Đánh giá mặc định:', JSON.stringify(result, null, 2));
                console.log('=== KẾT THÚC ĐÁNH GIÁ ===\n');
                return result;
            }

            console.log('Cấu hình đã tìm thấy, tiến hành đánh giá...');
            
            // Parse JSON cấu hình
            let gioiHan;
            try {
                gioiHan = typeof cauHinh.gioi_han_canh_bao === 'string' 
                    ? JSON.parse(cauHinh.gioi_han_canh_bao) 
                    : cauHinh.gioi_han_canh_bao;
                    
                console.log('Giới hạn cấu hình:', JSON.stringify(gioiHan, null, 2));
            } catch (e) {
                console.error('Lỗi khi parse JSON cấu hình:', e);
                console.log('Sử dụng đánh giá mặc định do lỗi parse');
                const result = this.evaluateBloodSugarDefault(glucoseValue, idCauHinh);
                console.log('=== KẾT THÚC ĐÁNH GIÁ ===\n');
                return result;
            }

            // Đánh giá dựa trên cấu hình
            const result = this.evaluateBasedOnConfig(glucoseValue, gioiHan, idCauHinh);
            
            console.log('Kết quả đánh giá từ cấu hình:', JSON.stringify(result, null, 2));
            console.log('=== KẾT THÚC ĐÁNH GIÁ ===\n');
            
            return result;
            
        } catch (error) {
            console.error('Lỗi trong quá trình đánh giá đường huyết:', error);
            console.log('Sử dụng đánh giá mặc định do lỗi');
            const result = this.evaluateBloodSugarDefault(glucoseValue, null);
            console.log('=== KẾT THÚC ĐÁNH GIÁ (lỗi) ===\n');
            return result;
        }
    }

    // Hàm đánh giá dựa trên cấu hình JSON (có thêm logging)
    static evaluateBasedOnConfig(glucoseValue, gioiHan, idCauHinh) {
        console.log('--- Đánh giá dựa trên cấu hình JSON ---');
        const numericValue = parseFloat(glucoseValue);
        
        if (isNaN(numericValue) || !isFinite(numericValue)) {
            console.log('Giá trị không hợp lệ');
            return {
                danh_gia_chi_tiet: 'Không thể đánh giá',
                muc_do: 'binh_thuong',
                noi_dung_canh_bao: 'Giá trị không hợp lệ',
                id_cau_hinh: idCauHinh,
                config_type: 'invalid_value'
            };
        }

        console.log(`Giá trị số: ${numericValue}`);
        
        // Kiểm tra theo thứ tự: Thấp -> Bình thường -> Cao -> Nguy hiểm
        
        // Thấp: giá trị trong khoảng [min, max]
        if (gioiHan.thap && gioiHan.thap.min !== undefined && gioiHan.thap.max !== undefined) {
            console.log(`Kiểm tra mức THẤP: ${gioiHan.thap.min} - ${gioiHan.thap.max}`);
            if (numericValue >= gioiHan.thap.min && numericValue <= gioiHan.thap.max) {
                console.log('→ Thuộc mức THẤP');
                return {
                    danh_gia_chi_tiet: gioiHan.thap.danh_gia || 'Đường huyết thấp',
                    muc_do: 'canh_bao',
                    noi_dung_canh_bao: gioiHan.thap.message || 'Giá trị thấp, cần theo dõi.',
                    id_cau_hinh: idCauHinh,
                    config_type: 'thap'
                };
            }
        }

        // Bình thường: giá trị trong khoảng [min, max]
        if (gioiHan.binh_thuong && gioiHan.binh_thuong.min !== undefined && gioiHan.binh_thuong.max !== undefined) {
            console.log(`Kiểm tra mức BÌNH THƯỜNG: ${gioiHan.binh_thuong.min} - ${gioiHan.binh_thuong.max}`);
            if (numericValue >= gioiHan.binh_thuong.min && numericValue <= gioiHan.binh_thuong.max) {
                console.log('→ Thuộc mức BÌNH THƯỜNG');
                return {
                    danh_gia_chi_tiet: gioiHan.binh_thuong.danh_gia || 'Bình thường',
                    muc_do: 'binh_thuong',
                    noi_dung_canh_bao: gioiHan.binh_thuong.message || null,
                    id_cau_hinh: idCauHinh,
                    config_type: 'binh_thuong'
                };
            }
        }

        // Cao: giá trị trong khoảng [min, max]
        if (gioiHan.cao && gioiHan.cao.min !== undefined && gioiHan.cao.max !== undefined) {
            console.log(`Kiểm tra mức CAO: ${gioiHan.cao.min} - ${gioiHan.cao.max}`);
            if (numericValue >= gioiHan.cao.min && numericValue <= gioiHan.cao.max) {
                console.log('→ Thuộc mức CAO');
                return {
                    danh_gia_chi_tiet: gioiHan.cao.danh_gia || 'Đường huyết cao',
                    muc_do: 'canh_bao',
                    noi_dung_canh_bao: gioiHan.cao.message || 'Giá trị cao, cần theo dõi.',
                    id_cau_hinh: idCauHinh,
                    config_type: 'cao'
                };
            }
        }

        // Nguy hiểm: Nếu giá trị không thuộc bất kỳ mốc nào
        console.log('Không thuộc mức nào, xác định là NGUY HIỂM');
        let nguyHiemMessage = 'Giá trị nguy hiểm! Cần can thiệp ngay.';
        let nguyHiemDanhGia = 'Nguy hiểm';
        
        if (gioiHan.nguy_hiem && gioiHan.nguy_hiem.message) {
            nguyHiemMessage = gioiHan.nguy_hiem.message;
        }
        if (gioiHan.nguy_hiem && gioiHan.nguy_hiem.danh_gia) {
            nguyHiemDanhGia = gioiHan.nguy_hiem.danh_gia;
        }
        
        return {
            danh_gia_chi_tiet: nguyHiemDanhGia,
            muc_do: 'nguy_hiem',
            noi_dung_canh_bao: nguyHiemMessage,
            id_cau_hinh: idCauHinh,
            config_type: 'nguy_hiem'
        };
    }

    // Hàm đánh giá mặc định (sử dụng khi không có cấu hình) - có thêm logging
    static evaluateBloodSugarDefault(glucoseValue, idCauHinh = null) {
        console.log('--- Đánh giá mặc định (tiêu chuẩn ADA) ---');
        
        const numericValue = parseFloat(glucoseValue);
        
        if (isNaN(numericValue) || !isFinite(numericValue)) {
            console.log('Giá trị không hợp lệ');
            return {
                danh_gia_chi_tiet: 'Không thể đánh giá',
                muc_do: 'binh_thuong',
                noi_dung_canh_bao: 'Giá trị không hợp lệ',
                id_cau_hinh: idCauHinh,
                config_type: 'default_invalid'
            };
        }

        console.log(`Giá trị: ${numericValue} mmol/L`);
        
        // Tiêu chuẩn ADA mặc định
        let danhGiaChiTiet = 'Bình thường';
        let mucDo = 'binh_thuong';
        let noiDungCanhBao = null;
        let configType = 'default_ada';

    
            console.log('Áp dụng tiêu chuẩn MẶC ĐỊNH');
            configType = 'default_chung';
            
            if (numericValue < 3.9) {
                danhGiaChiTiet = 'Hạ đường huyết';
                mucDo = 'nguy_hiem';
                noiDungCanhBao = 'Hạ đường huyết';
                console.log(`→ Hạ đường huyết (< 3.9)`);
            } else if (numericValue >= 3.9 && numericValue <= 6.1) {
                danhGiaChiTiet = 'Bình thường';
                mucDo = 'binh_thuong';
                console.log(`→ Bình thường (3.9 - 6.1)`);
            } else if (numericValue >= 6.2 && numericValue <= 7.8) {
                danhGiaChiTiet = 'Đường huyết cao nhẹ';
                mucDo = 'canh_bao';
                noiDungCanhBao = 'Đường huyết cao nhẹ';
                console.log(`→ Đường huyết cao nhẹ (6.2 - 7.8)`);
            } else if (numericValue >= 7.9 && numericValue <= 11.0) {
                danhGiaChiTiet = 'Đường huyết cao vừa';
                mucDo = 'canh_bao';
                noiDungCanhBao = 'Đường huyết cao vừa';
                console.log(`→ Đường huyết cao vừa (7.9 - 11.0)`);
            } else {
                danhGiaChiTiet = 'Đường huyết cao nặng';
                mucDo = 'nguy_hiem';
                noiDungCanhBao = 'Đường huyết cao nặng';
                console.log(`→ Đường huyết cao nặng (≥ 11.1)`);
            }

        console.log(`Kết quả: ${danhGiaChiTiet}, Mức độ: ${mucDo}`);
        
        return { 
            danh_gia_chi_tiet: danhGiaChiTiet,  
            muc_do: mucDo, 
            noi_dung_canh_bao: noiDungCanhBao,
            id_cau_hinh: idCauHinh,
            config_type: configType
        };
    }


    // Hàm chuyển đổi đơn vị đường huyết
    static convertGlucoseUnit(value, fromUnit, toUnit) {
        if (fromUnit === toUnit) return value;
        
        if (fromUnit === 'mg/dl' && toUnit === 'mmol/l') {
            return value / 18.018;  // mg/dL to mmol/L
        } else if (fromUnit === 'mmol/l' && toUnit === 'mg/dl') {
            return value * 18.018;  // mmol/L to mg/dL
        }
        
        return value;
    }

}

module.exports = DuongHuyetModel;
