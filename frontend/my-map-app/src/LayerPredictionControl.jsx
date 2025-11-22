const LayerPredictControl = ({ showPredictData, setShowPredictData }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column', // Xếp dọc
      gap: '10px',             // Khoảng cách giữa các dòng
      color: '#fff',           // Chữ màu trắng cho nổi trên nền tối
      padding: '5px 0'         // Đệm trên dưới chút cho thoáng
    }}>
      
      <label style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        cursor: 'pointer',
        fontSize: '14px'
      }}>
        <input
          type="checkbox"
          checked={showPredictData}
          onChange={(e) => setShowPredictData(e.target.checked)}
          style={{
            width: '18px',
            height: '18px',
            accentColor: '#4ade80', // Màu xanh khi tick
            cursor: 'pointer'
          }}
        />
        <span>Change to Prediction Mode</span>
      </label>
    </div>
  );
};

export default LayerPredictControl;