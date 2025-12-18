# Backend API - Hệ thống Quản lý Viện Dưỡng Lão

## Cài đặt

1. Cài đặt dependencies:
```bash
npm install
```

2. Tạo file `.env` từ `.env.example` và cấu hình:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=quanlyduonglao
DB_PORT=3306

JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRES_IN=7d

PORT=3000
NODE_ENV=development
```

3. Chạy server:
```bash
npm start
# hoặc development mode
npm dev
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Đăng nhập
    Raw body 
        {
            "so_dien_thoai": "0123456789",
            "mat_khau": "8888"
        }
- `GET /api/auth/profile` - Lấy thông tin profile (cần auth)

### Bệnh nhân
- `GET /api/benh_nhan/tong_so/:idDieuDuong` - Lấy danh sách bệnh nhân
- `GET /api/benh_nhan/:id` - Lấy chi tiết bệnh nhân

**Chỉ số sinh tồn:**
- `GET /api/benh-nhan/:id/chi-so-sinh-ton` - Lấy chỉ số sinh tồn
- `POST /api/benh-nhan/:id/chi-so-sinh-ton` - Thêm chỉ số sinh tồn
- `PUT /api/benh-nhan/:id/chi-so-sinh-ton/:chi_so_id` - Cập nhật chỉ số sinh tồn
- `DELETE /api/benh-nhan/:id/chi-so-sinh-ton/:chi_so_id` - Xóa chỉ số sinh tồn

**Hoạt động sinh hoạt:** *(Chưa implement)*
- `GET /api/benh-nhan/:id/hoat-dong-sinh-hoat` - Lấy hoạt động sinh hoạt
- `POST /api/benh-nhan/:id/hoat-dong-sinh-hoat` - Ghi nhận hoạt động sinh hoạt
- `PUT /api/benh-nhan/:id/hoat-dong-sinh-hoat/:hoat_dong_id` - Cập nhật hoạt động sinh hoạt
- `DELETE /api/benh-nhan/:id/hoat-dong-sinh-hoat/:hoat_dong_id` - Xóa hoạt động sinh hoạt

**Tâm lý giao tiếp:** *(Chưa implement)*
- `GET /api/benh-nhan/:id/tam-ly-giao-tiep` - Lấy thông tin tâm lý giao tiếp
- `POST /api/benh-nhan/:id/tam-ly-giao-tiep` - Ghi nhận tâm lý giao tiếp
- `PUT /api/benh-nhan/:id/tam-ly-giao-tiep/:tam_ly_id` - Cập nhật tâm lý giao tiếp
- `DELETE /api/benh-nhan/:id/tam-ly-giao-tiep/:tam_ly_id` - Xóa tâm lý giao tiếp

**Vận động phục hồi:** *(Chưa implement)*
- `GET /api/benh-nhan/:id/van-dong-phuc-hoi` - Lấy thông tin vận động phục hồi
- `POST /api/benh-nhan/:id/van-dong-phuc-hoi` - Ghi nhận vận động phục hồi
- `PUT /api/benh-nhan/:id/van-dong-phuc-hoi/:van_dong_id` - Cập nhật vận động phục hồi
- `DELETE /api/benh-nhan/:id/van-dong-phuc-hoi/:van_dong_id` - Xóa vận động phục hồi

**Bệnh hiện tại:** *(Chưa có CRUD riêng - chỉ lấy trong getBenhNhanById)*
- `GET /api/benh-nhan/:id/benh-hien-tai` - Lấy danh sách bệnh hiện tại
- `POST /api/benh-nhan/:id/benh-hien-tai` - Thêm bệnh hiện tại
- `PUT /api/benh-nhan/:id/benh-hien-tai/:benh_id` - Cập nhật bệnh hiện tại
- `DELETE /api/benh-nhan/:id/benh-hien-tai/:benh_id` - Xóa bệnh hiện tại

