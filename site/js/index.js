/* Travel Nurse Logbook - Index Page JavaScript */
/* Handles UI behavior and form interactions - uses auth.js for authentication logic */

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeTabs();
    initializeFormHandlers();
});

// Initialize tab functionality
function initializeTabs() {
    const tabs = document.querySelectorAll('.mode-tab');
    const forms = document.querySelectorAll('.auth-form');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const mode = tab.dataset.mode;
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show corresponding form
            forms.forEach(form => {
                form.classList.remove('active');
                if (form.id === `${mode}-form`) {
                    form.classList.add('active');
                }
            });
            
            // Clear any existing messages
            clearMessages();
        });
    });
}

// Initialize form handlers (UI behavior only)
function initializeFormHandlers() {
    // Sign In Form
    const signinForm = document.getElementById('signin-form');
    if (signinForm) {
        signinForm.addEventListener('submit', handleSignIn);
    }

    // Sign Up Form
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignUp);
    }

    // Reset Password Form
    const resetForm = document.getElementById('reset-form');
    if (resetForm) {
        resetForm.addEventListener('submit', handlePasswordReset);
    }
}

// Check if user is already logged in
async function checkExistingSession() {
    if (window.supabaseClient) {
        try {
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            if (session) {
                window.location.href = 'logbook.html';
            }
        } catch (error) {
            console.log('Session check error:', error);
        }
    }
}

// Handle Sign In (UI validation + auth.js call)
async function handleSignIn(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');

    // UI validation
    if (!email || !password) {
        showError('signin-error', 'Please fill in all fields');
        return;
    }

    // Ensure auth is available
    if (!window.auth) {
        showError('signin-error', 'Authentication system not ready. Please refresh the page.');
        return;
    }
    
    // Call auth.js for authentication logic
    const result = await window.auth.signIn(email, password);
    
    if (result.success) {
        showSuccess('signin-success', 'Login successful! Redirecting...');
        // auth.js handles the redirect automatically
    } else {
        showError('signin-error', result.error);
    }
}

// Handle Sign Up
async function handleSignUp(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('name');
    const email = formData.get('email');
    const password = formData.get('password');
    const confirm = formData.get('confirm');

    if (!name || !email || !password || !confirm) {
        showError('signup-error', 'Please fill in all fields');
        return;
    }

    if (password !== confirm) {
        showError('signup-error', 'Passwords do not match');
        return;
    }

    if (password.length < 6) {
        showError('signup-error', 'Password must be at least 6 characters');
        return;
    }

    // Ensure auth is available
    if (!window.auth) {
        showError('signup-error', 'Authentication system not ready. Please refresh the page.');
        return;
    }
    
    // Call auth.js for authentication logic
    const result = await window.auth.signUp(email, password, { full_name: name });
    
    if (result.success) {
        showSuccess('signup-success', result.message);
    } else {
        showError('signup-error', result.error);
    }
}

// Handle Password Reset
async function handlePasswordReset(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email');

    if (!email) {
        showError('reset-error', 'Please enter your email address');
        return;
    }

    // Ensure auth is available
    if (!window.auth) {
        showError('reset-error', 'Authentication system not ready. Please refresh the page.');
        return;
    }
    
    // Call auth.js for authentication logic
    const result = await window.auth.resetPassword(email);
    
    if (result.success) {
        showSuccess('reset-success', result.message);
    } else {
        showError('reset-error', result.error);
    }
}

// Utility functions
function showError(elementId, message) {
    clearMessages();
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    }
}

function showSuccess(elementId, message) {
    clearMessages();
    const successElement = document.getElementById(elementId);
    if (successElement) {
        successElement.textContent = message;
        successElement.style.display = 'block';
    }
}

function clearMessages() {
    const messages = document.querySelectorAll('.error-message, .success-message');
    messages.forEach(msg => {
        msg.style.display = 'none';
        msg.textContent = '';
    });
}