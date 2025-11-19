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

// Component để tự động điều chỉnh khung nhìn bản đồ (chỉ lần đầu)
function MapBoundsHandler({ points, shouldFit }) {
  const map = useMap();

  useEffect(() => {
    if (points && points.length > 0 && shouldFit) {
      // Tạo bounds từ tất cả các điểm
      const latLngs = points.map(point => [point.latitude, point.longitude]);
      const bounds = L.latLngBounds(latLngs);

      // Điều chỉnh khung nhìn để hiển thị tất cả điểm với padding
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [points, map, shouldFit]);

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

// Component bộ lọc thời gian (đặt ngoài để tránh re-render)
const TimeFilterBar = ({ timeFilter, setTimeFilter, firePointsCount, isFilterVisible, setIsFilterVisible }) => {
  const filterButtons = [
    { id: '24HRS', label: '24HRS' },
    { id: '3DAYS', label: '3DAYS' },
    { id: '7DAYS', label: '7DAYS' },
    { id: '1MONTH', label: '1MONTH' }
  ];

  // Hàm format ngày hiện tại
  const formatCurrentDate = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    return `${months[now.getMonth()]} ${now.getDate()} ${now.getFullYear()}`;
  };

  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      right: '10px',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      alignItems: 'flex-end'
    }}>
      {/* Nút toggle */}
      <button
        onClick={() => setIsFilterVisible(!isFilterVisible)}
        style={{
          background: 'rgba(45, 45, 45, 0.95)',
          border: 'none',
          borderRadius: '8px',
          padding: '10px',
          cursor: 'pointer',
          color: '#4ade80',
          fontSize: '24px',
          width: '45px',
          height: '45px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          transition: 'all 0.3s ease'
        }}
      >
        ☰
      </button>

      {/* Bảng điều khiển lọc */}
      {isFilterVisible && (
        <div style={{
          background: 'rgba(45, 45, 45, 0.95)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          minWidth: '280px',
          animation: 'slideIn 0.3s ease'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
            paddingBottom: '12px',
            borderBottom: '2px solid rgba(74, 222, 128, 0.3)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ color: '#4ade80', fontSize: '20px' }}>☰</span>
              <div style={{
                color: '#fff',
                fontSize: '14px',
                fontWeight: '400'
              }}>{formatCurrentDate()}</div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsFilterVisible(false);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#888',
                cursor: 'pointer',
                fontSize: '24px',
                padding: '0',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s'
              }}
            >×</button>
          </div>

          {/* Các nút lọc */}
          <div style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap'
          }}>
            {filterButtons.map(btn => (
              <button
                key={btn.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setTimeFilter(btn.id);
                }}
                style={{
                  background: timeFilter === btn.id ? '#4ade80' : 'rgba(255, 255, 255, 0.1)',
                  border: timeFilter === btn.id ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  color: timeFilter === btn.id ? '#1a1a1a' : '#fff',
                  fontSize: '12px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  flex: '1',
                  minWidth: '70px',
                  textAlign: 'center'
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Thông tin số lượng */}
          <div style={{
            marginTop: '12px',
            padding: '8px',
            background: 'rgba(74, 222, 128, 0.1)',
            borderRadius: '6px',
            color: '#4ade80',
            fontSize: '12px',
            textAlign: 'center',
            fontWeight: '600'
          }}>
            {firePointsCount} điểm cháy
          </div>
        </div>
      )}
    </div>
  );
};

