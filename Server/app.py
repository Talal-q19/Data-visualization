from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import pymysql
import traceback

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])

# Database connection
db = pymysql.connect(
    host="localhost",
    user="root",
    password="",
    database="datavis",
    cursorclass=pymysql.cursors.DictCursor  
)

print("Connected to database 'datavis'")


@app.route('/get_tables', methods=['GET'])
def get_tables():
    try:
        cursor = db.cursor()
        cursor.execute("SHOW TABLES;")
        tables = [row[f"Tables_in_{db.db.decode()}"] for row in cursor.fetchall()]
        return jsonify({'tables': tables}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/upload', methods=['POST'])
def upload_file():
    try:
        file = request.files['file']
        if not file:
            return jsonify({'error': 'No file uploaded'}), 400

        file_ext = file.filename.split('.')[-1].lower()
        if file_ext not in ['csv', 'xlsx']:
            return jsonify({'error': 'Only CSV and XLSX files are supported'}), 400

        # Read file into DataFrame
        df = pd.read_csv(file) if file_ext == 'csv' else pd.read_excel(file)
        df = df.fillna('')  # Replace NaN with empty string

        table_name = file.filename.split('.')[0].replace(' ', '_')  # Ensure valid table name

        cursor = db.cursor()
        cursor.execute(f"SHOW TABLES LIKE '{table_name}'")
        if cursor.fetchone():
            return jsonify({'error': f'Table {table_name} already exists'}), 400

        # Create table dynamically
        columns = [f"`{col.replace(' ', '_')}` TEXT" for col in df.columns.tolist()]
        create_table_query = f"CREATE TABLE `{table_name}` ({', '.join(columns)});"
        cursor.execute(create_table_query)

        # Insert data
        for _, row in df.iterrows():
            placeholders = ', '.join(['%s'] * len(row))
            insert_query = f"INSERT INTO `{table_name}` VALUES ({placeholders});"
            cursor.execute(insert_query, tuple(row))

        db.commit()
        return jsonify({'message': f'Table {table_name} created and data inserted successfully!'}), 200

    except Exception as e:
        error_trace = traceback.format_exc()
        print(error_trace)
        return jsonify({'error': str(e), 'trace': error_trace}), 500

@app.route('/table_schema', methods=['GET'])
def table_schema():
    table_name = request.args.get('table_name')
    if not table_name:
        return jsonify({'error': 'Table name is required'}), 400

    cursor = db.cursor()
    try:
        cursor.execute(f"DESCRIBE `{table_name}`;")
        schema = [row['Field'] for row in cursor.fetchall()]
        return jsonify({'columns': schema}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
    
    
        

@app.route('/filter_data', methods=['POST'])
def filter_data():
    try:
        data = request.json
        table_name = data.get('table_name')
        filters = data.get('filters', {})
        page = int(data.get('page', 1))
        limit = int(data.get('limit', 10))
        offset = (page - 1) * limit

        if not table_name:
            return jsonify({'error': 'Table name is required'}), 400

        cursor = db.cursor()

        # Build WHERE clause dynamically
        where_clause = " AND ".join([f"`{col}` LIKE %s" for col in filters.keys()]) if filters else "1=1"
        values = [f"%{val}%" for val in filters.values()]

        # Fetch data with limit & offset
        query = f"SELECT * FROM `{table_name}` WHERE {where_clause} LIMIT %s OFFSET %s"
        cursor.execute(query, values + [limit, offset])
        rows = cursor.fetchall()

        # Fetch total record count for pagination
        count_query = f"SELECT COUNT(*) as total FROM `{table_name}` WHERE {where_clause}"
        cursor.execute(count_query, values)
        total_records = cursor.fetchone()["total"]

        return jsonify({'data': rows, 'total_records': total_records}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    



if __name__ == '__main__':
    app.run(debug=True)
