
const connection = require('../config/database');

class sp02 {
    static async create(data) {
        try {
            const {
                id_benh_nhan,
                gia_tri_spo2,
                pi,
                thoi_gian_do,
                vi_tri_do,
                tinh_trang_ho_hap,
                ghi_chu,
                muc_do,
                noi_dung_canh_bao,
                id_cau_hinh_chi_so_canh_bao,
                danh_gia_chi_tiet
            } = data;

            // Nếu chưa có đánh giá, tự động đánh giá dựa trên cấu hình
            let evaluationResult = null;
            if (gia_tri_spo2 !== undefined && gia_tri_spo2 !== null) {
                if (!danh_gia_chi_tiet || !muc_do) {
                    evaluationResult = await this.evaluateSpO2(
                        gia_tri_spo2, 
                        tinh_trang_ho_hap
                    );
                }
            }

            const query = `
                INSERT INTO spo2 
                (id_benh_nhan, gia_tri_spo2, pi, thoi_gian_do, 
                 vi_tri_do, tinh_trang_ho_hap, ghi_chu, muc_do, 
                 noi_dung_canh_bao, id_cau_hinh_chi_so_canh_bao, danh_gia_chi_tiet)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const values = [
                id_benh_nhan,
                gia_tri_spo2,
                pi ?? null,
                thoi_gian_do || new Date(),
                vi_tri_do || 'ngon_tay_tro',
                evaluationResult ? evaluationResult.tinh_trang_ho_hap : (tinh_trang_ho_hap || 'binh_thuong'),
                ghi_chu ?? null,
                evaluationResult ? evaluationResult.muc_do : (muc_do ?? 'binh_thuong'),
                evaluationResult ? evaluationResult.noi_dung_canh_bao : (noi_dung_canh_bao ?? null),
                evaluationResult ? evaluationResult.id_cau_hinh : (id_cau_hinh_chi_so_canh_bao ?? null),
                evaluationResult ? evaluationResult.danh_gia_chi_tiet : (danh_gia_chi_tiet ?? null)
            ];

            // Đảm bảo không có undefined trong values
            const sanitizedValues = values.map(v => v === undefined ? null : v);
            const [result] = await connection.execute(query, sanitizedValues);
            const newRecord = await this.findById(result.insertId);

            return {
                success: true,
                message: 'Thêm dữ liệu SpO2 thành công',
                data: newRecord
            };
        } catch (error) {
            console.error('Lỗi khi thêm dữ liệu SpO2:', error);
            throw new Error('Không thể thêm dữ liệu SpO2: ' + error.message);
        }
    }

    static async findById(id) {
        try {
            const query = `
                SELECT s.*, bn.ho_ten, bn.ngay_sinh, bn.gioi_tinh
                FROM spo2 s
                LEFT JOIN benh_nhan bn ON s.id_benh_nhan = bn.id
                WHERE s.id = ?
            `;
            const [rows] = await connection.execute(query, [id]);
            return rows[0] || null;
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu SpO2 theo ID:', error);
            throw new Error('Không thể lấy dữ liệu SpO2: ' + error.message);
        }
    }

    static async findByBenhNhan(idBenhNhan, filters = {}) {
        try {
            let query = `
                SELECT s.*, bn.ho_ten, bn.ngay_sinh, bn.gioi_tinh
                FROM spo2 s
                LEFT JOIN benh_nhan bn ON s.id_benh_nhan = bn.id
                WHERE s.id_benh_nhan = ?
            `;

            const values = [idBenhNhan];

            if (filters.from_date) {
                query += ' AND DATE(s.thoi_gian_do) >= ?';
                values.push(filters.from_date);
            }

            if (filters.to_date) {
                query += ' AND DATE(s.thoi_gian_do) <= ?';
                values.push(filters.to_date);
            }

            if (filters.vi_tri_do) {
                query += ' AND s.vi_tri_do = ?';
                values.push(filters.vi_tri_do);
            }

            if (filters.tinh_trang_ho_hap) {
                query += ' AND s.tinh_trang_ho_hap = ?';
                values.push(filters.tinh_trang_ho_hap);
            }

            // Thêm filter cho muc_do
            if (filters.muc_do) {
                query += ' AND s.muc_do = ?';
                values.push(filters.muc_do);
            }

            query += ' ORDER BY s.thoi_gian_do DESC';

            if (filters.limit) {
                query += ' LIMIT ?';
                values.push(parseInt(filters.limit));
            }

            const [rows] = await connection.execute(query, values);
            return rows;
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu SpO2 theo bệnh nhân:', error);
            throw new Error('Không thể lấy dữ liệu SpO2 của bệnh nhân: ' + error.message);
        }
    }

    static async findLatestByBenhNhan(idBenhNhan) {
        try {
            const query = `
                SELECT s.*, bn.ho_ten, bn.ngay_sinh, bn.gioi_tinh
                FROM spo2 s
                LEFT JOIN benh_nhan bn ON s.id_benh_nhan = bn.id
                WHERE s.id_benh_nhan = ?
                ORDER BY s.thoi_gian_do DESC
                LIMIT 1
            `;
            const [rows] = await connection.execute(query, [idBenhNhan]);
            return rows[0] || null;
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu SpO2 gần nhất:', error);
            throw new Error('Không thể lấy dữ liệu SpO2 gần nhất: ' + error.message);
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

            fields.push('ngay_cap_nhat = CURRENT_TIMESTAMP');

            values.push(id);

            const query = `UPDATE spo2 SET ${fields.join(', ')} WHERE id = ?`;

            // Đảm bảo không có undefined trong values
            const sanitizedValues = values.map(v => v === undefined ? null : v);
            const [result] = await connection.execute(query, sanitizedValues);

            if (result.affectedRows === 0) {
                return { success: false, message: 'Không tìm thấy bản ghi để cập nhật' };
            }

            const updatedRecord = await this.findById(id);

            return {
                success: true,
                message: 'Cập nhật dữ liệu SpO2 thành công',
                data: updatedRecord
            };
        } catch (error) {
            console.error('Lỗi khi cập nhật dữ liệu SpO2:', error);
            throw new Error('Không thể cập nhật dữ liệu SpO2: ' + error.message);
        }
    }

    static async delete(id) {
        try {
            const query = 'DELETE FROM spo2 WHERE id = ?';
            const [result] = await connection.execute(query, [id]);

            if (result.affectedRows === 0) {
                return { success: false, message: 'Không tìm thấy bản ghi để xóa' };
            }

            return {
                success: true,
                message: 'Xóa dữ liệu SpO2 thành công',
                affectedRows: result.affectedRows
            };
        } catch (error) {
            console.error('Lỗi khi xóa dữ liệu SpO2:', error);
            throw new Error('Không thể xóa dữ liệu SpO2: ' + error.message);
        }
    }

    static async evaluateSpO2(spo2Value, tinhTrangHoHap = null) {
        try {
            // Tên chỉ số cho SpO2
            const tenChiSo = 'SpO2';
            
            // Tìm cấu hình mới nhất theo tên chỉ số
            const [configs] = await connection.execute(
                'SELECT * FROM cau_hinh_chi_so_canh_bao WHERE ten_chi_so = ? ORDER BY ngay_tao DESC LIMIT 1',
                [tenChiSo]
            );
            
            let cauHinh = null;
            let idCauHinh = null;
            
            if (configs.length > 0) {
                cauHinh = configs[0];
                idCauHinh = cauHinh.id;
            }

            // Nếu không có cấu hình, sử dụng đánh giá mặc định
            if (!cauHinh || !cauHinh.gioi_han_canh_bao) {
                return this.evaluateSpO2Default(spo2Value, tinhTrangHoHap, idCauHinh);
            }

            // Parse JSON cấu hình
            let gioiHan;
            try {
                gioiHan = typeof cauHinh.gioi_han_canh_bao === 'string' 
                    ? JSON.parse(cauHinh.gioi_han_canh_bao) 
                    : cauHinh.gioi_han_canh_bao;
            } catch (e) {
                console.error('Error parsing gioi_han_canh_bao:', e);
                return this.evaluateSpO2Default(spo2Value, tinhTrangHoHap, idCauHinh);
            }

            // Đánh giá dựa trên cấu hình
            return this.evaluateBasedOnConfig(spo2Value, gioiHan, tinhTrangHoHap, idCauHinh);
            
        } catch (error) {
            console.error('Error evaluating SpO2:', error);
            return this.evaluateSpO2Default(spo2Value, tinhTrangHoHap, null);
        }
    }

    // Hàm đánh giá dựa trên cấu hình JSON
    static evaluateBasedOnConfig(spo2Value, gioiHan, tinhTrangHoHap, idCauHinh) {
        const numericValue = parseFloat(spo2Value);
        
        if (isNaN(numericValue) || !isFinite(numericValue)) {
            return {
                danh_gia_chi_tiet: 'Không thể đánh giá',
                muc_do: 'binh_thuong',
                noi_dung_canh_bao: 'Giá trị không hợp lệ',
                tinh_trang_ho_hap: 'binh_thuong',
                id_cau_hinh: idCauHinh
            };
        }

        // Kiểm tra theo thứ tự: Thấp -> Bình thường -> Cao -> Nguy hiểm
        // (theo logic từ hàm evaluateSingleValue trước đó)
        
        // Thấp: giá trị trong khoảng [min, max]
        if (gioiHan.thap && gioiHan.thap.min !== undefined && gioiHan.thap.max !== undefined) {
            if (numericValue >= gioiHan.thap.min && numericValue <= gioiHan.thap.max) {
                let tinhTrang = tinhTrangHoHap || 'kho_tho';
                if (gioiHan.thap.tinh_trang_ho_hap) {
                    tinhTrang = gioiHan.thap.tinh_trang_ho_hap;
                }
                
                return {
                    danh_gia_chi_tiet: gioiHan.thap.danh_gia || 'SpO2 thấp',
                    muc_do: 'canh_bao',
                    noi_dung_canh_bao: gioiHan.thap.message || 'SpO2 thấp, cần theo dõi.',
                    tinh_trang_ho_hap: tinhTrang,
                    id_cau_hinh: idCauHinh
                };
            }
        }

        // Bình thường: giá trị trong khoảng [min, max]
        if (gioiHan.binh_thuong && gioiHan.binh_thuong.min !== undefined && gioiHan.binh_thuong.max !== undefined) {
            if (numericValue >= gioiHan.binh_thuong.min && numericValue <= gioiHan.binh_thuong.max) {
                let tinhTrang = tinhTrangHoHap || 'binh_thuong';
                if (gioiHan.binh_thuong.tinh_trang_ho_hap) {
                    tinhTrang = gioiHan.binh_thuong.tinh_trang_ho_hap;
                }
                
                return {
                    danh_gia_chi_tiet: gioiHan.binh_thuong.danh_gia || 'Bình thường',
                    muc_do: 'binh_thuong',
                    noi_dung_canh_bao: gioiHan.binh_thuong.message || null,
                    tinh_trang_ho_hap: tinhTrang,
                    id_cau_hinh: idCauHinh
                };
            }
        }

        // Cao: giá trị trong khoảng [min, max]
        if (gioiHan.cao && gioiHan.cao.min !== undefined && gioiHan.cao.max !== undefined) {
            if (numericValue >= gioiHan.cao.min && numericValue <= gioiHan.cao.max) {
                let tinhTrang = tinhTrangHoHap || 'binh_thuong';
                if (gioiHan.cao.tinh_trang_ho_hap) {
                    tinhTrang = gioiHan.cao.tinh_trang_ho_hap;
                }
                
                return {
                    danh_gia_chi_tiet: gioiHan.cao.danh_gia || 'SpO2 cao',
                    muc_do: 'canh_bao',
                    noi_dung_canh_bao: gioiHan.cao.message || 'SpO2 cao, cần theo dõi.',
                    tinh_trang_ho_hap: tinhTrang,
                    id_cau_hinh: idCauHinh
                };
            }
        }

        // Nguy hiểm: Nếu giá trị không thuộc bất kỳ mốc nào
        let nguyHiemMessage = 'Giá trị nguy hiểm! Cần can thiệp ngay.';
        let nguyHiemDanhGia = 'Nguy hiểm';
        let tinhTrangNguyHiem = tinhTrangHoHap || 'ngung_tho';
        
        if (gioiHan.nguy_hiem && gioiHan.nguy_hiem.message) {
            nguyHiemMessage = gioiHan.nguy_hiem.message;
        }
        if (gioiHan.nguy_hiem && gioiHan.nguy_hiem.danh_gia) {
            nguyHiemDanhGia = gioiHan.nguy_hiem.danh_gia;
        }
        if (gioiHan.nguy_hiem && gioiHan.nguy_hiem.tinh_trang_ho_hap) {
            tinhTrangNguyHiem = gioiHan.nguy_hiem.tinh_trang_ho_hap;
        }
        
        return {
            danh_gia_chi_tiet: nguyHiemDanhGia,
            muc_do: 'nguy_hiem',
            noi_dung_canh_bao: nguyHiemMessage,
            tinh_trang_ho_hap: tinhTrangNguyHiem,
            id_cau_hinh: idCauHinh
        };
    }

    // Hàm đánh giá mặc định (sử dụng khi không có cấu hình)
    static evaluateSpO2Default(spo2Value, hasRespiratorySymptoms = false, idCauHinh = null) {
        const numericValue = parseFloat(spo2Value);
        
        if (isNaN(numericValue) || !isFinite(numericValue)) {
            return {
                danh_gia_chi_tiet: 'Không thể đánh giá',
                muc_do: 'binh_thuong',
                noi_dung_canh_bao: 'Giá trị không hợp lệ',
                tinh_trang_ho_hap: 'binh_thuong',
                id_cau_hinh: idCauHinh
            };
        }

        let danhGia = 'binh_thuong';
        let mucDo = 'binh_thuong';
        let noiDungCanhBao = null;
        let tinh_trang_ho_hap = 'binh_thuong';

        // Đánh giá theo tiêu chuẩn y tế
        if (numericValue >= 95 && numericValue <= 100) {
            danhGia = 'binh_thuong';
            mucDo = 'binh_thuong';
            tinh_trang_ho_hap = 'binh_thuong';
        } else if (numericValue >= 93 && numericValue <= 94) {
            danhGia = 'nhe';
            mucDo = 'canh_bao';
            tinh_trang_ho_hap = hasRespiratorySymptoms ? 'kho_tho' : 'binh_thuong';
            noiDungCanhBao = 'SpO2 giảm nhẹ - Cần theo dõi';
        } else if (numericValue >= 90 && numericValue <= 92) {
            danhGia = 'trung_binh';
            mucDo = 'canh_bao';
            tinh_trang_ho_hap = 'kho_tho';
            noiDungCanhBao = 'Thiếu oxy máu - Cần thở oxy hỗ trợ';
        } else if (numericValue >= 85 && numericValue <= 89) {
            danhGia = 'nang';
            mucDo = 'nguy_hiem';
            tinh_trang_ho_hap = 'tho_nhanh';
            noiDungCanhBao = 'Thiếu oxy máu nặng - Cần can thiệp y tế';
        } else if (numericValue < 85) {
            danhGia = 'rat_nang';
            mucDo = 'nguy_hiem';
            tinh_trang_ho_hap = 'ngung_tho';
            noiDungCanhBao = 'SpO2 rất thấp - Nguy cơ ngừng thở, cần cấp cứu ngay';
        } else if (numericValue > 100) {
            danhGia = 'bat_thuong';
            mucDo = 'canh_bao';
            tinh_trang_ho_hap = 'binh_thuong';
            noiDungCanhBao = 'Giá trị SpO2 không hợp lệ (>100%)';
        }

        if (hasRespiratorySymptoms && numericValue < 95) {
            mucDo = 'nguy_hiem';
            noiDungCanhBao = 'Có triệu chứng hô hấp kèm SpO2 thấp - Cần đánh giá khẩn cấp';
        }

        return {
            danh_gia_chi_tiet: danhGia,
            muc_do: mucDo,
            noi_dung_canh_bao: noiDungCanhBao,
            tinh_trang_ho_hap: tinh_trang_ho_hap,
            id_cau_hinh: idCauHinh
        };
    }
}

module.exports = sp02;
