-- Script tạo tất cả các bảng cho hệ thống quản lý Dưỡng Lão

USE quanlyduonglao;

-- 1. Bảng tài khoản
CREATE TABLE IF NOT EXISTS tai_khoan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ho_ten VARCHAR(255) NOT NULL,
    so_dien_thoai VARCHAR(20) UNIQUE,
    email VARCHAR(255) UNIQUE,
    mat_khau VARCHAR(255) NOT NULL,
    avatar VARCHAR(500),
    vai_tro ENUM('admin', 'dieu_duong', 'y_ta', 'quan_ly') DEFAULT 'dieu_duong',
    trang_thai ENUM('active', 'inactive', 'locked') DEFAULT 'active',
    da_xoa TINYINT(1) DEFAULT 0,
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_so_dien_thoai (so_dien_thoai),
    INDEX idx_vai_tro (vai_tro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Bảng bệnh nhân
CREATE TABLE IF NOT EXISTS benh_nhan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ho_ten VARCHAR(255) NOT NULL,
    ngay_sinh DATE,
    gioi_tinh ENUM('nam', 'nu', 'khac'),
    cccd VARCHAR(20),
    so_dien_thoai VARCHAR(20),
    dia_chi TEXT,
    phong VARCHAR(50),
    ngay_nhap_vien DATE,
    tinh_trang_suc_khoe TEXT,
    da_xoa TINYINT(1) DEFAULT 0,
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_phong (phong),
    INDEX idx_ngay_nhap_vien (ngay_nhap_vien)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Bảng hồ sơ y tế bệnh nhân
CREATE TABLE IF NOT EXISTS ho_so_y_te_benh_nhan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_benh_nhan INT NOT NULL,
    tien_su_benh TEXT,
    di_ung_thuoc TEXT,
    lich_su_phau_thuat TEXT,
    benh_ly_hien_tai TEXT,
    ghi_chu TEXT,
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_benh_nhan) REFERENCES benh_nhan(id) ON DELETE CASCADE,
    UNIQUE KEY unique_benh_nhan (id_benh_nhan)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Bảng người thân bệnh nhân
CREATE TABLE IF NOT EXISTS nguoi_than_benh_nhan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_benh_nhan INT NOT NULL,
    ho_ten VARCHAR(255) NOT NULL,
    moi_quan_he VARCHAR(100),
    so_dien_thoai VARCHAR(20),
    email VARCHAR(255),
    dia_chi TEXT,
    la_nguoi_lien_he_chinh TINYINT(1) DEFAULT 0,
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_benh_nhan) REFERENCES benh_nhan(id) ON DELETE CASCADE,
    INDEX idx_id_benh_nhan (id_benh_nhan),
    INDEX idx_la_nguoi_lien_he_chinh (la_nguoi_lien_he_chinh)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Bảng điều dưỡng - bệnh nhân (phân công)
CREATE TABLE IF NOT EXISTS dieu_duong_benh_nhan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_benh_nhan INT NOT NULL,
    id_dieu_duong INT NOT NULL,
    ngay_bat_dau DATE NOT NULL,
    ngay_ket_thuc DATE,
    trang_thai ENUM('dang_quan_ly', 'ket_thuc', 'huy') DEFAULT 'dang_quan_ly',
    ghi_chu TEXT,
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_benh_nhan) REFERENCES benh_nhan(id) ON DELETE CASCADE,
    FOREIGN KEY (id_dieu_duong) REFERENCES tai_khoan(id) ON DELETE CASCADE,
    INDEX idx_id_dieu_duong (id_dieu_duong),
    INDEX idx_trang_thai (trang_thai)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Bảng công việc
CREATE TABLE IF NOT EXISTS cong_viec (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ten_cong_viec VARCHAR(255) NOT NULL,
    mo_ta TEXT,
    loai_cong_viec VARCHAR(100),
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Bảng phân công công việc
CREATE TABLE IF NOT EXISTS phan_cong_cong_viec (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_cong_viec INT,
    id_dieu_duong INT NOT NULL,
    id_benh_nhan INT,
    trang_thai ENUM('chua_lam', 'dang_lam', 'hoan_thanh', 'huy') DEFAULT 'chua_lam',
    ngay_thuc_hien DATE,
    ghi_chu TEXT,
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_dieu_duong) REFERENCES tai_khoan(id) ON DELETE CASCADE,
    FOREIGN KEY (id_benh_nhan) REFERENCES benh_nhan(id) ON DELETE SET NULL,
    INDEX idx_id_dieu_duong (id_dieu_duong),
    INDEX idx_trang_thai (trang_thai),
    INDEX idx_ngay_thuc_hien (ngay_thuc_hien)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Bảng lịch thăm bệnh
CREATE TABLE IF NOT EXISTS lich_tham_benh (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_benh_nhan INT NOT NULL,
    id_nguoi_than INT,
    ngay DATE NOT NULL,
    khung_gio ENUM('8_10', '14_16', '18_20') NOT NULL,
    trang_thai ENUM('cho_duyet', 'da_duyet', 'tu_choi', 'hoan_thanh') DEFAULT 'cho_duyet',
    ly_do_tham TEXT,
    ghi_chu TEXT,
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_benh_nhan) REFERENCES benh_nhan(id) ON DELETE CASCADE,
    FOREIGN KEY (id_nguoi_than) REFERENCES nguoi_than_benh_nhan(id) ON DELETE SET NULL,
    INDEX idx_id_benh_nhan (id_benh_nhan),
    INDEX idx_ngay (ngay),
    INDEX idx_trang_thai (trang_thai)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Bảng thông báo
CREATE TABLE IF NOT EXISTS thong_bao (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_nguoi_nhan INT,
    tieu_de VARCHAR(255) NOT NULL,
    noi_dung TEXT,
    link VARCHAR(500),
    loai VARCHAR(100),
    da_doc TINYINT(1) DEFAULT 0,
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_nguoi_nhan) REFERENCES tai_khoan(id) ON DELETE CASCADE,
    INDEX idx_id_nguoi_nhan (id_nguoi_nhan),
    INDEX idx_loai (loai),
    INDEX idx_da_doc (da_doc)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Bảng điểm rủi ro (nếu cần)
CREATE TABLE IF NOT EXISTS diem_rui_ro (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_benh_nhan INT NOT NULL,
    diem_so INT,
    danh_gia TEXT,
    ngay_danh_gia DATE,
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_benh_nhan) REFERENCES benh_nhan(id) ON DELETE CASCADE,
    INDEX idx_id_benh_nhan (id_benh_nhan)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

