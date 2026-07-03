# TÀI LIỆU KỸ THUẬT VÀ HƯỚNG DẪN BÀN GIAO HỆ THỐNG
## HỆ THỐNG QUẢN LÝ NHÂN SỰ & CHẤM CÔNG NỘI BỘ GENX PKS

Hệ thống được thiết kế dưới dạng Single Page Application (SPA) xây dựng trên nền tảng **React + Vite + Tailwind CSS**, kết nối bất đồng bộ với **Node.js (Express)** máy chủ và cơ sở dữ liệu **Supabase PostgreSQL**. Hệ thống tối ưu hóa quy trình quản lý nhân sự, tự động hóa chấm công đa phương thức và bảo mật tài liệu số hóa cho doanh nghiệp.

---

## 1. Kiến trúc Hệ thống & Cấu trúc Thư mục

Kiến trúc dự án được phân chia độc lập giữa lớp Giao diện (Frontend) và lớp Máy chủ (Backend):

```mermaid
graph TD
    Client[React SPA Frontend] <-->|HTTPS API / JSON| Server[Node.js Express Backend]
    Server <-->|SQL Queries| DB[(Supabase PostgreSQL)]
```

### 1.1. Cấu trúc Thư mục chính
*   **[api/](./api)**: Chứa toàn bộ mã nguồn Backend của dự án.
    *   **[config/db.js](./api/config/db.js)**: Kết nối cơ sở dữ liệu Supabase PostgreSQL và quản lý câu lệnh DDL khởi tạo cấu trúc bảng (database seeding).
    *   **[middleware/authMiddleware.js](./api/middleware/authMiddleware.js)**: Lớp kiểm soát mã quyền JWT và thẩm định quyền truy cập theo vai trò.
    *   **[controllers/](./api/controllers)**:
        *   [authController.js](./api/controllers/authController.js): Quản lý đăng ký, đăng nhập, khôi phục mật khẩu (OTP) và cập nhật thông tin cá nhân.
        *   [attendanceController.js](./api/controllers/attendanceController.js): Xử lý Check-in / Check-out, xác thực IP & GPS, tính toán giờ công thực tế.
        *   [requestController.js](./api/controllers/requestController.js): Tạo mới, tải danh sách và phê duyệt đơn từ.
        *   [documentController.js](./api/controllers/documentController.js): Lưu trữ tệp tin PDF, xác thực 2FA tải xuống tài liệu Core.
        *   [adminController.js](./api/controllers/adminController.js): CRUD phòng ban, chức vụ, quản lý tài khoản người dùng, kết xuất bảng công.
*   **[src/](./src)**: Chứa mã nguồn Frontend của ứng dụng.
    *   **[context/AppContext.jsx](./src/context/AppContext.jsx)**: Quản lý trạng thái toàn cục (User, Settings, Logs) và đồng bộ song song `Promise.all` với Backend.
    *   **[pages/](./src/pages)**:
        *   [Auth.jsx](./src/pages/Auth.jsx): Trang đăng nhập, đăng ký và khôi phục mật khẩu.
        *   [Dashboard.jsx](./src/pages/Dashboard.jsx): Đồng hồ chấm công, trạng thái ca trực, thống kê tháng và hồ sơ cá nhân.
        *   [Requests.jsx](./src/pages/Requests.jsx): Tạo và theo dõi danh sách đơn từ (Nghỉ phép, Chấm công bù).
        *   [HR.jsx](./src/pages/HR.jsx): Phân hệ quản trị nhân sự (Duyệt thông tin cá nhân, sửa thông tin, cơ cấu phòng ban).
        *   [Accounting.jsx](./src/pages/Accounting.jsx): Phân hệ lưu trữ chứng từ PDF và xác thực 2FA.
        *   [History.jsx](./src/pages/History.jsx): Tra cứu lịch sử công chi tiết của nhân viên.
        *   [Admin.jsx](./src/pages/Admin.jsx): Trang cấu hình chấm công và điều chỉnh lịch sử chấm công thủ công.

---

## 2. Cấu trúc Cơ sở dữ liệu (Database Schema)

Hệ thống sử dụng cơ sở dữ liệu Supabase PostgreSQL với các bảng thông tin sau:

### 2.1. Bảng `users` (Thông tin tài khoản)
Lưu trữ thông tin hồ sơ, thông tin công việc, vai trò và thông tin khôi phục mật khẩu.
*   `employee_id` (VARCHAR(50), Primary Key): Mã số định danh nhân viên (Ví dụ: `NV001`).
*   `full_name` (VARCHAR(100)): Họ và tên nhân viên.
*   `email` (VARCHAR(150), Unique): Email đăng ký.
*   `password` (VARCHAR(255)): Mật khẩu đã mã hóa hoặc dạng lưu trữ thô cho phiên bản thử nghiệm.
*   `role` (VARCHAR(50)): Vai trò người dùng (`Admin`, `HR`, `KeToan`, `NhanVien`).
*   `cccd` (VARCHAR(50)): Số Căn cước công dân.
*   `phone` (VARCHAR(20)): Số điện thoại liên hệ.
*   `address` (TEXT): Địa chỉ thường trú.
*   `start_date` (VARCHAR(50)): Ngày bắt đầu làm việc.
*   `department` (VARCHAR(100)): Phòng ban trực thuộc.
*   `position` (VARCHAR(100)): Chức vụ làm việc.
*   `gender` (VARCHAR(20)): Giới tính (`Nam` / `Nữ`).
*   `dob` (VARCHAR(50)): Ngày tháng năm sinh.
*   `is_profile_complete` (BOOLEAN): Trạng thái hoàn thành hồ sơ cá nhân bắt buộc.
*   `is_blocked` (BOOLEAN): Trạng thái khóa tài khoản.
*   `block_reason` (TEXT): Lý do khóa tài khoản.
*   `document_otp` (VARCHAR(50)): Mã OTP dùng để khôi phục mật khẩu hoặc xác thực 2FA.
*   `document_otp_expires_at` (TIMESTAMP): Thời điểm mã OTP hết hạn.

### 2.2. Bảng `attendance` (Lịch sử chấm công)
*   `id` (SERIAL, Primary Key): ID định danh bản ghi.
*   `employee_id` (VARCHAR(50)): Liên kết mã nhân viên.
*   `date` (VARCHAR(50)): Ngày làm việc (`YYYY-MM-DD`).
*   `shift` (VARCHAR(100)): Ca làm việc thực hiện.
*   `clock_in` (VARCHAR(50)): Giờ Check-in thực tế.
*   `clock_out` (VARCHAR(50)): Giờ Check-out thực tế.
*   `actual_hours` (DECIMAL): Số giờ làm việc tính toán thực tế.
*   `status` (VARCHAR(50)): Trạng thái chấm công (`Hợp lệ`, `Đi muộn`, `Về sớm`, `Nghỉ phép`, `Vắng mặt`).
*   *Ràng buộc độc bản:* Một nhân viên chỉ có tối đa một dòng chấm công trong một ngày cụ thể (`UNIQUE(employee_id, date)`).

### 2.3. Bảng `requests` (Danh sách đơn từ)
*   `id` (SERIAL, Primary Key).
*   `type` (VARCHAR(100)): Loại đơn (`Xin nghỉ phép`, `Giải trình quên check-in`).
*   `from_date` (VARCHAR(50)), `to_date` (VARCHAR(50)).
*   `reason` (TEXT): Lý do nộp đơn.
*   `attachment_name`, `attachment_size`, `attachment_path` (TEXT): Thông tin tệp tin đính kèm chứng minh.
*   `status` (VARCHAR(50)): Trạng thái phê duyệt (`Pending`, `Approved`, `Rejected`).
*   `reject_reason` (TEXT): Lý do từ chối đơn.

### 2.4. Bảng `documents` (Tài liệu kế toán)
*   `id` (SERIAL, Primary Key).
*   `name` (VARCHAR(255)), `type` (VARCHAR(100)).
*   `employee_id` (VARCHAR(50)): Người upload tài liệu.
*   `upload_date` (VARCHAR(50)).
*   `path` (TEXT): Chuỗi base64 tệp tin PDF.
*   `is_core` (BOOLEAN): Trạng thái tài liệu quan trọng (Yêu cầu xác thực 2FA để download).

---

## 3. Ma trận Phân quyền & Bảo mật Đường dẫn

Phân quyền chặt chẽ được thực thi tại cả lớp Giao diện (UI) và lớp Máy chủ (Backend):

| Tính năng | Admin | HR | Kế toán | Nhân viên |
| :--- | :---: | :---: | :---: | :---: |
| Chấm công, xem lịch sử cá nhân, nộp đơn từ | X | X | X | X |
| Đổi vai trò (Role) tài khoản khác | X | | | |
| Khóa tài khoản (Block), Mở khóa | X | | | |
| Cấu hình chấm công (IP, GPS, Grace Period) | X | | | |
| Điều chỉnh lịch sử chấm công thủ công | X | | | |
| Tạo / Xóa / Sửa Phòng ban & Chức vụ | X | X | | |
| Phê duyệt Đơn từ yêu cầu | X | X | | |
| Xem / Tải chứng từ PDF | X | | X | |
| Đăng tải chứng từ PDF | X | | X | |