**Hồ sơ y tế:** *(Chưa có CRUD riêng - chỉ lấy trong getBenhNhanById)*
- `GET /api/benh-nhan/:id/ho-so-y-te` - Lấy hồ sơ y tế
- `POST /api/benh-nhan/:id/ho-so-y-te` - Tạo hồ sơ y tế
- `PUT /api/benh-nhan/:id/ho-so-y-te` - Cập nhật hồ sơ y tế

### Lịch khám
- `GET /api/lich-kham` - Lấy danh sách lịch khám
- `GET /api/lich-kham/:id` - Lấy chi tiết lịch khám
- `POST /api/lich-kham` - Tạo lịch khám mới
- `PUT /api/lich-kham/:id` - Cập nhật lịch khám
- `DELETE /api/lich-kham/:id` - Xóa lịch khám
- `GET /api/lich-kham/tu-van/all` - Lấy danh sách lịch hẹn tư vấn
- `PUT /api/lich-kham/tu-van/:id` - Cập nhật lịch hẹn tư vấn

### Nhân viên
- `GET /api/nhan-vien` - Lấy danh sách nhân viên
- `GET /api/nhan-vien/:id` - Lấy chi tiết nhân viên
- `POST /api/nhan-vien` - Tạo nhân viên mới
- `PUT /api/nhan-vien/:id` - Cập nhật nhân viên
- `GET /api/nhan-vien/lich-phan-ca/all` - Lấy lịch phân ca
- `POST /api/nhan-vien/lich-phan-ca` - Phân ca làm việc
- `PUT /api/nhan-vien/lich-phan-ca/:id` - Cập nhật lịch phân ca
- `POST /api/nhan-vien/kpi` - Thêm KPI nhân viên

### Dịch vụ
- `GET /api/dich-vu` - Lấy danh sách dịch vụ (public)
- `GET /api/dich-vu/:id` - Lấy chi tiết dịch vụ (public)
- `POST /api/dich-vu` - Tạo dịch vụ mới (cần auth)
- `PUT /api/dich-vu/:id` - Cập nhật dịch vụ (cần auth)
- `DELETE /api/dich-vu/:id` - Xóa dịch vụ (cần auth)

### Sự kiện
- `GET /api/su-kien` - Lấy danh sách sự kiện (public)
- `GET /api/su-kien/:id` - Lấy chi tiết sự kiện (public)
- `POST /api/su-kien` - Tạo sự kiện mới (cần auth)
- `PUT /api/su-kien/:id` - Cập nhật sự kiện (cần auth)
- `DELETE /api/su-kien/:id` - Xóa sự kiện (cần auth)

### Bài viết
- `GET /api/bai-viet` - Lấy danh sách bài viết (public)
- `GET /api/bai-viet/:id` - Lấy chi tiết bài viết (public)
- `POST /api/bai-viet` - Tạo bài viết mới (cần auth)
- `PUT /api/bai-viet/:id` - Cập nhật bài viết (cần auth)
- `DELETE /api/bai-viet/:id` - Xóa bài viết (cần auth)

### Tuyển dụng
- `GET /api/tuyen-dung/tin-tuyen-dung` - Lấy danh sách tin tuyển dụng (public)
- `GET /api/tuyen-dung/tin-tuyen-dung/:id` - Lấy chi tiết tin tuyển dụng (public)
- `POST /api/tuyen-dung/tin-tuyen-dung` - Tạo tin tuyển dụng (cần auth)
- `PUT /api/tuyen-dung/tin-tuyen-dung/:id` - Cập nhật tin tuyển dụng (cần auth)
- `DELETE /api/tuyen-dung/tin-tuyen-dung/:id` - Xóa tin tuyển dụng (cần auth)
- `GET /api/tuyen-dung/ho-so-ung-tuyen` - Lấy danh sách hồ sơ ứng tuyển (cần auth)
- `PUT /api/tuyen-dung/ho-so-ung-tuyen/:id` - Cập nhật hồ sơ ứng tuyển (cần auth)

