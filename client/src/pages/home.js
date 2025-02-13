import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactPaginate from 'react-paginate';
import { debounce } from 'lodash';
import 'bootstrap/dist/css/bootstrap.min.css';
import logo from '../images/logo.jpeg';
import { Link } from 'react-router-dom';
import { shiftRight } from 'three/tsl';

const App = () => {
    const [file, setFile] = useState(null);
    const [columns, setColumns] = useState([]);
    const [filters, setFilters] = useState({});
    const [data, setData] = useState([]);
    const [pageCount, setPageCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);
    const [tableName, setTableName] = useState('');
    const [tables, setTables] = useState([]);
    const [editMode, setEditMode] = useState(false); // New state for toggle edit/display mode
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [tableToDelete, setTableToDelete] = useState('');

    
    

    const handleFileChange = (e) => setFile(e.target.files[0]);

    const handleUpload = async () => {
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            const response = await axios.post('http://localhost:5000/upload', formData, { withCredentials: true });
            if (response.status === 200) {
                fetchTables();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchTables = async () => {
        try {
            const res = await axios.get('http://localhost:5000/get_tables', {
                withCredentials: true,
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
        fetchData(0, selectedTable);
    };

    const fetchColumns = async (name) => {
        const res = await axios.get(`http://localhost:5000/table_schema?table_name=${name}`);
        setColumns(res.data.columns);
        setFilters({});
    };

    const fetchData = async (page = 0, table = tableName, activeFilters = filters) => {
        if (!table) return;

        const res = await axios.post('http://localhost:5000/filter_data', {
            table_name: table,
            filters: activeFilters,
            page: page + 1,
            limit: 10,
        });

        setData(res.data.data);
        setPageCount(Math.ceil(res.data.total_records / 10));
    };

    const handlePageClick = (event) => {
        setCurrentPage(event.selected);
        fetchData(event.selected);
    };

    const handleFilterChange = (column, value) => {
        const newFilters = { ...filters, [column]: value };
        setFilters(newFilters);
        fetchData(0, tableName, newFilters);
    };

    const handleRecordUpdate = async (columnName, newValue, recordId) => {
        // If the user has cleared the input, treat it as an empty string
        const valueToUpdate = newValue === "" ? null : newValue;
    
        try {
            const response = await axios.post(
                'http://localhost:5000/update_record',
                {
                    table_name: tableName,
                    column_name: columnName,
                    new_value: valueToUpdate,  // Pass null if it's empty
                    record_id: recordId,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );
            console.log('Record updated successfully', response.data);
        } catch (error) {
            console.error('Error updating record:', error);
        }
    };
    

    useEffect(() => {
        fetchTables();
    }, []);

    const [user, setUser] = useState(null);

    useEffect(() => {
        fetch('http://localhost:5000/check_session', {
            method: 'GET',
            credentials: 'include',
        })
            .then((res) => res.json())
            .then((data) => {
                console.log(`Session Data for User ${data.user_id}:`, data);
                if (data.user_id) {
                    setUser(data.username);
                }
            })
            .catch((err) => console.error('Error fetching session:', err));
    }, []);

    const handleLogout = async () => {
        try {
            await axios.post('http://localhost:5000/logout', {}, { withCredentials: true });
            window.location.href = '/login'; 
        } catch (error) {
            alert('Logout failed');
        }
    };

 
    
const handleTableDelete = async () => {
  console.log('tableToDelete:', tableToDelete);
  if (!tableToDelete) return;
  try {
    const response = await axios.post(
      'http://localhost:5000/delete_table',
      JSON.stringify({ table_name: tableToDelete }), // Send as JSON object
      { withCredentials: true, headers: { 'Content-Type': 'application/json' } } // Set Content-Type header
    );
    if (response.status === 200) {
      console.log('Table deleted successfully');
      setTableName('');
      fetchTables();
    }
  } catch (error) {
    console.error('Error deleting table:', error);
    alert('Failed to delete table.');
  }
  setShowDeleteModal(false);
};
    

    return (
        <div>
            {/* Navbar */}
            <nav className="navbar navbar-expand-lg navbar-dark bg-dark py-3">
                <div className="container d-flex justify-content-between">
                    <div className="d-flex align-items-center">
                        <a className="navbar-brand d-flex align-items-center" href="/">
                            <img src={logo} alt="Logo" width="50" height="50" className="me-2" />
                        </a>
                    </div>

                    <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                        <span className="navbar-toggler-icon"></span>
                    </button>

                    <div className="collapse navbar-collapse justify-content-end" id="navbarNav">
                        <ul className="navbar-nav me-auto">
                            <li className="nav-item"><Link to="/" className="nav-link">Home</Link></li>
                            <li className="nav-item"><Link to="/table" className="nav-link">Reports</Link></li>
                            <li className="nav-item"><Link to="/insight" className="nav-link">Insights</Link></li>
                            <li className="nav-item"><Link to="/graph" className="nav-link">Graphs</Link></li>
                            <li className="nav-item"><Link to="/summary" className="nav-link">Summary</Link></li>
                        </ul>

                        <div className="d-flex align-items-center">
                            {user ? (
                                <div className="d-flex align-items-center p-2 border rounded-3 text-white">
                                    <span className="me-3">{user}</span>
                                    <button className="btn btn-light btn-sm" onClick={handleLogout}>Logout</button>
                                </div>
                            ) : (
                                <div className="d-flex align-items-center p-2 border rounded-3 text-white">
                                    <span className="me-3">Guest</span>
                                </div>
                            )}
                        </div>

                        {!user && (
                            <li className="nav-item ms-3"><Link to="/login" className="nav-link">Login</Link></li>
                        )}
                    </div>
                </div>
            </nav>

            <div className="container mt-4">
                <br />
                <div className="mb-4 d-flex align-items-center gap-2">
                    <input type="file" className="form-control" onChange={handleFileChange} />
                    <button style={{ fontSize: 12, padding: 2 }} className="btn btn-dark" onClick={handleUpload}>
                      <i className="fas fa-upload" style={{ fontSize: 12 }} /> Upload
                    </button>
                </div>

                <div className="container mt-4">
                <div className="mb-4">
                    <h3>Select Table</h3>
                    <div className="d-flex gap-2">
                        <select className="form-select" onChange={handleTableSelect} value={tableName}>
                            <option value="">-- Select Table --</option>
                            {tables.map((table, index) => (
                                <option key={index} value={table}>{table}</option>
                            ))}
                        </select>
                        {tableName && (
                            <button className="btn btn-danger btn-sm" onClick={() => { setShowDeleteModal(true); setTableToDelete(tableName); }}>
                                <i className="fas fa-trash-alt fa-sm"></i> Delete Table
                            </button>
                        )}
                    </div>
                </div>
            </div>

           {showDeleteModal && (
             <div className="modal fade show d-block" tabIndex="-1" role="dialog">
               <div className="modal-dialog" role="document">
                 <div className="modal-content">
                  <div className="modal-header d-flex justify-content-between">
                    <h5 className="modal-title">Confirm Deletion</h5>
                    <button type="button" className="close" onClick={() => setShowDeleteModal(false)} style={{ color: 'red' }}>
                      <span>&times;</span>
                    </button>
                  </div>
                   <div className="modal-body">
                     <p>Are you sure you want to delete the table "{tableToDelete}"?</p>
                   </div>
                   <div className="modal-footer">
                     <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                     <button type="button" className="btn btn-danger" onClick={handleTableDelete}>Delete</button>
                   </div>
                 </div>
               </div>
             </div>
           )}


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
                        <br />
                <button
                  className="btn btn-dark"
                  onClick={() => setEditMode(!editMode)}
                >
                  {editMode ? (
                    <span>
                      <i className="fas fa-eye" /> 
                      <span style={{ marginLeft: 5 }}></span>
                      Switch to Display Mode
                    </span>
                  ) : (
                    <span>
                      <i className="fas fa-edit" /> 
                      <span style={{ marginLeft: 5 }}></span>
                      Switch to Edit Mode
                    </span>
                  )}
                </button>
                    </div>
                )}

                <div className="table-responsive">
                    <table className="table table-bordered table-striped">
                        <thead className="table-dark">
                            <tr>{data.length > 0 && Object.keys(data[0]).map((col) => <th key={col}>{col}</th>)}</tr>
                        </thead>
                        <tbody>
                            {data.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                    {Object.keys(row).map((colName, colIndex) => (
                                        <td key={colIndex}>
                                            {editMode ? (
                                                <input
                                                    type="text"
                                                    value={row[colName]}
                                                    onBlur={(e) => handleRecordUpdate(colName, e.target.value, row.id)}
                                                    onChange={(e) => {
                                                        const updatedData = [...data];
                                                        updatedData[rowIndex][colName] = e.target.value;
                                                        setData(updatedData);
                                                    }}
                                                />
                                            ) : (
                                                row[colName]
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="d-flex justify-content-between mt-3">
                  
                </div>

                <nav>
                    <ul className="pagination justify-content-center">
                        <ReactPaginate
                            previousLabel={'«'}
                            nextLabel={'»'}
                            breakLabel={'...'}
                            pageCount={pageCount}
                            onPageChange={handlePageClick}
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
        </div>
    );
};

export default App;
