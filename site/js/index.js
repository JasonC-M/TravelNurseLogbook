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
            console.log('index.js - Session check error:', error);
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
        console.error('Sign in error: Please fill in all fields');
        return;
    }

    // Ensure auth is available
    if (!window.auth) {
        console.error('Sign in error: Authentication system not ready. Please refresh the page.');
        return;
    }
    
    // Call auth.js for authentication logic
    const result = await window.auth.signIn(email, password);
    
    if (result.success) {
        console.log('Sign in success: Login successful! Redirecting...');
        // auth.js handles the redirect automatically
    } else {
        console.error('Sign in error:', result.error);
    }
}

// Handle Sign Up
async function handleSignUp(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const firstName = formData.get('first_name');
    const lastName = formData.get('last_name');
    const email = formData.get('email');
    const password = formData.get('password');
    const confirm = formData.get('confirm');

    if (!firstName || !lastName || !email || !password || !confirm) {
        console.error('Sign up error: Please fill in all fields');
        return;
    }

    if (password !== confirm) {
        console.error('Sign up error: Passwords do not match');
        return;
    }

    if (password.length < 6) {
        console.error('Sign up error: Password must be at least 6 characters');
        return;
    }

    // Check password complexity
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
        console.error('Sign up error: Password must contain at least one lowercase letter, one uppercase letter, and one number');
        return;
    }

    // Ensure auth is available
    if (!window.auth) {
        console.error('Sign up error: Authentication system not ready. Please refresh the page.');
        return;
    }
    
    // Create full name from separate fields
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    
    // Call auth.js for authentication logic
    const result = await window.auth.signUp(email, password, { 
        first_name: firstName.trim(), 
        last_name: lastName.trim(),
        full_name: fullName 
    });
    
    if (result.success) {
        console.log('Sign up success:', result.message);
    } else {
        console.error('Sign up error:', result.error);
    }
}

// Handle Password Reset
async function handlePasswordReset(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email');

    if (!email) {
        console.error('Password reset error: Please enter your email address');
        return;
    }

    // Ensure auth is available
    if (!window.auth) {
        console.error('Password reset error: Authentication system not ready. Please refresh the page.');
        return;
    }
    
    // Call auth.js for authentication logic
    const result = await window.auth.resetPassword(email);
    
    if (result.success) {
        console.log('Password reset success:', result.message);
    } else {
        console.error('Password reset error:', result.error);
    }
}