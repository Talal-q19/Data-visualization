import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Home from './pages/home';
import Login from './pages/login';
import axios from 'axios';
import { Navigate } from 'react-router-dom';
import GraphPage from './pages/graphPage';

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
                <Route path="/" element={<ProtectedRoute element={<Home />} />} />
                <Route path="/graph" element={<ProtectedRoute element={<GraphPage />} />} />
                <Route path="/login" element={<Login />} />
            </Routes>
        </Router>
    );
};

export default App;


