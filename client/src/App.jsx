import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import Dashboard from './pages/Dashboard';
import Analysis from './pages/Analysis';
import Areas from './pages/Areas';
import Inspections from './pages/Inspections';
import ProtectedZones from './pages/ProtectedZones';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="analysis" element={<Analysis />} />
          <Route path="areas" element={<Areas />} />
          <Route path="inspections" element={<Inspections />} />
          <Route path="protected-zones" element={<ProtectedZones />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
