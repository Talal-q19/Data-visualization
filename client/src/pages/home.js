import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactPaginate from 'react-paginate';
import { debounce } from 'lodash';

const App = () => {
    const [file, setFile] = useState(null);
    const [columns, setColumns] = useState([]);
    const [filters, setFilters] = useState({});
    const [data, setData] = useState([]);
    const [pageCount, setPageCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);
    const [tableName, setTableName] = useState('');

    const handleFileChange = (e) => setFile(e.target.files[0]);

    const handleUpload = async () => {
        const formData = new FormData();
        formData.append('file', file);
        try {
            const response = await axios.post('http://localhost:5000/upload', formData);
            if (response.status === 200) {
                const name = file.name.split('.')[0];
                setTableName(name);
                fetchColumns(name);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchColumns = async (name) => {
        const res = await axios.get(`http://localhost:5000/table_schema?table_name=${name}`);
        setColumns(res.data.columns);
        setFilters({});
    };

    const fetchData = async (page = 0) => {
        if (!tableName) return;

        const res = await axios.post(`http://localhost:5000/filter_data`, {
            table_name: tableName,
            filters,
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

    // Debounce filter changes to prevent excessive API calls
    const debouncedFilterChange = debounce((column, value) => {
        setFilters((prevFilters) => ({ ...prevFilters, [column]: value }));
    }, 500);

    useEffect(() => {
        if (file) fetchData(currentPage);
    }, [currentPage, filters]);

    return (
        <div>
            <h1>Data Visualization with Filters</h1>
            <input type="file" onChange={handleFileChange} />
            <button onClick={handleUpload}>Upload</button>

            {columns.length > 0 && (
                <div>
                    <h3>Filters</h3>
                    {columns.map((col) => (
                        <div key={col}>
                            <label>{col}</label>
                            <input type="text" onChange={(e) => debouncedFilterChange(col, e.target.value)} />
                        </div>
                    ))}
                </div>
            )}

            <table>
                <thead>
                    <tr>{data.length > 0 && Object.keys(data[0]).map((col) => <th key={col}>{col}</th>)}</tr>
                </thead>
                <tbody>
                    {data.map((row, index) => (
                        <tr key={index}>{Object.values(row).map((val, i) => <td key={i}>{val}</td>)}</tr>
                    ))}
                </tbody>
            </table>

            <ReactPaginate pageCount={pageCount} onPageChange={handlePageClick} containerClassName={'pagination'} activeClassName={'active'} />
        </div>
    );
};

export default App;
