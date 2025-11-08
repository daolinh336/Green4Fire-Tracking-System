// Khởi tạo bản đồ khi trang đã tải xong
let map;
let provincesLayer;
let selectedProvince = null;

// Hàm khởi tạo bản đồ
function initMap() {
    // Đảm bảo container đã có kích thước trước khi khởi tạo map
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.error('Không tìm thấy element #map');
        return;
    }
    
    // Đảm bảo container có kích thước
    const containerHeight = mapContainer.offsetHeight;
    const containerWidth = mapContainer.offsetWidth;
    
    if (containerHeight === 0 || containerWidth === 0) {
        console.warn('Container chưa có kích thước, đợi thêm...');
        setTimeout(initMap, 100);
        return;
    }
    
    // Đợi một chút để đảm bảo CSS đã được áp dụng hoàn toàn
    setTimeout(function() {
        // Tạo bản đồ, tập trung vào Việt Nam
        // Tọa độ trung tâm Việt Nam: [16.0, 108.0]
        // Zoom level: 6 (có thể điều chỉnh từ 1-18)
        map = L.map('map', {
            preferCanvas: false,
            zoomControl: true,
            attributionControl: true,
            worldCopyJump: false
        }).setView([16.0, 108.0], 6);
        
        // Thêm tile layer (bản đồ nền)
        // Sử dụng OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
            minZoom: 5,
            noWrap: false
        }).addTo(map);
        
        // Quan trọng: Cập nhật kích thước bản đồ ngay sau khi tạo
        // Điều này đảm bảo Leaflet nhận diện đúng kích thước container
        setTimeout(function() {
            map.invalidateSize();
            
            // Thử load dữ liệu GeoJSON thực tế từ URL trước
            // Chỉ hiển thị bản đồ khi có dữ liệu thực, không hiển thị các hình chữ nhật đơn giản
            if (typeof loadRealGeoJSONData === 'function') {
                loadRealGeoJSONData().then(loaded => {
                    if (!loaded) {
                        // Nếu không load được dữ liệu thực, không hiển thị gì cả
                        // (không hiển thị các hình chữ nhật đơn giản)
                        console.log('Không tải được dữ liệu thực. Vui lòng cấu hình URL trong load-geojson.js');
                        console.log('Để hiển thị ranh giới tỉnh thành, cần dữ liệu GeoJSON thực tế.');
                    }
                });
            } else {
                // Không có hàm load dữ liệu thực, không hiển thị các hình đơn giản
                console.log('Không có dữ liệu GeoJSON thực tế. Vui lòng cấu hình load-geojson.js');
            }
            
            // Đợi thêm một chút để đảm bảo layer đã được thêm xong
            setTimeout(function() {
                // Thiết lập tìm kiếm
                setupSearch();
                
                // Đảm bảo map resize đúng khi cửa sổ thay đổi kích thước
                let resizeTimer;
                window.addEventListener('resize', function() {
                    clearTimeout(resizeTimer);
                    resizeTimer = setTimeout(function() {
                        map.invalidateSize();
                    }, 250);
                });
                
                // Force invalidate size một lần nữa để đảm bảo
                map.invalidateSize();
                
                console.log('Bản đồ đã được khởi tạo thành công!');
            }, 300);
        }, 150);
    }, 100);
}

