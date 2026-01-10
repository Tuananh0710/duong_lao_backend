// helpers/mucDoHelper.js
const connection = require('../config/database');

class MucDoHelper {
    /**
     * Lấy mức độ cảnh báo cao nhất của bệnh nhân
     * @param {number} idBenhNhan - ID bệnh nhân
     * @param {string} debugTag - Tag để debug (tùy chọn)
     * @returns {string} - 'Nguy hiểm', 'Cảnh báo', 'Bình thường', 'Chưa có dữ liệu'
     */
    static async getMucDoCaoNhat(idBenhNhan, debugTag = '') {
        try {
            const debugPrefix = debugTag ? `[${debugTag}] ` : '';
            
            console.log(`\n${debugPrefix}=== getMucDoCaoNhat START - BenhNhan ID: ${idBenhNhan} ===`);
            console.log(`${debugPrefix}Thời gian hiện tại (UTC): ${new Date().toISOString()}`);
            console.log(`${debugPrefix}Thời gian hiện tại (GMT+7): ${new Date(new Date().getTime() + 7 * 60 * 60 * 1000).toISOString()}`);
            
            if (!idBenhNhan) {
                console.log(`${debugPrefix}❌ ERROR: ID bệnh nhân không hợp lệ`);
                return 'Chưa có dữ liệu';
            }

            // 1. Kiểm tra chỉ số trong 24h
            console.log(`\n${debugPrefix}[1] Kiểm tra chỉ số trong 24 giờ...`);
            const mucDoTrong24h = await this.getMucDoTrong24h(idBenhNhan, debugTag);
            console.log(`${debugPrefix}Kết quả mức độ trong 24h: ${mucDoTrong24h}`);
            
            if (mucDoTrong24h !== null) {
                console.log(`${debugPrefix}✅ Trả về mức độ trong 24h: ${mucDoTrong24h}`);
                console.log(`${debugPrefix}=== getMucDoCaoNhat END ===\n`);
                return mucDoTrong24h;
            }

            console.log(`${debugPrefix}⚠ Không có dữ liệu trong 24h, kiểm tra dữ liệu cũ...`);
            
            // 2. Kiểm tra chỉ số cũ hơn
            console.log(`\n${debugPrefix}[2] Kiểm tra tất cả dữ liệu cũ...`);
            const mucDoCu = await this.getMucDoCu(idBenhNhan, debugTag);
            console.log(`${debugPrefix}Kết quả mức độ từ dữ liệu cũ: ${mucDoCu}`);
            
            if (mucDoCu !== null) {
                console.log(`${debugPrefix}✅ Trả về mức độ từ dữ liệu cũ: ${mucDoCu}`);
                console.log(`${debugPrefix}=== getMucDoCaoNhat END ===\n`);
                return mucDoCu;
            }

            // 3. Không có dữ liệu
            console.log(`${debugPrefix}❌ Không có dữ liệu nào cho bệnh nhân này`);
            console.log(`${debugPrefix}=== getMucDoCaoNhat END ===\n`);
            return 'Chưa có dữ liệu';
            
        } catch (error) {
            const debugPrefix = debugTag ? `[${debugTag}] ` : '';
            console.error(`${debugPrefix}❌ ERROR in getMucDoCaoNhat for ID ${idBenhNhan}:`, error.message);
            console.error(`${debugPrefix}Stack:`, error.stack);
            return 'Chưa có dữ liệu';
        }
    }

