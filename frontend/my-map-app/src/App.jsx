// src/App.jsx
import React, { useState, useEffect } from 'react';
import VietnamMap from './VietnamMap';
import LoadingStatus from './LoadingStatus';
import LoadingStatusPredict from './LoadingStatusPredict';
import TimeFilterBar from './TimeFilterBar';
import LayerControl from './LayerControl';
import LayerPredictControl from './LayerPredictionControl';
import FireAPI from './api/FireAPI';
import './css/App.css';

function App() {
  // --- 1. CHUYỂN TOÀN BỘ STATE VỀ ĐÂY ---
  const [allFirePoints, setAllFirePoints] = useState([]);
  const [firePoints, setFirePoints] = useState([]);
  const [predFirePoints, setPredFirePoints] = useState([]);
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [forestGridData, setForestGridData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState('idle');

  const [isPredLoading, setIsPredLoading] = useState(false);
  const [apiStatusPred, setApiStatusPred] = useState('idle');
  
  // State điều khiển giao diện
  const [showVNBoundary, setShowVNBoundary] = useState(true);
  const [showPredictData, setShowPredictData] = useState(true);
  const [showForestGrid, setShowForestGrid] = useState(false);
  const [timeFilter, setTimeFilter] = useState('7DAYS');
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  const [shouldFitBounds, setShouldFitBounds] = useState(true);
  const [error, setError] = useState(null);

  const [shouldFitBoundsPred, setShouldFitBoundsPred] = useState(true);
  const [errorPred, setErrorPred] = useState(null);

  // --- 2. CHUYỂN LOGIC GỌI API VỀ ĐÂY ---
  // Load GeoJSON tĩnh
  useEffect(() => {
    fetch('/data/vn.geojson').then(r => r.json()).then(setGeoJsonData);
    fetch('/data/forest_grid.geojson').then(r => r.json()).then(setForestGridData);
    loadFireData(7);
    loadPredictFireData();
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



  const loadPredictFireData = async () => {
    setIsPredLoading(true);
    setApiStatusPred('loading');
    setErrorPred(null);

    try {
      const geojson = await FireAPI.fetchPredictFires();

      const points = FireAPI.convertToPredictFirePoints(geojson);
      setPredFirePoints(points);
      setShouldFitBoundsPred(true);
      setApiStatusPred('success');
      console.log(points)

    } catch (err) {
      console.error('❌ Error loading fire data:', err);
      setErrorPred(err.message);
    } finally {
      setIsPredLoading(false);
    }
  }



  // --- 3. RENDER GIAO DIỆN ---
return (
    <div className="dashboard-container">
      
      {/* === CỘT TRÁI: CÔNG CỤ === */}
      <div className="sidebar-left">
        {/* Đặt bộ lọc thời gian vào đây */}
        <div className="control-group">
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
            <label>Layer:</label>
                    <LayerControl
              showVNBoundary={showVNBoundary}
              setShowVNBoundary={setShowVNBoundary}
              showForestGrid={showForestGrid}
              setShowForestGrid={setShowForestGrid}
        />
        </div>

        <div>
          <label>Prediction</label>
          <LayerPredictControl 
          showPredictData={showPredictData}
          setShowPredictData={setShowPredictData}
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

        <div className="status-box">
                   <LoadingStatusPredict 
          isPredLoading={isPredLoading}
          apiStatusPred={apiStatusPred}
          predFirePointsCount={predFirePoints.length}
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
          predFirePoints={predFirePoints}
          showPredictData={showPredictData}
        />
      </div>


      <div className="sidebar-right">
          <div className="sidebar-right fire-info-card">
  
  {/* TIÊU ĐỀ */}
  <h3 className="card-header">
    <span role="img" aria-label="fire">🔥</span> Fire Danger Classification
  </h3>
  
  <p className="description">
    The Fire Weather Index (FWI) is a meteorologically-based index used worldwide to estimate fire danger. We classify the danger level based on the mean FWI value, calculated from four corner points and the center of the prediction area.
  </p>

  {/* BẢNG PHÂN LOẠI FWI - Đã làm gọn */}
  <h4>FWI Danger Scale</h4>
  <table className="fwi-table compact"> {/* Thêm class 'compact' */}
    <tbody>
      <tr>
        <th>Value &lt; 5</th>
        <td className="level-very-low">Very Low</td>
      </tr>
      <tr>
        <th>Value &lt; 12</th>
        <td className="level-low">Low</td>
      </tr>
      <tr>
        <th>Value &lt; 22</th>
        <td className="level-moderate">Moderate</td>
      </tr>
      <tr>
        <th>Value &lt; 32</th>
        <td className="level-high">High</td>
      </tr>
      <tr>
        <th>Value &lt; 50</th>
        <td className="level-very-high">Very High</td>
      </tr>
      <tr>
        <th>Value &gt; 50</th>
        <td className="level-extreme">Extreme</td>
      </tr>
    </tbody>
  </table>

  <hr className="divider"/>

  {/* CHU KỲ CẬP NHẬT */}
  <div className="update-cycle">
    <h4>Data Update Cycle</h4>
    <p>Data is update once a day</p>
  </div>
  
  <hr className="divider"/>

  {/* GỢI Ý TƯƠNG TÁC */}
  <div className="interaction-tip">
    <h4>Map Interaction Tip</h4>
    <p>
      To select fire or prediction points accurately, you can click to map to view information within a 10km radius circle centered on the cursor. Please zoom in on the map for better selection precision
    </p>
  </div>
</div>
      </div>

    </div>
  );
}

export default App;