from flask import Flask, request, jsonify, cors
from flask_sqlalchemy import SQLAlchemy
from datetime import date, time, datetime, timedelta
import re

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///appointments.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)
cors.CORS(app)

class Appointment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    date = db.Column(db.Date, nullable=False)
    time = db.Column(db.String(10), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'phone': self.phone,
            'date': str(self.date),
            'time': self.time,
            'created_at': str(self.created_at)
        }

def validate_israeli_phone(phone):
    # Remove non-digit characters
    phone = re.sub(r'\D', '', phone)
    return re.match(r'^05\d{8}$', phone) is not None

@app.route('/appointments', methods=['POST'])
def create_appointment():
    data = request.json
    
    # Validate input
    if not data.get('name') or len(data['name'].strip()) < 2:
        return jsonify({"error": "Invalid name"}), 400
    
    if not validate_israeli_phone(data.get('phone', '')):
        return jsonify({"error": "Invalid Israeli phone number"}), 400
    
    # Parse date and validate
    try:
        appointment_date = date.fromisoformat(data['date'])
        today = date.today()
        max_date = today + timedelta(days=7)
        
        if appointment_date < today or appointment_date > max_date:
            return jsonify({"error": "Invalid date"}), 400
    except ValueError:
        return jsonify({"error": "Invalid date format"}), 400
    
    # Check time slots
    valid_times = ['15:00', '15:30', '16:00', '16:30', '17:00', '17:30']
    if data['time'] not in valid_times:
        return jsonify({"error": "Invalid time slot"}), 400
    
    # Check for existing appointment
    existing = Appointment.query.filter_by(
        date=appointment_date, 
        time=data['time']
    ).first()
    
    if existing:
        return jsonify({"error": "Time slot already booked"}), 400
    
    # Create new appointment
    new_appointment = Appointment(
        name=data['name'],
        phone=data['phone'],
        date=appointment_date,
        time=data['time']
    )
    
    try:
        db.session.add(new_appointment)
        db.session.commit()
        return jsonify(new_appointment.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/available-slots', methods=['GET'])
def get_available_slots():
    target_date = request.args.get('target_date')
    
    try:
        appointment_date = date.fromisoformat(target_date)
        today = date.today()
        max_date = today + timedelta(days=7)
        
        if appointment_date < today or appointment_date > max_date:
            return jsonify({"error": "Invalid date"}), 400
    except ValueError:
        return jsonify({"error": "Invalid date format"}), 400
    
    valid_times = ['15:00', '15:30', '16:00', '16:30', '17:00', '17:30']
    booked_times = [
        appt.time for appt in Appointment.query.filter_by(date=appointment_date).all()
    ]
    
    available_slots = [
        {"time": time} for time in valid_times if time not in booked_times
    ]
    
    return jsonify(available_slots)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
