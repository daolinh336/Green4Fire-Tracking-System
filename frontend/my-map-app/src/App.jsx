// src/App.jsx
import React from 'react';
import './App.css';
import VietnamMap from './VietnamMap'; // Import component bản đồ

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Bản đồ Việt Nam với React-Leaflet</h1>
      </header>
      <main>
        <VietnamMap /> {/* Sử dụng component ở đây */}
      </main>
    </div>
  );
}

export default App;