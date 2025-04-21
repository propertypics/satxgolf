// Config
const API_BASE_URL = "https://satxgolf.wade-lewis.workers.dev";
const APP_VERSION = "1.0.7";

// DOM Elements
const courseGrid = document.getElementById('courseGrid');
const loadingIndicator = document.getElementById('loadingIndicator');
const loginModal = document.getElementById('loginModal');
const closeLoginModal = document.getElementById('closeLoginModal');
const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');
const userInfo = document.getElementById('userInfo');
const userName = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');
const membershipModal = document.getElementById('membershipModal');
const closeMembershipModal = document.getElementById('closeMembershipModal');
const membershipOptions = document.getElementById('membershipOptions');
const proceedToBooking = document.getElementById('proceedToBooking');
const statsLink = document.getElementById('statsLink');

// Course images - you can replace these with actual course images
const courseImages = {
    "Brackenridge Park": "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
    "Cedar Creek": "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
    "Mission del Lago": "https://images.unsplash.com/photo-1592919505780-303950717480?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
    "Northern Hills": "https://images.unsplash.com/photo-1563299796-17596ed6b017?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
    "Olmos Basin": "https://images.unsplash.com/photo-1591123120675-6f7f1aae0e5b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
    "Riverside 18": "https://images.unsplash.com/photo-1600170034071-d53e525296d7?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
    "The Teddy Bear Par 3": "https://images.unsplash.com/photo-1580236580881-2e91a67acd59?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
    "San Pedro Par 3": "https://images.unsplash.com/photo-1609198092458-38a293c7ac4b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
};

// Membership types (hardcoded based on your HTML example)
const membershipTypes = [
    { id: "0", name: "Public - No Booking Fees" },
    { id: "50541", name: "Trailpass Plus" },
    { id: "50537", name: "Trailpass Plus - Senior/Military" },
    { id: "3272", name: "Level I / Trailpass" },
    { id: "8916", name: "Level I / Trailpass - Senior/Military" },
    { id: "3300", name: "Trailpass Pro" },
    { id: "50544", name: "Legacy Level II" },
    { id: "50557", name: "Legacy Level II - Senior/Military" },
    { id: "50545", name: "Legacy Die Hard" }
];

// Currently selected course and membership
let selectedCourse = null;
let selectedMembership = null;

// Check if user is logged in
function checkLogin() {
    const token = localStorage.getItem('jwt_token');
    const storedName = localStorage.getItem('user_name');
    
    if (token) {
        if (storedName) {
            userName.textContent = storedName;
        }
        userInfo.style.display = 'flex';
        statsLink.style.display = 'block';  // Show My Stats link when logged in
        return true;
    }
    statsLink.style.display = 'none';  // Hide My Stats link when not logged in
    return false;
}

