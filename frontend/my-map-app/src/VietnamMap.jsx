import React, { useState, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Circle,
  useMapEvents,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';


function ZoomHandler({ setZoomLevel }) {
  const map = useMapEvents({
    zoomend: () => {
      setZoomLevel(map.getZoom());
    }
  });
  return null;
}

function MapBoundsHandler({ predFirePoints, points, shouldFit, showPredictData }) {
  const map = useMap();
  
  if (!showPredictData) {
  useEffect(() => {
    if (points && points.length > 0 && shouldFit) {
      const latLngs = points.map(point => [point.latitude, point.longitude]);
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [points, map, shouldFit]);
}
else {
      useEffect(() => {
    if (predFirePoints && predFirePoints.length > 0 && shouldFit) {
      const latLngs = predFirePoints.map(predFirePoints => [predFirePoints.latitude, predFirePoints.longitude]);
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [predFirePoints, map, shouldFit]);
}

  return null;
}

function MapClickHandler({ onMapClick, firePoints, predFirePoints, showPredictData }) {

  if (!showPredictData){
    const map = useMapEvents({
      click(e) {
        const clickedLat = e.latlng.lat;
        const clickedLng = e.latlng.lng;

        const nearbyPoints = firePoints.filter(point => {
          const distance = map.distance(
            [point.latitude, point.longitude],
            [clickedLat, clickedLng]
          );
          return distance <= 10000;
        });

        onMapClick(e.latlng, nearbyPoints, showPredictData);
      },
    });
  }
  else {
    //xu ly khi Predictdata
      const map = useMapEvents({
      click(e) {
        const clickedLat = e.latlng.lat;
        const clickedLng = e.latlng.lng;

        const nearbyPointsPred = predFirePoints.filter(point => {
          const distance = map.distance(
            [point.latitude, point.longitude],
            [clickedLat, clickedLng]
          );
          return distance <= 10000;
        });

        onMapClick(e.latlng, nearbyPointsPred, showPredictData);
      },
    });
  }

  return null;
}

const InfoTable = ({ points, onClose }) => {
  if (!points || points.length === 0) return null;

  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')} ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  return (
    <div style={{
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
      overflowY: 'auto', // scroll theo chiều dọc
      width: '90vw',      // thay vì 600px, co giãn theo màn hình
      maxWidth: '800px'   // giới hạn tối đa
    }}>
      <div style={{
        marginBottom: '10px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
    <h3 style={{ margin: 0, color: '#1a1a1a', textShadow: '0 1px 2px rgba(255,255,255,0.3)', fontWeight: '700' }}>
      Firepoint Information ({points.length} point{points.length === 1 ? '' : 's'})
    </h3>
        
  <button
    onClick={onClose}
    style={{
      position: 'absolute',
      top: '10px',
      right: '10px',
      border: 'none',
      background: 'rgba(0,0,0,0.15)',
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
    }}
  >
    &times;
  </button>
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
            }}>Time</th>
            <th style={{
              padding: '12px',
              textAlign: 'left',
              borderBottom: '2px solid rgba(0, 0, 0, 0.15)',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              fontWeight: '600',
              color: '#1a1a1a'
            }}>Latitude</th>
            <th style={{
              padding: '12px',
              textAlign: 'left',
              borderBottom: '2px solid rgba(0, 0, 0, 0.15)',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              fontWeight: '600',
              color: '#1a1a1a'
            }}>Longitude</th>
            <th style={{
              padding: '12px',
              textAlign: 'left',
              borderBottom: '2px solid rgba(0, 0, 0, 0.15)',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              fontWeight: '600',
              color: '#1a1a1a'
            }}>Tempurature (°K)</th>
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
            }}>Satellite</th>
            <th style={{
              padding: '12px',
              textAlign: 'left',
              borderBottom: '2px solid rgba(0, 0, 0, 0.15)',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              fontWeight: '600',
              color: '#1a1a1a'
            }}>Scan</th>
            <th style={{
              padding: '12px',
              textAlign: 'left',
              borderBottom: '2px solid rgba(0, 0, 0, 0.15)',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              fontWeight: '600',
              color: '#1a1a1a'
            }}>Track</th>
            <th style={{
              padding: '12px',
              textAlign: 'left',
              borderBottom: '2px solid rgba(0, 0, 0, 0.15)',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              fontWeight: '600',
              color: '#1a1a1a'
            }}>Confidence Level</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point, index) => {
            const isEven = index % 2 === 0;
            const confidencePercent = point.confidence === 'high' ? 'High' :
                                     point.confidence === 'medium' ? 'Medium' :
                                     point.confidence === 'low' ? 'Low' :
                                      'N/A';
            return (
              <tr key={point.id} style={{
                backgroundColor: isEven ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.08)',
                transition: 'background-color 0.2s'
              }}>
                <td style={{
                  padding: '12px',
                  borderLeft: `3px solid ${point.confidence === 'high' ? '#dc3545' :
                    point.confidence === 'medium' ? '#fd7e14' :
                    point.confidence === 'low' ? '#ffc107' :
                     '#6c757d'}`,
                  color: '#1a1a1a'
                }}>{formatDateTime(point.timestamp)}</td>
                <td style={{ padding: '12px', fontFamily: 'monospace', color: '#1a1a1a' }}>
                  {point.latitude.toFixed(6)}
                </td>
                <td style={{ padding: '12px', fontFamily: 'monospace', color: '#1a1a1a' }}>
                  {point.longitude.toFixed(6)}
                </td>
                <td style={{ padding: '12px', fontFamily: 'monospace', color: '#1a1a1a' }}>
                  {point.brightness.toFixed(2)}
                </td>
                <td style={{ padding: '12px', fontFamily: 'monospace', color: '#1a1a1a' }}>
                  {point.frp.toFixed(2)}
                </td>
                <td style={{ padding: '12px', fontFamily: 'monospace', color: '#1a1a1a' }}>
                  {point.instrument}
                </td>
                 <td style={{ padding: '12px', fontFamily: 'monospace', color: '#1a1a1a' }}>
                  {point.scan}
                </td>
                 <td style={{ padding: '12px', fontFamily: 'monospace', color: '#1a1a1a' }}>
                  {point.track}
                </td>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: '600',
                    backgroundColor: point.confidence === 'high' ? '#dc3545' :
                      point.confidence === 'medium' ? '#fd7e14' :
                      point.confidence === 'low' ? '#ffc107' :
                       '#6c757d',
                    color: 'white',
                    display: 'inline-block',
                    minWidth: '60px',
                    textAlign: 'center'
                  }}>
                    {confidencePercent}
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

const InfoTablePred = ({ points, onClose }) => {
  if (!points || points.length === 0) return null;

  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')} ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  return (
    <div style={{
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
      overflowY: 'auto', // scroll theo chiều dọc
      width: '90vw',      // thay vì 600px, co giãn theo màn hình
      maxWidth: '800px'   // giới hạn tối đa
    }}>
      <div style={{
        marginBottom: '10px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
      <h3 style={{ margin: 0, color: '#1a1a1a', textShadow: '0 1px 2px rgba(255,255,255,0.3)', fontWeight: '700' }}>
        Information ({points.length} predict area{points.length === 1 ? '' : 's'})
      </h3>
  <button
    onClick={onClose}
    style={{
      position: 'absolute',
      top: '10px',
      right: '10px',
      border: 'none',
      background: 'rgba(0,0,0,0.15)',
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
    }}
  >
    &times;
  </button>
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
            }}>Time acquired</th>
            <th style={{
              padding: '12px',
              textAlign: 'left',
              borderBottom: '2px solid rgba(0, 0, 0, 0.15)',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              fontWeight: '600',
              color: '#1a1a1a'
            }}>Latitude</th>
            <th style={{
              padding: '12px',
              textAlign: 'left',
              borderBottom: '2px solid rgba(0, 0, 0, 0.15)',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              fontWeight: '600',
              color: '#1a1a1a'
            }}>Longitude</th>
            <th style={{
              padding: '12px',
              textAlign: 'left',
              borderBottom: '2px solid rgba(0, 0, 0, 0.15)',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              fontWeight: '600',
              color: '#1a1a1a'
            }}>FWI Mean</th>
            <th style={{
              padding: '12px',
              textAlign: 'left',
              borderBottom: '2px solid rgba(0, 0, 0, 0.15)',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              fontWeight: '600',
              color: '#1a1a1a'
            }}>FWI Max</th>
            <th style={{
              padding: '12px',
              textAlign: 'left',
              borderBottom: '2px solid rgba(0, 0, 0, 0.15)',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              fontWeight: '600',
              color: '#1a1a1a'
            }}>Danger Level</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point, index) => {
            const isEven = index % 2 === 0;
            const dangerLabel = point.danger_label
            const fwi_mean = point.fwi_mean
            const fwi_max = point.fwi_max
            return (
              <tr key={point.id} style={{
                backgroundColor: isEven ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.08)',
                transition: 'background-color 0.2s'
              }}>
                <td style={{
                  padding: '12px',
                  borderLeft: `3px solid ${point.danger_label === 'Very Low' ? '#ffc107' :
                    point.danger_label === 'Low' ? '#fd7e14' :
                    point.danger_label === 'Moderate' ? '#fd3d14' :
                    point.danger_label === 'High' ? '#dc3545' :
                    point.danger_label === 'Very High' ? '#8b0000' :
                     '#6c757d'}`,
                  color: '#1a1a1a'
                }}>{formatDateTime(point.updated_at)}</td>
                <td style={{ padding: '12px', fontFamily: 'monospace', color: '#1a1a1a' }}>
                  {point.latitude.toFixed(6)}
                </td>
                <td style={{ padding: '12px', fontFamily: 'monospace', color: '#1a1a1a' }}>
                  {point.longitude.toFixed(6)}
                </td>
                <td style={{ padding: '12px', fontFamily: 'monospace', color: '#1a1a1a' }}>
                  {fwi_mean}
                </td>
                <td style={{ padding: '12px', fontFamily: 'monospace', color: '#1a1a1a' }}>
                  {fwi_max}
                </td>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: '600',
                    backgroundColor: point.danger_label === 'Very Low' ? '#ffc107' :
                    point.danger_label === 'Low' ? '#fd7e14' :
                    point.danger_label === 'Moderate' ? '#fd3d14' :
                    point.danger_label === 'High' ? '#dc3545' :
                    point.danger_label === 'Very High' ? '#8b0000' :
                     '#6c757d',
                    color: 'white',
                    display: 'inline-block',
                    minWidth: '60px',
                    textAlign: 'center'
                  }}>
                    {dangerLabel}
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

function VietnamMap({ 
  geoJsonData, showVNBoundary,
  forestGridData, showForestGrid,
  firePoints,
  predFirePoints,
  showPredictData
}
) {
  const [clickedPosition, setClickedPosition] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(6);
  const [nearbyPoints, setNearbyPoints] = useState([]);
  const [nearbyPointsPred, setnearbyPointsPred] = useState([]);
  const [shouldFitBounds, setShouldFitBounds] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiStatus, setApiStatus] = useState('idle');

  const center = [16.047079, 108.206230];

  const getRadius = (zoom) => {
    return Math.max(15000 * Math.pow(0.6, zoom - 6), 50);
  };

  

  const handleMapClick = (latlng, points, showPredictData) => {
   if(!showPredictData) {
    setClickedPosition(latlng);
    setNearbyPoints(points);
    setShouldFitBounds(false);
   }
   else
   {
      setClickedPosition(latlng);
      setnearbyPointsPred(points);
      setShouldFitBounds(false);
   }
  };
  useEffect(() => {
  // Khi showPredictData thay đổi, đóng tất cả modal nếu đang mở
  setNearbyPoints([]);
  setnearbyPointsPred([]);
}, [showPredictData]);
  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      {error && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2000,
          background: 'rgba(220, 53, 69, 0.95)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          fontSize: '14px',
          fontWeight: '600'
        }}>
          ⚠️ {error}
        </div>
      )}

      <MapContainer center={center} zoom={6} style={{ width: '100%', height: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {geoJsonData && showVNBoundary && <GeoJSON data={geoJsonData} />}
        {forestGridData && showForestGrid && (
          <GeoJSON 
            data={forestGridData}
            style={{
              color: '#22c55e',
              weight: 1,
              opacity: 0.6,
              fillOpacity: 0.1
            }}
          />
        )}

        {/* show data prediction layer */}





        <ZoomHandler setZoomLevel={setZoomLevel} />
        <MapClickHandler onMapClick={handleMapClick} firePoints={firePoints} predFirePoints={predFirePoints} showPredictData={showPredictData}/>
        <MapBoundsHandler predFirePoints={predFirePoints}  points={firePoints} shouldFit={shouldFitBounds} showPredictData={showPredictData}/>




        {clickedPosition && (
          <Circle
            center={clickedPosition}
            radius={10000}
            color="blue"
            weight={1}
            fillOpacity={0.1}
          />
        )}

        {!showPredictData && firePoints.map((point) => (
          <Circle
            key={point.id || `${point.latitude}-${point.longitude}`}
            center={[point.latitude, point.longitude]}   // vị trí tâm
            radius={4}                                  // bán kính chấm (đơn vị px)
            color={
              point.confidence === 'high' ? '#ff0000' :       // đỏ
              point.confidence === 'medium' ? '#ff6600' :     // cam
              point.confidence === 'low' ? '#ffff00' :        // vàng
              '#6c757d'                                       // xám cho unknown
            }
            fillColor={
              point.confidence === 'high' ? '#ff0000' :
              point.confidence === 'medium' ? '#ff6600' :
              point.confidence === 'low' ? '#ffff00' :
              '#6c757d'
            }
            fillOpacity={0.9}                           // độ mờ
          />
        ))}




          {showPredictData && predFirePoints.map((point) => (
          <Circle
            key={point.id}
            center={[point.latitude, point.longitude]}   // vị trí tâm
            radius={5}                                  // bán kính chấm (đơn vị px)
            color={
              point.danger_label === 'Very Low' ? '#ffc107' :
              point.danger_label === 'Low' ? '#fd7e14' :
              point.danger_label === 'Moderate' ? '#fd3d14' :
              point.danger_label === 'High' ? '#dc3545' :
              point.danger_label === 'Very High' ? '#8b0000' :
                '#6c757d'               // xám cho unknown
            }
            fillColor={
              point.danger_label === 'Very Low' ? '#ffc107' :
              point.danger_label === 'Low' ? '#fd7e14' :
              point.danger_label === 'Moderate' ? '#fd3d14' :
              point.danger_label === 'High' ? '#dc3545' :
              point.danger_label === 'Very High' ? '#8b0000' :
              '#6c757d'
            }
            fillOpacity={0.9}                           // độ mờ
          />
        ))}

        {nearbyPoints.length > 0 && (
          <InfoTable 
            points={nearbyPoints} 
            onClose={() => setNearbyPoints([])} 
          />
        )}

          {nearbyPointsPred.length > 0 && (
          <InfoTablePred
            points={nearbyPointsPred} 
            onClose={() => setnearbyPointsPred([])} 
          />
        )}
      </MapContainer>
    </div>
  );
}

export default VietnamMap;