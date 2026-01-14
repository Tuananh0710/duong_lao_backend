const connection=require('../config/database');

class suKien{


static async getDsSuKien() {
    try {
        // Cập nhật trạng thái trước
        await this.capNhatTrangThaiTuDong();
        
        const query = `
        SELECT 
            id,
            tieu_de,
            mo_ta,
            ngay,
            dia_diem,
            ngay_tao,
            ngay_cap_nhat,
            loai,
            trang_thai,
            CASE 
                WHEN DATE(ngay) = CURDATE() THEN 'dang_dien_ra'
                WHEN DATE(ngay) < CURDATE() THEN 'ket_thuc'
                ELSE trang_thai
            END as trang_thai_hien_tai
        FROM su_kien 
        WHERE da_xoa != 1 AND ngay >= CURDATE() - INTERVAL 7 DAY
        ORDER BY ngay DESC
        LIMIT 10
        `;

        const [rows] = await connection.execute(query);
        return rows;
    } catch (error) {
        console.error('Lỗi khi lấy lịch sự kiện:', error);
        throw error;
    }
}
    static async getDsSuKienTrongTuan() {
    try {
        // 1. CẬP NHẬT TRẠNG THÁI TỰ ĐỘNG TRƯỚC KHI LẤY DỮ LIỆU
        await this.capNhatTrangThaiTuDong();
        
        const query = `
        SELECT 
            id,
            tieu_de,
            mo_ta,
            dia_diem,
            anh_dai_dien,
            trang_thai,
            ngay_tao,
            ngay_cap_nhat,
            loai,
            -- Tính số ngày còn lại đến sự kiện (có thể âm nếu đã qua)
            DATEDIFF(DATE(ngay), CURDATE()) as so_ngay_con_lai,
            -- Xác định ngày trong tuần
            DAYNAME(ngay) as thu,
            DATE_FORMAT(ngay, '%d/%m/%Y') as ngay_format,
            DATE_FORMAT(ngay, '%H:%i') as gio_format,
            ngay, -- Thêm ngày gốc để sắp xếp
            -- Tính trạng thái hiện tại dựa trên ngày
            CASE 
                WHEN DATE(ngay) = CURDATE() THEN 'dang_dien_ra'
                WHEN DATE(ngay) < CURDATE() THEN 'ket_thuc'
                ELSE trang_thai
            END as trang_thai_hien_tai
        FROM su_kien 
        WHERE da_xoa != 1 
            -- Lấy tất cả sự kiện trong tuần hiện tại (từ thứ 2 đến chủ nhật)
            AND DATE(ngay) >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)  -- Thứ 2 đầu tuần
            AND DATE(ngay) <= DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 6 DAY)  -- Chủ nhật cuối tuần
        ORDER BY 
            -- Sắp xếp theo: sự kiện đang diễn ra -> sắp diễn ra -> đã kết thúc
            CASE 
                WHEN DATE(ngay) = CURDATE() THEN 1
                WHEN DATE(ngay) > CURDATE() THEN 2
                ELSE 3
            END,
            ngay ASC,
            trang_thai DESC
        `;

        const [rows] = await connection.execute(query);

        // Nhóm sự kiện theo ngày
        const suKienTheoNgay = {};
        const suKienTheoTrangThai = {
            dang_dien_ra: [],
            sap_dien_ra: [],
            ket_thuc: []
        };

        rows.forEach(suKien => {
            const ngayKey = suKien.ngay_format;
            if (!suKienTheoNgay[ngayKey]) {
                suKienTheoNgay[ngayKey] = {
                    ngay: suKien.ngay_format,
                    thu: suKien.thu,
                    danh_sach: []
                };
            }
            suKienTheoNgay[ngayKey].danh_sach.push(suKien);
            
            // Phân loại theo trạng thái
            if (suKien.trang_thai_hien_tai === 'dang_dien_ra') {
                suKienTheoTrangThai.dang_dien_ra.push(suKien);
            } else if (suKien.trang_thai_hien_tai === 'sap_dien_ra') {
                suKienTheoTrangThai.sap_dien_ra.push(suKien);
            } else {
                suKienTheoTrangThai.ket_thuc.push(suKien);
            }
        });

        // Tính toán thông tin tuần trong JavaScript
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

        // Tính tuần hiện tại theo ISO
        const getWeekNumber = (date) => {
            const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
            const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
            return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        };
        
        const currentWeek = getWeekNumber(today);

        return {
            tong_so: rows.length,
            danh_sach: rows,
            // theo_ngay: Object.values(suKienTheoNgay),
            // theo_trang_thai: suKienTheoTrangThai,
            // thong_tin_tuan: {
            //     tuan_hien_tai: currentWeek,
            //     thoi_gian_tu: formatDate(startOfWeek),
            //     thoi_gian_den: formatDate(endOfWeek),
            //     ngay_hom_nay: formatDate(today),
            //     thu_hom_nay: ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'][currentDay]
            // }
        };

    } catch (error) {
        console.error('Lỗi khi lấy sự kiện trong tuần:', error);
        throw error;
    }
}

// THÊM PHƯƠNG THỨC CẬP NHẬT TRẠNG THÁI TỰ ĐỘNG
static async capNhatTrangThaiTuDong() {
    try {
        const query = `
            -- Cập nhật sự kiện đang diễn ra (hôm nay)
            UPDATE su_kien 
            SET trang_thai = 'dang_dien_ra',
                ngay_cap_nhat = CURRENT_TIMESTAMP()
            WHERE da_xoa != 1 
                AND DATE(ngay) = CURDATE()
                AND trang_thai != 'dang_dien_ra';
            
            -- Cập nhật sự kiện đã kết thúc (trước hôm nay)
            UPDATE su_kien 
            SET trang_thai = 'ket_thuc',
                ngay_cap_nhat = CURRENT_TIMESTAMP()
            WHERE da_xoa != 1 
                AND DATE(ngay) < CURDATE()
                AND trang_thai != 'ket_thuc';
        `;
        
        const [result] = await connection.execute(query);
        return result;
    } catch (error) {
        console.error('Lỗi cập nhật trạng thái tự động:', error);
        throw error;
    }
}
static async getDsLoaiSuKien() {
    try {
        // Lấy tên database từ connection
        const [dbResult] = await connection.execute('SELECT DATABASE() as dbName');
        const dbName = dbResult[0].dbName;

        const query = `
            SELECT COLUMN_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = ?
            AND TABLE_NAME = 'su_kien'
            AND COLUMN_NAME = 'loai'
        `;

        const [rows] = await connection.execute(query, [dbName]);
        
        if (rows.length === 0) {
            // Nếu không phải ENUM, fallback về cách lấy giá trị từ bảng
            return await this.getDsLoaiSuKienFromTable();
        }

        // Parse giá trị ENUM từ chuỗi
        const enumDefinition = rows[0].COLUMN_TYPE;
        
        // Kiểm tra xem có phải là ENUM không
        if (!enumDefinition.startsWith('enum(')) {
            return await this.getDsLoaiSuKienFromTable();
        }

        // Trích xuất các giá trị ENUM
        const enumValues = enumDefinition
            .substring(5, enumDefinition.length - 1) // Bỏ "enum(" và ")"
            .split(',')
            .map(value => value.trim().replace(/'/g, '')); // Xóa dấu nháy và khoảng trắng

        return enumValues;

    } catch (error) {
        console.error('Lỗi khi lấy danh sách loại sự kiện:', error);
        throw error;
    }
}
}
module.exports=suKien;