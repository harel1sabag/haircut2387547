document.addEventListener('DOMContentLoaded', function() {
    // DOM Element Selectors
    const form = document.getElementById('appointment-form');
    const nameInput = document.getElementById('name');
    const phoneInput = document.getElementById('phone');
    const datesRow = document.getElementById('dates-row');
    const timesContainer = document.getElementById('times-container');
    const timesRow = document.getElementById('times-row');
    const selectedDateTitle = document.getElementById('selected-date-title');
    const selectedDateInput = document.getElementById('selected-date');
    const selectedTimeInput = document.getElementById('selected-time');
    
    // Create message div if not exists
    let messageDiv = document.getElementById('message');
    if (!messageDiv) {
        messageDiv = document.createElement('div');
        messageDiv.id = 'message';
        form.appendChild(messageDiv);
    }

    // Backend API Configuration
    const API_BASE_URL = '/.netlify/functions';

    // Available times
    const AVAILABLE_TIMES = [
        '15:00', '15:30', 
        '16:00', '16:30', 
        '17:00', '17:30'
    ];

    // Utility Functions
    function validatePhoneNumber(phone) {
        const cleanPhone = phone.replace(/\D/g, '');
        return /^05\d{8}$/.test(cleanPhone);
    }

    function showMessage(message, isError = false) {
        if (messageDiv) {
            messageDiv.textContent = message;
            messageDiv.style.color = isError ? 'red' : 'green';
            messageDiv.style.display = 'block';
        } else {
            console.error('Message display element not found');
        }
    }

    // Date Generation
    function generateDateButtons() {
        const today = new Date();
        const daysOfWeek = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
        
        datesRow.innerHTML = ''; // Clear existing dates
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            
            const dateButton = document.createElement('button');
            dateButton.classList.add('date-button');
            
            const dayName = daysOfWeek[date.getDay()];
            const formattedDate = date.toISOString().split('T')[0];
            const displayDate = `${dayName}, ${date.getDate()}/${date.getMonth() + 1}`;
            
            dateButton.textContent = displayDate;
            dateButton.setAttribute('data-date', formattedDate);
            
            dateButton.addEventListener('click', (event) => selectDate(event, formattedDate, displayDate));
            
            datesRow.appendChild(dateButton);
        }
    }

    // Date Selection
    function selectDate(event, date, displayDate) {
        document.querySelectorAll('.date-button').forEach(btn => 
            btn.classList.remove('active'));
        
        event.target.classList.add('active');
        
        timesContainer.classList.remove('hidden');
        selectedDateTitle.textContent = `תאריך: ${displayDate}`;
        selectedDateInput.value = date;
        
        fetchAvailableSlots(date);
    }

    // Fetch Available Slots
    async function fetchAvailableSlots(selectedDate) {
        try {
            const response = await fetch(`${API_BASE_URL}/available-slots?target_date=${selectedDate}`);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Full error response:', errorText);
                throw new Error(`Failed to fetch available slots: ${response.status}`);
            }

            const availableSlots = await response.json();
            populateTimeSlots(availableSlots);
        } catch (error) {
            showMessage('שגיאה בטעינת זמנים פנויים', true);
            console.error('Available slots error:', error);
        }
    }

    // Populate Time Slots
    function populateTimeSlots(availableSlots) {
        timesRow.innerHTML = '';
        
        availableSlots.forEach(slot => {
            const timeButton = document.createElement('button');
            timeButton.classList.add('time-button');
            timeButton.textContent = slot.time;
            
            timeButton.addEventListener('click', (event) => selectTime(event, slot.time));
            
            timesRow.appendChild(timeButton);
        });
    }

    // Time Selection
    function selectTime(event, time) {
        document.querySelectorAll('.time-button').forEach(btn => 
            btn.classList.remove('active'));
        
        event.target.classList.add('active');
        selectedTimeInput.value = time;
    }

    // Phone Input Formatting
    phoneInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^\d-]/g, '');
        
        if (this.value.length > 3 && this.value[3] !== '-') {
            this.value = this.value.slice(0, 3) + '-' + this.value.slice(3);
        }
        if (this.value.length > 7 && this.value[7] !== '-') {
            this.value = this.value.slice(0, 7) + '-' + this.value.slice(7);
        }
    });

    // Submit Appointment
    async function submitAppointment(event) {
        event.preventDefault();
        
        const name = nameInput.value.trim();
        const phone = phoneInput.value.replace(/\D/g, '');
        const selectedDateButton = document.querySelector('.date-button.active');
        const selectedTimeButton = document.querySelector('.time-button.active');

        const selectedDate = selectedDateButton ? selectedDateButton.dataset.date : null;
        const selectedTime = selectedTimeButton ? selectedTimeButton.textContent : null;

        // Validation
        if (!name || name.length < 2) {
            showMessage('אנא הזן שם תקין', true);
            return;
        }

        if (!validatePhoneNumber(phone)) {
            showMessage('אנא הזן מספר טלפון תקין (05xxxxxxxx)', true);
            return;
        }

        if (!selectedDate) {
            showMessage('אנא בחר תאריך', true);
            return;
        }

        if (!selectedTime) {
            showMessage('אנא בחר שעה', true);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/create-appointment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    phone,
                    date: selectedDate,
                    time: selectedTime
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to book appointment');
            }

            const confirmationData = await response.json();
            showMessage('התור נקבע בהצלחה! תודה לך.');
            
            // Reset form
            form.reset();
            timesContainer.classList.add('hidden');
            datesRow.innerHTML = '';
            generateDateButtons();
        } catch (error) {
            showMessage(error.message, true);
            console.error('Submission error:', error);
        }
    }

    // Initialize
    form.addEventListener('submit', submitAppointment);
    generateDateButtons();
});
