import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactPaginate from 'react-paginate';
import 'bootstrap/dist/css/bootstrap.min.css';
import logo from '../images/logo.jpeg';
import { Link } from 'react-router-dom';
import '@fortawesome/fontawesome-free/css/all.min.css';

const TableSummaryPage = () => {
    const [tableName, setTableName] = useState('');
    const [summary, setSummary] = useState({});
    const [tables, setTables] = useState([]);
    const [filters, setFilters] = useState({});
    const [filteredSummary, setFilteredSummary] = useState({});
    const [summaryPageCount, setSummaryPageCount] = useState({});
    const [currentSummaryPage, setCurrentSummaryPage] = useState({});

    // Fetch all tables
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

    // Fetch summary for the selected table
    const fetchTableSummary = async (name) => {
        try {
            const res = await axios.get(`http://localhost:5000/table_summary?table_name=${name}`);
            setSummary(res.data.summary);
            setFilteredSummary(res.data.summary); // Default to unfiltered summary
            setSummaryPageCount(
                Object.keys(res.data.summary).reduce((acc, column) => ({
                    ...acc,
                    [column]: Math.ceil(res.data.summary[column].length / 5),
                }), {})
            );
            setCurrentSummaryPage(
                Object.keys(res.data.summary).reduce((acc, column) => ({
                    ...acc,
                    [column]: 0,
                }), {})
            );
        } catch (error) {
            console.error(error);
        }
    };

    // Handle table selection
    const handleTableChange = (e) => {
        const selectedTable = e.target.value;
        setTableName(selectedTable);
        fetchTableSummary(selectedTable);
    };

    // Handle pagination for each column
    const handleSummaryPageClick = (column, event) => {
        setCurrentSummaryPage(prevState => ({
            ...prevState,
            [column]: event.selected,
        }));
    };

    // Handle filter changes
    const handleFilterChange = (column, value) => {
        setFilters(prev => ({ ...prev, [column]: value }));

        if (!value) {
            setFilteredSummary(summary);
        } else {
            const newFilteredSummary = {};
            Object.keys(summary).forEach((col) => {
                newFilteredSummary[col] = summary[col].filter((row) =>
                    row[col]?.toString().toLowerCase().includes(value.toLowerCase())
                );
            });
            setFilteredSummary(newFilteredSummary);
        }

        // Reset pagination after filtering
        setCurrentSummaryPage(
            Object.keys(summary).reduce((acc, column) => ({
                ...acc,
                [column]: 0,
            }), {})
        );
    };

    useEffect(() => {
        fetchTables();
    }, []);


    const handleLogout = async () => {
        try {
            await axios.post('http://localhost:5000/logout', {}, { withCredentials: true });
            window.location.href = '/login';  // Redirect after logout
        } catch (error) {
            alert('Logout failed');
        }
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

            {/* Main Content */}
            <div className="container mt-4">
                {/* Table Selection */}
                <h3>Select Table for Summary</h3>
                <select className="form-select" value={tableName} onChange={handleTableChange}>
                    <option value="">-- Select Table --</option>
                    {tables.map((table, index) => (
                        <option key={index} value={table}>{table}</option>
                    ))}
                </select>

                {/* Filters */}
                {tableName && (
                    <div className="mt-4">
                        <h3>Filters</h3>
                        <div className="row">
                            {Object.keys(summary).map((col, index) => (
                                <div className="col-md-3 mb-2" key={index}>
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

                {/* Summary Table */}
                {tableName && (
                    <div>
                        <h3 className="mt-4">Summary of {tableName}</h3>
                        {Object.keys(filteredSummary).map((column, index) => (
                            <div key={index} className="mb-4">
                                <h4 className="mt-3">{column}</h4>
                                <table className="table table-bordered table-striped mt-2">
                                    <thead className="table-dark">
                                        <tr>
                                            <th>{column}</th>
                                            <th>Count</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredSummary[column]
                                            ?.slice(
                                                currentSummaryPage[column] * 5,
                                                (currentSummaryPage[column] + 1) * 5
                                            )
                                            .map((row, i) => (
                                                <tr key={i}>
                                                    <td>{row[column]}</td>
                                                    <td>{row.count}</td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>

                                {/* Pagination Below Each Table Section */}
                                <nav>
                                    <ul className="pagination justify-content-center">
                                        <ReactPaginate
                                            previousLabel={'«'}
                                            nextLabel={'»'}
                                            breakLabel={'...'}
                                            pageCount={summaryPageCount[column] || 1}
                                            onPageChange={(event) => handleSummaryPageClick(column, event)}
                                            containerClassName={'pagination'}
                                            pageClassName={'page-item'}
                                            pageLinkClassName={'page-link'}
                                            previousClassName={'page-item'}
                                            previousLinkClassName={'page-link'}
                                            nextClassName={'page-item'}
                                            nextLinkClassName={'page-link'}
                                            breakClassName={'page-item'}
                                            breakLinkClassName={'page-link'}
                                            activeClassName={'active'}
                                        />
                                    </ul>
                                </nav>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TableSummaryPage;
