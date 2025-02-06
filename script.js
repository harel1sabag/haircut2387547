// כאן תוכל להוסיף קוד JavaScript בעתיד
console.log('האתר נטען בהצלחה!');

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('appointment-form');
    const confirmationDiv = document.getElementById('confirmation');
    const confirmationDetails = document.getElementById('confirmation-details');
    const phoneInput = document.getElementById('phone');
    const datesRow = document.getElementById('dates-row');
    const timesContainer = document.getElementById('times-container');
    const timesRow = document.getElementById('times-row');
    const selectedDateTitle = document.getElementById('selected-date-title');
    const selectedDateInput = document.getElementById('selected-date');
    const selectedTimeInput = document.getElementById('selected-time');

    // Backend API Configuration
    const API_BASE_URL = '/api';

    // Available times
    const availableTimes = [
        '15:00', '15:30', 
        '16:00', '16:30', 
        '17:00', '17:30', 
        '18:00'
    ];

    // Validate Israeli phone number
    function validateIsraeliPhoneNumber(phone) {
        const cleanPhone = phone.replace(/\D/g, '');
        const israeliPhoneRegex = /^(05\d{8})$/;
        return israeliPhoneRegex.test(cleanPhone);
    }

    // Generate dates for the next 7 days
    function generateDateButtons() {
        const today = new Date();
        const daysOfWeek = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
        
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
            
            dateButton.addEventListener('click', () => selectDate(formattedDate, displayDate));
            
            datesRow.appendChild(dateButton);
        }
    }

    // Handle date selection
    function selectDate(date, displayDate) {
        // Remove active class from all date buttons
        document.querySelectorAll('.date-button').forEach(btn => 
            btn.classList.remove('active'));
        
        // Add active class to selected date button
        event.target.classList.add('active');
        
        // Show times container
        timesContainer.classList.remove('hidden');
        
        // Update selected date title
        selectedDateTitle.textContent = `תאריך: ${displayDate}`;
        selectedDateInput.value = date;
        
        // Clear previous times
        timesRow.innerHTML = '';
        
        // Generate time buttons
        availableTimes.forEach(time => {
            const timeButton = document.createElement('button');
            timeButton.classList.add('time-button');
            timeButton.textContent = time;
            
            timeButton.addEventListener('click', () => selectTime(time));
            
            timesRow.appendChild(timeButton);
        });
    }

    // Handle time selection
    function selectTime(time) {
        // Remove active class from all time buttons
        document.querySelectorAll('.time-button').forEach(btn => 
            btn.classList.remove('active'));
        
        // Add active class to selected time button
        event.target.classList.add('active');
        
        // Set selected time
        selectedTimeInput.value = time;
    }

    // Add real-time validation to phone input
    phoneInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^\d-]/g, '');
        
        if (this.value.length > 3 && this.value[3] !== '-') {
            this.value = this.value.slice(0, 3) + '-' + this.value.slice(3);
        }
        if (this.value.length > 7 && this.value[7] !== '-') {
            this.value = this.value.slice(0, 7) + '-' + this.value.slice(7);
        }
    });

    async function submitAppointment(event) {
        event.preventDefault();
        
        const name = document.getElementById('name').value;
        const phone = document.getElementById('phone').value;
        const selectedDate = document.querySelector('.date-button.active').dataset.date;
        const selectedTime = document.querySelector('.time-button.active').dataset.time;

        try {
            const response = await fetch(`${API_BASE_URL}/create-appointment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: name,
                    phone: phone,
                    date: selectedDate,
                    time: selectedTime
                })
            });

            console.log('Appointment submission response:', response);

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Failed to book appointment:', errorData);
                throw new Error(errorData.detail || 'Failed to book appointment');
            }

            const confirmationData = await response.json();
            console.log('Appointment submission result:', confirmationData);
            showConfirmation(confirmationData);
        } catch (error) {
            console.error('Error:', error);
            showError(error.message);
        }
    }

    async function loadAvailableSlots(selectedDate) {
        try {
            console.log('Loading available slots for date:', selectedDate);
            const response = await fetch(`${API_BASE_URL}/available-slots?target_date=${selectedDate}`);
            
            console.log('Available slots response:', response);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Failed to load available slots:', errorText);
                throw new Error('Failed to load available slots: ' + errorText);
            }

            const availableSlots = await response.json();
            console.log('Available slots:', availableSlots);
            updateTimeSlots(availableSlots);
        } catch (error) {
            console.error('Error loading available slots:', error);
            showError('Could not load available time slots');
        }
    }

    form.addEventListener('submit', submitAppointment);

    // Generate date buttons when page loads
    generateDateButtons();
});

document.addEventListener('DOMContentLoaded', function() {
    const nameInput = document.getElementById('name');
    const phoneInput = document.getElementById('phone');
    const dateInput = document.getElementById('date');
    const selectedTimeInput = document.getElementById('selected-time');
    const submitButton = document.getElementById('submit-button');
    const messageDiv = document.getElementById('message');

    // Backend API Configuration
    const API_BASE_URL = '/api';

    // Validate Israeli phone number
    function validatePhoneNumber(phone) {
        const phoneRegex = /^05\d{8}$/;
        return phoneRegex.test(phone.replace(/\D/g, ''));
    }

    // Fetch available time slots
    async function fetchAvailableSlots(selectedDate) {
        try {
            console.log('Fetching available slots for date:', selectedDate);
            const response = await fetch(`${API_BASE_URL}/available-slots?target_date=${selectedDate}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log('Available slots response:', response);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Failed to fetch available slots:', errorText);
                throw new Error('Failed to fetch available slots: ' + errorText);
            }

            const availableSlots = await response.json();
            console.log('Available slots:', availableSlots);
            return availableSlots;
        } catch (error) {
            console.error('Error fetching available slots:', error);
            messageDiv.textContent = 'שגיאה בטעינת זמנים פנויים: ' + error.message;
            messageDiv.style.color = 'red';
            return [];
        }
    }

    // Populate time slots
    async function populateTimeSlots() {
        const selectedDate = dateInput.value;
        const timeSlotsContainer = document.getElementById('time-slots');
        timeSlotsContainer.innerHTML = '';

        if (!selectedDate) {
            messageDiv.textContent = 'אנא בחר תאריך';
            return;
        }

        const availableSlots = await fetchAvailableSlots(selectedDate);

        availableSlots.forEach(slot => {
            const timeButton = document.createElement('button');
            timeButton.textContent = slot.time;
            timeButton.classList.add('time-slot');
            timeButton.addEventListener('click', () => {
                selectedTimeInput.value = slot.time;
                document.querySelectorAll('.time-slot').forEach(btn => btn.classList.remove('selected'));
                timeButton.classList.add('selected');
            });
            timeSlotsContainer.appendChild(timeButton);
        });
    }

    // Submit appointment
    async function submitAppointment(event) {
        event.preventDefault();

        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();
        const date = dateInput.value;
        const time = selectedTimeInput.value;

        console.log('Submitting appointment:', { name, phone, date, time });

        // Validate inputs
        if (!name || name.length < 2) {
            console.warn('Invalid name');
            messageDiv.textContent = 'אנא הזן שם תקין';
            messageDiv.style.color = 'red';
            return;
        }

        if (!validatePhoneNumber(phone)) {
            console.warn('Invalid phone number');
            messageDiv.textContent = 'אנא הזן מספר טלפון תקין (05xxxxxxxx)';
            messageDiv.style.color = 'red';
            return;
        }

        if (!date) {
            console.warn('No date selected');
            messageDiv.textContent = 'אנא בחר תאריך';
            messageDiv.style.color = 'red';
            return;
        }

        if (!time) {
            console.warn('No time selected');
            messageDiv.textContent = 'אנא בחר שעה';
            messageDiv.style.color = 'red';
            return;
        }

        try {
            console.log('Sending request to:', `${API_BASE_URL}/create-appointment`);
            const response = await fetch(`${API_BASE_URL}/create-appointment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: name,
                    phone: phone,
                    date: date,
                    time: time
                })
            });

            console.log('Appointment submission response:', response);

            const result = await response.json();
            console.log('Appointment submission result:', result);

            if (response.ok) {
                messageDiv.textContent = 'התור נקבע בהצלחה! תודה לך.';
                messageDiv.style.color = 'green';
                
                // Reset form
                nameInput.value = '';
                phoneInput.value = '';
                dateInput.value = '';
                selectedTimeInput.value = '';
                document.getElementById('time-slots').innerHTML = '';
            } else {
                console.error('Appointment submission error:', result);
                messageDiv.textContent = result.error || 'שגיאה בקביעת תור';
                messageDiv.style.color = 'red';
            }
        } catch (error) {
            console.error('Submission error:', error);
            messageDiv.textContent = 'שגיאה בקביעת תור. אנא נסה שוב. ' + error.message;
            messageDiv.style.color = 'red';
        }
    }

    // Event Listeners
    dateInput.addEventListener('change', populateTimeSlots);
    submitButton.addEventListener('click', submitAppointment);

    // Optional: Add console log to verify script is loaded
    console.log('Booking script initialized');
});
