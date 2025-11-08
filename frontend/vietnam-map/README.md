# Bản Đồ Việt Nam

Ứng dụng web tĩnh hiển thị bản đồ tương tác của Việt Nam với các chức năng:
- Zoom in/out
- Tìm kiếm tỉnh/thành phố
- Click vào tỉnh để xem thông tin chi tiết
- Hiển thị ranh giới hành chính thực tế từ GeoJSON

## Yêu Cầu

- Trình duyệt web (Chrome, Firefox, Edge, Safari)
- Python 3 hoặc Node.js (để chạy local server)
- File GeoJSON (`vn.geojson`) trong thư mục `data/`

## Cài Đặt và Chạy Ứng Dụng

### Bước 1: Chạy Local Server

**Với Python 3:**
```bash
cd frontend/vietnam-map
python -m http.server 8000
```

**Với Python 2:**
```bash
cd frontend/vietnam-map
python -m SimpleHTTPServer 8000
```

**Với Node.js:**
```bash
# Cài đặt http-server (chỉ cần làm một lần)
npm install -g http-server

# Chạy server
cd frontend/vietnam-map
http-server -p 8000
```

**Với PHP:**
```bash
cd frontend/vietnam-map
php -S localhost:8000
```

### Bước 2: Mở Trình Duyệt

Truy cập: `http://localhost:8000`


## 📁 Cấu Trúc Thư Mục

```
vietnam-map/
├── index.html          # File HTML chính
├── styles.css          # File CSS cho styling
├── script.js           # File JavaScript chứa logic bản đồ
├── load-geojson.js     # File JavaScript load và xử lý GeoJSON
├── data/
│   └── vn.geojson      # File GeoJSON chứa ranh giới các tỉnh thành
└── README.md           # File hướng dẫn 
```

## Giải Thích Code

### 1. index.html
- File HTML chứa cấu trúc trang web
- Sử dụng CDN để load Leaflet library (không cần cài đặt)
- Có thanh tìm kiếm và container cho bản đồ
- Load các file JavaScript theo thứ tự: `load-geojson.js` → `script.js`

### 2. styles.css
- Định nghĩa giao diện và màu sắc
- Responsive design (tự động điều chỉnh theo kích thước màn hình)
- Styling cho search box và kết quả tìm kiếm
- Layout flexbox để bản đồ hiển thị đầy đủ

### 3. script.js
- **initMap()**: Khởi tạo bản đồ Leaflet
- **addProvincesLayer()**: Thêm các tỉnh thành lên bản đồ từ GeoJSON
- **setupSearch()**: Thiết lập chức năng tìm kiếm tỉnh thành
- **highlightProvinceOnMap()**: Highlight tỉnh khi tìm kiếm
- **showProvinceInfo()**: Hiển thị thông tin chi tiết của tỉnh

### 4. load-geojson.js
- **loadRealGeoJSONData()**: Load file GeoJSON từ thư mục `data/`
- **processGeoJSONData()**: Xử lý và chuẩn hóa dữ liệu GeoJSON
- **getProvinceCode()**: Helper function lấy mã tỉnh từ tên
- **getProvinceRegion()**: Helper function xác định vùng của tỉnh
- Tự động chuẩn hóa properties (name, code, region) từ GeoJSON

### 5. data/vn.geojson
- File GeoJSON chứa ranh giới hành chính các tỉnh thành Việt Nam
- Format: FeatureCollection với các features là Polygon hoặc MultiPolygon
- Mỗi feature có properties: `ten_tinh`, `ma_tinh`, hoặc các trường tương đương

## Các Thư Viện Sử Dụng

1. **Leaflet.js** (v1.9.4)
   - Thư viện JavaScript mã nguồn mở cho bản đồ web
   - Được load từ CDN, không cần cài đặt
   - Website: https://leafletjs.com/
   - License: BSD 2-Clause

2. **OpenStreetMap**
   - Cung cấp tile maps (bản đồ nền)
   - Miễn phí và mã nguồn mở
   - Website: https://www.openstreetmap.org/

## Tính Năng

### Tìm Kiếm
- Gõ tên tỉnh/thành phố vào ô tìm kiếm
- Hiển thị danh sách gợi ý khi gõ
- Click vào gợi ý để zoom vào tỉnh được chọn
- Hỗ trợ phím tắt: `Enter` để chọn, `Esc` để đóng

### Tương Tác Bản Đồ
- **Zoom**: Sử dụng nút +/- hoặc scroll chuột
- **Hover**: Di chuột qua tỉnh để highlight
- **Click**: Click vào tỉnh để xem thông tin chi tiết và zoom vào

### Hiển Thị Thông Tin
- Tên tỉnh/thành phố
- Mã tỉnh
- Vùng (Đồng bằng sông Hồng, Đông Nam Bộ, v.v.)

## Xử Lý Lỗi

Nếu bản đồ không hiển thị, kiểm tra:

1. **Console của trình duyệt (F12)**
   - Kiểm tra lỗi JavaScript
   - Kiểm tra xem file GeoJSON có được load thành công không

2. **File GeoJSON**
   - Đảm bảo file `vn.geojson` nằm trong thư mục `data/`
   - Đảm bảo file có định dạng GeoJSON hợp lệ

3. **Local Server**
   - Phải chạy qua local server (không mở trực tiếp file HTML)
   - Kiểm tra port 8000 có đang được sử dụng không

4. **Kết nối Internet**
   - Cần kết nối internet để load Leaflet từ CDN
   - Cần kết nối để load tile maps từ OpenStreetMap

## Tùy Chỉnh

### Thay Đổi Màu Sắc Tỉnh Thành
Sửa trong `script.js`, function `defaultStyle()`:
```javascript
fillColor: '#4a90e2',  // Màu nền
color: '#2c3e50',      // Màu viền
```

### Thay Đổi Màu Hover
Sửa trong `script.js`, function `highlightFeature()`:
```javascript
color: '#e74c3c',      // Màu viền khi hover
fillColor: '#e74c3c'   // Màu nền khi hover
```

### Thay Đổi Tile Map
Sửa trong `script.js`, function `initMap()`:
```javascript
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    // Có thể thay bằng các tile layer khác
})
```

## Lưu Ý

- File GeoJSON phải có cấu trúc hợp lệ
- Properties trong GeoJSON có thể là `ten_tinh`, `name`, `NAME`, hoặc `TenTinh`
- Code sẽ tự động chuẩn hóa dữ liệu nếu thiếu `code` hoặc `region`
- Nếu GeoJSON không có tên tỉnh, sẽ tự động tạo tên từ `ma_tinh`