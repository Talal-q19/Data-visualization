import React from 'react';
import { Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import logo from '../images/logo.jpeg';
import 'animate.css';
import { useEffect, useRef } from 'react';
import { Fade } from 'react-awesome-reveal';
import axios from 'axios';
import { useState } from 'react';

const LandingPage = () => {
  const typewriter = useRef(null);
  const typewriter2 = useRef(null);
  const button1 = useRef(null);
  const button2 = useRef(null);
  const ctaButton = useRef(null);

  const text1 = 'Transform Data into Insights';
  const text2 = 'Analyze, visualize, and uncover patterns with AI-powered analytics.';

  let index1 = 0;
  let index2 = 0;

 function typeWriter() {
   if (typewriter.current && index1 < text1.length) {
     typewriter.current.textContent += text1.charAt(index1);
     index1++;
     setTimeout(typeWriter, 150);
   }
 }
 
 function typeWriter2() {
   if (typewriter2.current && index2 < text2.length) {
     typewriter2.current.textContent += text2.charAt(index2);
     index2++;
     setTimeout(typeWriter2, 100);
   }
 }

  useEffect(() => {
      typeWriter();
      setTimeout(() => {
        typeWriter2();
      }, );

      // Animate buttons
     
  }, []);


  const [user, setUser] = useState(null);

const handleLogout = async () => {
  try {
    await axios.post('http://localhost:5000/logout', {}, { withCredentials: true });
    window.location.href = '/login'; // Redirect after logout
  } catch (error) {
    alert('Logout failed');
  }
};

useEffect(() => {
  fetch("http://localhost:5000/check_session", {
    method: "GET",
    credentials: "include", // Required for cookies to be sent
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("Session Data:", data); // Log response data
      if (data.user) {
        setUser(data.user); // Set the user data in state
      }
    })
    .catch((err) => console.error("Error fetching session:", err));
}, []);

  return (
      <div>
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
      {user ? (
        <div className="d-flex align-items-center p-2 border rounded-3 text-white">
          <span className="me-3">{user}</span> {/* Display username */}
          <button className="btn btn-light btn-sm" onClick={handleLogout}>Logout</button>
        </div>
      ) : (
        <div className="d-flex align-items-center p-2 border rounded-3 text-white">
          <span className="me-3">Guest</span> {/* Display Guest when no user */}
        </div>
      )}
    </div>

 {/* Login Link when no user */}
 {!user && (
   <ul className="navbar-nav ms-3">
     <li className="nav-item"><Link to="/login" className="nav-link">Login</Link></li>
   </ul>
 )}
  </div>
</div>
</nav>



        <Fade in={true} duration={1500} delay={500}>
          <header className="bg-dark text-white text-center py-5">
            <div className="container">
              <h1 className="display-4" ref={typewriter}></h1>
              <p className="lead" ref={typewriter2}></p>
              <div className="mt-4">
                <Link to="/table" className="btn btn-light btn-lg mx-2" ref={button1} style={{ padding: '10px 30px', fontSize: '18px' }}>Upload Data</Link>
                <Link to="/summary" className="btn btn-outline-light btn-lg mx-2" ref={button2} style={{ padding: '10px 30px', fontSize: '18px' }}>View Summary</Link>
              </div>
            </div>
          </header>
        </Fade>

          {/* Features Section */}
      <section className="container  my-5">
        <div className="row">
          <div className="col-md-4 text-center" style={{ height: '200px' }}>
            <Fade left duration={1000}>
              <i className="fas fa-chart-bar fa-3x text-primary" style={{ marginBottom: '20px' }}></i>
              <h4>Data Insights</h4>
              <p>Leverage AI-powered insights to detect anomalies and patterns in your data.</p>
            </Fade>
          </div>
          <div className="col-md-4 text-center" style={{ height: '200px' }}>
            <Fade left duration={1000} delay={500}>
              <i className="fas fa-file-alt fa-3x text-success" style={{ marginBottom: '20px' }}></i>
              <h4>Comprehensive Reports</h4>
              <p>Generate detailed reports to understand key metrics and trends.</p>
            </Fade>
          </div>
          <div className="col-md-4 text-center" style={{ height: '200px' }}>
            <Fade left duration={1000} delay={1000}>
              <i className="fas fa-chart-line fa-3x text-danger" style={{ marginBottom: '20px' }}></i>
              <h4>Visual Analytics</h4>
              <p>Interactive graphs and charts for better decision-making.</p>
            </Fade>
          </div>
        </div>
      </section>

        {/* Data Transformation Animation */}
        <section className="text-center my-5 bg-light" style={{  paddingTop: '50px' , paddingBottom: '50px'}}>
      <Fade bottom duration={1000}>
        <h2>How Your Data Evolves</h2>
        <p>From raw numbers to meaningful insights—experience the power of AI-driven analysis.</p>
        <div className="data-animation">
          <span className="data-block">101</span>
          <span className="data-block">202</span>
          <span className="data-block">303</span>
          <span className="arrow">➡️</span>
          <i className="fas fa-chart-bar fa-3x text-warning"></i>
        </div>
      </Fade>
    </section>

          {/* How It Works Section */}
        <section className=" py-5">
          <div className="container">
            <h2 className="text-center mb-4">How It Works</h2>
            <div className="row text-center d-flex justify-content-between">
              <div style={{ display: 'flex' }}>
                <Fade left duration={1000}>
                  <div className="col-lg-3 col-md-6 mb-4" style={{ width: '300px', height: '200px', marginRight: '20px', paddingBottom: '70px' }}>
                    <div style={{ marginTop: '40px' }}>
                      <i className="fas fa-upload fa-3x text-primary" style={{ marginBottom: '20px' }}></i>
                      <h5 className="mt-2">Upload Data</h5>
                    </div>
                  </div>
                </Fade>
                <Fade left duration={1000} delay={1000}>
                  <div className="col-lg-3 col-md-6 mb-4" style={{ width: '300px', height: '200px', marginRight: '20px', paddingBottom: '70px' }}>
                  <div style={{ marginTop: '40px' }}>
                      <i className="fas fa-chart-pie fa-3x text-warning" style={{ marginBottom: '20px' }}></i>
                      <h5 className="mt-2">Visual Reports</h5>
                    </div> 
                  </div>
                </Fade>
                <Fade left duration={1000} delay={500}>
                  <div className="col-lg-3 col-md-6 mb-4" style={{ width: '300px', height: '200px', marginRight: '20px', paddingBottom: '70px' }}>
                   <div style={{ marginTop: '40px' }}>
                     <i className="fas fa-robot fa-3x text-success" style={{ marginBottom: '20px' }}></i>
                     <h5 className="mt-2">AI Analysis</h5>
                   </div>
                  </div>
                </Fade>
                <Fade left duration={1000} delay={1500}>
                  <div className="col-lg-3 col-md-6 mb-4" style={{ width: '300px', height: '200px', marginRight: '20px', paddingBottom: '70px' }}>
                   <div style={{ marginTop: '40px' }}>
                     <i className="fas fa-tachometer-alt fa-3x text-danger" style={{ marginBottom: '20px' }}></i>
                     <h5 className="mt-2">Actionable Insights</h5>
                   </div>
                  </div>
                </Fade>
              </div>
            </div>
          </div>
        </section>

          {/* Call to Action Section */}
          <section className="bg-dark text-white text-center py-4">
              <div className="container">
                  <Fade bottom duration={1000}>
                      <h3>Ready to Unlock Your Data’s Potential?</h3>
                      <Link to="/table" className="btn btn-light btn-lg mt-3" ref={ctaButton} style={{ padding: '12px 40px', fontSize: '20px' }}>Get Started</Link>
                  </Fade>
              </div>
          </section>

          {/* Footer */}
          <footer className="bg-dark text-white text-center py-3">
              <Fade bottom duration={1000}>
                  <p>&copy; 2025 Data Insights Hub | <a href="#" className="text-white">Privacy Policy</a></p>
                  <div>
                      <a href="#" className="text-white me-3"><i className="fab fa-twitter"></i></a>
                      <a href="#" className="text-white me-3"><i className="fab fa-facebook"></i></a>
                      <a href="#" className="text-white"><i className="fab fa-linkedin"></i></a>
                  </div>
              </Fade>
          </footer>
            {/* CSS Styles */}
    <style>
      {`
        .data-animation {
          font-size: 2rem;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          margin-top: 20px;
        }
        .data-block {
          background-color: #007bff;
          color: white;
          padding: 10px 15px;
          border-radius: 5px;
          animation: bounce 1s infinite alternate;
        }
        @keyframes bounce {
          from { transform: translateY(0px); }
          to { transform: translateY(-10px); }
        }
      `}
    </style>
      </div>
  );
};

export default LandingPage;
