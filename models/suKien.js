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
                ngay,
                dia_diem,
                anh_dai_dien,
                trang_thai,
                ngay_tao,
                ngay_cap_nhat,
                -- Tính số ngày còn lại đến sự kiện
                DATEDIFF(ngay, CURDATE()) as so_ngay_con_lai,
                -- Xác định ngày trong tuần
                DAYNAME(ngay) as thu,
                DATE_FORMAT(ngay, '%d/%m/%Y') as ngay_format,
                DATE_FORMAT(ngay, '%H:%i') as gio_format
            FROM su_kien 
            WHERE da_xoa != 1 
                AND YEARWEEK(ngay, 1) = YEARWEEK(CURDATE(), 1)
                AND ngay >= CURDATE()  -- Chỉ lấy sự kiện từ hôm nay trở đi
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

            return {
                tong_so: rows.length,
                danh_sach: rows,
                theo_ngay: Object.values(suKienTheoNgay)
            };

        } catch (error) {
            console.error('Lỗi khi lấy sự kiện trong tuần:', error);
            throw error;
        }
    }
}
module.exports=suKien;