    /**
     * Lấy mức độ cao nhất trong 24h
     * @param {number} idBenhNhan - ID bệnh nhân
     * @param {string} debugTag - Tag để debug (tùy chọn)
     */
    static async getMucDoTrong24h(idBenhNhan, debugTag = '') {
    try {
        const debugPrefix = debugTag ? `[${debugTag}] ` : '';
        console.log(`${debugPrefix}getMucDoTrong24h - Bắt đầu cho ID ${idBenhNhan}`);
        
        const [timeRows] = await connection.query(
                "SELECT NOW() as mysql_now, UTC_TIMESTAMP() as mysql_utc, @@system_time_zone as tz"
            );
            console.log(`${debugPrefix}MySQL NOW: ${timeRows[0].mysql_now}`);
            console.log(`${debugPrefix}MySQL UTC: ${timeRows[0].mysql_utc}`);
            console.log(`${debugPrefix}MySQL Timezone: ${timeRows[0].tz}`);

        // Query lấy mức độ cao nhất từ 4 bản ghi MỚI NHẤT của mỗi loại
        const query = `
            SELECT MAX(muc_do_code) as muc_do_code
            FROM (
                -- Lấy bản ghi MỚI NHẤT của Huyết áp
                (
                    SELECT 
                        CASE muc_do
                            WHEN 'nguy_hiem' THEN 3
                            WHEN 'canh_bao' THEN 2
                            WHEN 'binh_thuong' THEN 1
                            ELSE 0
                        END as muc_do_code
                    FROM huyet_ap 
                    WHERE id_benh_nhan = ? 
                        AND thoi_gian_do >= DATE_SUB(
                            CONVERT_TZ(NOW(), @@session.time_zone, '+07:00'), 
                            INTERVAL 24 HOUR
                        )
                    ORDER BY thoi_gian_do DESC
                    LIMIT 1
                )
                
                UNION ALL
                
                -- Lấy bản ghi MỚI NHẤT của Nhịp tim
                (
                    SELECT 
                        CASE muc_do
                            WHEN 'nguy_hiem' THEN 3
                            WHEN 'canh_bao' THEN 2
                            WHEN 'binh_thuong' THEN 1
                            ELSE 0
                        END as muc_do_code
                    FROM nhip_tim 
                    WHERE id_benh_nhan = ? 
                        AND thoi_gian_do >= DATE_SUB(
                            CONVERT_TZ(NOW(), @@session.time_zone, '+07:00'), 
                            INTERVAL 24 HOUR
                        )
                    ORDER BY thoi_gian_do DESC
                    LIMIT 1
                )
                
                UNION ALL
                
                -- Lấy bản ghi MỚI NHẤT của Nhiệt độ
                (
                    SELECT 
                        CASE muc_do
                            WHEN 'nguy_hiem' THEN 3
                            WHEN 'canh_bao' THEN 2
                            WHEN 'binh_thuong' THEN 1
                            ELSE 0
                        END as muc_do_code
                    FROM nhiet_do 
                    WHERE id_benh_nhan = ? 
                        AND thoi_gian_do >= DATE_SUB(
                            CONVERT_TZ(NOW(), @@session.time_zone, '+07:00'), 
                            INTERVAL 24 HOUR
                        )
                    ORDER BY thoi_gian_do DESC
                    LIMIT 1
                )
                
                UNION ALL
                
                -- Lấy bản ghi MỚI NHẤT của Đường huyết
                (
                    SELECT 
                        CASE muc_do
                            WHEN 'nguy_hiem' THEN 3
                            WHEN 'canh_bao' THEN 2
                            WHEN 'binh_thuong' THEN 1
                        ELSE 0
                    END as muc_do_code
                FROM duong_huyet 
                WHERE id_benh_nhan = ? 
                    AND thoi_gian_do >= DATE_SUB(
                        CONVERT_TZ(NOW(), @@session.time_zone, '+07:00'), 
                        INTERVAL 24 HOUR
                    )
                ORDER BY thoi_gian_do DESC
                LIMIT 1
                )
            ) as latest_vitals
        `;

        console.log(`${debugPrefix}Thực thi query 24h...`);
        const [rows] = await connection.query(query, [
            idBenhNhan, idBenhNhan, idBenhNhan, idBenhNhan
        ]);

        const result = rows[0]?.muc_do_code;
        console.log(`${debugPrefix}Kết quả raw từ database: ${result}`);
        console.log(`${debugPrefix}Kết quả JSON: ${JSON.stringify(rows)}`);
        
        // Debug từng bảng chi tiết (giữ nguyên)
        await this.debugMucDoTrong24hChiTiet(idBenhNhan, debugTag);
        
        const converted = this.convertMucDoToText(result, debugTag);
        console.log(`${debugPrefix}Sau khi convert: ${converted}`);
        
        return converted;
        
    } catch (error) {
        const debugPrefix = debugTag ? `[${debugTag}] ` : '';
        console.error(`${debugPrefix}❌ ERROR in getMucDoTrong24h:`, error.message);
        console.error(`${debugPrefix}Stack:`, error.stack);
        return null;
    }
}

