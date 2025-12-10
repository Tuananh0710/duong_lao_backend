# Hướng dẫn Reset MySQL Root Password

## Cách 1: Reset password nếu bạn biết password hiện tại

```bash
mysql -u root -p
# Nhập password hiện tại khi được hỏi
```

Sau đó trong MySQL:
```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY '';
FLUSH PRIVILEGES;
exit;
```

## Cách 2: Reset password nếu KHÔNG biết password (Safe Mode)

1. Dừng MySQL:
```bash
sudo /usr/local/mysql/support-files/mysql.server stop
```

2. Khởi động MySQL ở chế độ safe mode (bỏ qua password):
```bash
sudo /usr/local/mysql/bin/mysqld_safe --skip-grant-tables &
```

3. Kết nối MySQL (không cần password):
```bash
mysql -u root
```

4. Trong MySQL, chạy:
```sql
USE mysql;
UPDATE user SET authentication_string='' WHERE User='root' AND Host='localhost';
FLUSH PRIVILEGES;
exit;
```

5. Dừng MySQL safe mode và khởi động lại bình thường:
```bash
sudo /usr/local/mysql/support-files/mysql.server stop
sudo /usr/local/mysql/support-files/mysql.server start
```

6. Kiểm tra:
```bash
mysql -u root
# Nếu kết nối được mà không cần password là thành công
```

## Sau khi reset password:

1. File phpMyAdmin đã được cập nhật (storage features đã tắt)
2. File .env đã có DB_PASSWORD=""
3. Thử truy cập lại phpMyAdmin: http://localhost/phpmyadmin/

