const connection= require('../config/database');
class congViec{
    static async getCongViecByDieuDuong(idDieuDuong, specificDate = null) {
    try {
        const dateToCheck = specificDate || new Date().toISOString().split('T')[0];
        
        const query = `
            SELECT 
                COUNT(*) as tong_so_cong_viec
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
        return results[0]?.tong_so_cong_viec || 0;
    } catch (error) {
        throw error;
    }
}
    static async getDsCongViecByDieuDuong(idDieuDuong, specificDate = null) {
    try {
        const dateToCheck = specificDate || new Date().toISOString().split('T')[0];
        const query = `
            SELECT 
                cv.id as id_cong_viec,
                cv.ten_cong_viec,
                cv.mo_ta,
                cv.muc_uu_tien,
                cv.thoi_gian_du_kien,
                pc.id as id_phan_cong,
                pc.id_dieu_duong as id_tai_khoan,
                pc.id_benh_nhan,
                pc.trang_thai,
                pc.thoi_gian_hoan_thanh,
                bn.ho_ten as ten_benh_nhan,
                ph.so_phong,
                ph.ten_phong
            FROM phan_cong_cong_viec pc
            INNER JOIN cong_viec cv ON pc.id_cong_viec = cv.id
            INNER JOIN benh_nhan bn ON pc.id_benh_nhan = bn.id
            LEFT JOIN (
                SELECT DISTINCT
                    pobn.id_benh_nhan,
                    ph.so_phong,
                    ph.ten_phong
                FROM phong_o_benh_nhan pobn
                INNER JOIN phong ph ON pobn.id_phong = ph.id
                WHERE pobn.ngay_ket_thuc_o IS NULL
            ) ph ON bn.id = ph.id_benh_nhan
            WHERE pc.id_dieu_duong = ?
            AND DATE(cv.ngay_tao) = ?
            ORDER BY 
                CASE pc.trang_thai
                    WHEN 'chua_lam' THEN 1
                    WHEN 'dang_lam' THEN 2
                    WHEN 'hoan_thanh' THEN 3
                    ELSE 4
                END,
                cv.thoi_gian_du_kien
        `;
        
        const [result] = await connection.execute(query, [idDieuDuong, dateToCheck]);
        return result || null;
    } catch (error) {
        throw error;
    }
}
static async capNhatTrangThaiCongViec(dsCapNhat,id_dieu_duong){
    let conn;
    try {
        conn= await connection.getConnection();
        await conn.beginTransaction();
        const result  = [];
        for(const item of dsCapNhat){
            const {id_phan_cong,trang_thai}= item;
            if(id_dieu_duong){
                const [check]= await conn.execute(
                    `SELECT id FROM phan_cong_cong_viec WHERE id= ? AND id_dieu_duong=?`,
                    [id_phan_cong,id_dieu_duong]
                );
                if(check.length ===0){
                    result.push({
                        id_phan_cong,
                        success:false,
                        message:'Công việc không thuộc về điều dưỡng này'
                    });
                    continue;
                }
            }
            let thoiGianHoanThanh=null;
            if(trang_thai==='hoan_thanh'){
                thoiGianHoanThanh= new Date();
            }
            const [hold] = await conn.execute(
                `UPDATE phan_cong_cong_viec
                SET trang_thai= ? ,
                    thoi_gian_hoan_thanh=?,
                    ngay_cap_nhat=NOW()
                WHERE id=?
                `,
                [trang_thai,thoiGianHoanThanh,id_phan_cong]
            );
            result.push({
                id_dieu_duong,
                success: hold.affectedRows>0,
                trang_thai:trang_thai,
                thoi_gian_hoan_thanh:thoiGianHoanThanh
            });
        }
        await conn.commit();
        return{
            success:true,
            message:'Cập nhật nhiều công việc thành công',
            result:result
        }
        
    } catch (error) {
        if (conn) await conn.rollback();
        throw error;
    }
    finally {
        if (conn) conn.release();
    }
}
}
module.exports=congViec;