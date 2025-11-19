// src/components/TimeFilterBar.jsx (hoặc nơi bạn để file này)
import React from 'react';

const TimeFilterBar = ({ 
  timeFilter, 
  setTimeFilter, 
  firePointsCount, 
  isLoading,
  onRefresh 
}) => {
  const filterButtons = [
    { id: '24HRS', label: '1 Ngày', days: 1 },
    { id: '3DAYS', label: '3 Ngày', days: 3 },
    { id: '7DAYS', label: '7 Ngày', days: 7 },
  ];

  const formatCurrentDate = () => {
    const now = new Date();
    // Format kiểu VN: 19/11/2025
    return `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
  };

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      color: '#fff', // Chữ màu trắng
      padding: '5px 0'
    }}>
      
      {/* Dòng hiển thị ngày tháng */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        paddingBottom: '8px',
        marginBottom: '4px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
           <span style={{ fontSize: '16px' }}>📅</span>
           <span style={{ fontSize: '14px', fontWeight: '500' }}>{formatCurrentDate()}</span>
        </div>
      </div>

      {/* Các nút bấm chọn thời gian */}
      <div style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap' // Tự xuống dòng nếu không đủ chỗ
      }}>
        {filterButtons.map(btn => (
          <button
            key={btn.id}
            onClick={() => {
              setTimeFilter(btn.id);
              onRefresh(btn.days);
            }}
            disabled={isLoading}
            style={{
              flex: '1 0 45%', // Chia 2 cột (mỗi nút chiếm khoảng 45%)
              padding: '8px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: isLoading ? 'wait' : 'pointer',
              border: timeFilter === btn.id ? 'none' : '1px solid #555',
              // Logic màu sắc:
              // - Đang chọn: Nền xanh, chữ đen
              // - Chưa chọn: Nền trong suốt, chữ trắng
              background: timeFilter === btn.id ? '#4ade80' : 'transparent',
              color: timeFilter === btn.id ? '#1a1a1a' : '#fff',
              transition: 'all 0.2s ease',
              opacity: isLoading ? 0.6 : 1
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Hiển thị số lượng điểm cháy */}
      <div style={{
        padding: '10px',
        background: 'rgba(74, 222, 128, 0.15)', // Nền xanh rất nhạt
        border: '1px solid rgba(74, 222, 128, 0.3)',
        borderRadius: '6px',
        color: '#4ade80', // Chữ xanh sáng
        fontSize: '13px',
        textAlign: 'center',
        fontWeight: '600'
      }}>
        {isLoading ? 'Đang tải dữ liệu...' : `🔥 Tìm thấy ${firePointsCount} điểm cháy trong vòng ${timeFilter === '24HRS' ? '1 ngày' : timeFilter === '3DAYS' ? '3 ngày' : '7 ngày'}`}
      </div>

    </div>
  );
};

export default TimeFilterBar;