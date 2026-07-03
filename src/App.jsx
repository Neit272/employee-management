import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Requests from './pages/Requests';
import HR from './pages/HR';
import Accounting from './pages/Accounting';
import Admin from './pages/Admin';

import MainLayout from './components/MainLayout';
import MandatoryUpdateModal from './components/MandatoryUpdateModal';
import SimulationPanel from './components/SimulationPanel';
import CustomDialog from './components/CustomDialog';

import './App.css';

function AppContent() {
  const { isLoggedIn, currentPath } = useApp();

  // If not logged in, show the Auth screen (tabs for login & register)
  if (!isLoggedIn) {
    return <Auth />;
  }

  // Define screen display based on the active path
  const renderPage = () => {
    switch (currentPath) {
      case '/dashboard':
        return <Dashboard />;
      case '/history':
        return <History />;
      case '/requests':
        return <Requests />;
      case '/hr':
        return <HR />;
      case '/accounting':
        return <Accounting />;
      case '/admin':
        return <Admin />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <MainLayout>
      <div key={currentPath} className="animate-fade-in flex-1 flex flex-col min-h-0">
        {renderPage()}
      </div>
      
      {/* Global locked overlay checking if profile details are incomplete */}
      <MandatoryUpdateModal />
      
      {/* Global floating simulator HUD - visible in development or with ?sim=true query parameter */}
      {(import.meta.env.DEV || window.location.search.includes('sim=true')) && <SimulationPanel />}

      {/* Reusable beautiful global overlay dialog */}
      <CustomDialog />
    </MainLayout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
