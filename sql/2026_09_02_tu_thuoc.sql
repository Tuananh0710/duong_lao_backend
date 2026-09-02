-- ============================================================
-- Tủ thuốc / vật tư tiêu hao dùng chung
-- Ngày: 2026-09-02
-- ============================================================

CREATE TABLE IF NOT EXISTS `phan_loai_thuoc` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `ten_loai` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `mo_ta` text COLLATE utf8mb4_general_ci,
  `ngay_tao` datetime DEFAULT NULL,
  `ngay_cap_nhat` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `tu_thuoc` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `id_phan_loai` bigint DEFAULT NULL,
  `ten_thuoc` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `don_vi_tinh` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `so_luong_ton` int DEFAULT '0',
  `so_luong_toi_thieu` int DEFAULT '0' COMMENT 'Ngưỡng cảnh báo sắp hết',
  `han_su_dung` date DEFAULT NULL,
  `chi_dinh` text COLLATE utf8mb4_general_ci,
  `trang_thai` enum('con_hang','sap_het','het_hang','het_han') COLLATE utf8mb4_general_ci DEFAULT 'con_hang',
  `ghi_chu` text COLLATE utf8mb4_general_ci,
  `da_xoa` tinyint(1) DEFAULT '0',
  `ngay_xoa` datetime DEFAULT NULL,
  `ngay_tao` datetime DEFAULT CURRENT_TIMESTAMP,
  `ngay_cap_nhat` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `id_phan_loai` (`id_phan_loai`),
  KEY `idx_tu_thuoc_ten_thuoc` (`ten_thuoc`),
  KEY `idx_tu_thuoc_trang_thai` (`trang_thai`),
  KEY `idx_tu_thuoc_han_su_dung` (`han_su_dung`),
  CONSTRAINT `fk_tu_thuoc_phan_loai` FOREIGN KEY (`id_phan_loai`) REFERENCES `phan_loai_thuoc` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Liên kết bản ghi tiêu hao với món trong tủ thuốc.
-- Chạy 1 lần; nếu 2 cột đã tồn tại thì bỏ qua block này.
ALTER TABLE `vat_tu_tieu_hao`
  ADD COLUMN `id_tu_thuoc` bigint DEFAULT NULL AFTER `id_nguoi_gui`,
  ADD COLUMN `ly_do` text COLLATE utf8mb4_general_ci AFTER `don_vi_tinh`,
  ADD KEY `idx_vat_tu_id_tu_thuoc` (`id_tu_thuoc`),
  ADD CONSTRAINT `fk_vat_tu_tu_thuoc` FOREIGN KEY (`id_tu_thuoc`) REFERENCES `tu_thuoc` (`id`) ON DELETE SET NULL;
