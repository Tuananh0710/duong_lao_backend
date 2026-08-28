ALTER TABLE huyet_ap
    ADD COLUMN da_gui_canh_bao TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Đã gửi cảnh báo cho quản lý/người nhà hay chưa',
    ADD COLUMN thoi_gian_gui_canh_bao DATETIME NULL COMMENT 'Thời điểm gửi cảnh báo',
    ADD COLUMN id_nguoi_gui_canh_bao INT NULL COMMENT 'id tài khoản đã gửi cảnh báo';

ALTER TABLE nhip_tim
    ADD COLUMN da_gui_canh_bao TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN thoi_gian_gui_canh_bao DATETIME NULL,
    ADD COLUMN id_nguoi_gui_canh_bao INT NULL;

ALTER TABLE nhiet_do
    ADD COLUMN da_gui_canh_bao TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN thoi_gian_gui_canh_bao DATETIME NULL,
    ADD COLUMN id_nguoi_gui_canh_bao INT NULL;

ALTER TABLE duong_huyet
    ADD COLUMN da_gui_canh_bao TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN thoi_gian_gui_canh_bao DATETIME NULL,
    ADD COLUMN id_nguoi_gui_canh_bao INT NULL;

ALTER TABLE spo2
    ADD COLUMN da_gui_canh_bao TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN thoi_gian_gui_canh_bao DATETIME NULL,
    ADD COLUMN id_nguoi_gui_canh_bao INT NULL;

