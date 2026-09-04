// controllers/tuThuocController.js
const TuThuocModel = require('../models/tuThuoc');

const TRANG_THAI_HOP_LE = ['con_hang', 'sap_het', 'het_hang', 'het_han'];

const loi = (res, status, message) =>
    res.status(status).json({ success: false, message });

// Chấp nhận 'YYYY-MM-DD' hoặc chuỗi ISO; trả null nếu bỏ trống, undefined nếu sai.
// Tự cắt chuỗi thay vì đi qua toISOString(): new Date('2026-12-31') là mốc UTC,
// đổi về ISO theo giờ máy sẽ lệch 1 ngày nếu server không nằm ở múi giờ dương.
const chuanHoaNgay = (giaTri) => {
    if (giaTri === null || giaTri === undefined || giaTri === '') return null;

    const m = String(giaTri).trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/);
    if (!m) return undefined;

    const nam = Number(m[1]);
    const thang = Number(m[2]);
    const ngay = Number(m[3]);

    // new Date tự cuộn ngày không tồn tại (30/02 -> 02/03), phải đối chiếu lại
    // thì mới bắt được ngày sai.
    const d = new Date(Date.UTC(nam, thang - 1, ngay));
    if (d.getUTCFullYear() !== nam || d.getUTCMonth() !== thang - 1 || d.getUTCDate() !== ngay) {
        return undefined;
    }

    return `${m[1]}-${m[2]}-${m[3]}`;
};

// Số nguyên >= 0. Trả undefined nếu không hợp lệ.
const soNguyenKhongAm = (giaTri) => {
    const n = parseInt(giaTri);
    if (isNaN(n) || n < 0) return undefined;
    return n;
};

const chuoiHoacNull = (giaTri) => {
    if (giaTri === null || giaTri === undefined) return null;
    const s = String(giaTri).trim();
    return s === '' ? null : s;
};

