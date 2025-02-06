document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');

    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // Check if the password is correct
        if (passwordInput.value === '1234') {
            // Redirect to appointments page
            window.location.href = 'appointments.html';
        } else {
            // Show error message
            errorMessage.classList.remove('hidden');
            
            // Hide error message after 3 seconds
            setTimeout(() => {
                errorMessage.classList.add('hidden');
            }, 3000);

            // Clear password input
            passwordInput.value = '';
        }
    });
});
