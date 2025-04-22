// This should be inserted at the top of your scripts.js file, replacing the existing code
const API_BASE_URL = "https://satxgolf.wade-lewis.workers.dev";
const APP_VERSION = "1.0.9";

// Helper function to safely get elements and log errors if they're not found
function getElement(id, errorMessage) {
    const element = document.getElementById(id);
    if (!element) {
        console.error(errorMessage || `Element with id '${id}' not found`);
    }
    return element;
}

// Get all important elements with error handling
const courseGrid = getElement('courseGrid', 'Course grid element not found. Course display will fail.');
const loadingIndicator = getElement('loadingIndicator');
const loginModal = getElement('loginModal');
const closeLoginModal = getElement('closeLoginModal');
const loginForm = getElement('loginForm');
const loginMessage = getElement('loginMessage');
const userInfo = getElement('userInfo');
const userName = getElement('userName');
const logoutBtn = getElement('logoutBtn');
const statsLink = getElement('statsLink');

// Course images mapping
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

// Global variables
let selectedCourse = null;

// Login check function
function checkLogin() {
    const token = localStorage.getItem('jwt_token');
    const storedName = localStorage.getItem('user_name');
    
    if (token) {
        if (storedName && userName) {
            userName.textContent = storedName;
        }
        if (userInfo) userInfo.style.display = 'flex';
        if (statsLink) statsLink.style.display = 'block';
        return true;
    }
    if (statsLink) statsLink.style.display = 'none';
    return false;
}

// Function to load courses from API
function loadCourses() {
    console.log('loadCourses called on page:', window.location.pathname);
    
    // Add diagnostic check 
    if (!courseGrid) {
        console.error('CRITICAL ERROR: courseGrid element not found, skipping course load');
        // Try to add a visible error on the page
        const mainElement = document.querySelector('main');
        if (mainElement) {
            mainElement.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: red;">
                    <h3>Error: Course Grid Not Found</h3>
                    <p>There is a technical issue with the page. Please contact support.</p>
                </div>
            `;
        }
        return;
    }
    
    // Show loading indicator
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
    } else {
        console.warn('Loading indicator not found');
    }
    
    // Clear any existing content
    courseGrid.innerHTML = '';
    
    // Hard-coded courses for testing in case API fails
    const fallbackCourses = [
        { 
            name: "Brackenridge Park", 
            details: "Rating 70.3 / Slope 126 / Par 71 / 6243 Yds", 
            courseId: "20103",
            facilityId: "3564" 
        },
        { 
            name: "Cedar Creek", 
            details: "Rating 73.4 / Slope 132 / Par 72 / 7158 yds", 
            courseId: "20104",
            facilityId: "3565"
        }
    ];
    
    console.log('Attempting to fetch courses from API...');
    fetch(`${API_BASE_URL}/api/courses`)
        .then(response => {
            console.log('API response received:', response.status);
            return response.json();
        })
        .then(courses => {
            console.log('Courses data received:', courses ? courses.length : 'none');
            
            // Use the returned courses or fallback if empty
            if (!courses || courses.length === 0) {
                console.warn('No courses returned from API, using fallback data');
                courses = fallbackCourses;
            }
            
            // Render courses to the page
            renderCourses(courses);
            
            // Hide loading indicator
            if (loadingIndicator) loadingIndicator.style.display = 'none';
        })
        .catch(error => {
            console.error('Error loading courses:', error);
            
            // Hide loading indicator
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            
            // Display error message
            courseGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: red;">
                    <h3>Error Loading Courses</h3>
                    <p>Could not connect to the server. Using fallback data.</p>
                </div>
            `;
            
            // Use fallback courses
            renderCourses(fallbackCourses);
        });
}

