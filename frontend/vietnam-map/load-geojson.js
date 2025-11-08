function loadRealGeoJSONData() {
    const filePath = './data/vn.geojson';

    return fetch(filePath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Không thể tải file: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            // Xử lý dữ liệu thành công
            return processGeoJSONData(data);
        })
        .catch(error => {
            console.warn('Không thể tải dữ liệu từ file local:', error);
            return Promise.resolve(false);
        });
}

// Hàm xử lý dữ liệu GeoJSON
function processGeoJSONData(data) {
    if (!data.features || !Array.isArray(data.features)) {
        throw new Error('Dữ liệu không đúng định dạng GeoJSON');
    }
    
    console.log('Tổng số tỉnh:', data.features.length);

    const processedFeatures = data.features.map(feature => {
        if (!feature.properties) {
            feature.properties = {};
        }

        // Lấy tên tỉnh
        const provinceName = feature.properties.ten_tinh || 
                            feature.properties.name || 
                            feature.properties.NAME ||
                            feature.properties.TenTinh ||
                            feature.properties.ten;
        
        const provinceCode = feature.properties.ma_tinh || 
                            feature.properties.code;

        let finalName;
        if (!provinceName || typeof provinceName !== 'string') {
            finalName = `Tỉnh ${provinceCode || 'Không xác định'}`;
        } else {
            finalName = provinceName.trim();
        }
        
        // Chuẩn hóa properties
        const normalizedFeature = {
            type: 'Feature',
            properties: {
                name: finalName,
                code: provinceCode || getProvinceCode(finalName),
                region: getProvinceRegion(finalName),
                ma_tinh: provinceCode
            },
            geometry: feature.geometry
        };
        
        return normalizedFeature;
    });
    
    // Tạo object GeoJSON mới
    const processedData = {
        type: 'FeatureCollection',
        features: processedFeatures
    };
    
    // Lưu dữ liệu vào window object
    window.vietnamProvincesData = processedData;

    if (typeof provincesLayer !== 'undefined' && provincesLayer && typeof map !== 'undefined' && map) {
        map.removeLayer(provincesLayer);
    }
    
    // Gọi addProvincesLayer để thêm layer mới
    // addProvincesLayer sẽ tự động lấy dữ liệu từ window.vietnamProvincesData
    if (typeof addProvincesLayer === 'function') {
        addProvincesLayer();
        
        // Fit bounds sau khi thêm layer
        if (typeof provincesLayer !== 'undefined' && provincesLayer) {
            setTimeout(() => {
                if (map && provincesLayer) {
                    map.fitBounds(provincesLayer.getBounds(), { padding: [50, 50] });
                }
            }, 200);
        }
    }
    
    return true;
}

// Hàm helper để lấy mã tỉnh từ tên
function getProvinceCode(name) {
    if (!name || typeof name !== 'string') {
        return 'XX';
    }
    
    const provinceCodes = {
        'Hà Nội': 'HN',
        'Hồ Chí Minh': 'HCM',
        'Đà Nẵng': 'DN',
        'Hải Phòng': 'HP',
        'Cần Thơ': 'CT',
    };
    
    if (provinceCodes[name]) {
        return provinceCodes[name];
    }
    
    if (name.length >= 2) {
        return name.substring(0, 2).toUpperCase();
    }
    
    return name.toUpperCase();
}

// Hàm helper để lấy vùng từ tên tỉnh
function getProvinceRegion(name) {
    if (!name || typeof name !== 'string') {
        return 'Chưa xác định';
    }
    
    const regions = {
        'Đồng bằng sông Hồng': ['Hà Nội', 'Hải Phòng', 'Hải Dương', 'Hưng Yên', 'Hà Nam', 'Nam Định', 'Thái Bình', 'Ninh Bình', 'Vĩnh Phúc', 'Bắc Ninh'],
        'Đông Nam Bộ': ['Hồ Chí Minh', 'Đồng Nai', 'Bình Dương', 'Bà Rịa - Vũng Tàu', 'Bình Phước', 'Tây Ninh'],
        'Đồng bằng sông Cửu Long': ['Cần Thơ', 'An Giang', 'Kiên Giang', 'Cà Mau', 'Bạc Liêu', 'Sóc Trăng', 'Trà Vinh', 'Vĩnh Long', 'Đồng Tháp', 'Tiền Giang', 'Bến Tre', 'Long An', 'Hậu Giang'],
        'Bắc Trung Bộ': ['Thanh Hóa', 'Nghệ An', 'Hà Tĩnh', 'Quảng Bình', 'Quảng Trị', 'Thừa Thiên Huế'],
        'Duyên hải Nam Trung Bộ': ['Đà Nẵng', 'Quảng Nam', 'Quảng Ngãi', 'Bình Định', 'Phú Yên', 'Khánh Hòa', 'Ninh Thuận', 'Bình Thuận'],
        'Tây Nguyên': ['Kon Tum', 'Gia Lai', 'Đắk Lắk', 'Đắk Nông', 'Lâm Đồng'],
        'Đông Bắc Bộ': ['Hà Giang', 'Cao Bằng', 'Bắc Kạn', 'Tuyên Quang', 'Lào Cai', 'Điện Biên', 'Lai Châu', 'Sơn La', 'Yên Bái', 'Thái Nguyên', 'Lạng Sơn', 'Bắc Giang', 'Quảng Ninh', 'Phú Thọ'],
        'Tây Bắc Bộ': ['Lào Cai', 'Điện Biên', 'Lai Châu', 'Sơn La', 'Yên Bái', 'Hòa Bình'],
    };
    
    for (const [region, provinces] of Object.entries(regions)) {
        if (provinces.includes(name)) {
            return region;
        }
    }
    
    return 'Chưa xác định';
}