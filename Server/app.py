from flask import Flask, request, jsonify, session
from flask_cors import CORS
import pandas as pd
import pymysql
import traceback
from pymysql.converters import escape_string
from dotenv import load_dotenv
import os
from flask_session import Session
from flask import Response

from flask import jsonify

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"], supports_credentials=True)



# Database Configuration from .env
DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "database": os.getenv("DB_NAME"),
    "cursorclass": pymysql.cursors.DictCursor,
    "autocommit": True
}

POOL_SIZE = int(os.getenv("DB_POOL_SIZE", 10))  # Default to 10 if not set

# Database Connection Pool
class DatabasePool:
    def __init__(self, size=POOL_SIZE):
        self.pool = []
        self.size = size
        self.create_pool()

    def create_pool(self):
        for _ in range(self.size):
            conn = pymysql.connect(**DB_CONFIG)
            self.pool.append(conn)

    def get_conn(self):
        if not self.pool:
            self.create_pool()
        return self.pool.pop(0)

    def release(self, conn):
        self.pool.append(conn)

pool = DatabasePool()

print(f"Connected to database '{DB_CONFIG['database']}' at {DB_CONFIG['host']}")


app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'supersecretkey')
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = False
app.config['SESSION_USE_SIGNER'] = True
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = "Lax"
Session(app)


@app.route('/table_summary_extended', methods=['GET'])
def table_summary_extended():
    try:
        table_name = request.args.get('table_name')
        if not table_name:
            return jsonify({'error': 'Table name is required'}), 400

        conn = pool.get_conn()
        cursor = conn.cursor()

        # Get column names and data types
        cursor.execute(f"DESCRIBE `{table_name}`;")
        columns_info = cursor.fetchall()
        columns = {row['Field']: row['Type'] for row in columns_info}

        summary = {}
        for column, col_type in columns.items():
            cursor.execute(f"SELECT `{column}`, COUNT(*) as count FROM `{table_name}` GROUP BY `{column}`;")
            values = cursor.fetchall()

            # Detect if column is numeric
            is_numeric = any(char.isdigit() for char in col_type)  # Basic check for numeric types

            summary[column] = {
                "type": "numeric" if is_numeric else "categorical",
                "data": values
            }

        cursor.close()
        pool.release(conn)

        return jsonify({'summary': summary}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/table_summary', methods=['GET'])
def table_summary():
    try:
        table_name = request.args.get('table_name')
        if not table_name:
            return jsonify({'error': 'Table name is required'}), 400

        conn = pool.get_conn()
        cursor = conn.cursor()

        # Get column names
        cursor.execute(f"DESCRIBE `{table_name}`;")
        columns = [row['Field'] for row in cursor.fetchall()]

        # Get summary data
        summary = {}
        for column in columns:
            cursor.execute(f"SELECT `{column}`, COUNT(*) as count FROM `{table_name}` GROUP BY `{column}`;")
            summary[column] = cursor.fetchall()

        cursor.close()
        pool.release(conn)

        return jsonify({'summary': summary}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500





@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username, password = data.get("username"), data.get("password")

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    try:
        conn = pool.get_conn()
        cursor = conn.cursor()

        cursor.execute("SELECT username FROM users WHERE username = %s AND password = %s", (username, password))
        user = cursor.fetchone()

        cursor.close()
        conn.close()

        if user:
            session['user'] = username  # Store session
            print(f"Session set for user: {session['user']}")  # Debug log
            return jsonify({"message": "Login successful"}), 200
        else:
            return jsonify({"error": "Invalid credentials"}), 401

    except Exception as e:
        return jsonify({"error": str(e)}), 500




@app.route('/check_session', methods=['GET'])
def check_session():
    if 'user' in session:
        session.modified = True  # Update the session object
        return jsonify({"user": session['user']}), 200
    return jsonify({"error": "Not authenticated"}), 401






@app.route('/logout', methods=['POST'])
def logout():
    session.pop('user', None)
    return jsonify({"message": "Logged out successfully"}), 200



@app.route('/get_tables', methods=['GET'])
def get_tables():
    try:
        conn = pool.get_conn()
        cursor = conn.cursor()

        cursor.execute("SHOW TABLES;")
        all_tables = [row[f"Tables_in_{conn.db.decode()}"] for row in cursor.fetchall()]

        # Exclude only the 'users' table
        filtered_tables = [table for table in all_tables if table != "users"]

        cursor.close()
        pool.release(conn)

        return jsonify({'tables': filtered_tables}), 200
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

        df = pd.read_csv(file) if file_ext == 'csv' else pd.read_excel(file)
        df = df.fillna('')

        table_name = escape_string(file.filename.split('.')[0].replace(' ', '_'))

        conn = pool.get_conn()
        cursor = conn.cursor()

        cursor.execute(f"SHOW TABLES LIKE '{table_name}'")
        if cursor.fetchone():
            cursor.close()
            pool.release(conn)
            return jsonify({'error': f'Table {table_name} already exists'}), 400

        columns = [f"`{escape_string(col.replace(' ', '_'))}` TEXT" for col in df.columns.tolist()]
        create_table_query = f"CREATE TABLE `{table_name}` ({', '.join(columns)});"
        cursor.execute(create_table_query)

        for _, row in df.iterrows():
            placeholders = ', '.join(['%s'] * len(row))
            insert_query = f"INSERT INTO `{table_name}` VALUES ({placeholders});"
            cursor.execute(insert_query, tuple(row))

        conn.commit()

        cursor.close()
        pool.release(conn)

        return jsonify({'message': f'Table {table_name} created and data inserted successfully!'}), 200

    except Exception as e:
        error_trace = traceback.format_exc()
        print(error_trace)
        return jsonify({'error': str(e), 'trace': error_trace}), 500

@app.route('/table_schema', methods=['GET'])
def table_schema():
    table_name = escape_string(request.args.get('table_name'))
    if not table_name:
        return jsonify({'error': 'Table name is required'}), 400

    conn = pool.get_conn()
    cursor = conn.cursor()
    
    try:
        cursor.execute(f"DESCRIBE `{table_name}`;")
        schema = [row['Field'] for row in cursor.fetchall()]

        cursor.close()
        pool.release(conn)

        return jsonify({'columns': schema}), 200
    except Exception as e:
        cursor.close()
        pool.release(conn)
        return jsonify({'error': str(e)}), 500

@app.route('/filter_data', methods=['POST'])
def filter_data():
    try:
        data = request.json
        table_name = escape_string(data.get('table_name'))
        filters = data.get('filters', {})
        page = int(data.get('page', 1))
        limit = int(data.get('limit', 10))
        offset = (page - 1) * limit

        if not table_name:
            return jsonify({'error': 'Table name is required'}), 400

        conn = pool.get_conn()
        cursor = conn.cursor()

        where_clause = " AND ".join([f"`{escape_string(col)}` LIKE %s" for col in filters.keys()]) if filters else "1=1"
        values = [f"%{escape_string(val)}%" for val in filters.values()]

        query = f"SELECT * FROM `{table_name}` WHERE {where_clause} LIMIT %s OFFSET %s"
        cursor.execute(query, values + [limit, offset])
        rows = cursor.fetchall()

        count_query = f"SELECT COUNT(*) as total FROM `{table_name}` WHERE {where_clause}"
        cursor.execute(count_query, values)
        total_records = cursor.fetchone()["total"]

        cursor.close()
        pool.release(conn)

        return jsonify({'data': rows, 'total_records': total_records}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
