# Data-visualization
Overview

This project enables users to upload CSV files, dynamically creates SQL tables based on file headers, and provides an interactive frontend for data retrieval, filtering, and pagination.

Features

1. File Upload

Users upload a file through the frontend.

The backend reads file headers and dynamically creates a corresponding SQL table.

Data from the file is inserted into the newly created table.

2. Dynamic Table Creation

Table names are derived from the uploaded file name or a unique identifier.

Columns are created dynamically based on file headers.

3. Dynamic Data Display

Users select a table from a dropdown or file list in the frontend.

The app fetches the table schema dynamically from the backend.

Data is displayed with pagination.

4. Dynamic Filtering

Input fields for filters are generated based on column names.

Users input filter criteria (e.g., Name = John or Age > 30).

The backend processes filters and returns filtered results.

5. Filtered Results with Pagination

Filtered data is displayed in the table.

Pagination is supported for both filtered and unfiltered data.

Backend: Key Functionalities

1. Upload Endpoint

Reads the uploaded file.

Creates a table dynamically using headers as columns.

Inserts data into the table.

2. Fetch Table Schema

Returns column names for a specified table.

3. Filter and Paginate Data

Dynamically constructs SQL queries based on user inputs.

Supports filtering and pagination simultaneously.

Frontend: Key Features

1. File Upload

Users upload a file, triggering backend processing.

Displays the uploaded table for selection.

2. Dynamic Filters

Generates filter input fields based on table schema.

Sends filter criteria to the backend.

3. Pagination

Integrates React Paginate to display results page-by-page.

Updates displayed data dynamically as users apply filters or navigate pages.

User Journey Example

1. Upload a File

Upload employees.csv with headers: Name, Age, Department.

Backend creates a table employees with columns Name, Age, Department and inserts the data.

2. Select a Table

Select employees from the table list.

The app fetches column names dynamically.

3. Apply Filters

The app generates input fields for Name, Age, and Department.

Enter filters, e.g., Age > 25 and Department = HR.

4. View Results

Filtered results are displayed in the table.

Pagination allows navigating through results.

Tech Stack

Frontend: React.js, React Paginate

Backend: Node.js, Express.js, SQL

Database: MySQL / SQL Server

Installation

1. Clone the repository

 git clone https://github.com/Talal-q19/Data-visualization.git

2. Install dependencies

Backend:

 cd backend


Frontend:

 cd frontend


3. Run the application

Backend: python app.py


Frontend:npm start
