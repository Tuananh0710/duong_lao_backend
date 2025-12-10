# Hướng dẫn chuyển sang XAMPP MySQL

## Cách 1: Sử dụng XAMPP Control Panel (Khuyến nghị)

1. Mở XAMPP Control Panel:
   ```bash
   open /Applications/XAMPP/xamppfiles/xamppfiles/xampp
   ```
   Hoặc tìm "XAMPP" trong Applications

2. Trong XAMPP Control Panel:
   - Dừng MySQL hiện tại (nếu đang chạy)
   - Click "Start" cho MySQL trong XAMPP
   - Đợi MySQL khởi động (nút chuyển sang màu xanh)

3. Kiểm tra XAMPP MySQL đã chạy:
   ```bash
   /Applications/XAMPP/xamppfiles/bin/mysql -u root -e "SELECT VERSION();"
   ```

## Cách 2: Sử dụng Terminal (cần quyền)

1. Dừng MySQL hiện tại:
   ```bash
   sudo /usr/local/mysql/support-files/mysql.server stop
   ```

2. Sửa quyền cho XAMPP MySQL:
   ```bash
   sudo chown -R $(whoami):staff /Applications/XAMPP/xamppfiles/var/mysql
   ```

3. Khởi động XAMPP MySQL:
   ```bash
   /Applications/XAMPP/xamppfiles/bin/mysql.server start
   ```

## Sau khi XAMPP MySQL đã chạy:

1. Tạo database:
   ```bash
   /Applications/XAMPP/xamppfiles/bin/mysql -u root -e "CREATE DATABASE IF NOT EXISTS quanlyduonglao CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   ```

2. Tạo các bảng:
   ```bash
   /Applications/XAMPP/xamppfiles/bin/mysql -u root quanlyduonglao < create_tables.sql
   ```

3. Kiểm tra:
   ```bash
   /Applications/XAMPP/xamppfiles/bin/mysql -u root -e "USE quanlyduonglao; SHOW TABLES;"
   ```

## Lưu ý:

- XAMPP MySQL mặc định không có password cho root
- Nếu cả 2 MySQL cùng chạy trên port 3306 sẽ bị conflict
- Nên chỉ chạy 1 MySQL server tại một thời điểm

