// src/App.jsx
import React, { useState, useEffect } from 'react';
import VietnamMap from './VietnamMap';
import LoadingStatus from './LoadingStatus';
import TimeFilterBar from './TimeFilterBar';
import LayerControl from './LayerControl';
import FireAPI from './api/FireAPI';
import './css/App.css';

function App() {
  // --- 1. CHUYỂN TOÀN BỘ STATE VỀ ĐÂY ---
  const [allFirePoints, setAllFirePoints] = useState([]);
  const [firePoints, setFirePoints] = useState([]);
//const [PredfirePoints, setPredfirePoints] = useState([]);
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [forestGridData, setForestGridData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState('idle');
  
  // State điều khiển giao diện
  const [showVNBoundary, setShowVNBoundary] = useState(true);
  const [showForestGrid, setShowForestGrid] = useState(false);
  const [timeFilter, setTimeFilter] = useState('7DAYS');
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  const [shouldFitBounds, setShouldFitBounds] = useState(true);
  const [error, setError] = useState(null);

  // --- 2. CHUYỂN LOGIC GỌI API VỀ ĐÂY ---
  // Load GeoJSON tĩnh
  useEffect(() => {
    fetch('/data/vn.geojson').then(r => r.json()).then(setGeoJsonData);
    fetch('/data/forest_grid.geojson').then(r => r.json()).then(setForestGridData);
    loadFireData(7);
  }, []);


  const handleRefresh = (days) => {

  if (!allFirePoints || allFirePoints.length === 0) {
    console.log('🔥 Dữ liệu firePoints chưa sẵn sàng, chờ...');
    return;
  }
    console.log(34)
    const now = Date.now();
    const filteredPoints = allFirePoints.filter(point => {
      const diffDays = (now - point.timestamp) / (1000 * 60 * 60 * 24);
      return diffDays <= days;
    });
    setFirePoints(filteredPoints);
    setShouldFitBounds(true); 
};
  const loadFallbackData = async () => {
    try {
      const response = await fetch('/data/fires_SouthEast_Asia_viirs_7days.geojson');
      const geojson = await response.json();
      console.log(geojson);
      const points = FireAPI.convertToFirePoints(geojson);
      setAllFirePoints(points);
      setFirePoints(points);
      setShouldFitBounds(true);
      setApiStatus('fallback');
      console.log('✅ Loaded fallback data:', points.length, 'points');
    } catch (err) {
      console.error('❌ Error loading fallback data:', err);
      setError('Không thể tải dữ liệu dự phòng');
    }
  };



  // Hàm load dữ liệu từ API
  const loadFireData = async (days = 7) => {
    setIsLoading(true);
    setApiStatus('loading');
    setError(null);

    try {
      const geojson = await FireAPI.fetchFires({ 
        days,
        min_conf: 50,
        region: 'SouthEast_Asia',
        bbox: '95,-11,155,24'
      });

      const points = FireAPI.convertToFirePoints(geojson);
      setAllFirePoints(points);
      setFirePoints(points);
      setShouldFitBounds(true);
      setApiStatus('success');

    } catch (err) {
      console.error('❌ Error loading fire data:', err);
      setError(err.message);
      await loadFallbackData();
    } finally {
      setIsLoading(false);
    }
  };

  // --- 3. RENDER GIAO DIỆN ---
return (
    <div className="dashboard-container">
      
      {/* === CỘT TRÁI: CÔNG CỤ === */}
      <div className="sidebar-left">
        <h2>🛠️ Công cụ</h2>
        
        {/* Đặt bộ lọc thời gian vào đây */}
        <div className="control-group">
            <label>Thời gian:</label>
                    <TimeFilterBar
          timeFilter={timeFilter}
          setTimeFilter={setTimeFilter}
          firePointsCount={firePoints.length}
          isFilterVisible={isFilterVisible}
          setIsFilterVisible={setIsFilterVisible}
          isLoading={isLoading}
          onRefresh={handleRefresh}
        />
        </div>

        {/* Đặt điều khiển lớp bản đồ vào đây */}
        <div className="control-group">
            <label>Lớp hiển thị:</label>
                    <LayerControl
              showVNBoundary={showVNBoundary}
              setShowVNBoundary={setShowVNBoundary}
              showForestGrid={showForestGrid}
              setShowForestGrid={setShowForestGrid}
        />
        </div>
        
        {/* Đặt trạng thái loading vào đây */}
        <div className="status-box">
                   <LoadingStatus 
          isLoading={isLoading}
          apiStatus={apiStatus}
          firePointsCount={firePoints.length}
        />
        </div>
      </div>


      {/* === CỘT GIỮA: BẢN ĐỒ === */}
      <div className="map-wrapper">
        <VietnamMap 
          geoJsonData={geoJsonData}
          showVNBoundary={showVNBoundary}
          forestGridData={forestGridData}
          showForestGrid={showForestGrid}
          firePoints={firePoints}
        />
      </div>


      {/* === CỘT PHẢI: THÔNG TIN CHI TIẾT === */}
      <div className="sidebar-right">
      </div>

    </div>
  );
}

export default App;