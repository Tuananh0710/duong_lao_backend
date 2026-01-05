const connection=require('../config/database');

class suKien{
    static async getDsSuKien(){
        try {
            const query=`
            SELECT 
                id,
                tieu_de,
                mo_ta,
                ngay,
                dia_diem,
                ngay_tao,
                ngay_cap_nhat
            FROM su_kien WHERE da_xoa != 1 AND ngay >= CURDATE()
            ORDER BY ngay DESC
            LIMIT 10
            `;

            const [rows]=await connection.execute(query);

            return rows;

        } catch (error) {
            console.error('loi khi lay lich su kien:', error);
            throw error;
        }
    }
    static async getDsSuKienTrongTuan() {
    try {
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
            -- Tính số ngày còn lại đến sự kiện (có thể âm nếu đã qua)
            DATEDIFF(DATE(ngay), CURDATE()) as so_ngay_con_lai,
            -- Xác định ngày trong tuần
            DAYNAME(ngay) as thu,
            DATE_FORMAT(ngay, '%d/%m/%Y') as ngay_format,
            DATE_FORMAT(ngay, '%H:%i') as gio_format
        FROM su_kien 
        WHERE da_xoa != 1 
            -- Lấy tất cả sự kiện trong tuần hiện tại (từ thứ 2 đến chủ nhật)
            AND DATE(ngay) >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)  -- Thứ 2 đầu tuần
            AND DATE(ngay) <= DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 6 DAY)  -- Chủ nhật cuối tuần
        ORDER BY ngay ASC
        `;

        const [rows] = await connection.execute(query);

        // Nhóm sự kiện theo ngày
        const suKienTheoNgay = {};
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
        });

        // Tính toán thông tin tuần trong JavaScript
        const today = new Date();
        const currentDay = today.getDay(); // 0=Chủ nhật, 1=Thứ 2, ..., 6=Thứ 7
        
        // Tính thứ 2 đầu tuần: nếu today là Chủ nhật (0) thì lùi 6 ngày, nếu không thì lùi (currentDay-1) ngày
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

        // Debug: kiểm tra phạm vi tuần
        console.log('Hôm nay:', formatDate(today));
        console.log('Thứ 2 đầu tuần:', formatDate(startOfWeek));
        console.log('Chủ nhật cuối tuần:', formatDate(endOfWeek));
        console.log('Số sự kiện:', rows.length);

        // Tính tuần hiện tại theo ISO (tuần bắt đầu từ thứ 2)
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
            // thong_tin_tuan: {
            //     tuan_hien_tai: currentWeek,
            //     thoi_gian_tu: formatDate(startOfWeek),
            //     thoi_gian_den: formatDate(endOfWeek),
            //     ngay_hom_nay: formatDate(today)
            // }
        };

    } catch (error) {
        console.error('Lỗi khi lấy sự kiện trong tuần:', error);
        throw error;
    }
}
}
module.exports=suKien;