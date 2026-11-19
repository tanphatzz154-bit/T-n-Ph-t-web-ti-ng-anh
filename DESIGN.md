# Ocean glass · 19/11/2026

Thiết kế lấy cảm hứng từ ảnh đại dương do người dùng cung cấp: xanh cyan và xanh biển sâu, viền kính sáng, góc bo mềm, lớp kính mờ. Thanh điều hướng dùng kính tối; vùng đọc bài dùng kính sáng có độ đục cao để giữ độ tương phản. Thẻ đầu trang mở ra khung cảnh đại dương. Nội dung bài học, dữ liệu tiến độ, biểu tượng cá nhân và quyền truy cập được giữ nguyên.

Theme: `docs/ocean-glass.css`, nạp sau CSS cấu trúc hiện có. Có fallback khi không hỗ trợ backdrop-filter, hỗ trợ reduced transparency và reduced motion.

## Video và chuyển động nước

`docs/videos.css` bổ sung phòng xem riêng trong menu **Tấn Phát**, chỉ hiện trình phát video ở giữa trang, trong viền kính mỏng. Không có tiêu đề, mô tả, danh sách hay biểu mẫu ở trang xem. Phần thêm/chọn/gỡ video được đặt trong Cài đặt. Giao diện điều khiển gốc của YouTube vẫn giữ nguyên. Video người dùng cung cấp: https://youtube.com/shorts/73qQ6nag6F8, tiêu đề “Cây ami cảnh”, tác giả “Nguyễn Tấn Phát”, xác minh qua YouTube oEmbed.

`docs/ocean-motion.css` tạo các lớp ánh nắng dưới nước, gợn caustic trôi chậm, bọt khí rất nhỏ và phản sáng ngang thẻ hero. Chuyển động chỉ dùng transform/opacity, không làm chuyển động chữ. Có nút bật/tắt, lưu lựa chọn, hỗ trợ reduced motion, tạm dừng khi trang ẩn và giảm cường độ trong mục video.

## Ảnh nền

- Tệp: `docs/assets/ocean-study-room.png`
- Kích thước: 1672 × 941 px.
- Tạo bằng công cụ ImageGen tích hợp; không dùng CLI.
- Ảnh người dùng là tham chiếu về màu sắc và không khí, không sao chép chữ/nhãn hiệu trong ảnh.

Prompt cuối:

> 16:9 wide website wallpaper for a calm English study dashboard behind translucent liquid-glass cards. Original cinematic painterly anime-inspired underwater train / aquarium lounge. Deep ocean blue interior curves, rounded glass windows on the right, luminous cyan ocean, subtle fish, soft sunbeams and caustics. Calm spacious center and left, luminous detail toward right. Dreamy, serene, glossy glass. No people, text, lettering, logos, watermark, UI or collage frames.
