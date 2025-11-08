// src/VietnamMap.jsx
import React, { useState, useEffect } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  GeoJSON, 
  Circle, 
  useMapEvents 
} from 'react-leaflet';
import './css/VietnamMap.css'; // Tệp CSS để chỉnh chiều cao

/*
  Component này sẽ "lắng nghe" sự kiện click trên bản đồ.
  Nó phải là một component con của MapContainer.
*/
function MapClickHandler({ onMapClick }) {
  // Dùng hook useMapEvents để theo dõi sự kiện 'click'
  useMapEvents({
    click(e) {
      // Khi click, gọi hàm onMapClick (được truyền từ cha)
      // với tọa độ (lat, lng) của điểm vừa click
      onMapClick(e.latlng);
    },
  });
  
  // Component này không hiển thị gì cả
  return null;
}


function VietnamMap() {
  const [geoJsonData, setGeoJsonData] = useState(null);
  
  // State mới để lưu vị trí điểm vừa click
  // Ban đầu là null (chưa click)
  const [clickedPosition, setClickedPosition] = useState(null);

  // Dùng useEffect để tải dữ liệu GeoJSON chỉ một lần
  useEffect(() => {
    fetch('/data/vn.geojson')
      .then((response) => response.json())
      .then((data) => {
        setGeoJsonData(data);
      })
      .catch((error) => console.error('Lỗi tải GeoJSON:', error));
  }, []);

  // Tọa độ trung tâm Việt Nam (ví dụ: Đà Nẵng)
  const center = [16.047079, 108.206230];

  // Hàm này sẽ được gọi khi MapClickHandler bắt được sự kiện click
  const handleMapClick = (latlng) => {
    setClickedPosition(latlng); // Cập nhật state với tọa độ mới
  };

  return (
    <MapContainer center={center} zoom={6} className="map-container">
      {/* Lớp bản đồ nền (dùng OpenStreetMap) */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      
      {/* Chỉ hiển thị lớp GeoJSON khi dữ liệu đã được tải */}
      {geoJsonData && <GeoJSON data={geoJsonData} />}

      {/* Thêm component "lắng nghe" sự kiện click */}
      <MapClickHandler onMapClick={handleMapClick} />

      {/* Hiển thị hình tròn CÓ ĐIỀU KIỆN
        Chỉ hiển thị khi clickedPosition không còn là null
      */}
      {clickedPosition && (
        <Circle 
          center={clickedPosition} // Tâm là điểm vừa click
          radius={7000} // Bán kính 7000 mét = 7km
          color="red" // Màu viền
          fillColor="#f03" // Màu nền
          fillOpacity={0.5} // Độ mờ
        />
      )}
    </MapContainer>
  );
}

export default VietnamMap;