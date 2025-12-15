# Tạo Tài Khoản Admin - Hệ Thống Quản Lý Viện Dưỡng Lão

Có nhiều cách để tạo tài khoản admin cho hệ thống:

## Cách 1: Sử dụng Script Node.js (Khuyến nghị)

Chạy script tự động:

```bash

pnpm run create-admin

Hoặc:

node scripts/create-admin.js

Script sẽ tạo tài khoản với thông tin:

Số điện thoại: 0123456789  
Email: admin@vienduonglao.com
Mật khẩu: Admin@123
Vai trò: super_admin
Trạng thái: active

Cách 2: Sử dụng API Register (Nếu có endpoint register)

Windows (PowerShell hoặc CMD):

curl -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d "{\"ho_ten\": \"Super Admin\", \"so_dien_thoai\": \"0123456789\", \"email\": \"admin@vienduonglao.com\", \"mat_khau\": \"Admin@123\", \"vai_tro\": \"super_admin\", \"trang_thai\": \"active\"}"

Linux/Mac:

curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "ho_ten": "Super Admin",
    "so_dien_thoai": "0123456789",
    "email": "admin@vienduonglao.com",
    "mat_khau": "Admin@123",
    "vai_tro": "super_admin",
    "trang_thai": "active"
  }'

Cách 3: Sử dụng MySQL trực tiếp
Nếu muốn tạo trực tiếp trong database:

-- Kiểm tra xem tài khoản đã tồn tại chưa
SELECT * FROM tai_khoan WHERE so_dien_thoai = '0123456789' OR email = 'admin@vienduonglao.com';

-- Tạo tài khoản admin (mật khẩu đã hash: Admin@123)
-- LƯU Ý: Cần hash mật khẩu trước khi insert. Hash của "Admin@123" là: $2a$10$N9qo8uLOickgx2ZMRZoMye.KbwDr8x6TNaOqZ7WWRaC7axlQ2/kKm
INSERT INTO tai_khoan (ho_ten, so_dien_thoai, email, mat_khau, vai_tro, trang_thai, da_xoa, ngay_tao)
VALUES (
  'Super Admin',
  '0123456789',
  'admin@vienduonglao.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMye.KbwDr8x6TNaOqZ7WWRaC7axlQ2/kKm',
  'super_admin',
  'active',
  0,
  NOW()
);

Đăng nhập với tài khoản Admin
Sau khi tạo tài khoản, bạn có thể đăng nhập qua API:

Endpoint: POST http://localhost:3000/api/auth/login

Headers:
Content-Type: application/json

Request body (dùng số điện thoại):

json
{
  "so_dien_thoai": "0123456789",
  "mat_khau": "Admin@123"
}

Hoặc (dùng email):

json
{
  "email": "admin@vienduonglao.com",
  "mat_khau": "Admin@123"
}

Response thành công:
json
{
  "success": true,
  "message": "Đăng nhập thành công !",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "ho_ten": "Super Admin",
    "so_dien_thoai": "0123456789",
    "email": "admin@vienduonglao.com",
    "avatar": null,
    "vai_tro": "super_admin",
    "trang_thai": "active",
    "ngay_tao": "2024-01-01T00:00:00.000Z"
  }
}

Lấy thông tin profile Admin
Endpoint: GET http://localhost:3000/api/auth/profile

Headers:

Authorization: Bearer <token>
Content-Type: application/json
Các vai trò có sẵn trong hệ thống
Dựa trên cấu trúc database, các vai trò có thể bao gồm:

super_admin - Super Admin (Toàn quyền)

quan_ly_y_te - Quản lý Y tế

quan_ly_nhan_su - Quản lý Nhân sự

dieu_duong_truong - Điều dưỡng trưởng

dieu_duong - Điều dưỡng

marketing - Marketing

nguoi_nha - Người nhà (mặc định)

Lưu ý quan trọng
Đảm bảo server đang chạy trước khi tạo tài khoản qua API

Kiểm tra kết nối database trong file config/database.js

Thay đổi mật khẩu sau lần đăng nhập đầu tiên

Bảo mật thông tin tài khoản admin

Hash mật khẩu nếu tạo trực tiếp trong database

Trạng thái tài khoản phải là active để có thể đăng nhập

Tài khoản bị xóa mềm (da_xoa = 1) sẽ không thể đăng nhập

Xử lý lỗi thường gặp
1. Lỗi "sdt/email hoặc mật khẩu sai!"
Kiểm tra số điện thoại/email đã nhập đúng chưa

Kiểm tra mật khẩu đã nhập đúng chưa

Kiểm tra tài khoản có bị da_xoa = 1 không

2. Lỗi "tài khoản đã bị khóa hoặc vô hiệu"
Kiểm tra trường trang_thai trong database phải là active

3. Lỗi kết nối database
Kiểm tra file config/database.js

Kiểm tra MySQL service đang chạy

Kiểm tra thông tin kết nối (host, port, username, password, database name)

Bảo mật
Không commit file chứa thông tin đăng nhập database

Sử dụng biến môi trường cho các thông tin nhạy cảm

Đổi mật khẩu mặc định ngay sau khi tạo tài khoản

Sử dụng HTTPS trong môi trường production

Giới hạn quyền truy cập vào database

Troubleshooting
Nếu gặp vấn đề khi tạo tài khoản admin:

Kiểm tra logs server để xem lỗi chi tiết

Kiểm tra bảng tai_khoan đã tồn tại trong database chưa

Kiểm tra cấu trúc bảng có đủ các trường cần thiết không

Test kết nối database bằng công cụ như MySQL Workbench hoặc phpMyAdmin

Hỗ trợ
Nếu cần hỗ trợ thêm, vui lòng:

Kiểm tra file authController.js và authRoutes.js

Xem logs server để biết lỗi chi tiết

Kiểm tra kết nối và cấu trúc database

text

File `README-ADMIN.md` này đã được điều chỉnh để phù hợp với:
1. Cấu trúc API backend hiện tại (chỉ có endpoint `/login` và `/profile`)
2. Cấu trúc bảng `tai_khoan` trong database
3. Logic xử lý trong `authController.js`
4. Các trường dữ liệu cần thiết để tạo tài khoản admin hoạt động được với hệ thống hiện tạ