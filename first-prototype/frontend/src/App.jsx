import React from 'react';
import './App.css';
import Sandbox from './Sandbox';

function App() {
  return (
    <div className="app-container">
      <header>Sandbox</header>

      <div className="sandbox-container">
        <Sandbox />
      </div>
    </div>
  );
}

export default App;