const tuThuocController = {
    getDsPhanLoai: async (req, res) => {
        try {
            const danhSach = await TuThuocModel.getDsPhanLoai();

            return res.status(200).json({
                success: true,
                message: 'Lấy danh sách phân loại thuốc thành công',
                tong_so: danhSach.length,
                data: danhSach
            });
        } catch (error) {
            console.error('Lỗi controller lấy phân loại thuốc:', error);
            return loi(res, 500, 'Lỗi server: ' + error.message);
        }
    },

    getDsThuoc: async (req, res) => {
        try {
            const { search = '', id_phan_loai, trang_thai } = req.query;

            const page = Math.max(parseInt(req.query.page) || 1, 1);
            const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);

            if (id_phan_loai && isNaN(id_phan_loai)) {
                return loi(res, 400, 'ID phân loại không hợp lệ');
            }

            if (trang_thai && !TRANG_THAI_HOP_LE.includes(trang_thai)) {
                return loi(res, 400, 'Trạng thái không hợp lệ');
            }

            const dieuKien = {
                search: search.trim(),
                idPhanLoai: id_phan_loai ? parseInt(id_phan_loai) : null,
                trangThai: trang_thai || null
            };

            const [danhSach, tongSo] = await Promise.all([
                TuThuocModel.getDsThuoc({ ...dieuKien, page, limit }),
                TuThuocModel.demDsThuoc(dieuKien)
            ]);

            return res.status(200).json({
                success: true,
                message: 'Lấy danh sách tủ thuốc thành công',
                data: danhSach,
                phan_trang: {
                    trang_hien_tai: page,
                    so_dong: limit,
                    tong_so: tongSo,
                    tong_trang: Math.ceil(tongSo / limit)
                }
            });
        } catch (error) {
            console.error('Lỗi controller lấy danh sách tủ thuốc:', error);
            return loi(res, 500, 'Lỗi server: ' + error.message);
        }
    },

    thongKe: async (req, res) => {
        try {
            const thongKe = await TuThuocModel.thongKe();

            return res.status(200).json({
                success: true,
                message: 'Lấy thống kê tủ thuốc thành công',
                data: thongKe
            });
        } catch (error) {
            console.error('Lỗi controller thống kê tủ thuốc:', error);
            return loi(res, 500, 'Lỗi server: ' + error.message);
        }
    },

    getChiTiet: async (req, res) => {
        try {
            const { id } = req.params;

            if (!id || isNaN(id)) {
                return loi(res, 400, 'ID không hợp lệ');
            }

            const thuoc = await TuThuocModel.getChiTiet(parseInt(id));

            if (!thuoc) {
                return loi(res, 404, 'Không tìm thấy mục trong tủ thuốc');
            }

            return res.status(200).json({
                success: true,
                message: 'Lấy chi tiết thành công',
                data: thuoc
            });
        } catch (error) {
            console.error('Lỗi controller lấy chi tiết tủ thuốc:', error);
            return loi(res, 500, 'Lỗi server: ' + error.message);
        }
    },

    // ==================== QUẢN LÝ TỦ THUỐC ====================

    themThuoc: async (req, res) => {
        try {
            const {
                id_phan_loai, ten_thuoc, don_vi_tinh, so_luong_ton,
                so_luong_toi_thieu, han_su_dung, chi_dinh, ghi_chu
            } = req.body;

            const tenThuoc = chuoiHoacNull(ten_thuoc);
            if (!tenThuoc) {
                return loi(res, 400, 'Vui lòng nhập tên thuốc/vật tư');
            }

            if (id_phan_loai !== undefined && id_phan_loai !== null && isNaN(id_phan_loai)) {
                return loi(res, 400, 'ID phân loại không hợp lệ');
            }

            const ton = soNguyenKhongAm(so_luong_ton ?? 0);
            if (ton === undefined) {
                return loi(res, 400, 'Số lượng tồn phải là số nguyên không âm');
            }

            const toiThieu = soNguyenKhongAm(so_luong_toi_thieu ?? 0);
            if (toiThieu === undefined) {
                return loi(res, 400, 'Số lượng tối thiểu phải là số nguyên không âm');
            }

            const han = chuanHoaNgay(han_su_dung);
            if (han === undefined) {
                return loi(res, 400, 'Hạn sử dụng không hợp lệ, dùng định dạng YYYY-MM-DD');
            }

            const idPhanLoai = id_phan_loai ? parseInt(id_phan_loai) : null;

            // Kiểm tra trước để trả 400 dễ hiểu, thay vì để MySQL ném lỗi khóa ngoại thành 500.
            if (idPhanLoai && !(await TuThuocModel.phanLoaiTonTai(idPhanLoai))) {
                return loi(res, 400, 'Phân loại không tồn tại');
            }

            const trung = await TuThuocModel.timTrung({ tenThuoc, idPhanLoai });
            if (trung) {
                return loi(
                    res, 409,
                    `"${tenThuoc}" đã có trong tủ thuốc (còn ${trung.so_luong_ton}). ` +
                    'Dùng chức năng nhập kho để cộng thêm tồn.'
                );
            }

            const newId = await TuThuocModel.themThuoc({
                id_phan_loai: idPhanLoai,
                ten_thuoc: tenThuoc,
                don_vi_tinh: chuoiHoacNull(don_vi_tinh),
                so_luong_ton: ton,
                so_luong_toi_thieu: toiThieu,
                han_su_dung: han,
                chi_dinh: chuoiHoacNull(chi_dinh),
                ghi_chu: chuoiHoacNull(ghi_chu)
            });

            return res.status(201).json({
                success: true,
                message: 'Thêm vào tủ thuốc thành công',
                id: newId
            });
        } catch (error) {
            console.error('Lỗi controller thêm thuốc:', error);
            return loi(res, error.status || 500,
                error.status ? error.message : 'Lỗi server: ' + error.message);
        }
    },

    capNhatThuoc: async (req, res) => {
        try {
            const { id } = req.params;

            if (!id || isNaN(id)) {
                return loi(res, 400, 'ID không hợp lệ');
            }

            const duLieu = {};

            if (req.body.ten_thuoc !== undefined) {
                const ten = chuoiHoacNull(req.body.ten_thuoc);
                if (!ten) return loi(res, 400, 'Tên thuốc/vật tư không được để trống');
                duLieu.ten_thuoc = ten;
            }

            if (req.body.id_phan_loai !== undefined) {
                if (req.body.id_phan_loai !== null && isNaN(req.body.id_phan_loai)) {
                    return loi(res, 400, 'ID phân loại không hợp lệ');
                }
                duLieu.id_phan_loai = req.body.id_phan_loai ? parseInt(req.body.id_phan_loai) : null;

                if (duLieu.id_phan_loai && !(await TuThuocModel.phanLoaiTonTai(duLieu.id_phan_loai))) {
                    return loi(res, 400, 'Phân loại không tồn tại');
                }
            }

            if (req.body.so_luong_ton !== undefined) {
                const ton = soNguyenKhongAm(req.body.so_luong_ton);
                if (ton === undefined) return loi(res, 400, 'Số lượng tồn phải là số nguyên không âm');
                duLieu.so_luong_ton = ton;
            }

            if (req.body.so_luong_toi_thieu !== undefined) {
                const tt = soNguyenKhongAm(req.body.so_luong_toi_thieu);
                if (tt === undefined) return loi(res, 400, 'Số lượng tối thiểu phải là số nguyên không âm');
                duLieu.so_luong_toi_thieu = tt;
            }

            if (req.body.han_su_dung !== undefined) {
                const han = chuanHoaNgay(req.body.han_su_dung);
                if (han === undefined) {
                    return loi(res, 400, 'Hạn sử dụng không hợp lệ, dùng định dạng YYYY-MM-DD');
                }
                duLieu.han_su_dung = han;
            }

            for (const cot of ['don_vi_tinh', 'chi_dinh', 'ghi_chu']) {
                if (req.body[cot] !== undefined) duLieu[cot] = chuoiHoacNull(req.body[cot]);
            }

            if (Object.keys(duLieu).length === 0) {
                return loi(res, 400, 'Không có thông tin nào để cập nhật');
            }

            if (duLieu.ten_thuoc) {
                const hienTai = await TuThuocModel.getChiTiet(parseInt(id));
                if (!hienTai) return loi(res, 404, 'Không tìm thấy mục trong tủ thuốc');

                const idPhanLoai = duLieu.id_phan_loai !== undefined
                    ? duLieu.id_phan_loai
                    : hienTai.id_phan_loai;

                const trung = await TuThuocModel.timTrung({
                    tenThuoc: duLieu.ten_thuoc,
                    idPhanLoai,
                    boQuaId: parseInt(id)
                });
                if (trung) {
                    return loi(res, 409, `"${duLieu.ten_thuoc}" đã có trong tủ thuốc`);
                }
            }

            const daSua = await TuThuocModel.capNhatThuoc(parseInt(id), duLieu);

            return res.status(200).json({
                success: true,
                message: daSua ? 'Cập nhật thành công' : 'Không có thay đổi nào'
            });
        } catch (error) {
            console.error('Lỗi controller cập nhật thuốc:', error);
            return loi(res, error.status || 500,
                error.status ? error.message : 'Lỗi server: ' + error.message);
        }
    },

    nhapKho: async (req, res) => {
        try {
            const { id } = req.params;
            const { so_luong, han_su_dung, ghi_chu } = req.body;

            if (!id || isNaN(id)) {
                return loi(res, 400, 'ID không hợp lệ');
            }

            const soLuong = parseInt(so_luong);
            if (!soLuong || isNaN(soLuong) || soLuong <= 0) {
                return loi(res, 400, 'Số lượng nhập phải lớn hơn 0');
            }

            const han = chuanHoaNgay(han_su_dung);
            if (han === undefined) {
                return loi(res, 400, 'Hạn sử dụng không hợp lệ, dùng định dạng YYYY-MM-DD');
            }

            const ketQua = await TuThuocModel.nhapKho(parseInt(id), {
                soLuong,
                // undefined = không gửi lên = giữ nguyên hạn cũ
                hanSuDung: han_su_dung === undefined ? null : han,
                ghiChu: chuoiHoacNull(ghi_chu)
            });

            return res.status(200).json({
                success: true,
                message: `Nhập kho thành công. Tồn kho: ${ketQua.ton_truoc} → ${ketQua.ton_sau}`,
                data: ketQua
            });
        } catch (error) {
            console.error('Lỗi controller nhập kho:', error);
            return loi(res, error.status || 500,
                error.status ? error.message : 'Lỗi server: ' + error.message);
        }
    },

    xoaThuoc: async (req, res) => {
        try {
            const { id } = req.params;

            if (!id || isNaN(id)) {
                return loi(res, 400, 'ID không hợp lệ');
            }

            const daXoa = await TuThuocModel.xoaThuoc(parseInt(id));

            if (!daXoa) {
                return loi(res, 404, 'Không tìm thấy mục trong tủ thuốc');
            }

            return res.status(200).json({
                success: true,
                message: 'Xóa khỏi tủ thuốc thành công'
            });
        } catch (error) {
            console.error('Lỗi controller xóa thuốc:', error);
            return loi(res, 500, 'Lỗi server: ' + error.message);
        }
    },

    dongBoTrangThai: async (req, res) => {
        try {
            const soDong = await TuThuocModel.dongBoTrangThai();

            return res.status(200).json({
                success: true,
                message: `Đã đồng bộ trạng thái ${soDong} mục`,
                data: { so_dong: soDong }
            });
        } catch (error) {
            console.error('Lỗi controller đồng bộ trạng thái:', error);
            return loi(res, 500, 'Lỗi server: ' + error.message);
        }
    },

    // ==================== QUẢN LÝ PHÂN LOẠI ====================

    themPhanLoai: async (req, res) => {
        try {
            const tenLoai = chuoiHoacNull(req.body.ten_loai);
            if (!tenLoai) {
                return loi(res, 400, 'Vui lòng nhập tên phân loại');
            }

            const trung = await TuThuocModel.timPhanLoaiTheoTen(tenLoai);
            if (trung) {
                return loi(res, 409, `Phân loại "${tenLoai}" đã tồn tại`);
            }

            const newId = await TuThuocModel.themPhanLoai({
                tenLoai,
                moTa: chuoiHoacNull(req.body.mo_ta)
            });

            return res.status(201).json({
                success: true,
                message: 'Thêm phân loại thành công',
                id: newId
            });
        } catch (error) {
            console.error('Lỗi controller thêm phân loại:', error);
            return loi(res, 500, 'Lỗi server: ' + error.message);
        }
    },

    capNhatPhanLoai: async (req, res) => {
        try {
            const { id } = req.params;

            if (!id || isNaN(id)) {
                return loi(res, 400, 'ID không hợp lệ');
            }

            const duLieu = {};

            if (req.body.ten_loai !== undefined) {
                const ten = chuoiHoacNull(req.body.ten_loai);
                if (!ten) return loi(res, 400, 'Tên phân loại không được để trống');

                const trung = await TuThuocModel.timPhanLoaiTheoTen(ten, parseInt(id));
                if (trung) return loi(res, 409, `Phân loại "${ten}" đã tồn tại`);

                duLieu.tenLoai = ten;
            }

            if (req.body.mo_ta !== undefined) {
                duLieu.moTa = chuoiHoacNull(req.body.mo_ta);
            }

            if (Object.keys(duLieu).length === 0) {
                return loi(res, 400, 'Không có thông tin nào để cập nhật');
            }

            const daSua = await TuThuocModel.capNhatPhanLoai(parseInt(id), duLieu);

            if (!daSua) {
                return loi(res, 404, 'Không tìm thấy phân loại');
            }

            return res.status(200).json({
                success: true,
                message: 'Cập nhật phân loại thành công'
            });
        } catch (error) {
            console.error('Lỗi controller cập nhật phân loại:', error);
            return loi(res, 500, 'Lỗi server: ' + error.message);
        }
    },

    xoaPhanLoai: async (req, res) => {
        try {
            const { id } = req.params;

            if (!id || isNaN(id)) {
                return loi(res, 400, 'ID không hợp lệ');
            }

            const soThuoc = await TuThuocModel.demThuocTheoPhanLoai(parseInt(id));
            if (soThuoc > 0) {
                return loi(
                    res, 409,
                    `Còn ${soThuoc} mục đang thuộc phân loại này. ` +
                    'Chuyển chúng sang phân loại khác trước khi xóa.'
                );
            }

            const daXoa = await TuThuocModel.xoaPhanLoai(parseInt(id));

            if (!daXoa) {
                return loi(res, 404, 'Không tìm thấy phân loại');
            }

            return res.status(200).json({
                success: true,
                message: 'Xóa phân loại thành công'
            });
        } catch (error) {
            console.error('Lỗi controller xóa phân loại:', error);
            return loi(res, 500, 'Lỗi server: ' + error.message);
        }
    }
};

module.exports = tuThuocController;
