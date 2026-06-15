import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';

function App() {
  const [toast, setToast] = useState(null);

  // Global helper to show notification messages
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  return (
    <BrowserRouter>
      {toast && (
        <div className={`toast ${toast.type}`}>
          <span>{toast.type === 'success' ? '✨' : '⚠️'}</span>
          <span>{toast.message}</span>
        </div>
      )}
      <Routes>
        <Route path="/login" element={<Login showToast={showToast} />} />
        <Route path="/register" element={<Register showToast={showToast} />} />
        <Route path="/dashboard" element={<Dashboard showToast={showToast} />} />
        {/* Fallback all other routes to Dashboard (which itself handles login redirects) */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
