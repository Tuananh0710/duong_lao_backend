// helpers/mucDoHelper.js
const connection = require('../config/database');

class MucDoHelper {
    /**
     * Lấy mức độ cảnh báo cao nhất của bệnh nhân
     * @param {number} idBenhNhan - ID bệnh nhân
     * @param {string} debugTag - Tag để debug (tùy chọn)
     * @returns {string} - 'Nguy hiểm', 'Cảnh báo', 'Bình thường', 'Bình thường (dữ liệu cũ)', 'Chưa có dữ liệu'
     */
    static async getMucDoCaoNhat(idBenhNhan, debugTag = '') {
        try {
            const debugPrefix = debugTag ? `[${debugTag}] ` : '';
            
            console.log(`\n${debugPrefix}=== getMucDoCaoNhat START - BenhNhan ID: ${idBenhNhan} ===`);
            
            if (!idBenhNhan) {
                console.log(`${debugPrefix}❌ ERROR: ID bệnh nhân không hợp lệ`);
                return 'Chưa có dữ liệu';
            }

            // 1. Lấy mức độ cao nhất từ TẤT CẢ các chỉ số (ưu tiên dữ liệu mới nhất)
            const mucDoCaoNhat = await this.getMucDoCaoNhatTatCaChiSo(idBenhNhan, debugTag);
            
            console.log(`${debugPrefix}=== getMucDoCaoNhat END: ${mucDoCaoNhat} ===\n`);
            return mucDoCaoNhat;
            
        } catch (error) {
            const debugPrefix = debugTag ? `[${debugTag}] ` : '';
            console.error(`${debugPrefix}❌ ERROR in getMucDoCaoNhat for ID ${idBenhNhan}:`, error.message);
            console.error(`${debugPrefix}Stack:`, error.stack);
            return 'Chưa có dữ liệu';
        }
    }

    /**
     * Lấy mức độ cao nhất từ tất cả các chỉ số
     */
    static async getMucDoCaoNhatTatCaChiSo(idBenhNhan, debugTag = '') {
        try {
            const debugPrefix = debugTag ? `[${debugTag}] ` : '';
            
            // Danh sách tất cả các chỉ số cần kiểm tra
            const chiSoList = [
                { table: 'huyet_ap', display: 'Huyết áp' },
                { table: 'nhip_tim', display: 'Nhịp tim' },
                { table: 'nhiet_do', display: 'Nhiệt độ' },
                { table: 'duong_huyet', display: 'Đường huyết' },
                { table: 'spo2', display: 'SpO2' }
            ];
            
            console.log(`${debugPrefix}[1] Kiểm tra từng chỉ số cho bệnh nhân ID: ${idBenhNhan}`);
            
            // Lấy mức độ cao nhất cho từng chỉ số
            const mucDoTungChiSo = await Promise.all(
                chiSoList.map(async (chiSo) => {
                    return await this.getMucDoChiSo(idBenhNhan, chiSo.table, chiSo.display, debugTag);
                })
            );
            
            // Debug: hiển thị kết quả từng chỉ số
            console.log(`${debugPrefix}[2] Kết quả từng chỉ số:`);
            mucDoTungChiSo.forEach((result, index) => {
                console.log(`${debugPrefix}  ${chiSoList[index].display}: ${result.mucDoText} (code: ${result.mucDoCode}, time: ${result.thoiGianDo})`);
            });
            
            // Lọc ra những chỉ số có dữ liệu
            const chiSoCoDuLieu = mucDoTungChiSo.filter(item => item.hasData);
            
            if (chiSoCoDuLieu.length === 0) {
                console.log(`${debugPrefix}[3] Không có dữ liệu từ bất kỳ chỉ số nào`);
                return 'Chưa có dữ liệu';
            }
            
            // Xác định loại dữ liệu: có dữ liệu trong 24h hay chỉ có dữ liệu cũ
            const hasDataTrong24h = chiSoCoDuLieu.some(item => item.trong24h);
            const allDataCu = chiSoCoDuLieu.every(item => !item.trong24h);
            
            console.log(`${debugPrefix}[3] Tổng hợp: ${chiSoCoDuLieu.length}/5 chỉ số có dữ liệu`);
            console.log(`${debugPrefix}   - Có dữ liệu trong 24h: ${hasDataTrong24h ? 'CÓ' : 'KHÔNG'}`);
            console.log(`${debugPrefix}   - Tất cả đều là dữ liệu cũ: ${allDataCu ? 'CÓ' : 'KHÔNG'}`);
            
            // Lấy mức độ cao nhất từ các chỉ số có dữ liệu
            const maxMucDoCode = Math.max(...chiSoCoDuLieu.map(item => item.mucDoCode));
            const mucDoCaoNhat = this.convertMucDoCodeToText(maxMucDoCode, debugTag);
            
            // Xác định loại trả về
            if (!hasDataTrong24h && allDataCu) {
                console.log(`${debugPrefix}[4] Tất cả dữ liệu đều cũ (>24h) -> trả về "Bình thường"`);
                return 'binh_thuong';
            }
            
            console.log(`${debugPrefix}[4] Mức độ cao nhất: ${mucDoCaoNhat}`);
            return mucDoCaoNhat;
            
        } catch (error) {
            const debugPrefix = debugTag ? `[${debugTag}] ` : '';
            console.error(`${debugPrefix}❌ ERROR in getMucDoCaoNhatTatCaChiSo:`, error.message);
            return 'Chưa có dữ liệu';
        }
    }