### Thuốc
- `GET /api/thuoc` - Lấy danh sách đơn thuốc
- `POST /api/thuoc` - Tạo đơn thuốc mới
- `PUT /api/thuoc/:id` - Cập nhật đơn thuốc
- `DELETE /api/thuoc/:id` - Xóa đơn thuốc

### Phòng
- `GET /api/phong` - Lấy danh sách phòng (cần auth)
- `GET /api/phong/benh-nhan/:id` - Lấy phòng theo bệnh nhân (cần auth)
- `POST /api/phong` - Tạo phòng mới (cần auth)
- `PUT /api/phong/:id` - Cập nhật phòng (cần auth)
- `DELETE /api/phong/:id` - Xóa phòng (cần auth)

### Người thân bệnh nhân
- `GET /api/nguoi-than` - Lấy danh sách người thân (cần auth)
- `GET /api/nguoi-than/:id` - Lấy chi tiết người thân (cần auth)
- `POST /api/nguoi-than` - Tạo người thân mới (cần auth)
- `PUT /api/nguoi-than/:id` - Cập nhật người thân (cần auth)
- `DELETE /api/nguoi-than/:id` - Xóa người thân (cần auth)

### Đồ dùng cá nhân
- `GET /api/do-dung` - Lấy danh sách đồ dùng (cần auth)
- `GET /api/do-dung/:id` - Lấy chi tiết đồ dùng (cần auth)
- `POST /api/do-dung` - Tạo đồ dùng mới (cần auth)
- `PUT /api/do-dung/:id` - Cập nhật đồ dùng (cần auth)
- `DELETE /api/do-dung/:id` - Xóa đồ dùng (cần auth)

### Dinh dưỡng
- `GET /api/dinh-duong/thuc-don` - Lấy thực đơn (cần auth)
- `POST /api/dinh-duong/thuc-don` - Tạo thực đơn (cần auth)
- `PUT /api/dinh-duong/thuc-don/:id` - Cập nhật thực đơn (cần auth)
- `DELETE /api/dinh-duong/thuc-don/:id` - Xóa thực đơn (cần auth)
- `GET /api/dinh-duong/hang-ngay` - Lấy dinh dưỡng hàng ngày (cần auth)
- `POST /api/dinh-duong/hang-ngay` - Ghi nhận dinh dưỡng hàng ngày (cần auth)
- `PUT /api/dinh-duong/hang-ngay/:id` - Cập nhật dinh dưỡng hàng ngày (cần auth)
- `DELETE /api/dinh-duong/hang-ngay/:id` - Xóa dinh dưỡng hàng ngày (cần auth)

### Công việc
- `GET /api/cong-viec` - Lấy danh sách công việc (cần auth)
- `POST /api/cong-viec` - Tạo công việc mới (cần auth)
- `PUT /api/cong-viec/:id` - Cập nhật công việc (cần auth)
- `DELETE /api/cong-viec/:id` - Xóa công việc (cần auth)
- `POST /api/cong-viec/phan-cong` - Phân công công việc (cần auth)
- `PUT /api/cong-viec/:id/trang-thai` - Cập nhật trạng thái công việc (cần auth)

### Dashboard
- `GET /api/dashboard` - Lấy dữ liệu dashboard
- `GET /api/dashboard/bao-cao` - Lấy báo cáo

## Phân quyền

- **super_admin**: Toàn quyền
- **quan_ly_y_te**: Quản lý bệnh nhân, lịch khám, thuốc
- **quan_ly_nhan_su**: Quản lý nhân viên, phân ca, KPI, tuyển dụng
- **dieu_duong_truong**: Xem bệnh nhân, cập nhật chăm sóc, giao việc
- **dieu_duong**: Chỉ xem bệnh nhân được giao, cập nhật chỉ số
- **marketing**: Quản lý tin tức, bài viết, sự kiện
- **nguoi_nha**: Xem thông tin bệnh nhân liên quan

## Authentication

Sử dụng JWT token trong header:
```
Authorization: Bearer <token>
```

## Response Format

Tất cả responses đều có format:
```json
{
  "success": true/false,
  "message": "Message",
  "data": {}
}
```