// Hàm thêm layer các tỉnh thành
function addProvincesLayer() {
    // Tạo style mặc định cho các tỉnh - style bản đồ hành chính
    function defaultStyle(feature) {
        return {
            fillColor: '#4a90e2',
            weight: 1.5,
            opacity: 1,
            color: '#2c3e50', // Màu viền đậm để thấy rõ ranh giới
            dashArray: '',
            fillOpacity: 0.4
        };
    }
    
    // Tạo style khi hover (di chuột qua)
    function highlightFeature(e) {
        const layer = e.target;
        
        layer.setStyle({
            weight: 3,
            color: '#e74c3c', // Màu đỏ khi hover để dễ nhận biết
            dashArray: '',
            fillOpacity: 0.7,
            fillColor: '#e74c3c'
        });
        
        // Hiển thị thông tin khi hover
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
        }
    }
    
    // Đặt lại style về mặc định
    function resetHighlight(e) {
        provincesLayer.resetStyle(e.target);
    }
    
    // Xử lý khi click vào tỉnh
    function onProvinceClick(e) {
        const layer = e.target;
        const province = layer.feature.properties;
        
        // Cập nhật tỉnh được chọn
        selectedProvince = province;
        
        // Fit bounds để zoom vào tỉnh được chọn
        map.fitBounds(layer.getBounds());
        
        // Hiển thị popup
        layer.bindPopup(`
            <div style="text-align: center;">
                <h3 style="color: #667eea; margin-bottom: 10px;">${province.name}</h3>
                <p><strong>Mã tỉnh:</strong> ${province.code}</p>
                <p><strong>Vùng:</strong> ${province.region}</p>
            </div>
        `).openPopup();
        
        // Hiển thị thông tin chi tiết
        showProvinceInfo(province);
    }
    
    // Thêm event listeners cho mỗi tỉnh
    function onEachFeature(feature, layer) {
        layer.on({
            mouseover: highlightFeature,
            mouseout: resetHighlight,
            click: onProvinceClick
        });
    }
    
    // Lấy dữ liệu từ window object (từ load-geojson.js)
    const dataSource = window.vietnamProvincesData;
    
    // Kiểm tra xem có dữ liệu không
    if (!dataSource || !dataSource.features || dataSource.features.length === 0) {
        console.warn('Không có dữ liệu GeoJSON. Đảm bảo file vn.geojson nằm trong thư mục data/');
        return;
    }
    
    // Thêm GeoJSON layer vào bản đồ chỉ khi có dữ liệu thực
    try {
        provincesLayer = L.geoJSON(dataSource, {
            style: defaultStyle,
            onEachFeature: onEachFeature
        }).addTo(map);
        
        console.log('✅ Đã tải và hiển thị', dataSource.features.length, 'tỉnh thành với ranh giới thực tế');
    } catch (error) {
        console.error('Lỗi khi tải dữ liệu GeoJSON:', error);
    }
}

// Hàm load dữ liệu GeoJSON thực tế từ URL sẽ được định nghĩa trong load-geojson.js
// Nếu file đó không tồn tại, hàm này sẽ không được gọi

// Hàm hiển thị thông tin tỉnh
function showProvinceInfo(province) {
    const infoDiv = document.getElementById('province-info');
    infoDiv.innerHTML = `
        <h2>${province.name}</h2>
        <p><strong>Mã tỉnh/thành phố:</strong> ${province.code}</p>
        <p><strong>Vùng:</strong> ${province.region}</p>
    `;
    infoDiv.classList.add('active');
}

