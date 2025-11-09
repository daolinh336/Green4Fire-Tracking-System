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

    // Tải dữ liệu điểm cháy từ GeoJSON
    fetch('/data/fires_SouthEast_Asia_viirs_7days.geojson')
      .then((response) => response.json())
      .then((data) => {
        // Chuyển đổi dữ liệu từ GeoJSON features sang mảng điểm cháy
        const points = data.features.map(feature => ({
          id: `${feature.properties.latitude}-${feature.properties.longitude}`,
          latitude: feature.properties.latitude,
          longitude: feature.properties.longitude,
          confidence: feature.properties.confidence >= 80 ? 'high' :
            feature.properties.confidence >= 60 ? 'medium' : 'low',
          location: `Điểm cháy`,
          timestamp: new Date(feature.properties.acq_datetime).getTime(),
          brightness: feature.properties.brightness,
          frp: feature.properties.frp
        }));
        setFirePoints(points);
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

  // Hàm format thời gian
  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')} ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  // Component bảng thông tin
  const InfoTable = ({ points }) => {
    if (!points || points.length === 0) return null;

    return (
      <div className="info-table-container" style={{
        position: 'absolute',
        top: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        padding: '16px',
        maxHeight: '80vh',
        overflowY: 'auto',
        width: '600px'
      }}>
        <div style={{
          marginBottom: '10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, color: '#333' }}>
            Thông tin điểm cháy ({points.length} điểm)
          </h3>
          <button onClick={() => setNearbyPoints([])} style={{
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '20px',
            color: '#666'
          }}>&times;</button>
        </div>
        <table style={{
          width: '100%',
          borderCollapse: 'separate',
          borderSpacing: '0',
          fontSize: '14px',
          color: '#333'
        }}>
          <thead>
            <tr>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                borderBottom: '2px solid #e1e1e1',
                backgroundColor: '#f8f9fa',
                fontWeight: '600',
                color: '#555'
              }}>Thời gian</th>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                borderBottom: '2px solid #e1e1e1',
                backgroundColor: '#f8f9fa',
                fontWeight: '600',
                color: '#555'
              }}>Vĩ độ</th>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                borderBottom: '2px solid #e1e1e1',
                backgroundColor: '#f8f9fa',
                fontWeight: '600',
                color: '#555'
              }}>Kinh độ</th>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                borderBottom: '2px solid #e1e1e1',
                backgroundColor: '#f8f9fa',
                fontWeight: '600',
                color: '#555'
              }}>Nhiệt độ (°K)</th>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                borderBottom: '2px solid #e1e1e1',
                backgroundColor: '#f8f9fa',
                fontWeight: '600',
                color: '#555'
              }}>FRP (MW)</th>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                borderBottom: '2px solid #e1e1e1',
                backgroundColor: '#f8f9fa',
                fontWeight: '600',
                color: '#555'
              }}>Độ tin cậy</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point, index) => {
              const isEven = index % 2 === 0;
              return (
                <tr key={point.id} style={{
                  backgroundColor: isEven ? 'white' : '#f8f9fa',
                  transition: 'background-color 0.2s'
                }}>
                  <td style={{
                    padding: '12px',
                    borderLeft: `3px solid ${point.confidence === 'high' ? '#dc3545' :
                      point.confidence === 'medium' ? '#fd7e14' :
                        '#ffc107'
                      }`,
                    color: '#444'
                  }}>{formatDateTime(point.timestamp)}</td>
                  <td style={{ padding: '12px', fontFamily: 'monospace', color: '#444' }}>{point.latitude.toFixed(6)}</td>
                  <td style={{ padding: '12px', fontFamily: 'monospace', color: '#444' }}>{point.longitude.toFixed(6)}</td>
                  <td style={{ padding: '12px', fontFamily: 'monospace', color: '#444' }}>{point.brightness.toFixed(2)}</td>
                  <td style={{ padding: '12px', fontFamily: 'monospace', color: '#444' }}>{point.frp.toFixed(2)}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontWeight: '600',
                      backgroundColor: point.confidence === 'high' ? '#dc3545' :
                        point.confidence === 'medium' ? '#fd7e14' :
                          '#ffc107',
                      color: 'white',
                      display: 'inline-block',
                      minWidth: '60px',
                      textAlign: 'center'
                    }}>
                      {Math.round(point.confidence === 'high' ? 100 :
                        point.confidence === 'medium' ? 70 : 40)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
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

      {/* Hiển thị bảng thông tin cho các điểm cháy trong vùng query */}
      {nearbyPoints.length > 0 && <InfoTable points={nearbyPoints} />}
    </MapContainer>
  );
}

export default VietnamMap;  