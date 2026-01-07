// helpers/mucDoHelper.js
const connection = require('../config/database');

class MucDoHelper {
    /**
     * Lấy mức độ cảnh báo cao nhất của bệnh nhân
     * @param {number} idBenhNhan - ID bệnh nhân
     * @returns {string} - 'Nguy hiểm', 'Cần theo dõi', 'Bình thường', 'Chưa có dữ liệu'
     */
    static async getMucDoCaoNhat(idBenhNhan) {
        try {
            if (!idBenhNhan) {
                return 'Chưa có dữ liệu';
            }

            // 1. Kiểm tra chỉ số trong 24h (ưu tiên cao)
            const mucDoTrong24h = await this.getMucDoTrong24h(idBenhNhan);
            if (mucDoTrong24h) {
                return mucDoTrong24h;
            }

            // 2. Kiểm tra chỉ số cũ hơn
            const mucDoCu = await this.getMucDoCu(idBenhNhan);
            if (mucDoCu) {
                return mucDoCu ;
            }

            // 3. Không có dữ liệu
            return 'Chưa có dữ liệu';
        } catch (error) {
            console.error('Error in getMucDoCaoNhat:', error);
            return 'Chưa có dữ liệu';
        }
    }

    /**
     * Lấy mức độ cao nhất trong 24h
     */
    static async getMucDoTrong24h(idBenhNhan) {
        try {
            const query = `
                SELECT muc_do_cao_nhat
                FROM (
                    -- Lấy mức độ cao nhất trong 24h từ tất cả các bảng
                    SELECT MAX(
                        CASE muc_do
                            WHEN 'nguy_hiem' THEN 3
                            WHEN 'canh_bao' THEN 2
                            WHEN 'binh_thuong' THEN 1
                            ELSE 0
                        END
                    ) as muc_do_cao_nhat
                    FROM (
                        -- Huyết áp
                        SELECT muc_do
                        FROM huyet_ap 
                        WHERE id_benh_nhan = ? 
                            AND thoi_gian_do >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                        
                        UNION ALL
                        
                        -- Nhịp tim
                        SELECT muc_do
                        FROM nhip_tim 
                        WHERE id_benh_nhan = ? 
                            AND thoi_gian_do >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                        
                        UNION ALL
                        
                        -- Nhiệt độ
                        SELECT muc_do
                        FROM nhiet_do 
                        WHERE id_benh_nhan = ? 
                            AND thoi_gian_do >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                        
                        UNION ALL
                        
                        -- Đường huyết
                        SELECT muc_do
                        FROM duong_huyet 
                        WHERE id_benh_nhan = ? 
                            AND thoi_gian_do >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                    ) as all_vitals
                ) as max_muc_do
            `;

            const [rows] = await connection.query(query, [
                idBenhNhan, idBenhNhan, idBenhNhan, idBenhNhan
            ]);

            return this.convertMucDoToText(rows[0]?.muc_do_cao_nhat);
        } catch (error) {
            console.error('Error in getMucDoTrong24h:', error);
            return null;
        }
    }

    /**
     * Lấy mức độ cao nhất từ dữ liệu cũ
     */
    static async getMucDoCu(idBenhNhan) {
        try {
            const query = `
                SELECT muc_do_cao_nhat
                FROM (
                    SELECT MAX(
                        CASE muc_do
                            WHEN 'nguy_hiem' THEN 3
                            WHEN 'canh_bao' THEN 2
                            WHEN 'binh_thuong' THEN 1
                            ELSE 0
                        END
                    ) as muc_do_cao_nhat
                    FROM (
                        -- Huyết áp
                        SELECT muc_do
                        FROM huyet_ap 
                        WHERE id_benh_nhan = ?
                        
                        UNION ALL
                        
                        -- Nhịp tim
                        SELECT muc_do
                        FROM nhip_tim 
                        WHERE id_benh_nhan = ?
                        
                        UNION ALL
                        
                        -- Nhiệt độ
                        SELECT muc_do
                        FROM nhiet_do 
                        WHERE id_benh_nhan = ?
                        
                        UNION ALL
                        
                        -- Đường huyết
                        SELECT muc_do
                        FROM duong_huyet 
                        WHERE id_benh_nhan = ?
                    ) as all_vitals
                ) as max_muc_do
            `;

            const [rows] = await connection.query(query, [
                idBenhNhan, idBenhNhan, idBenhNhan, idBenhNhan
            ]);

            return this.convertMucDoToText(rows[0]?.muc_do_cao_nhat);
        } catch (error) {
            console.error('Error in getMucDoCu:', error);
            return null;
        }
    }

    /**
     * Chuyển đổi mã mức độ thành văn bản
     */
    static convertMucDoToText(mucDoCode) {
        if (!mucDoCode) return null;
        
        switch (mucDoCode) {
            case 3: return 'Nguy hiểm';
            case 2: return 'Cần theo dõi';
            case 1: return 'Bình thường';
            default: return null;
        }
    }
}

module.exports = MucDoHelper;