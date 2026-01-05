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
            muc_do || null,
            noi_dung_canh_bao || null,
            id_cau_hinh_chi_so_canh_bao || null,
            danh_gia_chi_tiet || null
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

    
   static evaluateBloodSugar(glucoseValue, measurementTime = 'truoc_an') {
    let danhGiaChiTiet = 'Bình thường';
    let mucDo = 'binh_thuong';
    let noiDungCanhBao = null;

    // Đánh giá theo tiêu chuẩn ADA 
    if (measurementTime === 'truoc_an' || measurementTime === 'doi') {
        // Trước ăn hoặc đói
        if (glucoseValue < 70) {
            danhGiaChiTiet = 'Hạ đường huyết nặng';
            mucDo = 'nguy_hiem';
            noiDungCanhBao = 'Hạ đường huyết nặng - Cần xử trí ngay';
        } else if (glucoseValue < 80) {
            danhGiaChiTiet = 'Hạ đường huyết nhẹ';
            mucDo = 'canh_bao';
            noiDungCanhBao = 'Hạ đường huyết nhẹ';
        } else if (glucoseValue >= 80 && glucoseValue <= 100) {
            danhGiaChiTiet = 'Bình thường';
            mucDo = 'binh_thuong';
        } else if (glucoseValue >= 101 && glucoseValue <= 125) {
            danhGiaChiTiet = 'Tiền đái tháo đường';
            mucDo = 'canh_bao';
            noiDungCanhBao = 'Tiền đái tháo đường';
        } else if (glucoseValue >= 126 && glucoseValue < 200) {
            danhGiaChiTiet = 'Đái tháo đường';
            mucDo = 'canh_bao';
            noiDungCanhBao = 'Đái tháo đường - Cần theo dõi';
        } else if (glucoseValue >= 200) {
            danhGiaChiTiet = 'Đường huyết rất cao';
            mucDo = 'nguy_hiem';
            noiDungCanhBao = 'Đường huyết rất cao - Nguy cơ hôn mê';
        }
    } else if (measurementTime === 'sau_an') {
        // Sau ăn 2 giờ (mg/dL)
        if (glucoseValue < 70) {
            danhGiaChiTiet = 'Hạ đường huyết nặng';
            mucDo = 'nguy_hiem';
            noiDungCanhBao = 'Hạ đường huyết nặng - Cần xử trí ngay';
        } else if (glucoseValue < 80) {
            danhGiaChiTiet = 'Hạ đường huyết nhẹ';
            mucDo = 'canh_bao';
            noiDungCanhBao = 'Hạ đường huyết nhẹ';
        } else if (glucoseValue >= 80 && glucoseValue <= 140) {
            danhGiaChiTiet = 'Bình thường';
            mucDo = 'binh_thuong';
        } else if (glucoseValue >= 141 && glucoseValue <= 199) {
            danhGiaChiTiet = 'Đường huyết sau ăn cao';
            mucDo = 'canh_bao';
            noiDungCanhBao = 'Đường huyết sau ăn cao';
        } else if (glucoseValue >= 200) {
            danhGiaChiTiet = 'Đường huyết sau ăn rất cao';
            mucDo = 'canh_bao';
            noiDungCanhBao = 'Đường huyết sau ăn rất cao';
        }
    } else {
        // Mặc định (mg/dL)
        if (glucoseValue < 70) {
            danhGiaChiTiet = 'Hạ đường huyết';
            mucDo = 'nguy_hiem';
        } else if (glucoseValue >= 70 && glucoseValue <= 110) {
            danhGiaChiTiet = 'Bình thường';
            mucDo = 'binh_thuong';
        } else if (glucoseValue >= 111 && glucoseValue <= 140) {
            danhGiaChiTiet = 'Đường huyết cao nhẹ';
            mucDo = 'canh_bao';
        } else if (glucoseValue >= 141 && glucoseValue <= 199) {
            danhGiaChiTiet = 'Đường huyết cao vừa';
            mucDo = 'canh_bao';
        } else {
            danhGiaChiTiet = 'Đường huyết cao nặng';
            mucDo = 'nguy_hiem';
        }
    }

    return { 
        danh_gia_chi_tiet: danhGiaChiTiet,  
        muc_do: mucDo, 
        noi_dung_canh_bao: noiDungCanhBao 
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