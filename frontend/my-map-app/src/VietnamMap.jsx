// src/VietnamMap.jsx
import React, { useState, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Circle,
  useMapEvents,
  useMap,
  Popup
} from 'react-leaflet';
import L from 'leaflet';
import './css/VietnamMap.css'; // Tệp CSS để chỉnh chiều cao

/*
  Component này sẽ "lắng nghe" sự kiện click trên bản đồ.
  Nó phải là một component con của MapContainer.
*/
// Component để xử lý sự kiện zoom và điều chỉnh kích thước điểm cháy
function ZoomHandler({ setZoomLevel }) {
  const map = useMapEvents({
    zoomend: () => {
      setZoomLevel(map.getZoom());
    }
  });
  return null;
}

// Component để tự động điều chỉnh khung nhìn bản đồ
function MapBoundsHandler({ points }) {
  const map = useMap();

  useEffect(() => {
    if (points && points.length > 0) {
      // Tạo bounds từ tất cả các điểm
      const latLngs = points.map(point => [point.latitude, point.longitude]);
      const bounds = L.latLngBounds(latLngs);

      // Điều chỉnh khung nhìn để hiển thị tất cả điểm với padding
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [points, map]);

  return null;
}

// Component xử lý click và kiểm tra điểm cháy trong vùng
function MapClickHandler({ onMapClick, firePoints }) {
  const map = useMapEvents({
    click(e) {
      const clickedLat = e.latlng.lat;
      const clickedLng = e.latlng.lng;

      // Tìm điểm cháy trong bán kính 7km từ điểm click
      const nearbyPoints = firePoints.filter(point => {
        const distance = map.distance(
          [point.latitude, point.longitude],
          [clickedLat, clickedLng]
        );
        return distance <= 7000; // 7km
      });

      onMapClick(e.latlng, nearbyPoints);
    },
  });

  return null;
}


function VietnamMap() {
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [clickedPosition, setClickedPosition] = useState(null);
  const [firePoints, setFirePoints] = useState([]);
  const [zoomLevel, setZoomLevel] = useState(6);
  const [nearbyPoints, setNearbyPoints] = useState([]);

  // Dùng useEffect để tải dữ liệu GeoJSON và điểm cháy
  useEffect(() => {
    // Tải dữ liệu ranh giới Việt Nam
    fetch('/data/vn.geojson')
      .then((response) => response.json())
      .then((data) => {
        setGeoJsonData(data);
      })
      .catch((error) => console.error('Lỗi tải GeoJSON:', error));

    // Tải dữ liệu điểm cháy
    fetch('/data/fire-points.json')
      .then((response) => response.json())
      .then((data) => {
        setFirePoints(data.firePoints);
      })
      .catch((error) => console.error('Lỗi tải điểm cháy:', error));
  }, []);

  // Tọa độ trung tâm Việt Nam (ví dụ: Đà Nẵng)
  const center = [16.047079, 108.206230];

  // Tính bán kính hiển thị dựa trên mức zoom
  const getRadius = (zoom) => {
    // Bán kính giảm dần theo mức zoom
    // zoom 6 (xa nhất) -> 15000m
    // zoom 20 (gần nhất) -> 50m
    return Math.max(15000 * Math.pow(0.6, zoom - 6), 50);
  };

  // Hàm này sẽ được gọi khi MapClickHandler bắt được sự kiện click
  const handleMapClick = (latlng, points) => {
    setClickedPosition(latlng);
    setNearbyPoints(points);
  };

  return (
    <MapContainer center={center} zoom={6} className="map-container">
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {geoJsonData && <GeoJSON data={geoJsonData} />}

      <ZoomHandler setZoomLevel={setZoomLevel} />
      <MapClickHandler onMapClick={handleMapClick} firePoints={firePoints} />
      <MapBoundsHandler points={firePoints} />

      {/* Vòng tròn vùng click */}
      {clickedPosition && (
        <Circle
          center={clickedPosition}
          radius={7000}
          color="blue"
          weight={1}
          fillOpacity={0.1}
        />
      )}

      {/* Hiển thị các điểm cháy */}
      {firePoints.map((point) => (
        <Circle
          key={point.id}
          center={[point.latitude, point.longitude]}
          radius={getRadius(zoomLevel)}
          color={point.confidence === 'high' ? '#ff0000' : point.confidence === 'medium' ? '#ff6600' : '#ffcc00'}
          fillColor={point.confidence === 'high' ? '#ff0000' : point.confidence === 'medium' ? '#ff6600' : '#ffcc00'}
          fillOpacity={0.6}
        />
      ))}

      {/* Hiển thị thông tin các điểm cháy trong vùng query */}
      {nearbyPoints.map((point) => (
        <Popup
          key={`popup-${point.id}`}
          position={[point.latitude, point.longitude]}
          closeButton={true}
          autoPan={false}
          className="fire-point-popup"
          open={true}
        >
          <div style={{
            padding: '10px',
            borderRadius: '6px',
            borderLeft: `4px solid ${point.confidence === 'high' ? '#ff0000' :
              point.confidence === 'medium' ? '#ff6600' : '#ffcc00'
              }`,
            minWidth: '220px'
          }}>
            <div style={{
              fontWeight: 'bold',
              marginBottom: '8px',
              fontSize: '1.1em',
              color: '#333'
            }}>{point.location}</div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: '4px 8px',
              fontSize: '0.95em',
              color: '#555'
            }}>
              <div>Vĩ độ:</div>
              <div style={{ fontFamily: 'monospace' }}>{point.latitude.toFixed(6)}</div>
              <div>Kinh độ:</div>
              <div style={{ fontFamily: 'monospace' }}>{point.longitude.toFixed(6)}</div>
            </div>
            <div style={{
              marginTop: '8px',
              padding: '4px 8px',
              borderRadius: '4px',
              backgroundColor: point.confidence === 'high' ? 'rgba(255,0,0,0.1)' :
                point.confidence === 'medium' ? 'rgba(255,102,0,0.1)' : 'rgba(255,204,0,0.1)',
              color: point.confidence === 'high' ? '#d00' :
                point.confidence === 'medium' ? '#c50' : '#b80',
              fontWeight: '600',
              fontSize: '0.9em',
              display: 'inline-block'
            }}>
              Độ tin cậy: {point.confidence}
            </div>
            <div style={{
              marginTop: '8px',
              fontSize: '0.9em',
              color: '#666',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <svg style={{ width: '14px', height: '14px' }} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z" />
              </svg>
              {new Date(point.timestamp).toLocaleString('vi-VN')}
            </div>
          </div>
        </Popup>
      ))}
    </MapContainer>
  );
}

export default VietnamMap;  