function VietnamMap() {
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [clickedPosition, setClickedPosition] = useState(null);
  const [firePoints, setFirePoints] = useState([]);
  const [allFirePoints, setAllFirePoints] = useState([]); // Lưu tất cả điểm cháy
  const [zoomLevel, setZoomLevel] = useState(6);
  const [nearbyPoints, setNearbyPoints] = useState([]);
  const [timeFilter, setTimeFilter] = useState('7DAYS'); // 24HRS, 3DAYS, 7DAYS, 1MONTH
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [shouldFitBounds, setShouldFitBounds] = useState(true); // Chỉ fit bounds lần đầu

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
        setAllFirePoints(points);
        setFirePoints(points); // Mặc định hiển thị 7 ngày
        setShouldFitBounds(true); // Cho phép fit bounds lần đầu
      })
      .catch((error) => console.error('Lỗi tải điểm cháy:', error));
  }, []);

  // Lọc điểm cháy theo thời gian
  useEffect(() => {
    if (allFirePoints.length === 0) return; // Chưa load xong data
    
    setShouldFitBounds(false); // Tắt auto fit khi filter
    const now = Date.now();
    let filtered = [];

    switch (timeFilter) {
      case '24HRS':
        // Lọc 24 giờ qua
        filtered = allFirePoints.filter(point => now - point.timestamp <= 24 * 60 * 60 * 1000);
        break;
      case '3DAYS':
        // Lọc 3 ngày qua
        filtered = allFirePoints.filter(point => now - point.timestamp <= 3 * 24 * 60 * 60 * 1000);
        break;
      case '7DAYS':
        // Lọc 7 ngày qua
        filtered = allFirePoints.filter(point => now - point.timestamp <= 7 * 24 * 60 * 60 * 1000);
        break;
      case '1MONTH':
        // Lọc 1 tháng qua
        filtered = allFirePoints.filter(point => now - point.timestamp <= 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        filtered = allFirePoints;
    }

    setFirePoints(filtered);
  }, [timeFilter, allFirePoints]);

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
      <div className="info-table-container liquid" style={{
        position: 'absolute',
        top: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
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
          <h3 style={{ margin: 0, color: '#1a1a1a', textShadow: '0 1px 2px rgba(255,255,255,0.3)', fontWeight: '700' }}>
            Thông tin điểm cháy ({points.length} điểm)
          </h3>
          <button onClick={() => setNearbyPoints([])} style={{
            border: 'none',
            background: 'rgba(0, 0, 0, 0.15)',
            cursor: 'pointer',
            fontSize: '20px',
            color: '#1a1a1a',
            borderRadius: '50%',
            width: '30px',
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease'
          }}>&times;</button>
        </div>
        <table style={{
          width: '100%',
          borderCollapse: 'separate',
          borderSpacing: '0',
          fontSize: '14px',
          color: '#1a1a1a'
        }}>
          <thead>
            <tr>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                borderBottom: '2px solid rgba(0, 0, 0, 0.15)',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                fontWeight: '600',
                color: '#1a1a1a'
              }}>Thời gian</th>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                borderBottom: '2px solid rgba(0, 0, 0, 0.15)',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                fontWeight: '600',
                color: '#1a1a1a'
              }}>Vĩ độ</th>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                borderBottom: '2px solid rgba(0, 0, 0, 0.15)',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                fontWeight: '600',
                color: '#1a1a1a'
              }}>Kinh độ</th>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                borderBottom: '2px solid rgba(0, 0, 0, 0.15)',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                fontWeight: '600',
                color: '#1a1a1a'
              }}>Nhiệt độ (°K)</th>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                borderBottom: '2px solid rgba(0, 0, 0, 0.15)',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                fontWeight: '600',
                color: '#1a1a1a'
              }}>FRP (MW)</th>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                borderBottom: '2px solid rgba(0, 0, 0, 0.15)',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                fontWeight: '600',
                color: '#1a1a1a'
              }}>Độ tin cậy</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point, index) => {
              const isEven = index % 2 === 0;
              return (
                <tr key={point.id} style={{
                  backgroundColor: isEven ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.08)',
                  transition: 'background-color 0.2s'
                }}>
                  <td style={{
                    padding: '12px',
                    borderLeft: `3px solid ${point.confidence === 'high' ? '#dc3545' :
                      point.confidence === 'medium' ? '#fd7e14' :
                        '#ffc107'
                      }`,
                    color: '#1a1a1a'
                  }}>{formatDateTime(point.timestamp)}</td>
                  <td style={{ padding: '12px', fontFamily: 'monospace', color: '#1a1a1a' }}>{point.latitude.toFixed(6)}</td>
                  <td style={{ padding: '12px', fontFamily: 'monospace', color: '#1a1a1a' }}>{point.longitude.toFixed(6)}</td>
                  <td style={{ padding: '12px', fontFamily: 'monospace', color: '#1a1a1a' }}>{point.brightness.toFixed(2)}</td>
                  <td style={{ padding: '12px', fontFamily: 'monospace', color: '#1a1a1a' }}>{point.frp.toFixed(2)}</td>
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
      <MapBoundsHandler points={firePoints} shouldFit={shouldFitBounds} />

      {/* Bộ lọc thời gian */}
      <TimeFilterBar
        timeFilter={timeFilter}
        setTimeFilter={setTimeFilter}
        firePointsCount={firePoints.length}
        isFilterVisible={isFilterVisible}
        setIsFilterVisible={setIsFilterVisible}
      />

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