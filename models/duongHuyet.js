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

        // Nếu chưa có đánh giá, tự động đánh giá dựa trên cấu hình
        let evaluationResult = null;
        if (gia_tri_duong_huyet !== undefined && gia_tri_duong_huyet !== null) {
            if (!danh_gia_chi_tiet || !muc_do) {
                evaluationResult = await this.evaluateBloodSugar(
                    gia_tri_duong_huyet, 
                    thoi_diem_do || 'khac'
                );
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

        const [result] = await db.execute(query, values);
        
        const newRecord = await this.findById(result.insertId);
        
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
        // Tạo tên chỉ số dựa trên thời điểm đo
        let tenChiSo = 'Duong_huyet';
        
        // Tìm cấu hình mới nhất theo tên chỉ số
        let cauHinh = null;
        let idCauHinh = null;
        
        // Ưu tiên tìm theo tên chỉ số cụ thể
        const [configs] = await db.execute(
            'SELECT * FROM cau_hinh_chi_so_canh_bao WHERE ten_chi_so = ? ORDER BY ngay_tao DESC LIMIT 1',
            [tenChiSo]
        );
        
        // Nếu không tìm thấy tên chỉ số cụ thể, tìm chung
        if (configs.length === 0) {
            const [generalConfigs] = await db.execute(
                'SELECT * FROM cau_hinh_chi_so_canh_bao WHERE ten_chi_so LIKE ? ORDER BY ngay_tao DESC LIMIT 1',
                ['%Duong_huyet%']
            );
            
            if (generalConfigs.length > 0) {
                cauHinh = generalConfigs[0];
                idCauHinh = cauHinh.id;
            }
        } else {
            cauHinh = configs[0];
            idCauHinh = cauHinh.id;
        }

        // Nếu không có cấu hình, sử dụng đánh giá mặc định
        if (!cauHinh || !cauHinh.gioi_han_canh_bao) {
            return this.evaluateBloodSugarDefault(glucoseValue, idCauHinh);
        }

        // Parse JSON cấu hình
        let gioiHan;
        try {
            gioiHan = typeof cauHinh.gioi_han_canh_bao === 'string' 
                ? JSON.parse(cauHinh.gioi_han_canh_bao) 
                : cauHinh.gioi_han_canh_bao;
        } catch (e) {
            console.error('Error parsing gioi_han_canh_bao:', e);
            return this.evaluateBloodSugarDefault(glucoseValue, idCauHinh);
        }

        // Đánh giá dựa trên cấu hình
        return this.evaluateBasedOnConfig(glucoseValue, gioiHan, idCauHinh);
        
    } catch (error) {
        console.error('Error evaluating blood sugar:', error);
        return this.evaluateBloodSugarDefault(glucoseValue, null);
    }
}

    // Hàm đánh giá dựa trên cấu hình JSON
    static evaluateBasedOnConfig(glucoseValue, gioiHan, idCauHinh) {
        const numericValue = parseFloat(glucoseValue);
        
        if (isNaN(numericValue) || !isFinite(numericValue)) {
            return {
                danh_gia_chi_tiet: 'Không thể đánh giá',
                muc_do: 'binh_thuong',
                noi_dung_canh_bao: 'Giá trị không hợp lệ',
                id_cau_hinh: idCauHinh
            };
        }

        // Kiểm tra theo thứ tự: Thấp -> Bình thường -> Cao -> Nguy hiểm
        // (theo logic từ hàm evaluateSingleValue trước đó)
        
        // Thấp: giá trị trong khoảng [min, max]
        if (gioiHan.thap && gioiHan.thap.min !== undefined && gioiHan.thap.max !== undefined) {
            if (numericValue >= gioiHan.thap.min && numericValue <= gioiHan.thap.max) {
                return {
                    danh_gia_chi_tiet: gioiHan.thap.danh_gia || 'Đường huyết thấp',
                    muc_do: 'canh_bao',
                    noi_dung_canh_bao: gioiHan.thap.message || 'Giá trị thấp, cần theo dõi.',
                    id_cau_hinh: idCauHinh
                };
            }
        }

        // Bình thường: giá trị trong khoảng [min, max]
        if (gioiHan.binh_thuong && gioiHan.binh_thuong.min !== undefined && gioiHan.binh_thuong.max !== undefined) {
            if (numericValue >= gioiHan.binh_thuong.min && numericValue <= gioiHan.binh_thuong.max) {
                return {
                    danh_gia_chi_tiet: gioiHan.binh_thuong.danh_gia || 'Bình thường',
                    muc_do: 'binh_thuong',
                    noi_dung_canh_bao: gioiHan.binh_thuong.message || null,
                    id_cau_hinh: idCauHinh
                };
            }
        }

        // Cao: giá trị trong khoảng [min, max]
        if (gioiHan.cao && gioiHan.cao.min !== undefined && gioiHan.cao.max !== undefined) {
            if (numericValue >= gioiHan.cao.min && numericValue <= gioiHan.cao.max) {
                return {
                    danh_gia_chi_tiet: gioiHan.cao.danh_gia || 'Đường huyết cao',
                    muc_do: 'canh_bao',
                    noi_dung_canh_bao: gioiHan.cao.message || 'Giá trị cao, cần theo dõi.',
                    id_cau_hinh: idCauHinh
                };
            }
        }

        // Nguy hiểm: Nếu giá trị không thuộc bất kỳ mốc nào
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
            id_cau_hinh: idCauHinh
        };
    }

    // Hàm đánh giá mặc định (sử dụng khi không có cấu hình)
    static evaluateBloodSugarDefault(glucoseValue, measurementTime = 'khac', idCauHinh = null) {
        const numericValue = parseFloat(glucoseValue);
        
        if (isNaN(numericValue) || !isFinite(numericValue)) {
            return {
                danh_gia_chi_tiet: 'Không thể đánh giá',
                muc_do: 'binh_thuong',
                noi_dung_canh_bao: 'Giá trị không hợp lệ',
                id_cau_hinh: idCauHinh
            };
        }

        // Tiêu chuẩn ADA mặc định
        let danhGiaChiTiet = 'Bình thường';
        let mucDo = 'binh_thuong';
        let noiDungCanhBao = null;

        if (measurementTime === 'truoc_an' || measurementTime === 'doi') {
            // Trước ăn hoặc đói (mmol/L)
            if (numericValue < 3.9) { // < 70 mg/dL
                danhGiaChiTiet = 'Hạ đường huyết nặng';
                mucDo = 'nguy_hiem';
                noiDungCanhBao = 'Hạ đường huyết nặng - Cần xử trí ngay';
            } else if (numericValue < 4.4) { // < 80 mg/dL
                danhGiaChiTiet = 'Hạ đường huyết nhẹ';
                mucDo = 'canh_bao';
                noiDungCanhBao = 'Hạ đường huyết nhẹ';
            } else if (numericValue >= 4.4 && numericValue <= 5.6) { // 80-100 mg/dL
                danhGiaChiTiet = 'Bình thường';
                mucDo = 'binh_thuong';
            } else if (numericValue >= 5.7 && numericValue <= 6.9) { // 101-125 mg/dL
                danhGiaChiTiet = 'Tiền đái tháo đường';
                mucDo = 'canh_bao';
                noiDungCanhBao = 'Tiền đái tháo đường';
            } else if (numericValue >= 7.0 && numericValue < 11.1) { // 126-199 mg/dL
                danhGiaChiTiet = 'Đái tháo đường';
                mucDo = 'canh_bao';
                noiDungCanhBao = 'Đái tháo đường - Cần theo dõi';
            } else if (numericValue >= 11.1) { // ≥ 200 mg/dL
                danhGiaChiTiet = 'Đường huyết rất cao';
                mucDo = 'nguy_hiem';
                noiDungCanhBao = 'Đường huyết rất cao - Nguy cơ hôn mê';
            }
        } else if (measurementTime === 'sau_an') {
            // Sau ăn 2 giờ (mmol/L)
            if (numericValue < 3.9) { // < 70 mg/dL
                danhGiaChiTiet = 'Hạ đường huyết nặng';
                mucDo = 'nguy_hiem';
                noiDungCanhBao = 'Hạ đường huyết nặng - Cần xử trí ngay';
            } else if (numericValue < 4.4) { // < 80 mg/dL
                danhGiaChiTiet = 'Hạ đường huyết nhẹ';
                mucDo = 'canh_bao';
                noiDungCanhBao = 'Hạ đường huyết nhẹ';
            } else if (numericValue >= 4.4 && numericValue <= 7.8) { // 80-140 mg/dL
                danhGiaChiTiet = 'Bình thường';
                mucDo = 'binh_thuong';
            } else if (numericValue >= 7.9 && numericValue <= 11.0) { // 141-199 mg/dL
                danhGiaChiTiet = 'Đường huyết sau ăn cao';
                mucDo = 'canh_bao';
                noiDungCanhBao = 'Đường huyết sau ăn cao';
            } else if (numericValue >= 11.1) { // ≥ 200 mg/dL
                danhGiaChiTiet = 'Đường huyết sau ăn rất cao';
                mucDo = 'nguy_hiem';
                noiDungCanhBao = 'Đường huyết sau ăn rất cao';
            }
        } else {
            // Mặc định (mmol/L)
            if (numericValue < 3.9) { // < 70 mg/dL
                danhGiaChiTiet = 'Hạ đường huyết';
                mucDo = 'nguy_hiem';
                noiDungCanhBao = 'Hạ đường huyết';
            } else if (numericValue >= 3.9 && numericValue <= 6.1) { // 70-110 mg/dL
                danhGiaChiTiet = 'Bình thường';
                mucDo = 'binh_thuong';
            } else if (numericValue >= 6.2 && numericValue <= 7.8) { // 111-140 mg/dL
                danhGiaChiTiet = 'Đường huyết cao nhẹ';
                mucDo = 'canh_bao';
                noiDungCanhBao = 'Đường huyết cao nhẹ';
            } else if (numericValue >= 7.9 && numericValue <= 11.0) { // 141-199 mg/dL
                danhGiaChiTiet = 'Đường huyết cao vừa';
                mucDo = 'canh_bao';
                noiDungCanhBao = 'Đường huyết cao vừa';
            } else { // ≥ 200 mg/dL
                danhGiaChiTiet = 'Đường huyết cao nặng';
                mucDo = 'nguy_hiem';
                noiDungCanhBao = 'Đường huyết cao nặng';
            }
        }

        return { 
            danh_gia_chi_tiet: danhGiaChiTiet,  
            muc_do: mucDo, 
            noi_dung_canh_bao: noiDungCanhBao,
            id_cau_hinh: idCauHinh
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
