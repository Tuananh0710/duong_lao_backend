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
                    ngay_cap_nhat,
                    trang_thai
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
                    ngay_cap_nhat,
                    trang_thai
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
    static async getLichChungGanNhat(idBenhNhan, limit = 3) {
    try {
        if (!idBenhNhan) {
            throw new Error('Thiếu tham số cần thiết: idBenhNhan');
        }

        const query = `
            SELECT * FROM (
                (SELECT 
                    id,
                    tieu_de AS ten,
                    mo_ta AS ghi_chu,
                    ngay AS thoi_gian,
                    dia_diem,
                    'su_kien' AS loai,
                    ngay_tao,
                    ngay_cap_nhat,
                    ABS(DATEDIFF(ngay, CURDATE())) AS khoang_cach
                FROM su_kien 
                WHERE da_xoa != 1 
                    AND ngay >= CURDATE()
                ORDER BY ngay ASC)
                
                UNION ALL
                
                (SELECT 
                    id,
                    CONCAT('Khám: ', loai_kham) AS ten,
                    bac_si AS ghi_chu,
                    thoi_gian,
                    NULL AS dia_diem,
                    'lich_kham' AS loai,
                    ngay_tao,
                    ngay_cap_nhat,
                    ABS(DATEDIFF(thoi_gian, CURDATE())) AS khoang_cach
                FROM lich_kham
                WHERE id_benh_nhan = ? 
                    AND trang_thai = 'cho_kham' 
                    AND thoi_gian >= CURDATE()
                ORDER BY thoi_gian ASC)
            ) AS combined
            ORDER BY khoang_cach ASC, thoi_gian ASC
            LIMIT ?
        `;

        const [rows] = await connection.execute(query, [idBenhNhan, limit.toString()]);
        
        // Xóa trường khoang_cach nếu không cần thiết trả về frontend
        const cleanedRows = rows.map(row => {
            const { khoang_cach, ...rest } = row;
            return rest;
        });
        
        return cleanedRows;

    } catch (error) {
        console.error('Lỗi khi lấy lịch chung gần nhất:', error);
        throw error;
    }
}
static async getLichChungTrongTuan(idBenhNhan) {
    try {
        if (!idBenhNhan) {
            throw new Error('Thiếu tham số cần thiết: idBenhNhan');
        }

        const query = `
            SELECT * FROM (
                -- Lấy sự kiện trong tuần
                (SELECT 
                    id,
                    tieu_de AS ten,
                    mo_ta AS ghi_chu,
                    ngay AS thoi_gian,
                    dia_diem,
                    'su_kien' AS loai,
                    anh_dai_dien,
                    trang_thai,
                    ngay_tao,
                    ngay_cap_nhat,
                    -- Tính số ngày còn lại đến sự kiện
                    DATEDIFF(DATE(ngay), CURDATE()) as so_ngay_con_lai,
                    -- Xác định ngày trong tuần
                    DAYNAME(ngay) as thu,
                    DATE_FORMAT(ngay, '%d/%m/%Y') as ngay_format,
                    DATE_FORMAT(ngay, '%H:%i') as gio_format,
                    NULL AS bac_si,
                    NULL AS loai_kham
                FROM su_kien 
                WHERE da_xoa != 1 
                    -- Lấy sự kiện trong tuần hiện tại
                    AND DATE(ngay) >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
                    AND DATE(ngay) <= DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 6 DAY))
                
                UNION ALL
                
                -- Lấy lịch khám trong tuần
                (SELECT 
                    id,
                    CONCAT('Khám: ', loai_kham) AS ten,
                    bac_si AS ghi_chu,
                    thoi_gian,
                    NULL AS dia_diem,
                    'lich_kham' AS loai,
                    NULL AS anh_dai_dien,
                    trang_thai,
                    ngay_tao,
                    ngay_cap_nhat,
                    -- Tính số ngày còn lại đến lịch khám
                    DATEDIFF(DATE(thoi_gian), CURDATE()) as so_ngay_con_lai,
                    -- Xác định ngày trong tuần
                    DAYNAME(thoi_gian) as thu,
                    DATE_FORMAT(thoi_gian, '%d/%m/%Y') as ngay_format,
                    DATE_FORMAT(thoi_gian, '%H:%i') as gio_format,
                    bac_si,
                    loai_kham
                FROM lich_kham
                WHERE id_benh_nhan = ? 
                    AND trang_thai = 'cho_kham'
                    -- Lấy lịch khám trong tuần hiện tại
                    AND DATE(thoi_gian) >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
                    AND DATE(thoi_gian) <= DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 6 DAY))
            ) AS combined
            ORDER BY thoi_gian ASC
        `;

        const [rows] = await connection.execute(query, [idBenhNhan]);

        // Nhóm theo ngày
        const lichTheoNgay = {};
        rows.forEach(item => {
            const ngayKey = item.ngay_format;
            if (!lichTheoNgay[ngayKey]) {
                lichTheoNgay[ngayKey] = {
                    ngay: item.ngay_format,
                    thu: item.thu,
                    danh_sach: []
                };
            }
            
            // Format lại đối tượng cho phù hợp
            const formattedItem = {
                id: item.id,
                ten: item.ten,
                ghi_chu: item.ghi_chu,
                thoi_gian: item.thoi_gian,
                dia_diem: item.dia_diem,
                loai: item.loai,
                anh_dai_dien: item.anh_dai_dien,
                trang_thai: item.trang_thai,
                ngay_tao: item.ngay_tao,
                ngay_cap_nhat: item.ngay_cap_nhat,
                so_ngay_con_lai: item.so_ngay_con_lai,
                ngay_format: item.ngay_format,
                gio_format: item.gio_format
            };
            
            // Thêm thông tin bổ sung tùy loại
            if (item.loai === 'lich_kham') {
                formattedItem.bac_si = item.bac_si;
                formattedItem.loai_kham = item.loai_kham;
            }
            
            lichTheoNgay[ngayKey].danh_sach.push(formattedItem);
        });

        // Tính toán thông tin tuần
        const today = new Date();
        const currentDay = today.getDay(); // 0=Chủ nhật, 1=Thứ 2, ..., 6=Thứ 7
        
        // Tính thứ 2 đầu tuần
        const diffToMonday = currentDay === 0 ? 6 : currentDay - 1;
        
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - diffToMonday);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        // Format dates
        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        // Tính số lượng theo loại
        const tongSuKien = rows.filter(item => item.loai === 'su_kien').length;
        const tongLichKham = rows.filter(item => item.loai === 'lich_kham').length;

        return {
            tong_so: rows.length,
            tong_su_kien: tongSuKien,
            tong_lich_kham: tongLichKham,
            danh_sach: rows,
            // theo_ngay: Object.values(lichTheoNgay),
            // thong_tin_tuan: {
            //     tu_ngay: formatDate(startOfWeek),
            //     den_ngay: formatDate(endOfWeek),
            //     ngay_hom_nay: formatDate(today)
            // }
        };

    } catch (error) {
        console.error('Lỗi khi lấy lịch chung trong tuần:', error);
        throw error;
    }
}
}

module.exports = lichChung;