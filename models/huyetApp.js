
const connection = require('../config/database')

class huyetAp {
    static async create(data) {
        try {
            const {
                id_benh_nhan,
                tam_thu,
                tam_truong,
                danh_gia_chi_tiet,
                thoi_gian_do,
                vi_tri_do,
                tu_the_khi_do,
                ghi_chu,
                muc_do,
                noi_dung_canh_bao,
                id_cau_hinh_chi_so_canh_bao
            } = data;

            // Nếu chưa có đánh giá, tự động đánh giá dựa trên cấu hình
            let evaluationResult = null;
            if (tam_thu !== undefined && tam_truong !== undefined) {
                if (!danh_gia_chi_tiet || !muc_do) {
                    evaluationResult = await this.evaluateBloodPressure(
                        tam_thu,
                        tam_truong
                    );
                }
            }

            const query = `
            INSERT INTO huyet_ap 
                (id_benh_nhan, tam_thu, tam_truong, danh_gia_chi_tiet, thoi_gian_do, 
                 vi_tri_do, tu_the_khi_do, ghi_chu, muc_do, noi_dung_canh_bao, id_cau_hinh_chi_so_canh_bao)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const values = [
                id_benh_nhan,
                tam_thu,
                tam_truong,
                evaluationResult ? evaluationResult.danh_gia_chi_tiet : (danh_gia_chi_tiet || null),
                thoi_gian_do || new Date(),
                vi_tri_do,
                tu_the_khi_do,
                ghi_chu || null,
                evaluationResult ? evaluationResult.muc_do : (muc_do || null),
                evaluationResult ? evaluationResult.noi_dung_canh_bao : (noi_dung_canh_bao || null),
                evaluationResult ? evaluationResult.id_cau_hinh : (id_cau_hinh_chi_so_canh_bao || null)
            ];
            
            const [result] = await connection.execute(query, values);
            
            // Lấy bản ghi vừa thêm
            const newId = result.insertId;
            const newRecord = await this.findById(newId);
            
            return {
                success: true,
                message: 'Thêm dữ liệu huyết áp thành công',
                data: newRecord ? newRecord[0] : null
            };
        } catch (error) {
            console.error('Lỗi khi thêm dữ liệu huyết áp:', error);
            throw new Error('Không thể thêm dữ liệu huyết áp: ' + error.message);
        }
    };

    static async findById(id) {
        try {
            const query = `
            SELECT ha.*, bn.ho_ten, bn.ngay_sinh, bn.gioi_tinh
                FROM huyet_ap ha
                LEFT JOIN benh_nhan bn ON ha.id_benh_nhan = bn.id
                WHERE ha.id = ?
            `;
            const [rows] = await connection.execute(query, [id]);
            return rows;
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu huyết áp theo ID:', error);
            throw new Error('Không thể lấy dữ liệu huyết áp: ' + error.message);
        }
    };

    static async findByBenhNhan(idBenhNhan, filters = {}) {
        try {
            let query = `
                SELECT ha.*, bn.ho_ten, bn.ngay_sinh, bn.gioi_tinh
                FROM huyet_ap ha
                LEFT JOIN benh_nhan bn ON ha.id_benh_nhan = bn.id
                WHERE ha.id_benh_nhan = ?
            `;
            
            const values = [idBenhNhan];

            if (filters.from_date) {
                query += ' AND DATE(ha.thoi_gian_do) >= ?';
                values.push(filters.from_date);
            }

            if (filters.to_date) {
                query += ' AND DATE(ha.thoi_gian_do) <= ?';
                values.push(filters.to_date);
            }

            if (filters.vi_tri_do) {
                query += ' AND ha.vi_tri_do = ?';
                values.push(filters.vi_tri_do);
            }

            if (filters.tu_the_khi_do) {
                query += ' AND ha.tu_the_khi_do = ?';
                values.push(filters.tu_the_khi_do);
            }

            if (filters.muc_do) {
                query += ' AND ha.muc_do = ?';
                values.push(filters.muc_do);
            }

            query += ' ORDER BY ha.thoi_gian_do DESC';

            if (filters.limit) {
                query += ' LIMIT ?';
                values.push(parseInt(filters.limit));
            }

            const [rows] = await connection.execute(query, values);
            return rows;
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu huyết áp theo bệnh nhân:', error);
            throw new Error('Không thể lấy dữ liệu huyết áp của bệnh nhân: ' + error.message);
        }
    };

    static async findLastestById(id) {
        try {
            const query = `
            SELECT ha.*, bn.ho_ten, bn.ngay_sinh, bn.gioi_tinh
                FROM huyet_ap ha
                LEFT JOIN benh_nhan bn ON ha.id_benh_nhan = bn.id
                WHERE ha.id_benh_nhan = ?
                ORDER BY ha.thoi_gian_do DESC
                LIMIT 1
            `;
            const [rows] = await connection.execute(query, [id]);
            return rows[0] || null;
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu huyết áp gần nhất:', error);
            throw new Error('Không thể lấy dữ liệu huyết áp gần nhất: ' + error.message);
        }
    };
    static async findLastestByIdToday(id) {
    try {
        const query = `
            SELECT ha.*, bn.ho_ten, bn.ngay_sinh, bn.gioi_tinh
            FROM huyet_ap ha
            LEFT JOIN benh_nhan bn ON ha.id_benh_nhan = bn.id
            WHERE ha.id_benh_nhan = ? 
                AND DATE(ha.thoi_gian_do) = CURDATE()
            ORDER BY ha.thoi_gian_do DESC
            LIMIT 1
        `;
        const [rows] = await connection.execute(query, [id]);
        return rows[0] || null;
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu huyết áp gần nhất hôm nay:', error);
        throw new Error('Không thể lấy dữ liệu huyết áp gần nhất hôm nay: ' + error.message);
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

            const query = `UPDATE huyet_ap SET ${fields.join(', ')} WHERE id = ?`;
            const [result] = await connection.execute(query, values);

            if (result.affectedRows === 0) {
                return { success: false, message: 'Không tìm thấy bản ghi để cập nhật' };
            }

            const updatedRecord = await this.findById(id);
            
            return {
                success: true,
                message: 'Cập nhật dữ liệu huyết áp thành công',
                data: updatedRecord ? updatedRecord[0] : null
            };
        } catch (error) {
            console.error('Lỗi khi cập nhật dữ liệu huyết áp:', error);
            throw new Error('Không thể cập nhật dữ liệu huyết áp: ' + error.message);
        }
    };

    static async delete(id) {
        try {
            const query = 'DELETE FROM huyet_ap WHERE id = ?';
            const [result] = await connection.execute(query, [id]);

            if (result.affectedRows === 0) {
                return { success: false, message: 'Không tìm thấy bản ghi để xóa' };
            }

            return {
                success: true,
                message: 'Xóa dữ liệu huyết áp thành công',
                affectedRows: result.affectedRows
            };
        } catch (error) {
            console.error('Lỗi khi xóa dữ liệu huyết áp:', error);
            throw new Error('Không thể xóa dữ liệu huyết áp: ' + error.message);
        }
    };

    static async evaluateBloodPressure(tamThu, tamTruong) {
        try {
            // Tên chỉ số cho Huyết áp
            const tenChiSo = 'Huyết áp';
            
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
                return this.evaluateBloodPressureDefault(tamThu, tamTruong, idCauHinh);
            }

            // Parse JSON cấu hình
            let gioiHan;
            try {
                gioiHan = typeof cauHinh.gioi_han_canh_bao === 'string' 
                    ? JSON.parse(cauHinh.gioi_han_canh_bao) 
                    : cauHinh.gioi_han_canh_bao;
            } catch (e) {
                console.error('Error parsing gioi_han_canh_bao:', e);
                return this.evaluateBloodPressureDefault(tamThu, tamTruong, idCauHinh);
            }

            // Đánh giá dựa trên cấu hình
            return this.evaluateBasedOnConfig(tamThu, tamTruong, gioiHan, idCauHinh);
            
        } catch (error) {
            console.error('Error evaluating blood pressure:', error);
            return this.evaluateBloodPressureDefault(tamThu, tamTruong, null);
        }
    };

    // Hàm đánh giá dựa trên cấu hình JSON
   static evaluateBasedOnConfig(tamThu, tamTruong, gioiHan, idCauHinh) {
    // Kiểm tra giá trị hợp lệ
    const numericTamThu = parseFloat(tamThu);
    const numericTamTruong = parseFloat(tamTruong);
    
    if (isNaN(numericTamThu) || !isFinite(numericTamThu) || 
        isNaN(numericTamTruong) || !isFinite(numericTamTruong)) {
        return {
            danh_gia_chi_tiet: 'Không thể đánh giá',
            muc_do: 'binh_thuong',
            noi_dung_canh_bao: 'Giá trị không hợp lệ',
            id_cau_hinh: idCauHinh
        };
    }

    // Đánh giá riêng biệt cho tâm thu và tâm trương
    let danhGiaTamThu = null;
    let danhGiaTamTruong = null;
    let mucDoTamThu = 'binh_thuong';
    let mucDoTamTruong = 'binh_thuong';
    let noiDungTamThu = null;
    let noiDungTamTruong = null;

    // Hàm đánh giá từng chỉ số
    const danhGiaChiSo = (giaTri, loai) => {
        // Mặc định là bình thường
        let ketQua = {
            danh_gia: 'Bình thường',
            muc_do: 'binh_thuong',
            noi_dung: null
        };

        // Kiểm tra từng mức độ: thấp -> bình thường -> cao -> nguy hiểm
        if (gioiHan.thap && 
            gioiHan.thap[`tam_${loai}_min`] !== undefined && 
            gioiHan.thap[`tam_${loai}_max`] !== undefined) {
            const min = gioiHan.thap[`tam_${loai}_min`];
            const max = gioiHan.thap[`tam_${loai}_max`];
            if (giaTri >= min && giaTri <= max) {
                return {
                    danh_gia: gioiHan.thap.danh_gia || 'Thấp',
                    muc_do: 'canh_bao',
                    noi_dung: gioiHan.thap.message || 'Huyết áp thấp, cần theo dõi.'
                };
            }
        }

        if (gioiHan.binh_thuong && 
            gioiHan.binh_thuong[`tam_${loai}_min`] !== undefined && 
            gioiHan.binh_thuong[`tam_${loai}_max`] !== undefined) {
            const min = gioiHan.binh_thuong[`tam_${loai}_min`];
            const max = gioiHan.binh_thuong[`tam_${loai}_max`];
            if (giaTri >= min && giaTri <= max) {
                return {
                    danh_gia: gioiHan.binh_thuong.danh_gia || 'Bình thường',
                    muc_do: 'binh_thuong',
                    noi_dung: gioiHan.binh_thuong.message || null
                };
            }
        }

        if (gioiHan.cao && 
            gioiHan.cao[`tam_${loai}_min`] !== undefined && 
            gioiHan.cao[`tam_${loai}_max`] !== undefined) {
            const min = gioiHan.cao[`tam_${loai}_min`];
            const max = gioiHan.cao[`tam_${loai}_max`];
            if (giaTri >= min && giaTri <= max) {
                return {
                    danh_gia: gioiHan.cao.danh_gia || 'Cao',
                    muc_do: 'canh_bao',
                    noi_dung: gioiHan.cao.message || 'Huyết áp cao, cần theo dõi.'
                };
            }
        }

        // Nếu không thuộc các mức trên -> nguy hiểm
        return {
            danh_gia: gioiHan.nguy_hiem?.danh_gia || 'Nguy hiểm',
            muc_do: 'nguy_hiem',
            noi_dung: gioiHan.nguy_hiem?.message || 'Huyết áp nguy hiểm! Cần can thiệp ngay.'
        };
    };

    // Đánh giá từng chỉ số
    const ketQuaTamThu = danhGiaChiSo(numericTamThu, 'thu');
    const ketQuaTamTruong = danhGiaChiSo(numericTamTruong, 'truong');

    // Xác định mức độ chung (lấy mức độ cao nhất)
    const mucDoMap = {
        'binh_thuong': 1,
        'canh_bao': 2,
        'nguy_hiem': 3
    };

    const mucDoChung = 
        mucDoMap[ketQuaTamThu.muc_do] >= mucDoMap[ketQuaTamTruong.muc_do] 
        ? ketQuaTamThu.muc_do 
        : ketQuaTamTruong.muc_do;

    // Xác định đánh giá chi tiết
    let danhGiaChiTiet = '';
    let noiDungCanhBao = '';

    if (mucDoChung === 'nguy_hiem') {
        danhGiaChiTiet = gioiHan.nguy_hiem?.danh_gia || 'Nguy hiểm';
        noiDungCanhBao = gioiHan.nguy_hiem?.message || 'Huyết áp nguy hiểm! Cần can thiệp ngay.';
    } else if (mucDoChung === 'canh_bao') {
        // Nếu có 1 chỉ số cảnh báo, 1 chỉ số bình thường
        if ((ketQuaTamThu.muc_do === 'canh_bao' && ketQuaTamTruong.muc_do === 'binh_thuong') ||
            (ketQuaTamThu.muc_do === 'binh_thuong' && ketQuaTamTruong.muc_do === 'canh_bao')) {
            
            const chiSoCanhBao = ketQuaTamThu.muc_do === 'canh_bao' ? 'tâm thu' : 'tâm trương';
            const mucDoCanhBao = ketQuaTamThu.muc_do === 'canh_bao' ? ketQuaTamThu.danh_gia : ketQuaTamTruong.danh_gia;
            
            danhGiaChiTiet = `${mucDoCanhBao} (${chiSoCanhBao})`;
            noiDungCanhBao = `Huyết áp ${mucDoCanhBao.toLowerCase()} ở chỉ số ${chiSoCanhBao}. Cần theo dõi.`;
        } else if (ketQuaTamThu.muc_do === 'canh_bao' && ketQuaTamTruong.muc_do === 'canh_bao') {
            // Cả hai đều cảnh báo
            if (ketQuaTamThu.danh_gia === ketQuaTamTruong.danh_gia) {
                danhGiaChiTiet = ketQuaTamThu.danh_gia;
            } else {
                danhGiaChiTiet = `${ketQuaTamThu.danh_gia} (tâm thu) / ${ketQuaTamTruong.danh_gia} (tâm trương)`;
            }
            noiDungCanhBao = 'Huyết áp bất thường ở cả hai chỉ số. Cần theo dõi chặt chẽ.';
        }
    } else {
        // Bình thường
        danhGiaChiTiet = gioiHan.binh_thuong?.danh_gia || 'Bình thường';
        noiDungCanhBao = gioiHan.binh_thuong?.message || null;
    }

    return {
        danh_gia_chi_tiet: danhGiaChiTiet,
        muc_do: mucDoChung,
        noi_dung_canh_bao: noiDungCanhBao,
        id_cau_hinh: idCauHinh
    };
}

    // Hàm đánh giá mặc định (sử dụng khi không có cấu hình)
    static evaluateBloodPressureDefault(tamThu, tamTruong, idCauHinh = null) {
        // Kiểm tra giá trị hợp lệ
        const numericTamThu = parseFloat(tamThu);
        const numericTamTruong = parseFloat(tamTruong);
        
        if (isNaN(numericTamThu) || !isFinite(numericTamThu) || 
            isNaN(numericTamTruong) || !isFinite(numericTamTruong)) {
            return {
                danh_gia_chi_tiet: 'Không thể đánh giá',
                muc_do: 'binh_thuong',
                noi_dung_canh_bao: 'Giá trị không hợp lệ',
                id_cau_hinh: idCauHinh
            };
        }

        let danhGia = 'binh_thuong';
        let mucDo = 'binh_thuong';
        let noiDungCanhBao = null;

        // Đánh giá theo tiêu chuẩn
        if (numericTamThu >= 180 || numericTamTruong >= 120) {
            danhGia = 'cao_nang';
            mucDo = 'nguy_hiem';
            noiDungCanhBao = 'Huyết áp rất cao - Cần can thiệp y tế ngay lập tức';
        } else if (numericTamThu >= 160 || numericTamTruong >= 100) {
            danhGia = 'cao_vua';
            mucDo = 'canh_bao';
            noiDungCanhBao = 'Huyết áp cao - Cần theo dõi chặt chẽ';
        } else if (numericTamThu >= 140 || numericTamTruong >= 90) {
            danhGia = 'cao_nhe';
            mucDo = 'canh_bao';
            noiDungCanhBao = 'Huyết áp tăng nhẹ';
        } else if (numericTamThu < 90 || numericTamTruong < 60) {
            danhGia = 'thap';
            mucDo = 'canh_bao';
            noiDungCanhBao = 'Huyết áp thấp - Cần theo dõi';
        } else {
            danhGia = 'binh_thuong';
            mucDo = 'binh_thuong';
        }

        return { 
            danh_gia_chi_tiet: danhGia, 
            muc_do: mucDo, 
            noi_dung_canh_bao: noiDungCanhBao,
            id_cau_hinh: idCauHinh 
        };
    };
}

module.exports = huyetAp;
