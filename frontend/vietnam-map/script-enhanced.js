let map;
let provincesLayer;
let selectedProvince = null;
let provinceMarkers = [];

// Tọa độ trung tâm các tỉnh thành Việt Nam (latitude, longitude)
const provinceCenters = {
    "Hà Nội": [21.0285, 105.8542],
    "Hồ Chí Minh": [10.8231, 106.6297],
    "Đà Nẵng": [16.0544, 108.2022],
    "Hải Phòng": [20.8449, 106.6881],
    "Cần Thơ": [10.0452, 105.7469],
    "An Giang": [10.5216, 105.1259],
    "Bà Rịa - Vũng Tàu": [10.5417, 107.2420],
    "Bắc Giang": [21.2737, 106.1946],
    "Bắc Kạn": [22.1470, 105.8348],
    "Bạc Liêu": [9.2941, 105.7277],
    "Bắc Ninh": [21.1861, 106.0763],
    "Bến Tre": [10.2434, 106.3756],
    "Bình Định": [13.7696, 109.2319],
    "Bình Dương": [11.3254, 106.4774],
    "Bình Phước": [11.6471, 106.6059],
    "Bình Thuận": [10.9287, 108.1021],
    "Cà Mau": [9.1769, 105.1520],
    "Cao Bằng": [22.6638, 106.2601],
    "Đắk Lắk": [12.7104, 108.2378],
    "Đắk Nông": [12.0041, 107.6875],
    "Điện Biên": [21.3924, 103.0167],
    "Đồng Nai": [10.9574, 106.8429],
    "Đồng Tháp": [10.4930, 105.6881],
    "Gia Lai": [13.9718, 108.0153],
    "Hà Giang": [22.8233, 104.9833],
    "Hà Nam": [20.5411, 105.9229],
    "Hà Tĩnh": [18.3428, 105.9057],
    "Hải Dương": [20.9373, 106.3146],
    "Hậu Giang": [9.7845, 105.4701],
    "Hòa Bình": [20.8136, 105.3383],
    "Hưng Yên": [20.6464, 106.0511],
    "Khánh Hòa": [12.2388, 109.1967],
    "Kiên Giang": [9.9580, 105.1335],
    "Kon Tum": [14.3545, 108.0074],
    "Lai Châu": [22.3969, 103.4558],
    "Lâm Đồng": [11.9404, 108.4583],
    "Lạng Sơn": [21.8536, 106.7612],
    "Lào Cai": [22.3402, 103.8448],
    "Long An": [10.6596, 106.4140],
    "Nam Định": [20.4208, 106.1687],
    "Nghệ An": [18.6796, 105.6813],
    "Ninh Bình": [20.2506, 105.9744],
    "Ninh Thuận": [11.5637, 108.9880],
    "Phú Thọ": [21.3015, 105.2046],
    "Phú Yên": [13.0880, 109.0929],
    "Quảng Bình": [17.4680, 106.6227],
    "Quảng Nam": [15.8800, 108.3380],
    "Quảng Ngãi": [15.1169, 108.8046],
    "Quảng Ninh": [21.0064, 107.2925],
    "Quảng Trị": [16.7500, 107.1833],
    "Sóc Trăng": [9.6025, 105.9739],
    "Sơn La": [21.3257, 103.9160],
    "Tây Ninh": [11.3104, 106.0979],
    "Thái Bình": [20.4465, 106.3366],
    "Thái Nguyên": [21.5942, 105.8480],
    "Thanh Hóa": [19.8067, 105.7852],
    "Thừa Thiên Huế": [16.4637, 107.5909],
    "Tiền Giang": [10.3600, 106.3600],
    "Trà Vinh": [9.9347, 106.3453],
    "Tuyên Quang": [21.8233, 105.2185],
    "Vĩnh Long": [10.2537, 105.9722],
    "Vĩnh Phúc": [21.3087, 105.6049],
    "Yên Bái": [21.7051, 104.8697]
};

