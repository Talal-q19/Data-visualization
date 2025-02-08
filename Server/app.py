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
        
        pool.release(conn)

        # Create DataFrame from the fetched rows
        df = pd.DataFrame(rows)

        # Debug: Print fetched rows to check their structure
        print("Fetched Rows: ", rows)

        # Convert all columns to the appropriate types and handle missing data
        df = df.apply(pd.to_numeric, errors='ignore')  # Convert numeric columns
        df = df.replace({None: np.nan, 'NULL': np.nan, '': np.nan})  # Replace None, 'NULL', and '' with NaN

        # Insights initialization
        insights = []

        # Missing Data Detection - Check entire rows with any missing data
        missing_data_rows = df[df.isnull().any(axis=1)]  # Get rows with missing data
        missing_data = missing_data_rows.isnull().sum().to_dict()

        # Log missing data in the same format as duplicates
        missing_data_log = []
        for _, row in missing_data_rows.iterrows():
            missing_data_log.append({
                **{k: (v if pd.notna(v) else None) for k, v in row.to_dict().items()},  # Replace NaN with None
                'missing_reason': 'Missing data detected'
            })

        # Duplicate Detection (Entire row duplicates)
        duplicate_data = df.duplicated(keep=False).sum()  # Detect entire row duplicates
        duplicates = df[df.duplicated(keep=False)]  # Get all duplicate rows

        # Most Common Values & Pattern Recognition
        common_patterns = {col: df[col].mode()[0] if not df[col].mode().empty else None for col in df.columns}

        # Anomaly detection (for numeric columns and unrealistic dates)
        anomalies = []
        if not df.empty:
            # Handle numeric columns for anomaly detection
            numeric_cols = df.select_dtypes(include=['number']).columns
            if len(numeric_cols) > 0:
                iso_forest = IsolationForest(contamination=0.05)  # Adjust contamination rate if needed
                df[numeric_cols] = df[numeric_cols].fillna(0)  # Fill missing numeric data with 0
                anomaly_preds = iso_forest.fit_predict(df[numeric_cols])  # Anomaly prediction

                # Collect anomalies (rows with anomaly_preds == -1)
                anomalies += df[anomaly_preds == -1].apply(lambda row: {
                    **{k: (v if pd.notna(v) else None) for k, v in row.to_dict().items()},  # Replace NaN with None
                    'anomaly_reason': f"Numeric outlier detected"
                }, axis=1).tolist()

            # Handle date columns for unrealistic dates
            date_cols = df.select_dtypes(include=['datetime']).columns
            if len(date_cols) > 0:
                for col in date_cols:
                    # Check for unrealistic dates (e.g., far future or far past dates)
                    unrealistic_dates = df[col].apply(lambda x: x.year < 1900 or x.year > 2100 if pd.notnull(x) else False)
                    anomalies += df[unrealistic_dates].apply(lambda row: {
                        **{k: (v if pd.notna(v) else None) for k, v in row.to_dict().items()},  # Replace NaN with None
                        'anomaly_reason': f"Unrealistic date detected in column '{col}'"
                    }, axis=1).tolist()

            # Explicitly add duplicate rows to anomalies (entire row duplicates)
            for _, row in duplicates.iterrows():
                anomalies.append({
                    **{k: (v if pd.notna(v) else None) for k, v in row.to_dict().items()},  # Replace NaN with None
                    'anomaly_reason': "Duplicate row detected"
                })

            # Include rows with missing data as anomalies (rows with missing values)
            for _, row in missing_data_rows.iterrows():
                anomalies.append({
                    **{k: (v if pd.notna(v) else None) for k, v in row.to_dict().items()},  # Replace NaN with None
                    'anomaly_reason': f"Missing data detected in row"
                })

        else:
            anomalies = []

        # Correlation Analysis
        correlations = []

        # Numerical Correlation (using Pearson)
        numerical_cols = df.select_dtypes(include=['number']).columns.tolist()
        if numerical_cols:
            numerical_corr = df[numerical_cols].corr(method='pearson')  # or 'spearman'
            numerical_corr_dict = numerical_corr.to_dict()
            correlations.append({
                'correlation_type': 'Numerical',
                'correlation_matrix': numerical_corr_dict
            })

        # Categorical Correlation (using Cramér's V)
        categorical_cols = df.select_dtypes(include=['object']).columns.tolist()
        if categorical_cols:
            for col1, col2 in combinations(categorical_cols, 2):
                cramer_v = cramers_v(df[col1], df[col2])
                correlations.append({
                    'correlation_type': 'Categorical',
                    'columns': (col1, col2),
                    'correlation_score': cramer_v
                })

        # General Insights
        for col in df.columns:
            pattern = common_patterns.get(col, 'N/A')

            insights.append({
                'column': col,
                'missing_values': missing_data.get(col, 0),
                'duplicates': duplicate_data,
                'most_common': common_patterns.get(col, 'N/A'),
                'pattern': pattern,
                'insight_type': 'General',
                'details': f"{missing_data.get(col, 0)} missing values, {duplicate_data} duplicates.",
                'suggested_action': (
                    'Fill missing values' if missing_data.get(col, 0) > 0 and duplicate_data == 0 
                    else 'Remove duplicates' if duplicate_data > 0 and missing_data.get(col, 0) == 0 
                    else 'Fill missing values, remove duplicates, and check anomalies.' if missing_data.get(col, 0) > 0 and duplicate_data > 0 
                    else 'No suggestions'
                )
            })

        # Convert int64 to int (to avoid large int issues in JSON response)
        def convert_int64_to_int(obj):
            if isinstance(obj, dict):
                return {k: convert_int64_to_int(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_int64_to_int(v) for v in obj]
            elif isinstance(obj, np.int64):
                return int(obj)
            else:
                return obj

        # Prepare missing data in the same format as duplicates
        missing_data_formatted = [
            {'column': col, 'missing_count': missing_data.get(col, 0) if missing_data.get(col, 0) != np.nan else 0}
            for col in df.columns if missing_data.get(col, 0) > 0
        ]

        return jsonify(convert_int64_to_int({
            'insights': insights,
            'correlations': correlations,
            'anomalies': anomalies,  # Anomalies without anomaly_score column
            'duplicates': duplicates.to_dict(),
            'missing_data': missing_data_formatted,  # Added missing data to response in similar format as duplicates
            'logged_missing_data': missing_data_log  # Log of missing data in the response
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
