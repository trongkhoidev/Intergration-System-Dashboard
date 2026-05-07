# KỊCH BẢN THUYẾT TRÌNH DỰ ÁN DASHBOARD QUẢN TRỊ TÍCH HỢP

## 1. Mở đầu & Đăng nhập (Thời lượng: 2 phút)
*   **Thao tác trên màn hình:** Mở trang Login, nhập tài khoản Admin.
*   **Nội dung thuyết trình:** 
    *   "Chào thầy/cô và các bạn. Đây là dự án **Hệ thống Quản trị Tích hợp** mà nhóm em đã phát triển."
    *   "Đầu tiên, các bạn có thể thấy trang Đăng nhập được thiết kế theo phong cách **Glassmorphism** với tông màu Hồng Vivid hiện đại."
    *   "Về mặt kỹ thuật, hệ thống sử dụng cơ chế **JWT (JSON Web Token)** để bảo mật. Khi đăng nhập, Backend sẽ kiểm tra thông tin trong cơ sở dữ liệu xác thực (Auth Database) để cấp quyền truy cập."

## 2. Phân quyền người dùng (RBAC) (Thời lượng: 2 phút)
*   **Thao tác trên màn hình:** Trỏ vào Sidebar, giải thích các menu.
*   **Nội dung thuyết trình:** 
    *   "Hệ thống của chúng em triển khai mô hình **Phân quyền dựa trên vai trò (RBAC)**."
    *   "Tùy vào quyền hạn (Admin, HR, hay Payroll) mà Sidebar sẽ hiển thị các chức năng khác nhau. Điều này giúp bảo mật dữ liệu nhạy cảm, ví dụ: nhân sự (HR) sẽ không thể xem được bảng lương chi tiết nếu không được cấp quyền."

## 3. Dashboard Tổng quan (Thời lượng: 3 phút)
*   **Thao tác trên màn hình:** Cuộn trang Dashboard, trỏ vào các Stat Cards và biểu đồ.
*   **Nội dung thuyết trình:** 
    *   "Sau khi đăng nhập thành công, chúng ta sẽ vào trang **Executive Overview**."
    *   "Các thẻ thống kê (**Stat Cards**) được thiết kế theo phong cách **Vivid Pastel**. Nhóm em đã tối ưu hóa trải nghiệm người dùng bằng cách sử dụng **chữ đen độ tương phản cao (#111827)** trên nền màu nhạt, giúp các chỉ số trở nên cực kỳ sắc nét và dễ đọc."
    *   "Biểu đồ phân bổ trạng thái nhân viên cũng được đồng bộ màu sắc: màu **Hồng Vivid** dành riêng cho trạng thái **Thử việc (Probation)**, giúp nhà quản lý nhận diện nhanh tình hình nhân sự mà không cần đọc chi tiết văn bản."

## 4. Các chức năng chính (Admin View) (Thời lượng: 5 phút)
*   **Thao tác trên màn hình:** Đi qua trang Employees, Payroll và Reports.
*   **Nội dung thuyết trình:** 
    *   **Quản lý Nhân sự:** "Chúng em cung cấp một bộ công cụ quản lý nhân viên toàn diện, hỗ trợ từ việc thêm mới đến lọc dữ liệu theo phòng ban."
    *   **Quản lý Lương:** "Module này kết nối với cơ sở dữ liệu MySQL chuyên biệt, hỗ trợ tính toán lương và xuất phiếu lương (Payslip) trực quan."
    *   **Hệ thống Báo cáo:** "Nhóm em đã xây dựng 4 module báo cáo chuyên sâu (HR, Payroll, Attendance, Dividend). Mỗi module đều có khả năng **xuất file PDF/Excel** hỗ trợ tiếng Việt có dấu hoàn hảo cho việc lưu trữ và báo cáo ngoại tuyến."

## 5. Kết nối Dữ liệu & Công nghệ (Thời lượng: 3 phút)
*   **Nội dung thuyết trình:** 
    *   "Về kiến trúc hạ tầng:
        *   **Frontend:** ReactJS + Vite + Bootstrap (Tối ưu tốc độ phản hồi).
        *   **Backend:** Python Flask (Xử lý logic API linh hoạt).
        *   **Database:** Hiện hệ thống đang chạy trên **Railway**, kết nối đồng thời với **SQL Server** (Dữ liệu chính) và **MySQL** (Dữ liệu lương)."
    *   **Luồng dữ liệu:** "Frontend sẽ gửi yêu cầu API kèm theo Token bảo mật -> Backend nhận diện người dùng -> Truy vấn Database thông qua các Driver chuẩn -> Trả về dữ liệu đã được chuẩn hóa để hiển thị lên giao diện."

## 6. Kết luận
*   **Nội dung thuyết trình:** "Dự án không chỉ tập trung vào tính năng quản trị mà còn đặc biệt chú trọng đến sự hài hòa về thẩm mỹ và trải nghiệm người dùng chuyên nghiệp. Cảm ơn thầy/cô và các bạn đã lắng nghe!"
