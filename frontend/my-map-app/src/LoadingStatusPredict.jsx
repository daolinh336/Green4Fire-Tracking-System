const LoadingStatusPredict = ({ isPredLoading, apiStatusPred, predFirePointsCount }) => {
  return (
    <div style={{
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
        gap: '8px'
      }}>
        <span style={{
          fontSize: '20px',
          animation: isPredLoading ? 'spin 1s linear infinite' : 'none'
        }}>
          {isPredLoading ? '⟳  ' : '✓  '}
        </span>
        <div style={{
          color: '#fff',
          fontSize: '14px',
          fontWeight: '600'
        }}>
           Prediction Data
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
            backgroundColor: apiStatusPred === 'loading' ? '#ffc107' : 
                            apiStatusPred === 'success' ? '#4ade80' : '#dc3545',
            animation: apiStatusPred === 'loading' ? 'pulse 1.5s infinite' : 'none'
          }}></span>
          <span style={{ color: '#fff' }}>
            {apiStatusPred === 'loading' ? ' Fetching Prediction Data...' :
             apiStatusPred === 'success' ? ' Successful fetched data' :
             apiStatusPred === 'fallback' ? ' Failed to fetch, back-up data (7 days)' :
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
        
        
        {predFirePointsCount > 0 && (
          <div style={{
            fontSize: '13px',
            color: '#4ade80',
            fontWeight: '600',
            padding: '8px',
            background: 'rgba(74, 222, 128, 0.1)',
            borderRadius: '6px',
            textAlign: 'center'
          }}>
            Predict {predFirePointsCount} areas
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