// Function to render courses to the page
function renderCourses(courses) {
    if (!courseGrid) {
        console.error('CRITICAL ERROR: courseGrid element not found in renderCourses function');
        return;
    }
    
    console.log('Rendering courses:', courses.length);
    courseGrid.innerHTML = '';
    
    courses.forEach(course => {
        try {
            const courseCard = document.createElement('div');
            courseCard.className = 'course-card';
            
            const imageUrl = courseImages[course.name] || 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80';
            
            courseCard.innerHTML = `
                <div class="course-img" style="background-image: url('${imageUrl}')"></div>
                <div class="course-info">
                    <h3 class="course-name">${course.name}</h3>
                    <p class="course-details">${course.details}</p>
                    <button class="book-btn">Book Tee Time</button>
                </div>
            `;
            
            const bookBtn = courseCard.querySelector('.book-btn');
            bookBtn.addEventListener('click', () => {
                selectedCourse = course;
                console.log('Course selected:', course.name);
                
                if (checkLogin()) {
                    // Show a notification that we're ready for the next step
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
                        <h3 style="margin-top: 0;">Course Selected</h3>
                        <p>You've selected ${course.name}.</p>
                        <p>In the future, we'll implement booking functionality here.</p>
                        <button id="closeNotification" style="background-color: white; color: #2e7d32; border: none; padding: 8px 16px; border-radius: 4px; margin-top: 10px; cursor: pointer;">Close</button>
                    `;
                    document.body.appendChild(notification);
                    
                    // Add event listener to close button
                    const closeButton = notification.querySelector('#closeNotification');
                    closeButton.addEventListener('click', () => {
                        document.body.removeChild(notification);
                    });
                    
                    // Auto-remove notification after 5 seconds
                    setTimeout(() => {
                        if (document.body.contains(notification)) {
                            document.body.removeChild(notification);
                        }
                    }, 5000);
                } else {
                    showLoginModal();
                }
            });
            
            courseGrid.appendChild(courseCard);
        } catch (e) {
            console.error('Error rendering course:', course.name, e);
        }
    });
    
    console.log('Course rendering complete.');
}

// Login modal functions
function showLoginModal() {
    if (loginModal) {
        console.log('Showing login modal');
        loginModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    } else {
        console.error('Login modal element not found');
    }
}

function hideLoginModal() {
    if (loginModal) {
        loginModal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Function to log in user
function loginUser(username, password) {
    if (!loginMessage || !loginForm) {
        console.error('Login message or form elements not found');
        return;
    }
    
    loginMessage.style.display = 'none';
    
    const loginBtn = document.querySelector('.login-btn');
    if (!loginBtn) {
        console.error('Login button not found');
        return;
    }
    
    const originalText = loginBtn.textContent;
    loginBtn.textContent = 'Signing in...';
    loginBtn.disabled = true;
    
    console.log('Attempting to log in user:', username);
    
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
        loginBtn.textContent = originalText;
        loginBtn.disabled = false;
        
        console.log('Login response received:', data.success !== false ? 'success' : 'failed');
        
        if (data.error) {
            showMessage(data.message || 'Unknown error', 'error');
            return;
        }
        
        if (data.cookies) {
            localStorage.setItem('foreup_cookies', data.cookies);
        }
        
        if (data.success === false && (data.msg === "Refresh required." || data.msg === "Refresh required")) {
            showMessage('ForeUp requires you to log in through their website first. Please complete login at ForeUp and try again.', 'error');
            return;
        }
        
        if (data.success === false) {
            showMessage(data.msg || 'Login failed', 'error');
            return;
        }
        
        if (data.jwt) {
            localStorage.setItem('jwt_token', data.jwt);
            
            if (data.first_name && data.last_name) {
                const fullName = `${data.first_name} ${data.last_name}`;
                localStorage.setItem('user_name', fullName);
                if (userName) userName.textContent = fullName;
            }
            
            localStorage.setItem('login_data', JSON.stringify(data));
            
            if (userInfo) userInfo.style.display = 'flex';
            if (statsLink) statsLink.style.display = 'block';
            
            hideLoginModal();
            
            if (selectedCourse) {
                // Show notification that user has selected a course
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
                    <h3 style="margin-top: 0;">Successfully Logged In</h3>
                    <p>You've selected ${selectedCourse.name}.</p>
                    <p>In the future, we'll implement booking functionality here.</p>
                    <button id="closeNotification" style="background-color: white; color: #2e7d32; border: none; padding: 8px 16px; border-radius: 4px; margin-top: 10px; cursor: pointer;">Close</button>
                `;
                document.body.appendChild(notification);
                
                // Add event listener to close button
                const closeButton = notification.querySelector('#closeNotification');
                closeButton.addEventListener('click', () => {
                    document.body.removeChild(notification);
                });
                
                // Auto-remove notification after 5 seconds
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 5000);
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

function showMessage(message, type) {
    if (loginMessage) {
        loginMessage.textContent = message;
        loginMessage.className = `status-message ${type}`;
        loginMessage.style.display = 'block';
    } else {
        console.error('Login message element not found');
        alert(message); // Fallback to alert if the message element isn't found
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM content loaded, initializing page...');
    
    // Check for login status
    checkLogin();
    
    // Bind event listeners for login form
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            if (!usernameInput || !passwordInput) {
                showMessage('Username or password input not found', 'error');
                return;
            }
            if (!usernameInput.value || !passwordInput.value) {
                showMessage('Please enter both username and password.', 'error');
                return;
            }
            loginUser(usernameInput.value, passwordInput.value);
        });
    } else {
        console.warn('Login form not found, login functionality will be disabled');
    }
    
    // Bind event listeners for login modal
    if (closeLoginModal) {
        closeLoginModal.addEventListener('click', hideLoginModal);
    }
    
    if (loginModal) {
        loginModal.addEventListener('click', function(e) {
            if (e.target === loginModal) {
                hideLoginModal();
            }
        });
    }
    
    // Bind event listener for logout button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('jwt_token');
            localStorage.removeItem('user_name');
            localStorage.removeItem('foreup_cookies');
            localStorage.removeItem('login_data');
            if (userInfo) userInfo.style.display = 'none';
            if (statsLink) statsLink.style.display = 'none';
            location.href = 'index3.html';
        });
    }
    
    // Initialize page-specific functionality
    if (document.getElementById('courseGrid')) {
        console.log('Course grid found, loading courses...');
        loadCourses();
    } else if (document.getElementById('statsContainer')) {
        console.log('Stats container found, initializing stats page...');
        if (typeof initializeStatsPage === 'function') {
            initializeStatsPage();
        } else {
            console.error('initializeStatsPage function not found');
        }
    } else {
        console.warn('Neither course grid nor stats container found. Unknown page type.');
    }
    
    // Health check
    console.log('Performing API health check...');
    fetch(`${API_BASE_URL}/health`)
        .then(response => response.json())
        .then(data => {
            console.log('API health check:', data);
        })
        .catch(error => {
            console.error('API health check failed:', error);
        });
});