    /**
     * Lấy mức độ của một chỉ số cụ thể
     */
    static async getMucDoChiSo(idBenhNhan, tableName, displayName, debugTag = '') {
        try {
            const debugPrefix = debugTag ? `[${debugTag}] ` : '';
            
            // 1. Ưu tiên: lấy dữ liệu trong 24h
            const query24h = `
                SELECT muc_do, thoi_gian_do
                FROM ${tableName}
                WHERE id_benh_nhan = ?
                    AND thoi_gian_do >= DATE_SUB(
                        CONVERT_TZ(NOW(), @@session.time_zone, '+07:00'), 
                        INTERVAL 24 HOUR
                    )
                ORDER BY thoi_gian_do DESC
                LIMIT 1
            `;
            
            const [rows24h] = await connection.query(query24h, [idBenhNhan]);
            
            if (rows24h.length > 0) {
                const mucDoCode = this.convertMucDoToCode(rows24h[0].muc_do);
                return {
                    hasData: true,
                    trong24h: true,
                    mucDoCode: mucDoCode,
                    mucDoText: this.convertMucDoCodeToText(mucDoCode),
                    thoiGianDo: rows24h[0].thoi_gian_do
                };
            }
            
            // 2. Nếu không có trong 24h, lấy dữ liệu cũ nhất
            const queryCu = `
                SELECT muc_do, thoi_gian_do
                FROM ${tableName}
                WHERE id_benh_nhan = ?
                ORDER BY thoi_gian_do DESC
                LIMIT 1
            `;
            
            const [rowsCu] = await connection.query(queryCu, [idBenhNhan]);
            
            if (rowsCu.length > 0) {
                const mucDoCode = this.convertMucDoToCode(rowsCu[0].muc_do);
                return {
                    hasData: true,
                    trong24h: false,
                    mucDoCode: mucDoCode,
                    mucDoText: this.convertMucDoCodeToText(mucDoCode),
                    thoiGianDo: rowsCu[0].thoi_gian_do
                };
            }
            
            // 3. Không có dữ liệu
            return {
                hasData: false,
                trong24h: false,
                mucDoCode: 0,
                mucDoText: 'Không có dữ liệu',
                thoiGianDo: null
            };
            
        } catch (error) {
            const debugPrefix = debugTag ? `[${debugTag}] ` : '';
            console.error(`${debugPrefix}❌ ERROR in getMucDoChiSo (${tableName}):`, error.message);
            return {
                hasData: false,
                trong24h: false,
                mucDoCode: 0,
                mucDoText: 'Lỗi',
                thoiGianDo: null
            };
        }
    }

    /**
     * Chuyển đổi muc_do (string) thành mã số
     */
    static convertMucDoToCode(mucDo) {
        switch (mucDo) {
            case 'nguy_hiem': return 3;
            case 'canh_bao': return 2;
            case 'binh_thuong': return 1;
            default: return 0;
        }
    }