### 3.1. Bảo mật Router Guard (Frontend)
Hệ thống sử dụng bộ lọc Router Guard tại tệp [App.jsx](./src/App.jsx). Khi có thay đổi đường dẫn URL, Router Guard kiểm tra quyền `currentUser.role`. Nếu phát hiện người dùng truy cập trái thẩm quyền, hệ thống lập tức chuyển hướng về trang `/dashboard`.

### 3.2. Bảo mật Middleware (Backend)
Các Secured Routes tại [index.js](./api/index.js) được bảo vệ bằng middleware kiểm tra JWT [authMiddleware](./api/middleware/authMiddleware.js) và kiểm tra phân quyền `requireRole(['RoleA', 'RoleB'])`.

---

## 4. Nghiệp vụ & Các ràng buộc Logic Cốt lõi

### 4.1. Quy trình Cập nhật Thông tin Bắt buộc (Mandatory Update)
*   Khi nhân viên mới đăng nhập thành công lần đầu tiên, trường `is_profile_complete` là `false`.
*   Một màn hình khóa toàn diện (Mandatory Update Modal) sẽ chặn mọi thao tác trên web và yêu cầu cập nhật hồ sơ cá nhân đầy đủ (Họ tên, SĐT, CCCD, Địa chỉ, Ngày sinh, Giới tính). Khi lưu thành công, trường `is_profile_complete` chuyển sang `true` và mở khóa toàn bộ tính năng.

### 4.2. Cơ chế Chấm công Đa phương thức (WiFi On-site & Geofencing)
*   **WiFi IP văn phòng:** Thiết bị kết nối phải có địa chỉ IP trùng với danh sách IP chi nhánh được Admin cấu hình.
*   **Geofencing GPS:** Khoảng cách vị trí thiết bị so với tọa độ văn phòng (Mặc định: `21.028511, 105.854167`) phải `<=` bán kính cho phép (ví dụ: `100` mét).
*   **Ngoại lệ Ca làm việc Từ xa (Online Shift):**
    *   Nếu nhân viên chọn ca có tên chứa chữ `"online"` (ví dụ: `Ca Online (Làm việc từ xa)`), hệ thống sẽ tự động bỏ qua toàn bộ kiểm tra IP văn phòng và định vị GPS Geofencing.
    *   Tuy nhiên, tại Backend, hệ thống bắt buộc kiểm tra xem nhân viên đó có đơn đề xuất (loại nghỉ phép hoặc đăng ký làm online) ở trạng thái đã phê duyệt (`status = 'Approved'`) bao phủ ngày hôm nay trong bảng `requests` hay không. Nếu không có đơn được duyệt hợp lệ, backend sẽ chặn check-in để đảm bảo tính kỷ luật.
*   **Khóa trạng thái Chọn Ca:**
    *   Hệ thống gợi ý ca làm việc gần nhất dựa theo giờ thực tế.
    *   Sau khi **Check-in** thành công, ô chọn ca bị khóa cứng (read-only) để tránh việc đổi ca làm việc giữa chừng.
    *   Nút Check-in tự động chuyển đổi nhãn phụ sang `[Check-out Tăng Ca]` khi thời gian thực tế `>= 18:00`.
*   **Chống lặp ca (Check-in Lock):** Nếu nhân viên đã thực hiện cả Check-in và Check-out của một ca làm việc cụ thể trong ngày hôm nay, nút Chấm công của ca đó sẽ bị vô hiệu hóa hoàn toàn kèm thông báo `"Ca này đã hoàn thành"`.

### 4.3. Xác thực Hai lớp PDF Core (Accounting 2FA)
*   Đối với các tài liệu quan trọng được đánh dấu `is_core = true` trong phân hệ Kế toán, khi bấm tải xuống (Download), hệ thống kích hoạt bảo mật 2 lớp:
    1.  **Lớp 1:** Nhập mã bảo mật mật khẩu phân hệ (Pass Core).
    2.  **Lớp 2:** Mã xác thực OTP gồm 6 chữ số được gửi qua email (giới hạn thời gian hiệu lực 5 phút). OTP sẽ bị xóa hoàn toàn khỏi DB ngay khi xác thực thành công.

### 4.4. Cơ chế Kết xuất Dữ liệu Bảng công (Export Data)
*   **Xuất CSV / Excel:** Cả Admin (tại Tab Quản trị) và Kế toán (tại Phân hệ Kế toán) đều có thể xuất dữ liệu bảng công ra tệp tin CSV/Excel từ database. Tính năng này tự động áp dụng bộ lọc theo tháng và năm được chỉ định trên bộ lọc giao diện để truy xuất chính xác các dòng chấm công tương ứng trong cơ sở dữ liệu.
*   **Xuất PDF:** Admin có quyền xuất bản in PDF trực quan cho Bảng tổng hợp công Grid Matrix của tháng/năm hiện hành nhờ công cụ in của trình duyệt (A4 khổ ngang Landscape), loại bỏ các CSS định vị cuộn (sticky layout) để trang in đẹp mắt và đầy đủ thông tin nhất.

