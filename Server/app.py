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

from sklearn.ensemble import IsolationForest
from itertools import combinations
import numpy as np
from scipy import stats
from sqlalchemy import text


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

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    try:
        conn = pool.get_conn()
        cursor = conn.cursor()
        cursor.execute("INSERT INTO users (username, password) VALUES (%s, %s)", (username, password))
        conn.commit()
        pool.release(conn)
        return jsonify({"message": "User registered successfully"}), 201
    except pymysql.err.IntegrityError:
        return jsonify({"error": "Username already exists"}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Cramér's V for categorical data
def cramers_v(x, y):
    contingency_table = pd.crosstab(x, y)
    chi2, p, dof, expected = stats.chi2_contingency(contingency_table)
    n = contingency_table.sum().sum()
    phi2 = chi2 / n
    r, k = contingency_table.shape
    return (phi2 / min(k - 1, r - 1)) ** 0.5

@app.route('/analyze_table', methods=['GET'])
def analyze_table():
    table_name = request.args.get('table_name')
    if not table_name:
        return jsonify({'error': 'Table name is required'}), 400
    
    try:
        conn = pool.get_conn()
        with conn.cursor() as cursor:
            cursor.execute(f"SELECT * FROM `{table_name}`;")
            rows = cursor.fetchall()
            column_names = [desc[0] for desc in cursor.description]  # Fetch column names
        
        pool.release(conn)

        # Create DataFrame from fetched rows
        df = pd.DataFrame(rows, columns=column_names)

        # Convert columns to appropriate types
        df = df.apply(pd.to_numeric, errors='ignore')
        df = df.replace({None: np.nan, 'NULL': np.nan, '': np.nan})  # Standardize missing values

        insights = []
        anomalies = []
        missing_data_log = []

        # **Missing Data Detection**
        missing_data_rows = df[df.isnull().any(axis=1)]
        missing_data = missing_data_rows.isnull().sum().to_dict()

        # Format missing data
        for _, row in missing_data_rows.iterrows():
            missing_data_log.append({
                **{k: (v if pd.notna(v) else None) for k, v in row.to_dict().items()},
                'anomaly_reason': 'Missing data detected'
            })

        # **Duplicate Detection**
        duplicates = df[df.duplicated(keep=False)]
        duplicate_count = duplicates.shape[0]

        # **Most Common Values & Patterns**
        common_patterns = {col: df[col].mode()[0] if not df[col].mode().empty else None for col in df.columns}

        # **Anomaly Detection (Numeric & Date)**
        numeric_cols = df.select_dtypes(include=['number']).columns
        if not df.empty and len(numeric_cols) > 0:
            iso_forest = IsolationForest(contamination=0.05)
            df[numeric_cols] = df[numeric_cols].fillna(0)  
            anomaly_preds = iso_forest.fit_predict(df[numeric_cols])

            anomalies += df[anomaly_preds == -1].apply(lambda row: {
                **{k: (v if pd.notna(v) else None) for k, v in row.to_dict().items()},
                'anomaly_reason': "Numeric outlier detected"
            }, axis=1).tolist()

        date_cols = df.select_dtypes(include=['datetime']).columns
        for col in date_cols:
            unrealistic_dates = df[col].apply(lambda x: x.year < 1900 or x.year > 2100 if pd.notnull(x) else False)
            anomalies += df[unrealistic_dates].apply(lambda row: {
                **{k: (v if pd.notna(v) else None) for k, v in row.to_dict().items()},
                'anomaly_reason': f"Unrealistic date detected in '{col}'"
            }, axis=1).tolist()

        # Include duplicates & missing data in anomalies
        for _, row in duplicates.iterrows():
            anomalies.append({
                **{k: (v if pd.notna(v) else None) for k, v in row.to_dict().items()},
                'anomaly_reason': "Duplicate row detected"
            })

        for _, row in missing_data_rows.iterrows():
            anomalies.append({
                **{k: (v if pd.notna(v) else None) for k, v in row.to_dict().items()},
                'anomaly_reason': "Missing data detected"
            })

        # **Correlation Analysis**
        correlations = []
        numerical_cols = df.select_dtypes(include=['number']).columns.tolist()
        if numerical_cols:
            numerical_corr = df[numerical_cols].corr(method='pearson')
            correlations.append({
                'correlation_type': 'Numerical',
                'correlation_matrix': numerical_corr.where(pd.notna(numerical_corr), None).to_dict()  # Replacing NaN with None
            })

        categorical_cols = df.select_dtypes(include=['object']).columns.tolist()
        if categorical_cols:
            for col1, col2 in combinations(categorical_cols, 2):
                cramer_v_score = cramers_v(df[col1], df[col2])
                correlations.append({
                    'correlation_type': 'Categorical',
                    'columns': (col1, col2),
                    'correlation_score': cramer_v_score if not np.isnan(cramer_v_score) else None  # Replace NaN with None
                })

        # **General Insights**
        for col in df.columns:
            insights.append({
                'column': col,
                'missing_values': missing_data.get(col, 0),
                'duplicates': duplicate_count,
                'insight_type': 'General',
                'most_common': common_patterns.get(col, None),
                'details': f"{missing_data.get(col, 0)} missing values, {duplicate_count} duplicates.",
                'suggested_action': (
                    'Fill missing values' if missing_data.get(col, 0) > 0 and duplicate_count == 0 
                    else 'Remove duplicates' if duplicate_count > 0 and missing_data.get(col, 0) == 0 
                    else 'Fill missing values, remove duplicates, and check anomalies.' if missing_data.get(col, 0) > 0 and duplicate_count > 0 
                    else 'No suggestions'
                )
            })

        # **Convert int64 to int for JSON compatibility**
        def convert_int64_to_int(obj):
            if isinstance(obj, dict):
                return {k: convert_int64_to_int(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_int64_to_int(v) for v in obj]
            elif isinstance(obj, np.int64):
                return int(obj)
            elif isinstance(obj, float) and np.isnan(obj):  # Convert NaN to None
                return None
            else:
                return obj

        missing_data_formatted = [
            {'column': col, 'missing_count': missing_data.get(col, 0) if missing_data.get(col, 0) != np.nan else 0}
            for col in df.columns if missing_data.get(col, 0) > 0
        ]

        return jsonify(convert_int64_to_int({
            'insights': insights,
            'correlations': correlations,
            'anomalies': anomalies,
            'duplicates': duplicates.to_dict(),
            'missing_data': missing_data_formatted,
            'logged_missing_data': missing_data_log
        })), 200

    except Exception as e:
        error_trace = traceback.format_exc()
        print(error_trace)
        return jsonify({'error': str(e), 'trace': error_trace}), 500







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

        query = "SELECT id, username FROM users WHERE username = %s AND password = %s"
        print(f"Executing query: {query} with params: {username}, {password}")

        cursor.execute(query, (username, password))
        print(f"Row count: {cursor.rowcount}")  # Print the row count
        user = cursor.fetchone()
        print(f"User: {user}")  # Print the user variable

        cursor.close()
        conn.close()

        if user:
            session['user_id'] = user['id']
            session['username'] = user['username']
            print(f"Session set for user: {session['username']}")  # Debug log
            return jsonify({"message": "Login successful", "user_id": user['id'], "username": user['username']}), 200
        else:
            return jsonify({"error": "Invalid credentials"}), 401

    except Exception as e:
        print(f"Error: {e}")  # Print the error message
        return jsonify({"error": "Internal Server Error"}), 500


@app.route('/check_session', methods=['GET'])
def check_session():
    if 'user_id' in session and 'username' in session:
        session.modified = True  # Update the session object
        return jsonify({"user_id": session['user_id'], "username": session['username']}), 200
    return jsonify({"error": "Not authenticated"}), 401


@app.route('/update_record', methods=['POST'])
def update_record():
    data = request.json
    table_name = data.get('table_name')
    column_name = data.get('column_name')
    new_value = data.get('new_value')
    record_id = data.get('record_id')

    if not all([table_name, column_name, record_id]):
        return jsonify({"error": "All fields are required"}), 400

    # If the new_value is empty, set it to None (NULL)
    if new_value == "":
        new_value = None

    try:
        query = "UPDATE `{}` SET {} = %s WHERE id = %s".format(table_name, column_name)
        conn = pool.get_conn()
        cursor = conn.cursor()
        cursor.execute(query, (new_value, record_id))
        conn.commit()
        return jsonify({"message": "Record updated successfully"}), 200
    except Exception as e:
        print(f"Error updating record: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals():
            pool.release(conn)


            



@app.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"message": "Logged out successfully"}), 200



@app.route('/get_tables', methods=['GET'])
def get_tables():
    try:
        user_id = session.get('user_id')
        if not user_id:
            print("User not authenticated")  # Debug log
            return jsonify({'error': 'User not authenticated'}), 401

        conn = pool.get_conn()
        cursor = conn.cursor()

        # Properly format the query string
        print(f"Fetching tables for user_id: {user_id}")  # Debug log
        query = f"SHOW TABLES LIKE 'user_{user_id}_%'"
        print(f"Executing query: {query}")  # Debug log

        cursor.execute(query)
        result = cursor.fetchall()
        print(f"Query result: {result}")  # Debug log

        # Extract table names from the dictionary result
        if result:
            all_tables = [row[list(row.keys())[0]] for row in result]  # Accessing the first key in the dictionary
            print(f"Tables found: {all_tables}")  # Debug log
        else:
            all_tables = []

        cursor.close()
        pool.release(conn)

        return jsonify({'tables': all_tables}), 200
    except Exception as e:
        print("Error:", str(e))  # Debug log
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

        # Get user_id from session
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'User not authenticated'}), 401

        # Modify table name to include user_id
        table_name = f"user_{user_id}_{escape_string(file.filename.split('.')[0].replace(' ', '_'))}"

        conn = pool.get_conn()
        cursor = conn.cursor()

        cursor.execute(f"SHOW TABLES LIKE '{table_name}'")
        if cursor.fetchone():
            cursor.close()
            pool.release(conn)
            return jsonify({'error': f'Table {table_name} already exists'}), 400

        # Escape column names with backticks
        columns = [f"`{escape_string(col.replace(' ', '_'))}` TEXT" for col in df.columns.tolist()]
        
        # Create the table with an 'id' column as the primary key
        create_table_query = f"""
            CREATE TABLE `{table_name}` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,  -- Adding the 'id' column
                {', '.join(columns)}
            );
        """
        cursor.execute(create_table_query)

        # Insert data into the table with escaped column names
        for _, row in df.iterrows():
            placeholders = ', '.join(['%s'] * len(row))
            insert_query = f"INSERT INTO `{table_name}` ({', '.join([f'`{escape_string(col.replace(' ', '_'))}`' for col in df.columns])}) VALUES ({placeholders});"
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
