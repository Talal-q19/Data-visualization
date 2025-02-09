import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'animate.css';
import { Fade } from 'react-awesome-reveal';
import logo from '../images/logo.jpeg';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:5000/login', { username, password }, { withCredentials: true });
            if (response.status === 200) navigate('/land');
        } catch (error) {
            setError(error.response?.data?.error || 'Login failed');
        }
    };

    return (
        <div className="d-flex flex-column min-vh-100 bg-dark">
        {/* Navbar */}
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark py-3">
            <div className="container d-flex justify-content-between">
                {/* Logo on the left */}
                <div className="d-flex align-items-center">
                    <a className="navbar-brand d-flex align-items-center" href="/">
                        <img src={logo} alt="Logo" width="50" height="50" className="me-2" />
                    </a>
                </div>
    
                {/* Navbar Toggler */}
                <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                    <span className="navbar-toggler-icon"></span>
                </button>
    
                {/* Navbar Links */}
                <div className="collapse navbar-collapse justify-content-end" id="navbarNav">
                    <ul className="navbar-nav me-auto">
                        <li className="nav-item"><Link to="/" className="nav-link">Home</Link></li>
                        <li className="nav-item"><Link to="/table" className="nav-link">Reports</Link></li>
                        <li className="nav-item"><Link to="/insight" className="nav-link">Insights</Link></li>
                        <li className="nav-item"><Link to="/graph" className="nav-link">Graphs</Link></li>
                        <li className="nav-item"><Link to="/summary" className="nav-link">Summary</Link></li>
                    </ul>
    
                    {/* Username and Logout Box */}
                    <div className="d-flex align-items-center">
                        <div className="d-flex align-items-center p-2 border rounded-3 text-white">
                            <span className="me-3">Guest</span> {/* Display Guest as placeholder */}
                        </div>
                    </div>
    
                   
                </div>
            </div>
        </nav>
    
        {/* Main Content Wrapper */}
        <div className="flex-grow-1 d-flex justify-content-center align-items-center">
            <Fade duration={1000}>
                <div className="card p-4 shadow-lg rounded-4" style={{ width: '400px' }}>
                    <div className="text-center">
                        <img src={logo} alt="Logo" width="60" height="60" className="mb-3" />
                        <h2 className="mb-4">Welcome Back</h2>
                    </div>
                    <form onSubmit={handleLogin}>
                        <div className="mb-3">
                            <label className="form-label">Username</label>
                            <input type="text" className="form-control" placeholder="Enter your username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Password</label>
                            <input type="password" className="form-control" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        </div>
                        {error && <div className="alert alert-danger" role="alert">{error}</div>}
                        <button type="submit" className="btn btn-dark w-100">Login</button>
                    </form>
                    <div className="text-center mt-3">
                        <a href="/signup" className="text-muted">Not a user? Sign Up</a>
                    </div>
                </div>
            </Fade>
        </div>
    
        {/* Footer */}
        <footer className="bg-dark text-white text-center py-3 mt-auto">
            <Fade bottom duration={1000}>
                <p>&copy; 2025 Data Insights Hub | <a href="#" className="text-white">Privacy Policy</a></p>
                <div>
                    <a href="#" className="text-white me-3"><i className="fab fa-twitter"></i></a>
                    <a href="#" className="text-white me-3"><i className="fab fa-facebook"></i></a>
                    <a href="#" className="text-white"><i className="fab fa-linkedin"></i></a>
                </div>
            </Fade>
        </footer>
    </div>
    
        
    );
};

export default Login;