    /**
     * Chuyển đổi mã mức độ thành văn bản
     */
    static convertMucDoCodeToText(mucDoCode, debugTag = '') {
        const debugPrefix = debugTag ? `[${debugTag}] ` : '';
        
        if (mucDoCode === null || mucDoCode === undefined || mucDoCode === 0) {
            return 'Không có dữ liệu';
        }
        
        let result;
        switch (parseInt(mucDoCode)) {
            case 3: 
                result = 'nguy_hiem';
                break;
            case 2: 
                result = 'canh_bao';
                break;
            case 1: 
                result = 'binh_thuong';
                break;
            default: 
                result = 'Không có dữ liệu';
        }
        
        return result;
    }

    /**
     * Hàm cũ - giữ lại cho tương thích
     */
    static async getMucDoTrong24h(idBenhNhan, debugTag = '') {
        try {
            const debugPrefix = debugTag ? `[${debugTag}] ` : '';
            console.log(`${debugPrefix}[DEPRECATED] getMucDoTrong24h - Chỉ dùng cho debug`);
            
            // Chỉ trả về null để hàm chính chuyển sang kiểm tra dữ liệu cũ
            return null;
            
        } catch (error) {
            return null;
        }
    }

    /**
     * Hàm cũ - giữ lại cho tương thích
     */
    static async getMucDoCu(idBenhNhan, debugTag = '') {
        try {
            const debugPrefix = debugTag ? `[${debugTag}] ` : '';
            console.log(`${debugPrefix}[DEPRECATED] getMucDoCu - Chỉ dùng cho debug`);
            
            // Để tránh ảnh hưởng logic mới, luôn trả về null
            return null;
            
        } catch (error) {
            return null;
        }
    }

    /**
     * Hàm cũ - giữ lại cho tương thích
     */
    static convertMucDoToText(mucDoCode, debugTag = '') {
        const debugPrefix = debugTag ? `[${debugTag}] ` : '';
        console.log(`${debugPrefix}convertMucDoToText: Input = ${mucDoCode}`);
        
        if (mucDoCode === null || mucDoCode === undefined || mucDoCode === 0 || mucDoCode === 'undefined') {
            return null;
        }
        
        return this.convertMucDoCodeToText(mucDoCode);
    }

