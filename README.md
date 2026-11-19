# Tấn Phát đang học tiếng Anh

Website học cá nhân bằng tiếng Việt, tập trung giao tiếp cơ bản, 30 phút mỗi ngày.

## Chức năng

- Mục **Tấn Phát** chỉ hiện trình phát YouTube trực tiếp, mặc định [video của Phát](https://www.youtube.com/watch?v=MKsNBLssYyM). Video mặc định cũ được thay khi đọc dữ liệu đã lưu hoặc bản sao lưu; giữ nguyên tiến độ và các video khác. Thêm video bằng link Shorts/watch/youtu.be, đặt tên, chọn hoặc gỡ video trong **Cài đặt**. Gỡ chỉ xóa mục lưu trên website, không xóa video YouTube. Video mới lưu trên trình duyệt, đi kèm bản sao lưu hiện có; không tự đồng bộ giữa thiết bị.
- Hiệu ứng đại dương gồm vệt nắng, gợn sáng, bọt khí nhỏ và phản sáng trên thẻ chính. Nút **Sóng nước** bật/tắt mà không tải lại trình phát. Tự tắt theo `prefers-reduced-motion`, dừng khi trang bị ẩn và dịu hơn trong mục video.
- 4 chủ đề tuần, 28 bài: làm quen, sinh hoạt hằng ngày, gọi món, hỏi đường.
- Thẻ từ có câu ví dụ và lịch ôn 10 phút / 1 / 3 / 7 / 14 / 30 ngày tùy kết quả. Buổi mới ưu tiên tối đa 10 từ đến hạn trước từ mới, có thể bỏ qua. Luyện sớm không làm tăng bậc ôn.
- 84 câu hỏi khác nhau kèm giải thích; hoàn thành ít nhất 2/3 câu trong bài. Ngày 6–7 mỗi tuần có câu điền từ và bài tự viết với mẫu/tiêu chí đối chiếu.
- Tiếp tục đúng thẻ/câu đang học, giữ đáp án, bản nháp và lựa chọn luyện nói theo từng bài sau khi tải lại trang.
- Shadowing: giọng đọc của thiết bị, tốc độ, lặp câu, ẩn/hiện lời thoại và nghĩa. Tự chọn mức hỗ trợ hoặc dùng gợi ý dựa trên ba lượt luyện gần đây và mức sử dụng lời thoại khi nghe; tự đánh giá dễ không tự chứng minh đã luyện độc lập.
- Thu âm tối đa 2 phút, nghe lại và tải xuống. Cần HTTPS hoặc localhost và người dùng cấp quyền micro.
- Tiến độ trong localStorage; bản thu gần nhất của mỗi bài trong IndexedDB. Có nhắc sao lưu, xuất/nhập JSON gồm bài làm dở, tương thích bản sao lưu cũ. Chưa có đồng bộ giữa thiết bị hay chấm điểm phát âm bằng AI.
- Giao diện kính mờ xanh đại dương, responsive trên điện thoại, nút khôi phục dùng được bằng bàn phím, chuyển focus theo nội dung khi lật thẻ/chấm bài. Chi tiết theme và ảnh nền được ghi trong `DESIGN.md`.

## Chạy cục bộ

Node.js 20 trở lên. Không cần cài thư viện.

```sh
node server.mjs
node --test tests/*.test.mjs
```

Mở http://127.0.0.1:4173; có thể đặt biến `PORT` để thử với dữ liệu trình duyệt riêng ở cổng khác. Nguồn tĩnh trong `docs/`. Nội dung học trong `docs/curriculum.js`; quy tắc tiến độ trong `docs/learning.js`, `docs/study-flow.js`; kiểm tra phiên học dở trong `docs/study-session.js`.

Bản GitHub Pages được xuất từ website Sites, giữ nguyên nội dung và chức năng.

## Website công khai

https://tanphatzz154-bit.github.io/T-n-Ph-t-web-ti-ng-anh/

GitHub Pages dùng nhánh `main`, thư mục `/docs`. Cập nhật các tệp trong `docs/` để cập nhật website. Không cần cài thư viện hoặc chạy build.

Mỗi người có tiến độ học riêng trong trình duyệt. Khi chuyển từ trang Sites, vào **Cài đặt** ở trang cũ để xuất bản sao lưu, rồi nhập trên trang GitHub Pages. Bản thu âm cần tải xuống riêng; dữ liệu không tự đồng bộ giữa các thiết bị.

## Giới hạn đã biết

Giọng tiếng Anh phụ thuộc hệ điều hành/trình duyệt; font dùng Google Fonts và có font hệ thống dự phòng. Nội dung là bộ bài khởi đầu, không phải đánh giá CEFR chính thức. Phần nói do người học tự xác nhận.

Video dùng iframe YouTube privacy-enhanced (`youtube-nocookie.com`), không tự phát. Khả năng phát phụ thuộc video còn tồn tại và cho phép nhúng; luôn có đường dẫn mở trên YouTube. URL nhập được kiểm tra máy chủ và video ID trước khi tạo iframe. Tham khảo: https://developers.google.com/youtube/player_parameters.
