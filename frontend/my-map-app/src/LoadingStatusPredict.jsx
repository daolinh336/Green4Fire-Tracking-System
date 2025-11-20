const LoadingStatusPredict = ({ isLoading, apiStatus, firePointsCount }) => {
  return (
    <div style={{
      position: 'absolute',
      bottom: '150px',  // Thay top='10px' thành bottom
      left: '10px',    // Giữ nguyên bên trái
      zIndex: 1000,
      background: 'rgba(45, 45, 45, 0.95)',
      backdropFilter: 'blur(10px)',
      borderRadius: '12px',
      padding: '16px',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
      minWidth: '250px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px'
      }}>
        <span style={{
          fontSize: '20px',
          animation: isLoading ? 'spin 1s linear infinite' : 'none'
        }}>
          {isLoading ? '⟳' : '✓'}
        </span>
        <div style={{
          color: '#fff',
          fontSize: '14px',
          fontWeight: '600'
        }}>
          Get predict data
        </div>
      </div>
      
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{
          fontSize: '12px',
          color: '#4ade80',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: apiStatus === 'loading' ? '#ffc107' : 
                            apiStatus === 'success' ? '#4ade80' : '#dc3545',
            animation: apiStatus === 'loading' ? 'pulse 1.5s infinite' : 'none'
          }}></span>
          <span style={{ color: '#fff' }}>
            {apiStatus === 'loading' ? 'Đang tải từ API...' :
             apiStatus === 'success' ? 'Dữ liệu thời gian thực' :
             apiStatus === 'fallback' ? 'Dữ liệu dự phòng (7 ngày)' :
             'Sẵn sàng'}
          </span>
        </div>
        
        <div style={{
          fontSize: '12px',
          color: '#888',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          paddingTop: '8px'
        }}>
          Data from Predict Model
        </div>
        
        
        {firePointsCount > 0 && (
          <div style={{
            fontSize: '13px',
            color: '#4ade80',
            fontWeight: '600',
            marginTop: '4px',
            padding: '8px',
            background: 'rgba(74, 222, 128, 0.1)',
            borderRadius: '6px',
            textAlign: 'center'
          }}>
            {firePointsCount} điểm cháy
          </div>
        )}
      </div>
      
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default LoadingStatusPredict;