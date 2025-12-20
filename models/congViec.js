const connection= require('../config/database');
class congViec{
    static async getCongViecByDieuDuong(idDieuDuong, specificDate = null) {
    try {
        const dateToCheck = specificDate || new Date().toISOString().split('T')[0];
        
        const query = `
            SELECT 
                pc.trang_thai,
                COUNT(*) as so_luong_cong_viec
            FROM phan_cong_cong_viec pc
            INNER JOIN tai_khoan tk ON pc.id_dieu_duong = tk.id
            WHERE tk.id = ? 
            AND DATE(pc.ngay_tao) = ?
            GROUP BY pc.trang_thai
            ORDER BY 
                CASE pc.trang_thai
                    WHEN 'chua_lam' THEN 1
                    WHEN 'dang_lam' THEN 2
                    WHEN 'hoan_thanh' THEN 3
                    ELSE 4
                END
        `;
        
        const [results] = await connection.execute(query, [idDieuDuong, dateToCheck]);
        return results[0];
    } catch (error) {
        throw error;
    }
}
}
module.exports=congViec;