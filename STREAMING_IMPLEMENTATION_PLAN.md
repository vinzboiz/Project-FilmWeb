KẾ HOẠCH NÂNG CẤP HỆ THỐNG STREAMING BẢO MẬT (HLS & AES-128)
📌 NGUYÊN TẮC CỐT LÕI (IMPORTANT)
KHÔNG sửa đổi logic Database hiện tại (Trừ việc cập nhật trường video_url).

KHÔNG làm ảnh hưởng đến các chức năng: Auth, CRUD Movie, UI/UX hiện có.

CHỈ BỔ SUNG lớp xử lý (Service) và các cấu hình bảo mật.

🛠 BƯỚC 1: CẤU HÌNH HẠ TẦNG (BACKEND - SPRING BOOT)
1.1 Cấu hình Lưu trữ & Resource Mapping
Mục tiêu: Tách biệt file gốc (.mp4) và file đã băm (.m3u8, .ts).

Nhiệm vụ cho AI:

Cấu hình application.properties:

app.storage.original: Thư mục chứa file gốc (Nằm ngoài thư mục static, cấm truy cập URL).

app.storage.hls: Thư mục chứa file đã băm (Nằm trong static hoặc map qua ResourceHandler).

Cập nhật WebConfig.java: Map URL /hls/** tới thư mục app.storage.hls.

1.2 Viết VideoProcessService (Dùng FFmpeg)
Mục tiêu: Tự động hóa việc băm video.

Nhiệm vụ cho AI:

Tạo Service xử lý bằng @Async để không làm treo server khi Admin upload.

Sử dụng lệnh FFmpeg để:

Chia nhỏ video thành các đoạn 5 giây (-hls_time 5).

Mã hóa AES-128 cho các file .ts.

Tạo file index.m3u8.

Sau khi băm xong, tự động cập nhật videoUrl trong DB từ .mp4 sang .m3u8.

🛡 BƯỚC 2: BẢO MẬT CHỐNG TẢI LẬU (SECURITY)
2.1 API Cấp phát Chìa khóa (Key Delivery)
Nhiệm vụ cho AI:

Tạo KeyManagementController với endpoint /api/v1/streaming/key.

Kiểm tra JWT Token của người dùng trước khi trả về nội dung file .key.

Chỉ cho phép tải Key nếu User hợp lệ.

2.2 Content-Type Filter
Nhiệm vụ cho AI:

Cấu hình Header cho các file trả về từ /hls/**:

.m3u8 => application/x-mpegURL

.ts => video/MP2T

💻 BƯỚC 3: TRÌNH PHÁT VIDEO BẢO MẬT (FRONTEND - REACT/VUE)
3.1 Tích hợp thư viện Hls.js
Nhiệm vụ cho AI:

Tạo Component HlsPlayer. KHÔNG dùng thuộc tính src trực tiếp trong thẻ <video>.

Sử dụng hls.loadSource(url) để nạp file .m3u8.

Cấu hình xhrSetup để tự động đính kèm Token vào Header mỗi khi trình duyệt xin file Key hoặc file .ts.

3.2 Chống tải thủ công (Basic Protection)
Nhiệm vụ cho AI:

Thêm Event Listener để cấm chuột phải (contextmenu) trên vùng Video.

Thêm controlsList="nodownload" vào thẻ <video>.

Chặn các phím tắt F12 (tùy chọn) hoặc ít nhất là ẩn các nút tải mặc định của trình duyệt.

🔄 BƯỚC 4: TỰ ĐỘNG HÓA KHI ADMIN UPLOAD
Nhiệm vụ cho AI:

Cập nhật hàm saveVideo trong UploadService.

Quy trình: Lưu file gốc vào folder Private -> Kích hoạt Async VideoProcessService -> Trả về thông báo cho Admin thành công.

Hệ thống sẽ tự chạy ngầm để băm video và người dùng chỉ thấy phim khi trạng thái chuyển sang "Ready" (hoặc khi file .m3u8 đã tồn tại).

🧪 KỊCH BẢN KIỂM TRA (TESTING)
Admin: Upload 1 file .mp4 bất kỳ.

Hệ thống: Tự băm thành hàng trăm file .ts trong thư mục hls/.

Người dùng:

Xem phim mượt mà.

Chuột phải: Bị chặn.

Cốc Cốc/IDM: Nếu bắt được link, chỉ tải được 1 mảnh 5 giây không có hình (do mã hóa).

F12: Thấy hàng ngàn file .ts, không thể tải hết và ghép lại thủ công."Hãy đọc file STREAMING_IMPLEMENTATION_PLAN.md. Trước tiên, hãy thực hiện BƯỚC 1.1 và 1.2. Hãy giữ nguyên các code cũ, chỉ bổ sung logic mới."