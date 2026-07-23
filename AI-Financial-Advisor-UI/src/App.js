import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import MainContainer from './webpages/MainContainer';
import StockDetails from './webpages/StockDetails';
import Portfolio from './webpages/Portfolio';
import Dashboard from './webpages/Dashboard';
import Account from './webpages/Account';
import InvestBrainTester from './webpages/InvestBrainTester';
import Simulation from './webpages/Simulation';
import LandingPage from './webpages/LandingPage';
import LoginPage from './webpages/LoginPage';
import SignupPage from './webpages/SignUpPage';
import { AuthContext } from './AuthContext';

function App() {
  const { isAuthenticated } = useContext(AuthContext);

  return (
    <Router>
      <div className="App">
        {isAuthenticated && <Sidebar />}
        <div className="app-content">
          {isAuthenticated && <TopBar />}
          <main>
            <Routes>
              <Route path="/" element={isAuthenticated ? <Navigate to="/advisor" /> : <LandingPage />} />
              <Route path="/login" element={isAuthenticated ? <Navigate to="/advisor" /> : <LoginPage />} />
              <Route path="/signup" element={isAuthenticated ? <Navigate to="/advisor" /> : <SignupPage />} />
              {isAuthenticated ? (
                <>
                  <Route path="/advisor" element={<MainContainer />} />
                  <Route path="/simulation" element={<Simulation />} />
                  <Route path="/stocks/:symbol" element={<StockDetails />} />
                  <Route path="/portfolio" element={<Portfolio />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/account" element={<Account />} />
                  <Route path="/invest-brain-tester" element={<InvestBrainTester />} />
                </>
              ) : (
                <>
                  <Route path="/advisor" element={<Navigate to="/login" />} />
                  <Route path="/simulation" element={<Navigate to="/login" />} />
                  <Route path="/stocks/:symbol" element={<Navigate to="/login" />} />
                  <Route path="/portfolio" element={<Navigate to="/login" />} />
                  <Route path="/dashboard" element={<Navigate to="/login" />} />
                  <Route path="/account" element={<Navigate to="/login" />} />
                  <Route path="/invest-brain-tester" element={<Navigate to="/login" />} />
                </>
              )}
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
