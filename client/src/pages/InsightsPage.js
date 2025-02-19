import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactPaginate from 'react-paginate';
import 'bootstrap/dist/css/bootstrap.min.css';
import logo from '../images/logo.jpeg';
import { Link } from 'react-router-dom';

const InsightsPage = () => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [insights, setInsights] = useState([]);
  const [correlations, setCorrelations] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [user, setUser] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    fetchTables();
 
  }, []);

 
useEffect(() => {
  fetch("http://localhost:5000/check_session", {
    method: "GET",
    credentials: "include", // Required for cookies to be sent
  })
    .then((res) => res.json())
    .then((data) => {
      console.log(`Session Data for User ${data.user_id}:`, data); // Log response data with user ID
      if (data.user_id) {
        setUser(data.username);
      }
    })
    .catch((err) => console.error("Error fetching session:", err));
}, []);
const fetchTables = async () => {
  try {
      const res = await axios.get('http://localhost:5000/get_tables', {
          withCredentials: true,  // Ensures session cookie is sent with the request
      });
      setTables(res.data.tables);
  } catch (error) {
      console.error('Error fetching tables:', error);
  }
};

  const fetchInsights = async () => {
    if (!selectedTable) return;
  
    try {
      const res = await axios.get(`http://localhost:5000/analyze_table?table_name=${selectedTable}`);
  
      // Debug log the response data
      console.log("Fetched Insights Response:", res.data);
  
      // Ensure res.data is structured properly
      const data = res.data || {};
  
      // Additional debug logs
      console.log("Insights:", data.insights || []);
      console.log("Correlations:", data.correlations || []);
      console.log("Anomalies:", data.anomalies || []);
  
      // Update state with spread operator to force re-render
      setInsights([...data.insights || []]);
      setCorrelations([...data.correlations || []]);
      setAnomalies([...data.anomalies || []]);
  
      // Calculate total pages based on the number of insights
      setPageCount(Math.ceil((data.insights?.length || 0) / 10));
  
    } catch (error) {
      console.error('Error fetching insights:', error);
  
      if (error.response) {
        console.error('Server responded with:', error.response.status, error.response.data);
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Request error:', error.message);
      }
    }
  };
  

  const handlePageClick = (event) => {
    setCurrentPage(event.selected);
  };

  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:5000/logout', {}, { withCredentials: true });
      window.location.href = '/login';
    } catch (error) {
      alert('Logout failed');
    }
  };

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
             <li className="nav-item ms-3"><Link to="/login" className="nav-link">Login</Link></li>
           )}
         </div>
       </div>
     </nav>

      <div className="container mt-4">
        <h3>Select Table</h3>
        <select className="form-select" onChange={(e) => setSelectedTable(e.target.value)} value={selectedTable}>
          <option value="">-- Select Table --</option>
          {tables.map((table, index) => (
            <option key={index} value={table}>{table}</option>
          ))}
        </select>
        <button className="btn btn-primary mt-3" onClick={fetchInsights} disabled={!selectedTable}>Analyze Insights</button>

        {insights.length > 0 && (
  <div className="mt-4">
    <h3>Column Insights</h3>
    <div className="table-responsive">
      <table className="table table-bordered table-striped">
        <thead className="table-dark">
          <tr>
            {Object.keys(insights[0]).map((key, index) => (
              <th key={index}>{key.replace(/_/g, ' ')}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {insights.slice(currentPage * 10, (currentPage + 1) * 10).map((insight, index) => (
            <tr key={index}>
              {Object.values(insight).map((value, i) => (
                <td key={i}>{value !== null ? value : 'N/A'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}



{correlations.length > 0 && (
  <div className="mt-4">
    <h3>Categorical Correlations</h3>
    <table className="table table-bordered table-striped">
      <thead className="table-dark">
        <tr>
          <th>Columns</th>
          <th>Correlation Score</th>
        </tr>
      </thead>
      <tbody>
        {correlations.filter(cor => cor.columns && cor.correlation_score).map((cor, index) => (
          <tr key={index}>
            <td>{Array.isArray(cor.columns) ? cor.columns.join(' & ') : 'N/A'}</td>
            <td>{cor.correlation_score}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}



        {anomalies.length > 0 && (
          <div className="mt-4">
            <h3>Anomalies Detected</h3>
            <table className="table table-bordered table-striped">
              <thead className="table-dark">
                <tr>
                  {Object.keys(anomalies[0]).map((key, index) => (
                    <th key={index}>{key.replace('_', ' ').toUpperCase()}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {anomalies.map((anomaly, index) => (
                  <tr key={index}>
                    {Object.values(anomaly).map((value, idx) => (
                      <td key={idx}>{value || "N/A"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InsightsPage;