---

## 5. Quy tắc Kiểm tra Dữ liệu (Validation Rules)

Hệ thống tích hợp quy tắc kiểm tra định dạng nghiêm ngặt tại cả Client và Server:

### 5.1. Kiểm tra Số điện thoại (Phone Validation)
*   Chấp nhận số điện thoại bắt đầu bằng `0`, `84`, hoặc `+84`.
*   Phải thuộc các đầu số nhà mạng Việt Nam: `3`, `5`, `7`, `8`, `9` và theo sau bởi đúng 8 chữ số.

### 5.2. Kiểm tra Căn cước công dân (CCCD Validation)
Hệ thống kiểm tra ngữ nghĩa chuyên sâu dựa theo quy định Bộ Công An Việt Nam:
*   Mã CCCD phải có độ dài đúng 12 chữ số.
*   **Mã Thế kỷ & Giới tính (Chữ số thứ 4):**
    *   Sinh thế kỷ 20 (1900 - 1999): Nam là `0`, Nữ là `1`.
    *   Sinh thế kỷ 21 (2000 - 2099): Nam là `2`, Nữ là `3`.
*   **Mã năm sinh (Chữ số thứ 5 và 6):** Phải trùng khớp tuyệt đối với 2 chữ số cuối của năm sinh trong Ngày sinh (DOB) của nhân sự.

### 5.3. Ràng buộc thời gian tra cứu và đơn từ
*   **Xem lịch sử:** Khoảng cách thời gian lọc (Từ ngày - Đến ngày) bị giới hạn tối đa không quá **31 ngày** để bảo toàn hiệu năng database.
*   **Đơn xin nghỉ phép:** Ngày bắt đầu nghỉ tối thiểu phải từ ngày hiện tại trở đi (`fromDate >= today`).
*   **Đơn chấm công bù:** Ngày xin bù tối đa chỉ được chọn ngày hôm nay hoặc quá khứ (`fromDate <= today`), cấm đăng ký tương lai.
*   **Độ dài lý do:** Lý do đơn từ bắt buộc từ **10 đến 500 ký tự**.
*   **Tệp minh chứng đính kèm:** Chỉ nhận định dạng `.jpg`, `.jpeg`, `.png`, `.pdf` và dung lượng `< 5MB`.

---

## 6. Hướng dẫn Triển khai & Vận hành (Deployment & Setup)

### 6.1. Thiết lập Biến môi trường (`.env`)
Tạo tệp `.env` tại thư mục gốc của dự án với các cấu hình sau:
```env
# Kết nối PostgreSQL (Supabase)
DATABASE_URL=postgresql://postgres.xxx:xxx@xxx.supabase.co:5432/postgres

# Cấu hình JWT mật mã
JWT_SECRET=super_secret_jwt_passphrase_2026

# Email SMTP cấu hình gửi OTP (Sử dụng cấu hình thực hoặc dịch vụ test Ethereal)
SMTP_USER=test@example.com
SMTP_PASS=password

# IP mạng công ty mặc định cho phép chấm công
OFFICE_WIFI_IPS=127.0.0.1,::1,::ffff:127.0.0.1,192.168.1.100
```

### 6.2. Cài đặt và Khởi chạy cục bộ (Local Run)

Hỗ trợ chạy trên cả Windows (PowerShell) và Linux/macOS:

```bash
# 1. Khai báo Node.js cục bộ nếu chạy trong môi trường sandbox của dự án (Tùy chọn)
# Windows: $env:PATH = "c:\path\to\project\.node;" + $env:PATH
# Linux: export PATH="/path/to/project/.node:$PATH"

# 2. Cài đặt các gói phụ thuộc (Dependencies)
npm install

# 3. Khởi chạy song song cả Server và Client ở chế độ Development
npm run dev -- --host
```

### 6.3. Biên dịch cho Production (Build & Deploy)
```bash
# Biên dịch đóng gói Frontend sang thư mục /dist
npm run build

# Khởi chạy ứng dụng production (Hệ thống tự động phát hiện tệp tĩnh trong dist và chạy API server)
npm start
```
Dự án được cấu hình sẵn sàng triển khai Serverless một lần nhấn trên nền tảng **Vercel** thông qua tệp [vercel.json](./vercel.json).