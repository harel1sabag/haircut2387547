from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import sqlite3
from datetime import date, datetime, timedelta
import re

app = Flask(__name__)
CORS(app)

def validate_israeli_phone(phone):
    # Remove non-digit characters
    phone = re.sub(r'\D', '', phone)
    return re.match(r'^05\d{8}$', phone) is not None

def init_db():
    conn = sqlite3.connect('appointments.db')
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

@app.route('/appointments', methods=['POST'])
def create_appointment():
    data = request.json
    
    # Validate input
    if not data or not data.get('name') or len(data['name'].strip()) < 2:
        return jsonify({"error": "Invalid name"}), 400
    
    if not validate_israeli_phone(data.get('phone', '')):
        return jsonify({"error": "Invalid Israeli phone number"}), 400
    
    # Parse date and validate
    try:
        appointment_date = date.fromisoformat(data['date'])
        today = date.today()
        max_date = today + timedelta(days=30)
        
        if appointment_date < today or appointment_date > max_date:
            return jsonify({"error": "Invalid date"}), 400
    except ValueError:
        return jsonify({"error": "Invalid date format"}), 400
    
    # Check time slots
    valid_times = ['15:00', '15:30', '16:00', '16:30', '17:00', '17:30']
    if data['time'] not in valid_times:
        return jsonify({"error": "Invalid time slot"}), 400
    
    # Check for existing appointment
    conn = sqlite3.connect('appointments.db')
    c = conn.cursor()
    
    c.execute('''
        SELECT * FROM appointments 
        WHERE date = ? AND time = ?
    ''', (str(appointment_date), data['time']))
    
    existing = c.fetchone()
    
    if existing:
        conn.close()
        return jsonify({"error": "Time slot already booked"}), 400
    
    # Create new appointment
    try:
        c.execute('''
            INSERT INTO appointments 
            (name, phone, date, time) 
            VALUES (?, ?, ?, ?)
        ''', (data['name'], data['phone'], str(appointment_date), data['time']))
        
        conn.commit()
        appointment_id = c.lastrowid
        conn.close()
        
        return jsonify({
            "id": appointment_id,
            "name": data['name'],
            "phone": data['phone'],
            "date": str(appointment_date),
            "time": data['time']
        }), 201
    
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"error": str(e)}), 500

@app.route('/available-slots', methods=['GET'])
def get_available_slots():
    target_date = request.args.get('target_date')
    
    try:
        appointment_date = date.fromisoformat(target_date)
        today = date.today()
        max_date = today + timedelta(days=30)
        
        if appointment_date < today or appointment_date > max_date:
            return jsonify({"error": "Invalid date"}), 400
    except ValueError:
        return jsonify({"error": "Invalid date format"}), 400
    
    valid_times = ['15:00', '15:30', '16:00', '16:30', '17:00', '17:30']
    
    conn = sqlite3.connect('appointments.db')
    c = conn.cursor()
    
    c.execute('''
        SELECT time FROM appointments 
        WHERE date = ?
    ''', (str(appointment_date),))
    
    booked_times = [row[0] for row in c.fetchall()]
    conn.close()
    
    available_slots = [
        {"time": time} for time in valid_times if time not in booked_times
    ]
    
    return jsonify(available_slots)

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)
