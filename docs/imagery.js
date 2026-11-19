const descriptions={
  "conversation": "Nhóm bạn trò chuyện cùng nhau bên bàn cà phê",
  "routine": "Bữa sáng với cà phê và bánh sừng bò trên bàn gỗ",
  "cafe": "Nhân viên quán cà phê nhận món từ một khách hàng",
  "directions": "Đôi tay cầm bản đồ giấy để tìm đường đi",
  "reading": "Người đọc mở một cuốn sách trước những giá sách thư viện",
  "writing": "Bàn tay viết vào sổ tay bên cạnh bàn phím máy tính",
  "listening": "Người học đeo tai nghe và ghi chép tại bàn học",
  "speaking": "Người nói chuyện trước micro trong phòng thu âm",
  "work": "Đôi tay sử dụng máy tính xách tay tại bàn làm việc",
  "shopping": "Khách hàng lựa chọn rau củ trong siêu thị",
  "transport": "Xe buýt có bảng hiển thị điểm đến tại bến xe",
  "leisure": "Bốn người bạn đi dạo và trò chuyện trong công viên"
};
export const activityPhotos={vocab:'reading',grammar:'writing',shadow:'listening',apply:'speaking'};
export const weekPhotos={1:'conversation',2:'routine',3:'cafe',4:'directions'};
const lessonScenes={
  w1d1:'conversation',w1d2:'directions',w1d3:'work',w1d4:'leisure',w1d5:'listening',w1d6:'conversation',w1d7:'speaking',
  w2d1:'routine',w2d2:'work',w2d3:'shopping',w2d4:'leisure',w2d5:'leisure',w2d6:'routine',w2d7:'conversation',
  w3d1:'cafe',w3d2:'cafe',w3d3:'cafe',w3d4:'shopping',w3d5:'cafe',w3d6:'cafe',w3d7:'cafe',
  w4d1:'directions',w4d2:'directions',w4d3:'directions',w4d4:'transport',w4d5:'directions',w4d6:'transport',w4d7:'directions'
};
export function photo(key){return {src:`./assets/photos/${key}.jpg`,alt:descriptions[key]||'Tình huống giao tiếp hằng ngày',position:({routine:'50% 70%',reading:'50% 65%',speaking:'50% 40%'}[key]||'50% 50%')};}
export function lessonPhoto(id){return photo(lessonScenes[id]||'reading');}

export const photoCredits = [
  {
    "key": "conversation",
    "sourcePage": "https://unsplash.com/photos/friends-are-chatting-and-having-coffee-at-a-cafe-rioA77g2-XU",
    "photographer": "Vitaly Gariev",
    "alt": "Nhóm bạn trò chuyện cùng nhau bên bàn cà phê"
  },
  {
    "key": "routine",
    "sourcePage": "https://unsplash.com/photos/a-wooden-table-topped-with-a-cup-of-coffee-and-a-croissant-t3fml85WJv4",
    "photographer": "Olga Pukhalskaya",
    "alt": "Bữa sáng với cà phê và bánh sừng bò trên bàn gỗ"
  },
  {
    "key": "cafe",
    "sourcePage": "https://unsplash.com/photos/a-barista-takes-an-order-from-a-customer-PhpPpKfxcFY",
    "photographer": "Vitaly Gariev",
    "alt": "Nhân viên quán cà phê nhận món từ một khách hàng"
  },
  {
    "key": "directions",
    "sourcePage": "https://unsplash.com/photos/person-holding-map-D2K1UZr4vxk",
    "photographer": "Sylwia Bartyzel",
    "alt": "Đôi tay cầm bản đồ giấy để tìm đường đi"
  },
  {
    "key": "reading",
    "sourcePage": "https://unsplash.com/photos/a-person-reads-a-book-in-a-library-DIej5OYg_dM",
    "photographer": "Khanh Do",
    "alt": "Người đọc mở một cuốn sách trước những giá sách thư viện"
  },
  {
    "key": "writing",
    "sourcePage": "https://unsplash.com/photos/a-person-writing-on-a-notebook-next-to-a-keyboard-UDY1fa6UHCw",
    "photographer": "Kelly Sikkema",
    "alt": "Bàn tay viết vào sổ tay bên cạnh bàn phím máy tính"
  },
  {
    "key": "listening",
    "sourcePage": "https://unsplash.com/photos/young-woman-wearing-headphones-studying-at-desk-Imz-pn2LMbg",
    "photographer": "Julio Lopez",
    "alt": "Người học đeo tai nghe và ghi chép tại bàn học"
  },
  {
    "key": "speaking",
    "sourcePage": "https://unsplash.com/photos/a-person-sitting-at-a-microphone-z5zTv9QO6QI",
    "photographer": "Luther Yonel",
    "alt": "Người nói chuyện trước micro trong phòng thu âm"
  },
  {
    "key": "work",
    "sourcePage": "https://unsplash.com/photos/person-working-on-a-laptop-at-a-desk-AJ3UrHe9HA8",
    "photographer": "Caroline Badran",
    "alt": "Đôi tay sử dụng máy tính xách tay tại bàn làm việc"
  },
  {
    "key": "shopping",
    "sourcePage": "https://unsplash.com/photos/people-shopping-for-produce-in-grocery-Z3eWeJkthM4",
    "photographer": "proudlyswazi",
    "alt": "Khách hàng lựa chọn rau củ trong siêu thị"
  },
  {
    "key": "transport",
    "sourcePage": "https://unsplash.com/photos/modern-bus-with-destination-display-at-station-6H-ktrx5oRM",
    "photographer": "Jošua Bird",
    "alt": "Xe buýt có bảng hiển thị điểm đến tại bến xe"
  },
  {
    "key": "leisure",
    "sourcePage": "https://unsplash.com/photos/four-friends-walking-together-in-a-park-ymczKuCuf84",
    "photographer": "Vitaly Gariev",
    "alt": "Bốn người bạn đi dạo và trò chuyện trong công viên"
  }
];