    /**
     * Debug chi tiết từng bảng trong 24h
     */
    static async debugMucDoTrong24hChiTiet(idBenhNhan, debugTag = '') {
        try {
            const debugPrefix = debugTag ? `[${debugTag}] ` : '';
            console.log(`\n${debugPrefix}[DEBUG CHI TIẾT TỪNG BẢNG TRONG 24H]`);
            
            const tables = [
                { name: 'huyet_ap', display: 'Huyết áp' },
                { name: 'nhip_tim', display: 'Nhịp tim' },
                { name: 'nhiet_do', display: 'Nhiệt độ' },
                { name: 'duong_huyet', display: 'Đường huyết' }
            ];
            
            let hasDataIn24h = false;
            
            for (const table of tables) {
                const query = `
                    SELECT 
                        COUNT(*) as count,
                        GROUP_CONCAT(DISTINCT muc_do ORDER BY 
                            CASE muc_do
                                WHEN 'nguy_hiem' THEN 1
                                WHEN 'canh_bao' THEN 2
                                WHEN 'binh_thuong' THEN 3
                                ELSE 4
                            END
                        ) as muc_dos,
                        MAX(thoi_gian_do) as latest_time,
                        MIN(thoi_gian_do) as earliest_time
                    FROM ${table.name}
                    WHERE id_benh_nhan = ? 
                        AND thoi_gian_do >= DATE_SUB(
                            CONVERT_TZ(NOW(), @@session.time_zone, '+07:00'), 
                            INTERVAL 24 HOUR
                        )
                `;
                
                const [rows] = await connection.query(query, [idBenhNhan]);
                const row = rows[0];
                
                console.log(`${debugPrefix}  ${table.display}:`);
                console.log(`${debugPrefix}    - Số bản ghi: ${row.count}`);
                console.log(`${debugPrefix}    - Các mức độ: ${row.muc_dos || '(none)'}`);
                console.log(`${debugPrefix}    - Thời gian sớm nhất: ${row.earliest_time || '(none)'}`);
                console.log(`${debugPrefix}    - Thời gian mới nhất: ${row.latest_time || '(none)'}`);
                
                if (row.count > 0) {
                    hasDataIn24h = true;
                    
                    // Lấy 3 bản ghi mới nhất để debug
                    const detailQuery = `
                        SELECT muc_do, thoi_gian_do
                        FROM ${table.name}
                        WHERE id_benh_nhan = ?
                            AND thoi_gian_do >= DATE_SUB(
                                CONVERT_TZ(NOW(), @@session.time_zone, '+07:00'), 
                                INTERVAL 24 HOUR
                            )
                        ORDER BY thoi_gian_do DESC
                        LIMIT 3
                    `;
                    const [details] = await connection.query(detailQuery, [idBenhNhan]);
                    if (details.length > 0) {
                        console.log(`${debugPrefix}    - 3 bản ghi mới nhất trong 24h:`);
                        details.forEach(detail => {
                            console.log(`${debugPrefix}      • ${detail.muc_do} - ${detail.thoi_gian_do}`);
                        });
                    }
                }
            }
            
            if (!hasDataIn24h) {
                console.log(`${debugPrefix}  ⚠ Không có dữ liệu nào trong 24h`);
            }
            
        } catch (error) {
            const debugPrefix = debugTag ? `[${debugTag}] ` : '';
            console.error(`${debugPrefix}❌ Error in debugMucDoTrong24hChiTiet:`, error.message);
        }
    }

    /**
     * Lấy mức độ cao nhất từ dữ liệu cũ
     */
    static async getMucDoCu(idBenhNhan, debugTag = '') {
        try {
            const debugPrefix = debugTag ? `[${debugTag}] ` : '';
            console.log(`${debugPrefix}getMucDoCu - Bắt đầu với ID ${idBenhNhan}`);
            
            const query = `
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
            `;

            console.log(`${debugPrefix}Thực thi query dữ liệu cũ...`);
            const [rows] = await connection.query(query, [
                idBenhNhan, idBenhNhan, idBenhNhan, idBenhNhan
            ]);

            const result = rows[0]?.muc_do_cao_nhat;
            console.log(`${debugPrefix}Kết quả từ database (raw): ${result}`);
            console.log(`${debugPrefix}Kết quả JSON: ${JSON.stringify(rows)}`);
            
            const converted = this.convertMucDoToText(result, debugTag);
            console.log(`${debugPrefix}Sau khi convert: ${converted}`);
            
            return converted;
            
        } catch (error) {
            const debugPrefix = debugTag ? `[${debugTag}] ` : '';
            console.error(`${debugPrefix}❌ ERROR in getMucDoCu:`, error.message);
            console.error(`${debugPrefix}Stack:`, error.stack);
            return null;
        }
    }

    /**
     * Chuyển đổi mã mức độ thành văn bản
     */
    static convertMucDoToText(mucDoCode, debugTag = '') {
    const debugPrefix = debugTag ? `[${debugTag}] ` : '';
    console.log(`${debugPrefix}convertMucDoToText: Input = ${mucDoCode}, Type = ${typeof mucDoCode}`);
    
    // SỬA: thêm kiểm tra cho undefined
    if (mucDoCode === null || mucDoCode === undefined || mucDoCode === 0 || mucDoCode === 'undefined') {
        console.log(`${debugPrefix}→ Trả về null (vì value là: ${mucDoCode})`);
        return null;
    }
    
    let result;
    switch (parseInt(mucDoCode)) { // SỬA: chuyển về số để so sánh
        case 3: 
            result = 'Nguy hiểm';
            break;
        case 2: 
            result = 'Cảnh báo';
            break;
        case 1: 
            result = 'Bình thường';
            break;
        default: 
            result = null;
            console.log(`${debugPrefix}⚠ Unexpected value: ${mucDoCode}`);
    }
    
    console.log(`${debugPrefix}→ Chuyển đổi ${mucDoCode} thành: ${result}`);
    return result;
}
}

module.exports = MucDoHelper;