// Thông tin các tỉnh
const provinceInfo = {
    "Hà Nội": { code: "HN", region: "Đồng bằng sông Hồng" },
    "Hồ Chí Minh": { code: "HCM", region: "Đông Nam Bộ" },
    "Đà Nẵng": { code: "DN", region: "Duyên hải Nam Trung Bộ" },
    "Hải Phòng": { code: "HP", region: "Đồng bằng sông Hồng" },
    "Cần Thơ": { code: "CT", region: "Đồng bằng sông Cửu Long" },
    "An Giang": { code: "AG", region: "Đồng bằng sông Cửu Long" },
    "Bà Rịa - Vũng Tàu": { code: "BR-VT", region: "Đông Nam Bộ" },
    "Bắc Giang": { code: "BG", region: "Đông Bắc Bộ" },
    "Bắc Kạn": { code: "BK", region: "Đông Bắc Bộ" },
    "Bạc Liêu": { code: "BL", region: "Đồng bằng sông Cửu Long" },
    "Bắc Ninh": { code: "BN", region: "Đồng bằng sông Hồng" },
    "Bến Tre": { code: "BT", region: "Đồng bằng sông Cửu Long" },
    "Bình Định": { code: "BD", region: "Duyên hải Nam Trung Bộ" },
    "Bình Dương": { code: "BDU", region: "Đông Nam Bộ" },
    "Bình Phước": { code: "BP", region: "Đông Nam Bộ" },
    "Bình Thuận": { code: "BTH", region: "Duyên hải Nam Trung Bộ" },
    "Cà Mau": { code: "CM", region: "Đồng bằng sông Cửu Long" },
    "Cao Bằng": { code: "CB", region: "Đông Bắc Bộ" },
    "Đắk Lắk": { code: "DL", region: "Tây Nguyên" },
    "Đắk Nông": { code: "DNO", region: "Tây Nguyên" },
    "Điện Biên": { code: "DB", region: "Tây Bắc Bộ" },
    "Đồng Nai": { code: "DNA", region: "Đông Nam Bộ" },
    "Đồng Tháp": { code: "DT", region: "Đồng bằng sông Cửu Long" },
    "Gia Lai": { code: "GL", region: "Tây Nguyên" },
    "Hà Giang": { code: "HG", region: "Đông Bắc Bộ" },
    "Hà Nam": { code: "HNA", region: "Đồng bằng sông Hồng" },
    "Hà Tĩnh": { code: "HT", region: "Bắc Trung Bộ" },
    "Hải Dương": { code: "HD", region: "Đồng bằng sông Hồng" },
    "Hậu Giang": { code: "HGI", region: "Đồng bằng sông Cửu Long" },
    "Hòa Bình": { code: "HB", region: "Tây Bắc Bộ" },
    "Hưng Yên": { code: "HY", region: "Đồng bằng sông Hồng" },
    "Khánh Hòa": { code: "KH", region: "Duyên hải Nam Trung Bộ" },
    "Kiên Giang": { code: "KG", region: "Đồng bằng sông Cửu Long" },
    "Kon Tum": { code: "KT", region: "Tây Nguyên" },
    "Lai Châu": { code: "LC", region: "Tây Bắc Bộ" },
    "Lâm Đồng": { code: "LD", region: "Tây Nguyên" },
    "Lạng Sơn": { code: "LS", region: "Đông Bắc Bộ" },
    "Lào Cai": { code: "LCA", region: "Tây Bắc Bộ" },
    "Long An": { code: "LA", region: "Đồng bằng sông Cửu Long" },
    "Nam Định": { code: "ND", region: "Đồng bằng sông Hồng" },
    "Nghệ An": { code: "NA", region: "Bắc Trung Bộ" },
    "Ninh Bình": { code: "NB", region: "Đồng bằng sông Hồng" },
    "Ninh Thuận": { code: "NT", region: "Duyên hải Nam Trung Bộ" },
    "Phú Thọ": { code: "PT", region: "Đông Bắc Bộ" },
    "Phú Yên": { code: "PY", region: "Duyên hải Nam Trung Bộ" },
    "Quảng Bình": { code: "QB", region: "Bắc Trung Bộ" },
    "Quảng Nam": { code: "QNA", region: "Duyên hải Nam Trung Bộ" },
    "Quảng Ngãi": { code: "QNG", region: "Duyên hải Nam Trung Bộ" },
    "Quảng Ninh": { code: "QNI", region: "Đông Bắc Bộ" },
    "Quảng Trị": { code: "QT", region: "Bắc Trung Bộ" },
    "Sóc Trăng": { code: "ST", region: "Đồng bằng sông Cửu Long" },
    "Sơn La": { code: "SL", region: "Tây Bắc Bộ" },
    "Tây Ninh": { code: "TN", region: "Đông Nam Bộ" },
    "Thái Bình": { code: "TB", region: "Đồng bằng sông Hồng" },
    "Thái Nguyên": { code: "TNG", region: "Đông Bắc Bộ" },
    "Thanh Hóa": { code: "TH", region: "Bắc Trung Bộ" },
    "Thừa Thiên Huế": { code: "TTH", region: "Bắc Trung Bộ" },
    "Tiền Giang": { code: "TGI", region: "Đồng bằng sông Cửu Long" },
    "Trà Vinh": { code: "TV", region: "Đồng bằng sông Cửu Long" },
    "Tuyên Quang": { code: "TQ", region: "Đông Bắc Bộ" },
    "Vĩnh Long": { code: "VL", region: "Đồng bằng sông Cửu Long" },
    "Vĩnh Phúc": { code: "VP", region: "Đồng bằng sông Hồng" },
    "Yên Bái": { code: "YB", region: "Tây Bắc Bộ" }
};

// Hàm khởi tạo bản đồ
function initMap() {
    map = L.map('map').setView([16.0, 108.0], 6);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        minZoom: 5
    }).addTo(map);
    
    // Tải GeoJSON từ file
    loadProvincesData();
    
    setupSearch();
}

// Hàm tải dữ liệu tỉnh thành
function loadProvincesData() {
    if (typeof vietnamProvincesData !== 'undefined' && vietnamProvincesData.features.length > 0) {
        // Sử dụng GeoJSON
        addProvincesLayer();
    } else {
        // Sử dụng markers
        addProvinceMarkers();
    }
}

// Hàm thêm markers cho các tỉnh (fallback)
function addProvinceMarkers() {
    Object.keys(provinceCenters).forEach(provinceName => {
        const center = provinceCenters[provinceName];
        const info = provinceInfo[provinceName];
        
        const marker = L.marker(center).addTo(map);
        
        marker.bindPopup(`
            <div style="text-align: center;">
                <h3 style="color: #667eea; margin-bottom: 10px;">${provinceName}</h3>
                <p><strong>Mã tỉnh:</strong> ${info.code}</p>
                <p><strong>Vùng:</strong> ${info.region}</p>
            </div>
        `);
        
        marker.on('click', function() {
            showProvinceInfo({ name: provinceName, ...info });
            map.setView(center, 8);
        });
        
        provinceMarkers.push({
            name: provinceName,
            marker: marker,
            center: center,
            info: info
        });
    });
}

document.addEventListener('DOMContentLoaded', initMap);