// Load courses
function loadCourses() {
    loadingIndicator.style.display = 'block';
    courseGrid.innerHTML = '';
    
    fetch(`${API_BASE_URL}/api/courses`)
        .then(response => response.json())
        .then(courses => {
            renderCourses(courses);
            loadingIndicator.style.display = 'none';
        })
        .catch(error => {
            console.error('Error loading courses:', error);
            loadingIndicator.style.display = 'none';
            
            // Show error message
            courseGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 2rem;">
                    <h3>Error Loading Courses</h3>
                    <p>Could not connect to the server. Please try again later.</p>
                </div>
            `;
        });
}

// Render courses
function renderCourses(courses) {
    courseGrid.innerHTML = '';
    
    courses.forEach(course => {
        const courseCard = document.createElement('div');
        courseCard.className = 'course-card';
        
        // Get image URL (default if not found)
        const imageUrl = courseImages[course.name] || 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80';
        
        courseCard.innerHTML = `
            <div class="course-img" style="background-image: url('${imageUrl}')"></div>
            <div class="course-info">
                <h3 class="course-name">${course.name}</h3>
                <p class="course-details">${course.details}</p>
                <button class="book-btn">Book Tee Time</button>
            </div>
        `;
        
        // Add click event to book button
        const bookBtn = courseCard.querySelector('.book-btn');
        bookBtn.addEventListener('click', () => {
            selectedCourse = course;
            if (checkLogin()) {
                showMembershipModal();
            } else {
                showLoginModal();
            }
        });
        
        courseGrid.appendChild(courseCard);
    });
}

// Show login modal
function showLoginModal() {
    loginModal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
}

// Hide login modal
function hideLoginModal() {
    loginModal.classList.remove('active');
    document.body.style.overflow = ''; // Enable scrolling
}

// Show membership modal
function showMembershipModal() {
    // Generate membership options
    membershipOptions.innerHTML = '';
    let selectedOption = null;
    
    membershipTypes.forEach(membership => {
        const option = document.createElement('div');
        option.className = 'membership-option';
        option.innerHTML = `
            <div class="membership-name">${membership.name}</div>
        `;
        
        option.addEventListener('click', () => {
            // Deselect previous option
            if (selectedOption) {
                selectedOption.classList.remove('selected');
            }
            
            // Select this option
            option.classList.add('selected');
            selectedOption = option;
            selectedMembership = membership;
            
            // Enable proceed button
            proceedToBooking.disabled = false;
        });
        
        membershipOptions.appendChild(option);
    });
    
    // Reset proceed button
    proceedToBooking.disabled = true;
    
    // Show modal
    membershipModal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
}

// Hide membership modal
function hideMembershipModal() {
    membershipModal.classList.remove('active');
    document.body.style.overflow = ''; // Enable scrolling
}

// Handle login form submission
loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    
    if (!usernameInput.value || !passwordInput.value) {
        showMessage('Please enter both username and password.', 'error');
        return;
    }
    
    loginUser(usernameInput.value, passwordInput.value);
});

// Login user
function loginUser(username, password) {
    // Clear previous messages
    loginMessage.style.display = 'none';
    
    // Create loading indicator
    const loginBtn = document.querySelector('.login-btn');
    const originalText = loginBtn.textContent;
    loginBtn.textContent = 'Signing in...';
    loginBtn.disabled = true;
    
    fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: username,
            password: password
        })
    })
    .then(response => response.json())
    .then(data => {
        // Reset button
        loginBtn.textContent = originalText;
        loginBtn.disabled = false;
        
        if (data.error) {
            showMessage(data.message || 'Unknown error', 'error');
            return;
        }
        
        // Store cookies if received
        if (data.cookies) {
            localStorage.setItem('foreup_cookies', data.cookies);
        }
        
        // Handle "Refresh required" error
        if (data.success === false && (data.msg === "Refresh required." || data.msg === "Refresh required")) {
            showMessage('ForeUp requires you to log in through their website first. Please complete login at ForeUp and try again.', 'error');
            return;
        }
        
        if (data.success === false) {
            showMessage(data.msg || 'Login failed', 'error');
            return;
        }
        
        // Store JWT token if present
        if (data.jwt) {
            localStorage.setItem('jwt_token', data.jwt);
            
            // Store user name
            if (data.first_name && data.last_name) {
                const fullName = `${data.first_name} ${data.last_name}`;
                localStorage.setItem('user_name', fullName);
                userName.textContent = fullName;
            }
            
            // Store the entire login response for stats analysis
            localStorage.setItem('login_data', JSON.stringify(data));
            
            // Show user info
            userInfo.style.display = 'flex';
            statsLink.style.display = 'block';
            
            // Hide login modal
            hideLoginModal();
            
            // Show membership modal if a course was selected
            if (selectedCourse) {
                showMembershipModal();
            }
        } else {
            showMessage('No authentication token received', 'error');
        }
    })
    .catch(error => {
        console.error('Login error:', error);
        loginBtn.textContent = originalText;
        loginBtn.disabled = false;
        showMessage('Login failed. Please check your credentials and try again.', 'error');
    });
}

// Show message in login modal
function showMessage(message, type) {
    loginMessage.textContent = message;
    loginMessage.className = `status-message ${type}`;
    loginMessage.style.display = 'block';
}

// Proceed to booking
proceedToBooking.addEventListener('click', function() {
    if (!selectedCourse || !selectedMembership) {
        return;
    }
    
    hideMembershipModal();
    
    // Show a brief notification
    const notification = document.createElement('div');
    notification.style.position = 'fixed';
    notification.style.top = '50%';
    notification.style.left = '50%';
    notification.style.transform = 'translate(-50%, -50%)';
    notification.style.backgroundColor = 'rgba(46, 125, 50, 0.9)';
    notification.style.color = 'white';
    notification.style.padding = '20px';
    notification.style.borderRadius = '8px';
    notification.style.zIndex = '2000';
    notification.style.textAlign = 'center';
    notification.style.maxWidth = '90%';
    notification.style.width = '400px';
    
    notification.innerHTML = `
        <h3 style="margin-top: 0;">Opening ForeUp Website</h3>
        <p>You'll now be redirected to the ForeUp booking system.</p>
        <p>You may need to log in again on the ForeUp site.</p>
    `;
    
    document.body.appendChild(notification);
    
    // Target URL
    const foreupUrl = `https://foreupsoftware.com/index.php/booking/${selectedCourse.courseId}/${selectedCourse.facilityId}#teetimes`;
    
    // After a brief delay, open ForeUp and remove notification
    setTimeout(() => {
        window.open(foreupUrl, '_blank');
        document.body.removeChild(notification);
    }, 2500);
});

// Handle logout
logoutBtn.addEventListener('click', function() {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_name');
    localStorage.removeItem('foreup_cookies');
    localStorage.removeItem('login_data');
    userInfo.style.display = 'none';
    statsLink.style.display = 'none';
    
    // Reload the page
    location.reload();
});

// Close modal when clicking the X
if (closeLoginModal) closeLoginModal.addEventListener('click', hideLoginModal);
if (closeMembershipModal) closeMembershipModal.addEventListener('click', hideMembershipModal);

// Close modals when clicking outside
if (loginModal) {
    loginModal.addEventListener('click', function(e) {
        if (e.target === loginModal) {
            hideLoginModal();
        }
    });
}

if (membershipModal) {
    membershipModal.addEventListener('click', function(e) {
        if (e.target === membershipModal) {
            hideMembershipModal();
        }
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    checkLogin();
    
    // Load courses only on main page
    if (document.getElementById('courseGrid')) {
        loadCourses();
    }
    
    // Health check
    fetch(`${API_BASE_URL}/health`)
        .then(response => response.json())
        .then(data => {
            console.log('API health check:', data);
        })
        .catch(error => {
            console.error('API health check failed:', error);
        });
});
