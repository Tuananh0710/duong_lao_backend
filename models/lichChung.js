const connection = require('../config/database');

class lichChung {
    /**
     * Lấy lịch chung kết hợp sự kiện và lịch khám của bệnh nhân
     * @param {number} idBenhNhan - ID của bệnh nhân
     * @returns {Promise<Array>} - Mảng các sự kiện và lịch khám đã được sắp xếp
     */
    static async getLichChung(idBenhNhan) {
        try {
            if (!idBenhNhan) {
                throw new Error('Thiếu tham số cần thiết: idBenhNhan');
            }

            const querySuKien = `
                SELECT 
                    id,
                    tieu_de AS ten,
                    mo_ta AS ghi_chu,
                    ngay AS thoi_gian,
                    dia_diem,
                    'su_kien' AS loai,
                    ngay_tao,
                    ngay_cap_nhat
                FROM su_kien 
                WHERE da_xoa != 1 
                    AND ngay >= CURDATE()
                ORDER BY ngay
            `;

            const queryLichKham = `
                SELECT 
                    id,
                    CONCAT('Khám: ', loai_kham) AS ten,
                    bac_si AS ghi_chu,
                    thoi_gian,
                    NULL AS dia_diem,
                    'lich_kham' AS loai,
                    ngay_tao,
                    ngay_cap_nhat
                FROM lich_kham
                WHERE id_benh_nhan = ? 
                    AND trang_thai = 'cho_kham' 
                    AND thoi_gian >= CURDATE()
            `;

            const [suKienPromise, lichKhamPromise] = await Promise.all([
                connection.execute(querySuKien),
                connection.execute(queryLichKham, [idBenhNhan])
            ]);

            const [suKienRows] = suKienPromise;
            const [lichKhamRows] = lichKhamPromise;

            // Kết hợp và sắp xếp dữ liệu
            const lichChung = this._combineAndSort(suKienRows, lichKhamRows);

            return lichChung;

        } catch (error) {
            console.error('Lỗi khi lấy lịch chung:', error);
            throw error;
        }
    }

    /**
     * Kết hợp và sắp xếp sự kiện và lịch khám
     * @param {Array} suKienList - Danh sách sự kiện
     * @param {Array} lichKhamList - Danh sách lịch khám
     * @returns {Array} - Danh sách đã kết hợp và sắp xếp
     */
    static _combineAndSort(suKienList, lichKhamList) {
        // Tạo mảng kết hợp
        const combinedList = [
            ...suKienList.map(item => ({
                ...item,
                loai: 'su_kien'
            })),
            ...lichKhamList.map(item => ({
                ...item,
                loai: 'lich_kham'
            }))
        ];

        return combinedList.sort((a, b) => {
            const timeA = new Date(a.thoi_gian);
            const timeB = new Date(b.thoi_gian);
            const now = new Date();
            
            // Ưu tiên thời gian gần hiện tại nhất
            const diffA = Math.abs(timeA - now);
            const diffB = Math.abs(timeB - now);
            
            return diffA - diffB;
        });
    }

    /**
     * Lấy lịch chung với phân trang
     * @param {number} idBenhNhan - ID của bệnh nhân
     * @param {number} page - Trang hiện tại (mặc định 1)
     * @param {number} limit - Số lượng mỗi trang (mặc định 10)
     * @returns {Promise<Object>} - Kết quả phân trang
     */
    static async getLichChungPhanTrang(idBenhNhan, page = 1, limit = 10) {
        try {
            const allItems = await this.getLichChung(idBenhNhan);
            
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            
            const items = allItems.slice(startIndex, endIndex);
            
            return {
                tong_so: allItems.length,
                trang_hien_tai: page,
                tong_trang: Math.ceil(allItems.length / limit),
                so_luong_moi_trang: limit,
                danh_sach: items
            };
            
        } catch (error) {
            console.error('Lỗi khi lấy lịch chung phân trang:', error);
            throw error;
        }
    }

    /**
     * Lấy lịch chung trong khoảng thời gian cụ thể
     * @param {number} idBenhNhan - ID của bệnh nhân
     * @param {Date} startDate - Ngày bắt đầu
     * @param {Date} endDate - Ngày kết thúc
     * @returns {Promise<Array>} - Danh sách lịch trong khoảng thời gian
     */
    static async getLichChungTheoKhoangThoiGian(idBenhNhan, startDate, endDate) {
        try {
            if (!idBenhNhan || !startDate || !endDate) {
                throw new Error('Thiếu tham số cần thiết');
            }
            const querySuKien = `
                SELECT 
                    id,
                    tieu_de AS ten,
                    mo_ta AS ghi_chu,
                    ngay AS thoi_gian,
                    dia_diem,
                    'su_kien' AS loai,
                    ngay_tao,
                    ngay_cap_nhat
                FROM su_kien 
                WHERE da_xoa != 1 
                    AND ngay >= ? 
                    AND ngay <= ?
                ORDER BY ngay
            `;

            const queryLichKham = `
                SELECT 
                    id,
                    CONCAT('Khám: ', loai_kham) AS ten,
                    bac_si AS ghi_chu,
                    thoi_gian,
                    NULL AS dia_diem,
                    'lich_kham' AS loai,
                    ngay_tao,
                    ngay_cap_nhat
                FROM lich_kham
                WHERE id_benh_nhan = ? 
                    AND trang_thai = 'cho_kham' 
                    AND thoi_gian >= ? 
                    AND thoi_gian <= ?
            `;

            const [suKienRows] = await connection.execute(querySuKien, [startDate, endDate]);
            const [lichKhamRows] = await connection.execute(queryLichKham, [idBenhNhan, startDate, endDate]);

            return this._combineAndSort(suKienRows, lichKhamRows);

        } catch (error) {
            console.error('Lỗi khi lấy lịch chung theo khoảng thời gian:', error);
            throw error;
        }
    }
}

module.exports = lichChung;