// Hàm thiết lập tìm kiếm
function setupSearch() {
    const searchInput = document.getElementById('province-search');
    const searchResults = document.getElementById('search-results');
    
    if (!searchInput || !searchResults) {
        console.error('Không tìm thấy search input hoặc results container');
        return;
    }
    
    // Flag để theo dõi xem có đang chọn từ dropdown không
    let isSelectingFromDropdown = false;
    
    // Lấy dữ liệu từ window object (từ load-geojson.js)
    const dataSource = window.vietnamProvincesData;
    
    // Kiểm tra xem có dữ liệu không
    if (!dataSource || !dataSource.features || dataSource.features.length === 0) {
        console.warn('Không có dữ liệu tỉnh thành để tìm kiếm');
        // Vô hiệu hóa ô tìm kiếm
        searchInput.disabled = true;
        searchInput.placeholder = 'Không có dữ liệu. Đảm bảo file vn.geojson nằm trong thư mục data/';
        return;
    }
    
    // Danh sách tất cả các tỉnh - lưu trữ thông tin để tìm kiếm
    const provinces = dataSource.features.map(feature => {
        // Tạo một layer tạm để lấy bounds
        const tempLayer = L.geoJSON(feature);
        let bounds = null;
        try {
            bounds = tempLayer.getBounds();
        } catch (e) {
            // Nếu không lấy được bounds, sử dụng tọa độ trung tâm ước tính
            console.warn('Không thể lấy bounds cho', feature.properties.name);
        }
        return {
            name: feature.properties.name,
            code: feature.properties.code,
            region: feature.properties.region,
            bounds: bounds,
            feature: feature
        };
    });
    
    // Xử lý khi người dùng nhập vào ô tìm kiếm
    searchInput.addEventListener('input', function(e) {
        // Nếu đang chọn từ dropdown, không trigger search
        if (isSelectingFromDropdown) {
            isSelectingFromDropdown = false;
            return;
        }
        
        const query = e.target.value.trim().toLowerCase();
        
        if (query === '') {
            // Ẩn và xóa nội dung khi ô trống
            searchResults.classList.remove('active');
            searchResults.innerHTML = '';
            return;
        }
        
        // Tìm kiếm các tỉnh phù hợp
        const matches = provinces.filter(province => 
            province.name.toLowerCase().includes(query) ||
            province.code.toLowerCase().includes(query)
        );
        
        // Hiển thị kết quả
        displaySearchResults(matches);
    });
    
    // Ẩn kết quả khi click bên ngoài
    document.addEventListener('click', function(e) {
        // Chỉ ẩn nếu click không phải vào search input hoặc results
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.remove('active');
        }
    });
    
    // Ẩn kết quả khi nhấn phím Esc
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            searchResults.classList.remove('active');
            searchInput.blur(); // Bỏ focus khỏi input
        }
        // Enter để chọn kết quả đầu tiên
        if (e.key === 'Enter') {
            e.preventDefault();
            const firstResult = searchResults.querySelector('.search-result-item');
            if (firstResult) {
                firstResult.click();
            }
        }
    });
    
    // Hàm hiển thị kết quả tìm kiếm
    function displaySearchResults(matches) {
        if (matches.length === 0) {
            searchResults.innerHTML = '<div class="search-result-item">Không tìm thấy tỉnh/thành phố nào</div>';
            searchResults.classList.add('active');
            return;
        }
        
        searchResults.innerHTML = matches.map(province => 
            `<div class="search-result-item" data-province="${province.name}">
                <strong>${province.name}</strong> (${province.code})
                <br><small>${province.region}</small>
            </div>`
        ).join('');
        
        // Thêm event listener cho mỗi kết quả
        searchResults.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', function(e) {
                // Ngăn event bubble lên document
                e.stopPropagation();
                e.preventDefault();
                
                const provinceName = this.getAttribute('data-province');
                const province = matches.find(p => p.name === provinceName);
                
                if (province) {
                    // Đặt flag để tránh trigger search khi update input
                    isSelectingFromDropdown = true;
                    
                    // Cập nhật input với tên tỉnh được chọn
                    searchInput.value = provinceName;
                    
                    // Ẩn dropdown ngay lập tức và xóa nội dung
                    searchResults.classList.remove('active');
                    searchResults.innerHTML = '';
                    
                    // Zoom vào tỉnh được chọn (sử dụng bounds từ feature nếu có)
                    if (province.bounds) {
                        map.fitBounds(province.bounds, { padding: [50, 50] });
                    }
                    
                    // Tìm và highlight tỉnh trên bản đồ
                    if (provincesLayer) {
                        highlightProvinceOnMap(provinceName);
                    }
                    
                    // Bỏ focus khỏi input để tránh hiển thị lại dropdown
                    setTimeout(() => {
                        searchInput.blur();
                    }, 100);
                }
            });
        });
        
        searchResults.classList.add('active');
    }
}

// Hàm highlight tỉnh trên bản đồ khi tìm kiếm
function highlightProvinceOnMap(provinceName) {
    provincesLayer.eachLayer(function(layer) {
        if (layer.feature.properties.name === provinceName) {
            // Zoom và highlight
            map.fitBounds(layer.getBounds());
            layer.setStyle({
                weight: 4,
                color: '#667eea',
                fillOpacity: 0.7
            });
            
            // Mở popup
            layer.bindPopup(`
                <div style="text-align: center;">
                    <h3 style="color: #667eea; margin-bottom: 10px;">${layer.feature.properties.name}</h3>
                    <p><strong>Mã tỉnh:</strong> ${layer.feature.properties.code}</p>
                    <p><strong>Vùng:</strong> ${layer.feature.properties.region}</p>
                </div>
            `).openPopup();
            
            // Hiển thị thông tin
            showProvinceInfo(layer.feature.properties);
        } else {
            // Reset style cho các tỉnh khác
            provincesLayer.resetStyle(layer);
        }
    });
}

// Khởi tạo bản đồ khi DOM và window đã sẵn sàng
// Sử dụng cả DOMContentLoaded và window load để đảm bảo CSS đã được áp dụng
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        // Đợi thêm một chút để CSS render xong
        setTimeout(initMap, 100);
    });
} else {
    // DOM đã sẵn sàng
    setTimeout(initMap, 100);
}

// Cũng lắng nghe event load để đảm bảo mọi thứ đã sẵn sàng
window.addEventListener('load', function() {
    if (map) {
        setTimeout(function() {
            map.invalidateSize();
        }, 100);
    }
});

// Hàm helper để zoom in
function zoomIn() {
    map.zoomIn();
}

// Hàm helper để zoom out
function zoomOut() {
    map.zoomOut();
}

// Export các hàm để có thể sử dụng từ console nếu cần
window.vietnamMap = {
    map: () => map,
    zoomIn: zoomIn,
    zoomOut: zoomOut,
    searchProvince: (name) => {
        highlightProvinceOnMap(name);
    }
};

