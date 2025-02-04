import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import logo from '../images/logo.jpeg';
import '@fortawesome/fontawesome-free/css/all.min.css';

Chart.register(...registerables);

const GraphPage = () => {
    const [tableName, setTableName] = useState('');
    const [tables, setTables] = useState([]);
    const [columns, setColumns] = useState([]);
    const [filters, setFilters] = useState({});
    const [data, setData] = useState([]);
    const [chartType, setChartType] = useState('Bar');
    const [xAxis, setXAxis] = useState('');
    const [yAxis, setYAxis] = useState('');

    useEffect(() => {
        fetchTables();
    }, []);

    const fetchTables = async () => {
        try {
            const res = await axios.get('http://localhost:5000/get_tables');
            setTables(res.data.tables);
        } catch (error) {
            console.error(error);
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
        setFilters({});
    };

    const fetchData = async (table, activeFilters = filters) => {
        if (!table) return;

        const res = await axios.post('http://localhost:5000/filter_data', {
            table_name: table,
            filters: activeFilters,
        });

        setData(res.data.data);
    };

    const handleFilterChange = (column, value) => {
        const newFilters = { ...filters, [column]: value };
        setFilters(newFilters);
        fetchData(tableName, newFilters);
    };

    const handleXAxisChange = (e) => {
        setXAxis(e.target.value);
    };

    const handleYAxisChange = (e) => {
        setYAxis(e.target.value);
    };

    const chartData = {
        labels: data.map((item) => item[xAxis]),
        datasets: [{
            label: yAxis,
            data: data.map((item) => {
                const value = item[yAxis];
                // If the value is numeric, return it, otherwise return null (skipping non-numeric values)
                return isNaN(value) ? null : value;
            }).filter(value => value !== null),  // Remove null values (non-numeric)
            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4CAF50', '#9966FF'],
            borderColor: 'rgba(75,192,192,1)',
            borderWidth: 1,
        }],
    };
    const [user, setUser] = useState(null);

    useEffect(() => {
      fetch("http://localhost:5000/check_session", {
        method: "GET",
        credentials: "include", // Required for cookies to be sent
      })
        .then((res) => res.json())
        .then((data) => {
          console.log("Session Data:", data); // Log response data
          if (data.user) {
            setUser(data.user);
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
      <nav className="navbar navbar-dark bg-dark" style={{ height: "60px", padding: "20px" }}>
          <div className="container-fluid">
            <a className="navbar-brand" href="/">
              <img
                src={logo}
                alt="Logo"
                width="40px"
                height="40px"
                style={{ position: "relative", top: "-37px", left: "-20px" }}
              />
            </a>
            <div className="d-flex justify-content-center align-items-center">
              <h1 className="text-white" style={{ fontSize: "32px", width: "300px", height: "100px", marginTop: "-10px" , marginLeft: "280px" }}>
                Graphical View
              </h1>
            </div>
            <div className="d-flex align-items-center">
           
            {user && <span className="text-white me-3" style={{ fontSize: "18px" , marginTop: "-70px"}}>Username: {user}</span>}
            
           <Link to="/" className="btn btn-light" style={{ 
             border: "none", 
             padding: "4px 16px", 
             fontSize: "16px", 
             marginTop: "-70px"
            }}>
             <i className="fas fa-table" style={{ marginRight: "8px" }}></i>
             Table view
           </Link>


            <span style={{ margin: "0 5px" }}></span>
            <Link to="/summary" className="btn btn-light" style={{ 
           border: "none", 
           padding: "4px 16px", 
           fontSize: "16px", 
           marginTop: "-70px"
          }}>
           <i className="fas fa-file-alt" style={{ marginRight: "8px" }}></i>
           Summary
         </Link>


            <span style={{ margin: "0 5px" }}></span>



           <button
             className="btn btn-danger"
             style={{
               border: "none",
               padding: "4px 16px",
               fontSize: "16px",
               marginTop: "-70px",
               backgroundColor: "#dc3545",
               color: "#ffffff"
             }}
             onClick={handleLogout}
           >
             <i className="fas fa-sign-out-alt" style={{ marginRight: "8px" }}></i>
             Logout
           </button>
            
      
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

                {columns.length > 0 && (
                    <div className="mb-4">
                        <h3>Filters</h3>
                        <div className="row">
                            {columns.map((col) => (
                                <div className="col-md-3 mb-2" key={col}>
                                    <label className="form-label">{col}</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        onChange={(e) => handleFilterChange(col, e.target.value)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {data.length > 0 && (
                    <div>
                        <h3>Graph Representation</h3>
                        <select className="form-select mb-3" onChange={(e) => setChartType(e.target.value)} value={chartType}>
                            <option value="Bar">Bar Chart</option>
                            <option value="Line">Line Chart</option>
                            <option value="Pie">Pie Chart</option>
                            <option value="Doughnut">Doughnut Chart</option>
                        </select>

                        <div className="mb-3">
                            <h4>Select X Axis</h4>
                            <select className="form-select" onChange={handleXAxisChange} value={xAxis}>
                                <option value="">-- Select X Axis --</option>
                                {columns.map((col, index) => (
                                    <option key={index} value={col}>{col}</option>
                                ))}
                            </select>
                        </div>

                        <div className="mb-3">
                            <h4>Select Y Axis</h4>
                            <select className="form-select" onChange={handleYAxisChange} value={yAxis}>
                                <option value="">-- Select Y Axis --</option>
                                {columns.map((col, index) => (
                                    <option key={index} value={col}>{col}</option>
                                ))}
                            </select>
                        </div>

                        <div className="mb-4">
                            {chartType === 'Bar' && <Bar data={chartData} />}
                            {chartType === 'Line' && <Line data={chartData} />}
                            {chartType === 'Pie' && <Pie data={chartData} />}
                            {chartType === 'Doughnut' && <Doughnut data={chartData} />}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GraphPage;
