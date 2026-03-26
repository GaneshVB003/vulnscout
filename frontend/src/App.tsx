import { useState } from 'react';
import { Shield, AlertTriangle, ArrowRight, Activity, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import ScanningPage from './pages/ScanningPage';
import ResultsPage from './pages/ResultsPage';
import HistoryPage from './pages/HistoryPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-900 text-slate-100">
        <header className="border-b border-slate-700/50 bg-slate-800/50 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="w-8 h-8 text-cyan-400" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                VulnScout
              </h1>
            </div>
            <nav className="flex items-center space-x-4">
              <NavLink to="/" icon={<Activity className="w-4 h-4" />} text="Scan" />
              <NavLink to="/history" icon={<Clock className="w-4 h-4" />} text="History" />
            </nav>
          </div>
        </header>

        <main>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/scanning/:scanId" element={<ScanningPage />} />
            <Route path="/results/:scanId" element={<ResultsPage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Routes>
        </main>

        <footer className="border-t border-slate-700/50 py-6 mt-auto">
          <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
            <p className="flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              VulnScout is for authorized security testing only. Unauthorized scanning is illegal.
            </p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

interface NavLinkProps {
  to: string;
  icon: React.ReactNode;
  text: string;
}

function NavLink({ to, icon, text }: NavLinkProps) {
  const navigate = useNavigate();
  const isActive = window.location.pathname === to;

  return (
    <button
      onClick={() => navigate(to)}
      className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
        isActive 
          ? 'bg-cyan-500/20 text-cyan-400' 
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
      }`}
    >
      {icon}
      <span className="text-sm font-medium">{text}</span>
    </button>
  );
}

export default App;