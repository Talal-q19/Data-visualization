import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactPaginate from 'react-paginate';
import { debounce } from 'lodash';
import 'bootstrap/dist/css/bootstrap.min.css';

const App = () => {
    const [file, setFile] = useState(null);
    const [columns, setColumns] = useState([]);
    const [filters, setFilters] = useState({});
    const [data, setData] = useState([]);
    const [pageCount, setPageCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);
    const [tableName, setTableName] = useState('');
    const [tables, setTables] = useState([]);

    const handleFileChange = (e) => setFile(e.target.files[0]);

    const handleUpload = async () => {
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            const response = await axios.post('http://localhost:5000/upload', formData);
            if (response.status === 200) {
                fetchTables();
            }
        } catch (error) {
            console.error(error);
        }
    };

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
    

    useEffect(() => {
        fetchTables();
    }, []);

    return (
        <div className="container mt-4">
            <h1 className="text-center mb-4">Data Visualization</h1>

            {/* File Upload Section */}
            <div className="mb-4 d-flex align-items-center gap-2">
                <input type="file" className="form-control" onChange={handleFileChange} />
                <button className="btn btn-primary" onClick={handleUpload}>Upload</button>
            </div>

            {/* Table Selection */}
            <div className="mb-4">
                <h3>Select Table</h3>
                <select className="form-select" onChange={handleTableSelect} value={tableName}>
                    <option value="">-- Select Table --</option>
                    {tables.map((table, index) => (
                        <option key={index} value={table}>{table}</option>
                    ))}
                </select>
            </div>

            {/* Filters */}
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

            {/* Data Table */}
            <div className="table-responsive">
                <table className="table table-bordered table-striped">
                    <thead className="table-dark">
                        <tr>{data.length > 0 && Object.keys(data[0]).map((col) => <th key={col}>{col}</th>)}</tr>
                    </thead>
                    <tbody>
                        {data.map((row, index) => (
                            <tr key={index}>
                                {Object.values(row).map((val, i) => <td key={i}>{val}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
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
    );
};

export default App;
