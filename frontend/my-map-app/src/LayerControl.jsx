const LayerControl = ({ showVNBoundary, setShowVNBoundary, showForestGrid, setShowForestGrid }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column', // Xếp dọc
      gap: '10px',             // Khoảng cách giữa các dòng
      color: '#fff',           // Chữ màu trắng cho nổi trên nền tối
      padding: '5px 0'         // Đệm trên dưới chút cho thoáng
    }}>
      
      {/* Checkbox 1: Ranh giới VN */}
      <label style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        cursor: 'pointer',
        fontSize: '14px'
      }}>
        <input
          type="checkbox"
          checked={showVNBoundary}
          onChange={(e) => setShowVNBoundary(e.target.checked)}
          style={{
            width: '18px',
            height: '18px',
            accentColor: '#4ade80', // Màu xanh khi tick
            cursor: 'pointer'
          }}
        />
        <span>Ranh giới Việt Nam</span>
      </label>
      
      {/* Checkbox 2: Lưới rừng */}
      <label style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        cursor: 'pointer',
        fontSize: '14px'
      }}>
        <input
          type="checkbox"
          checked={showForestGrid}
          onChange={(e) => setShowForestGrid(e.target.checked)}
          style={{
            width: '18px',
            height: '18px',
            accentColor: '#4ade80',
            cursor: 'pointer'
          }}
        />
        <span>Lưới rừng</span>
      </label>
    </div>
  );
};

export default LayerControl;