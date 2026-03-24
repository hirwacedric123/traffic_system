// Custom popup function
function showPopup(title, message, type = 'info') {
    const popupOverlay = document.getElementById('popup-overlay');
    const popupIcon = document.getElementById('popup-icon');
    const popupTitle = document.getElementById('popup-title');
    const popupMessage = document.getElementById('popup-message');
    const popupButton = document.getElementById('popup-button');

    // Set icon based on type
    popupIcon.className = 'popup-icon';
    if (type === 'success') {
        popupIcon.textContent = '✓';
        popupIcon.classList.add('success');
        popupButton.className = 'popup-button success';
    } else if (type === 'error') {
        popupIcon.textContent = '✕';
        popupIcon.classList.add('error');
        popupButton.className = 'popup-button error';
    } else if (type === 'warning') {
        popupIcon.textContent = '⚠';
        popupIcon.classList.add('warning');
        popupButton.className = 'popup-button';
    } else {
        popupIcon.textContent = 'ℹ';
        popupButton.className = 'popup-button';
    }

    popupTitle.textContent = title;
    popupMessage.textContent = message;

    // Show popup
    popupOverlay.classList.add('show');

    // Handle button click
    const closePopup = () => {
        popupOverlay.classList.remove('show');
        popupButton.removeEventListener('click', closePopup);
    };

    popupButton.addEventListener('click', closePopup);

    // Close on overlay click
    popupOverlay.addEventListener('click', (e) => {
        if (e.target === popupOverlay) {
            closePopup();
        }
    });
}

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        ...options
    });
    const data = await response.json().catch(() => ({}));
    return { response, data };
}

function validateEmail(email) {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    if (password.length < 8) {
        return 'Password must be at least 8 characters long';
    }
    if (password.length > 128) {
        return 'Password must be at most 128 characters long';
    }
    return null;
}

// Get form elements
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const signupEmailInput = document.getElementById('signup-email');
const signupPasswordInput = document.getElementById('signup-password');
const confirmPasswordInput = document.getElementById('confirm-password');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const showSignupLink = document.getElementById('show-signup');
const showLoginLink = document.getElementById('show-login');

// Toggle between login and signup forms
showSignupLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    signupForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
});

// Signup validation
signupBtn.addEventListener('click', async () => {
    const email = signupEmailInput.value.trim();
    const password = signupPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Basic validations
    if (!email) {
        showPopup('Error', 'Please enter an email address', 'error');
        return;
    }

    if (!validateEmail(email)) {
        showPopup('Error', 'Please enter a valid email address', 'error');
        return;
    }

    const passwordValidationError = validatePassword(password);
    if (passwordValidationError) {
        showPopup('Error', passwordValidationError, 'error');
        return;
    }

    if (password !== confirmPassword) {
        showPopup('Error', 'Passwords do not match', 'error');
        return;
    }

    try {
        signupBtn.disabled = true;
        const { response, data } = await apiRequest('/api/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            showPopup('Sign Up Failed', data.error || 'Unable to create account.', 'error');
            return;
        }

        showPopup('Success', 'Account created successfully!', 'success');

        // Switch to login form
        signupForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        signupEmailInput.value = '';
        signupPasswordInput.value = '';
        confirmPasswordInput.value = '';
    } catch (error) {
        console.error('Signup error:', error);
        showPopup('Network Error', 'Could not connect to the server.', 'error');
    } finally {
        signupBtn.disabled = false;
    }
});

// Login functionality
loginBtn.addEventListener('click', async () => {
    const email = loginEmailInput.value.trim();
    const password = loginPasswordInput.value;

    // Validate inputs
    if (!email || !password) {
        showPopup('Error', 'Please enter both email and password', 'error');
        return;
    }
    if (!validateEmail(email)) {
        showPopup('Error', 'Please enter a valid email address', 'error');
        return;
    }

    try {
        loginBtn.disabled = true;
        const { response, data } = await apiRequest('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            showPopup('Login Failed', data.error || 'Invalid email or password', 'error');
            return;
        }

        const role = data.user?.role || 'user';
        showPopup('Welcome Back!', 'Login successful!', 'success');
        setTimeout(() => {
            window.location.href = role === 'admin' ? 'admin.html' : 'index.html';
        }, 1200);
    } catch (error) {
        console.error('Login error:', error);
        showPopup('Network Error', 'Could not connect to the server.', 'error');
    } finally {
        loginBtn.disabled = false;
    }
});

// Check if user is already logged in
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const { response, data } = await apiRequest('/api/auth/me', { method: 'GET' });
        if (response.ok && data.authenticated) {
            if (data.user?.role === 'admin') {
                window.location.href = 'admin.html';
                return;
            }
            window.location.href = 'index.html';
            return;
        }
    } catch (error) {
        console.warn('Session check skipped:', error);
    }

    // Add Enter key functionality for login form
    loginEmailInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loginBtn.click();
        }
    });

    loginPasswordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loginBtn.click();
        }
    });

    // Add Enter key functionality for signup form
    signupEmailInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            signupBtn.click();
        }
    });

    signupPasswordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            signupBtn.click();
        }
    });

    confirmPasswordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            signupBtn.click();
        }
    });
});