    /**
     * Debug chi tiết từng bảng trong 24h (giữ nguyên cho debug)
     */
    static async debugMucDoTrong24hChiTiet(idBenhNhan, debugTag = '') {
        try {
            const debugPrefix = debugTag ? `[${debugTag}] ` : '';
            console.log(`\n${debugPrefix}[DEBUG CHI TIẾT TỪNG BẢNG TRONG 24H]`);
            
            const tables = [
                { name: 'huyet_ap', display: 'Huyết áp' },
                { name: 'nhip_tim', display: 'Nhịp tim' },
                { name: 'nhiet_do', display: 'Nhiệt độ' },
                { name: 'duong_huyet', display: 'Đường huyết' },
                { name: 'spo2', display: 'SpO2' }
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
                
                if (row.count > 0) {
                    hasDataIn24h = true;
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
static async countMucDoCanhBaoTheoDieuDuongTrongNgay(idDieuDuong) {
    try {
        if (!idDieuDuong) {
            console.log('❌ ERROR: ID điều dưỡng không hợp lệ');
            return 0;
        }

        console.log(`\n=== countMucDoCanhBaoTheoDieuDuongTrongNgay START - DieuDuong ID: ${idDieuDuong} ===`);
        
        // Query đơn giản hơn và chính xác hơn
        const query = `
            SELECT COUNT(*) as tong_so_canh_bao
            FROM (
                -- Lấy bản ghi mới nhất của mỗi chỉ số cho mỗi bệnh nhân trong ngày
                SELECT 'huyet_ap' as loai, id_benh_nhan, muc_do, thoi_gian_do
                FROM huyet_ap 
                WHERE (id_benh_nhan, thoi_gian_do) IN (
                    SELECT id_benh_nhan, MAX(thoi_gian_do)
                    FROM huyet_ap 
                    WHERE id_benh_nhan IN (
                        SELECT id_benh_nhan 
                        FROM dieu_duong_benh_nhan 
                        WHERE id_dieu_duong = ? 
                            AND trang_thai = 'dang_quan_ly'
                    )
                    AND DATE(CONVERT_TZ(thoi_gian_do, @@session.time_zone, '+07:00')) = DATE(CONVERT_TZ(NOW(), @@session.time_zone, '+07:00'))
                    GROUP BY id_benh_nhan
                )
                AND muc_do IN ('canh_bao', 'nguy_hiem')
                
                UNION ALL
                
                SELECT 'nhip_tim' as loai, id_benh_nhan, muc_do, thoi_gian_do
                FROM nhip_tim 
                WHERE (id_benh_nhan, thoi_gian_do) IN (
                    SELECT id_benh_nhan, MAX(thoi_gian_do)
                    FROM nhip_tim 
                    WHERE id_benh_nhan IN (
                        SELECT id_benh_nhan 
                        FROM dieu_duong_benh_nhan 
                        WHERE id_dieu_duong = ? 
                            AND trang_thai = 'dang_quan_ly'
                    )
                    AND DATE(CONVERT_TZ(thoi_gian_do, @@session.time_zone, '+07:00')) = DATE(CONVERT_TZ(NOW(), @@session.time_zone, '+07:00'))
                    GROUP BY id_benh_nhan
                )
                AND muc_do IN ('canh_bao', 'nguy_hiem')
                
                UNION ALL
                
                SELECT 'nhiet_do' as loai, id_benh_nhan, muc_do, thoi_gian_do
                FROM nhiet_do 
                WHERE (id_benh_nhan, thoi_gian_do) IN (
                    SELECT id_benh_nhan, MAX(thoi_gian_do)
                    FROM nhiet_do 
                    WHERE id_benh_nhan IN (
                        SELECT id_benh_nhan 
                        FROM dieu_duong_benh_nhan 
                        WHERE id_dieu_duong = ? 
                            AND trang_thai = 'dang_quan_ly'
                    )
                    AND DATE(CONVERT_TZ(thoi_gian_do, @@session.time_zone, '+07:00')) = DATE(CONVERT_TZ(NOW(), @@session.time_zone, '+07:00'))
                    GROUP BY id_benh_nhan
                )
                AND muc_do IN ('canh_bao', 'nguy_hiem')
                
                UNION ALL
                
                SELECT 'duong_huyet' as loai, id_benh_nhan, muc_do, thoi_gian_do
                FROM duong_huyet 
                WHERE (id_benh_nhan, thoi_gian_do) IN (
                    SELECT id_benh_nhan, MAX(thoi_gian_do)
                    FROM duong_huyet 
                    WHERE id_benh_nhan IN (
                        SELECT id_benh_nhan 
                        FROM dieu_duong_benh_nhan 
                        WHERE id_dieu_duong = ? 
                            AND trang_thai = 'dang_quan_ly'
                    )
                    AND DATE(CONVERT_TZ(thoi_gian_do, @@session.time_zone, '+07:00')) = DATE(CONVERT_TZ(NOW(), @@session.time_zone, '+07:00'))
                    GROUP BY id_benh_nhan
                )
                AND muc_do IN ('canh_bao', 'nguy_hiem')
                
                UNION ALL
                
                SELECT 'spo2' as loai, id_benh_nhan, muc_do, thoi_gian_do
                FROM spo2 
                WHERE (id_benh_nhan, thoi_gian_do) IN (
                    SELECT id_benh_nhan, MAX(thoi_gian_do)
                    FROM spo2 
                    WHERE id_benh_nhan IN (
                        SELECT id_benh_nhan 
                        FROM dieu_duong_benh_nhan 
                        WHERE id_dieu_duong = ? 
                            AND trang_thai = 'dang_quan_ly'
                    )
                    AND DATE(CONVERT_TZ(thoi_gian_do, @@session.time_zone, '+07:00')) = DATE(CONVERT_TZ(NOW(), @@session.time_zone, '+07:00'))
                    GROUP BY id_benh_nhan
                )
                AND muc_do IN ('canh_bao', 'nguy_hiem')
            ) as latest_canh_bao
        `;

        const [rows] = await connection.query(query, [
            idDieuDuong, idDieuDuong, idDieuDuong, idDieuDuong, idDieuDuong
        ]);

        const tongSoCanhBao = rows[0]?.tong_so_canh_bao || 0;

        console.log(`\nKết quả - Tổng số cảnh báo (bản ghi MỚI NHẤT trong ngày): ${tongSoCanhBao}`);
        console.log(`=== countMucDoCanhBaoTheoDieuDuongTrongNgay END ===`);

        return tongSoCanhBao;

    } catch (error) {
        console.error('❌ ERROR in countMucDoCanhBaoTheoDieuDuongTrongNgay:', error.message);
        console.error('Stack:', error.stack);
        
        return 0;
    }
}
}

module.exports = MucDoHelper;