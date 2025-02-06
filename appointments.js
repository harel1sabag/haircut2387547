document.addEventListener('DOMContentLoaded', function() {
    const appointmentsList = document.getElementById('appointments-list');
    const cancelConfirmation = document.getElementById('cancel-confirmation');

    // Function to load appointments from localStorage
    function loadAppointments() {
        const appointments = JSON.parse(localStorage.getItem('appointments') || '[]');
        
        // Clear existing rows
        appointmentsList.innerHTML = '';

        // Add each appointment to the table
        appointments.forEach((appointment, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${appointment.name}</td>
                <td>${appointment.phone}</td>
                <td>${appointment.date}</td>
                <td>${appointment.time}</td>
                <td>
                    <button class="cancel-btn" data-index="${index}">ביטול תור</button>
                </td>
            `;
            appointmentsList.appendChild(row);
        });

        // Add event listeners to cancel buttons
        const cancelButtons = document.querySelectorAll('.cancel-btn');
        cancelButtons.forEach(button => {
            button.addEventListener('click', function() {
                const index = this.getAttribute('data-index');
                cancelAppointment(index);
            });
        });
    }

    // Function to cancel an appointment
    function cancelAppointment(index) {
        // Get current appointments
        const appointments = JSON.parse(localStorage.getItem('appointments') || '[]');
        
        // Remove the appointment at the specified index
        appointments.splice(index, 1);

        // Save updated appointments
        localStorage.setItem('appointments', JSON.stringify(appointments));

        // Reload the appointments table
        loadAppointments();

        // Show cancellation confirmation
        cancelConfirmation.classList.remove('hidden');

        // Hide confirmation after 3 seconds
        setTimeout(() => {
            cancelConfirmation.classList.add('hidden');
        }, 3000);
    }

    // Load appointments when the page loads
    loadAppointments();
});
