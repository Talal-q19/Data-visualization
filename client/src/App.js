import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Home from './pages/home';
import Login from './pages/login';
import axios from 'axios';
import { Navigate } from 'react-router-dom';
import GraphPage from './pages/graphPage';
import SummaryPage from './pages/summaryPage';
import InsightsPage from './pages/InsightsPage';
import LandingPage from './pages/Ulanding';
import NLandingPage from './pages/landing';
import SignUp from './pages/signup';


const ProtectedRoute = ({ element }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        axios.get('http://localhost:5000/check_session', { withCredentials: true })
            .then(() => setIsAuthenticated(true))
            .catch(() => {
                setIsAuthenticated(false);
            });
    }, []);

    if (isAuthenticated === null) return <div>Loading...</div>;
    
    return isAuthenticated ? element : <Navigate to="/login" />;
};


const App = () => {
    return (
        <Router>
            <Routes>
            <Route path="/" element={<NLandingPage />} />
            <Route path="/signup" element={<SignUp />} />
                <Route path="/land" element={<ProtectedRoute element={<LandingPage />} />} />
                <Route path="/graph" element={<ProtectedRoute element={<GraphPage />} />} />
                <Route path="/summary" element={<ProtectedRoute element={<SummaryPage />} />} />
                <Route path="/insight" element={<ProtectedRoute element={<InsightsPage />} />} />
                <Route path="/table" element={<ProtectedRoute element={<Home />} />} />
                <Route path="/login" element={<Login />} />
            </Routes>
        </Router>
    );
};

export default App;


