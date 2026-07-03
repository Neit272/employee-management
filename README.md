# HỆ THỐNG QUẢN LÝ NHÂN SỰ & CHẤM CÔNG NỘI BỘ GENX PKS

---

## 1. Mô tả Tổng Quan Hệ Thống

Hệ thống được thiết kế dưới dạng Single Page Application (SPA) xây dựng trên nền tảng **React + Vite + Tailwind CSS**, tích hợp mô phỏng Firebase Logs và đồng bộ hóa đa tab (Real-time Broadcast Channel) để đem lại trải nghiệm vận hành thực tế.

- **Phong cách thiết kế:** Kính mờ (Glassmorphic) kết hợp 3 luồng cầu lỏng (Liquid Blobs) chuyển động mượt mà ở nền.
- **Tính năng thích ứng:** Hỗ trợ đầy đủ **Chế độ Sáng / Tối (Light / Dark Mode)** và tương thích giao diện di động (Responsive Web).
- **Bảo mật mô phỏng:** Kiểm tra tính hợp lệ của địa chỉ IP Wifi chi nhánh và tọa độ GPS thực tế của thiết bị trước khi cho phép chấm công.

---

## 2. Vai Trò Nhân Sự & Phân Quyền (Permissions Matrix)

Hệ thống áp dụng cơ chế phân quyền nghiêm ngặt theo phân cấp vai trò:

### 2.1. Admin (Quản trị Hệ thống)

*Quyền hạn cao nhất toàn hệ thống, chịu trách nhiệm quản trị vận hành.*

- **Quản lý cấu hình chấm công:** Thiết lập danh sách các địa chỉ IP Wifi hợp lệ (nhiều chi nhánh), bán kính GPS cho phép (mét) và thời gian đi muộn cho phép (grace period).
- **Phê duyệt phân quyền:** Có quyền nâng/hạ quyền của bất kỳ tài khoản nào nằm dưới cấp Admin (HR, Kế toán, Nhân viên).
- **Ràng buộc an toàn:** Hệ thống tự động chặn Admin tự hạ quyền của chính mình hoặc hạ quyền của các tài khoản Admin khác.
- **Khóa tài khoản:** Có quyền khóa tài khoản nhân sự và bắt buộc nhập lý do khóa (Nghỉ việc, Vi phạm chính sách,...). Lý do khóa được hiển thị chi tiết dưới thẻ trạng thái.
- **Xem nhật ký:** Truy cập bảng điều khiển hệ thống, xem nhật ký kiểm toán (Firebase Audit Logs).

### 2.2. HR (Quản lý Nhân sự)

*Phụ trách quản trị cơ cấu phòng ban và hồ sơ nhân sự.*

- **Quản lý tổ chức:** Thêm mới, chỉnh sửa hoặc xóa bỏ các Phòng ban và Chức vụ trong công ty.
- **Quản lý hồ sơ:** Chỉnh sửa thông tin hồ sơ của nhân sự có phân quyền bằng hoặc thấp hơn mình.
- **Ràng buộc phân quyền:**
  - **Khóa quyền sửa vai trò (Role):** HR hoàn toàn không được quyền nâng/hạ cấp vai trò (Role) của nhân sự khác (trường chọn vai trò sẽ bị khóa read-only). HR chỉ được phép sửa Phòng ban, Chức vụ và thông tin cá nhân.
  - **Bảo vệ ngang hàng:** HR không được giảm quyền của nhân sự quản lý ngang hàng khác (như Kế toán hoặc HR khác) xuống thành Nhân viên thường.

### 2.3. Kế toán (KeToan)

*Phụ trách tổng hợp dữ liệu công và thông tin tính lương.*

- **Quản lý kế toán:** Truy cập Phân hệ Kế toán để xem bảng tổng hợp ngày công, bộ lọc phòng ban/chức vụ, và tổng hợp số phút đi trễ/về sớm của từng nhân viên.
- **Quản lý hồ sơ:** Đọc thông tin hợp đồng và cấu trúc lương của nhân sự.

### 2.4. Nhân viên (NhanVien)

*Người dùng cuối sử dụng hệ thống để phục vụ công việc hàng ngày.*

- **Chấm công:** Thực hiện Check-in / Check-out ca làm việc được đăng ký.
- **Xem lịch sử:** Xem lịch sử chấm công cá nhân, lọc dữ liệu theo tháng/năm/trạng thái bằng bộ lọc kính mờ nâng cao.
- **Đơn từ yêu cầu:** Tạo yêu cầu sửa công (check-in correction) hoặc đơn xin nghỉ phép gửi lên cấp quản lý duyệt.
- **Hồ sơ cá nhân:** Xem và chỉnh sửa thông tin cá nhân (Họ tên, SĐT, Số CCCD, Ngày sinh, Địa chỉ).

