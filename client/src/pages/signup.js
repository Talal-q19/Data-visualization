import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'animate.css';
import { Fade } from 'react-awesome-reveal';
import logo from '../images/logo.jpeg';

const SignUp = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSignUp = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        try {
            const response = await axios.post('http://localhost:5000/register', { username, password });
            if (response.status === 201) navigate('/login');
        } catch (error) {
            setError(error.response?.data?.error || 'Registration failed');
        }
    };

    return (
        <div className="d-flex flex-column min-vh-100 bg-dark">
            {/* Navbar */}
            <nav className="navbar navbar-expand-lg navbar-dark bg-dark py-3">
                <div className="container d-flex justify-content-between">
                    {/* Logo */}
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

                        {/* User Box */}
                        <div className="d-flex align-items-center">
                            <div className="d-flex align-items-center p-2 border rounded-3 text-white">
                                <span className="me-3">Guest</span>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Signup Form */}
            <div className="flex-grow-1 d-flex justify-content-center align-items-center">
                <Fade duration={1000}>
                    <div className="card p-4 shadow-lg rounded-4" style={{ width: '400px' }}>
                        <div className="text-center">
                            <img src={logo} alt="Logo" width="60" height="60" className="mb-3" />
                            <h2 className="mb-4">Sign Up</h2>
                        </div>
                        <form onSubmit={handleSignUp}>
                            <div className="mb-3">
                                <label className="form-label">Username</label>
                                <input type="text" className="form-control" placeholder="Enter your username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Password</label>
                                <input type="password" className="form-control" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Confirm Password</label>
                                <input type="password" className="form-control" placeholder="Confirm your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                            </div>
                            {error && <div className="alert alert-danger" role="alert">{error}</div>}
                            <button type="submit" className="btn btn-dark w-100">Sign Up</button>
                        </form>
                        <div className="text-center mt-3">
                        <a href="/login" className="text-muted">Already have an account? Login</a>
                    </div>
                    </div>
                </Fade>
            </div>

            {/* Footer */}
            <footer className="bg-dark text-white text-center py-3 mt-auto">
                <Fade bottom duration={1000}>
                    <p>&copy; 2025 Data Insights Hub | <a href="#" className="text-white">Privacy Policy</a></p>
                </Fade>
            </footer>
        </div>
    );
};

export default SignUp;
