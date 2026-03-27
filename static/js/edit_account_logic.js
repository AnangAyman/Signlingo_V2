document.addEventListener('DOMContentLoaded', function () {
    const editForm = document.getElementById('edit-account-form');
    
    if (editForm) {
        editForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const age = document.getElementById('age').value.trim();
            const currentPassword = document.getElementById('current_password').value;
            const newPassword = document.getElementById('new_password').value;
            const confirmNewPassword = document.getElementById('confirm_new_password').value;
            
            const errorContainer = document.getElementById('client-error-message');
            const errorTextElement = errorContainer.querySelector('.error-text');
            let errors = [];

            if (!name || !email || !age) {
                errors.push('Username, Email, and Age are required fields.');
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (email && !emailRegex.test(email)) {
                errors.push('Please enter a valid email address.');
            }
            if (age && (isNaN(age) || parseInt(age) <= 0)) {
                errors.push('Please enter a valid age.');
            }

            const passwordFieldsFilled = [currentPassword, newPassword, confirmNewPassword].filter(Boolean).length;
            if (passwordFieldsFilled > 0) {
                if (passwordFieldsFilled < 3) {
                    errors.push('To change your password, all three password fields are required.');
                } else {
                    if (newPassword.length < 8) {
                        errors.push('New password must be at least 8 characters long.');
                    }
                    if (newPassword !== confirmNewPassword) {
                        errors.push('New passwords do not match.');
                    }
                }
            }

            if (errors.length > 0) {
                errorTextElement.innerHTML = errors.join('<br>');
                errorContainer.style.display = 'flex';
                window.scrollTo(0, 0); 
            } else {
                errorContainer.style.display = 'none';
                editForm.submit();
            }
        });
    }
});