---

## 3. Luồng Hoạt Động Chính (Core Workflows)

### 3.1. Luồng Đăng nhập & Khôi phục Mật khẩu (Forgot Password)

1. **Đăng nhập:** Người dùng đăng nhập bằng Email và Mật khẩu. Hỗ trợ bảng mô phỏng tài khoản nhanh ở góc phải để chuyển đổi vai trò kiểm thử.
2. **Khôi phục mật khẩu (2 bước):**
   - **Bước 1:** Nhấp vào "Quên mật khẩu", nhập Email. Hệ thống kiểm tra tính tồn tại của email. Nếu đúng, hệ thống gửi mã OTP gồm 6 chữ số (mô phỏng ngay trên màn hình và ghi nhận vào Firebase Logs).
   - **Bước 2:** Nhập mã OTP chính xác cùng mật khẩu mới (tối thiểu 6 ký tự). Sau khi xác nhận thành công, mật khẩu sẽ được cập nhật và người dùng được đưa về màn hình đăng nhập.

### 3.2. Luồng Chấm công & Xác thực Kỹ thuật (Attendance Flow)

1. **Lựa chọn ca làm việc:** Hệ thống tự động phân tích thời gian thực tế để đề xuất ca làm việc gần nhất. Người dùng có thể chọn ca khác nếu chưa Check-in.
2. **Xác thực điều kiện:**
   - **Kiểm tra IP:** Thiết bị phải kết nối tới địa chỉ IP nằm trong danh sách Wifi được Admin cấu hình.
   - **Kiểm tra GPS:** Khoảng cách định vị thực tế của thiết bị so với tọa độ văn phòng phải nhỏ hơn bán kính cho phép.
3. **Thực hiện Chấm công:**
   - Khi bấm **Check-in**, hệ thống tạo bản ghi chấm công "Đang làm việc" và khóa tính năng chọn ca.
   - Khi bấm **Check-out**, hệ thống tính toán tổng số giờ làm việc thực tế và xác định trạng thái công (Hợp lệ, Đi muộn, Về sớm).

### 3.3. Luồng Quản lý Yêu cầu & Đơn từ (Leave/Correction Requests)

1. **Tạo yêu cầu:** Nhân viên gửi yêu cầu xin nghỉ phép hoặc xin sửa giờ chấm công.
2. **Xử lý trung gian:** Đơn từ được đẩy vào hàng chờ duyệt chung.
3. **Phê duyệt:** Quản lý (Admin hoặc bộ phận có thẩm quyền) xem chi tiết đơn từ, nhấn **Duyệt** hoặc **Từ chối**. Khi được duyệt, hệ thống tự động đồng bộ hóa thông tin và gửi thông báo Real-time cho nhân viên.

---

## 4. Quy tắc Kiểm tra Dữ liệu Hệ thống (Validation Rules)

- **Số điện thoại di động (Phone):** Kiểm tra chuẩn định dạng di động Việt Nam (10 chữ số, bắt đầu bằng các đầu số nhà mạng phổ biến như `03`, `05`, `07`, `08`, `09`).
- **Mã định danh công dân (CCCD):** Yêu cầu nhập đúng 12 chữ số quốc gia.
- **Ngày tháng hiển thị:** Định dạng chuẩn hóa thống nhất toàn hệ thống theo kiểu **DD/MM/YYYY** (Ví dụ: `03/07/2026`).

---

## 5. Hướng dẫn Chạy dự án (Local Run)

Do môi trường chạy không có biến môi trường `npm` toàn cục, bạn cần khai báo đường dẫn Node.js cục bộ trước khi khởi chạy:

```powershell
# 1. Khai báo biến môi trường Node.js (Chạy trên Windows PowerShell)
$env:PATH = "c:\Users\Tri\OneDrive\Documents\GitHub\employee-management\.node;" + $env:PATH

# 2. Khởi chạy dự án ở chế độ phát triển
npm run dev -- --host
```

Dự án sẽ khởi chạy môi trường phát triển local server (mặc định tại cổng `5173`) hỗ trợ truy cập mạng nội bộ (`--host`) để bạn có thể test trực tiếp giao diện từ điện thoại cá nhân.