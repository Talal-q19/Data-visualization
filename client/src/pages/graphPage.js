import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Link } from 'react-router-dom';
import logo from '../images/logo.jpeg';

Chart.register(...registerables);

const GraphPage = () => {
    const [tableName, setTableName] = useState('');
    const [tables, setTables] = useState([]);
    const [columns, setColumns] = useState([]);
    const [data, setData] = useState({});
    const [chartTypes, setChartTypes] = useState({});

    useEffect(() => {
        fetchTables();
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

    const handleTableSelect = async (e) => {
        const selectedTable = e.target.value;
        setTableName(selectedTable);
        fetchColumns(selectedTable);
        fetchData(selectedTable);
    };

    const fetchColumns = async (name) => {
        const res = await axios.get(`http://localhost:5000/table_schema?table_name=${name}`);
        setColumns(res.data.columns);
    };

    const fetchData = async (table) => {
        if (!table) return;
        const res = await axios.get(`http://localhost:5000/table_summary?table_name=${table}`);
        setData(res.data.summary);
    };

    const handleChartTypeChange = (column, type) => {
        setChartTypes((prev) => ({ ...prev, [column]: type }));
    };

    const [user, setUser] = useState(null);

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
    const handleLogout = async () => {
        try {
            await axios.post('http://localhost:5000/logout', {}, { withCredentials: true });
            window.location.href = '/login';  // Redirect after logout
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
                <select className="form-select mb-3" onChange={handleTableSelect} value={tableName}>
                    <option value="">-- Select Table --</option>
                    {tables.map((table, index) => (
                        <option key={index} value={table}>{table}</option>
                    ))}
                </select>

                {Object.keys(data).length > 0 && (
                    <div>
                        <h3>Graphical Representation</h3>
                        {columns.map((col, index) => (
                            <div key={index} className="mb-4">
                                <h4>{col}</h4>
                                <select className="form-select mb-2" onChange={(e) => handleChartTypeChange(col, e.target.value)} value={chartTypes[col] || ''}>
                                    <option value="">-- Select Chart Type --</option>
                                    <option value="Bar">Bar Chart</option>
                                    <option value="Line">Line Chart</option>
                                    <option value="Pie">Pie Chart</option>
                                    <option value="Doughnut">Doughnut Chart</option>
                                </select>
                                {data[col] && chartTypes[col] && (
                                    (() => {
                                        const chartData = {
                                            labels: data[col].map(item => item[col]),
                                            datasets: [{
                                                label: col,
                                                data: data[col].map(item => item.count),
                                                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4CAF50', '#9966FF'],
                                            }],
                                        };

                                        switch (chartTypes[col]) {
                                            case 'Line': return <Line data={chartData} />;
                                            case 'Pie': return <Pie data={chartData} />;
                                            case 'Doughnut': return <Doughnut data={chartData} />;
                                            default: return <Bar data={chartData} />;
                                        }
                                    })()
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GraphPage;
