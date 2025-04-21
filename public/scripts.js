const API_BASE_URL = "https://satxgolf.wade-lewis.workers.dev";
const APP_VERSION = "1.0.7";

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

let selectedCourse = null;
let selectedMembership = null;

function checkLogin() {
    const token = localStorage.getItem('jwt_token');
    const storedName = localStorage.getItem('user_name');
    
    if (token) {
        if (storedName) {
            userName.textContent = storedName;
        }
        userInfo.style.display = 'flex';
        statsLink.style.display = 'block';
        return true;
    }
    statsLink.style.display = 'none';
    return false;
}

function loadCourses() {
    console.log('loadCourses called on page:', window.location.pathname);
    if (!courseGrid) {
        console.warn('courseGrid element not found, skipping course load');
        return;
    }
    loadingIndicator.style.display = 'block';
    courseGrid.innerHTML = '';
    
    fetch(`${API_BASE_URL}/api/courses`)
        .then(response => response.json())
        .then(courses => {
            if (typeof renderCourses === 'function') {
                renderCourses(courses);
            } else {
                console.error('renderCourses function not found');
            }
            loadingIndicator.style.display = 'none';
        })
        .catch(error => {
            console.error('Error loading courses:', error);
            loadingIndicator.style.display = 'none';
            
            courseGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 2rem;">
                    <h3>Error Loading Courses</h3>
                    <p>Could not connect to the server. Please try again later.</p>
                </div>
            `;
        });
}

function renderCourses(courses) {
    courseGrid.innerHTML = '';
    
    courses.forEach(course => {
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
            if (checkLogin()) {
                showMembershipModal();
            } else {
                showLoginModal();
            }
        });
        
        courseGrid.appendChild(courseCard);
    });
}

function showLoginModal() {
    loginModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function hideLoginModal() {
    loginModal.classList.remove('active');
    document.body.style.overflow = '';
}

function showMembershipModal() {
    membershipOptions.innerHTML = '';
    let selectedOption = null;
    
    membershipTypes.forEach(membership => {
        const option = document.createElement('div');
        option.className = 'membership-option';
        option.innerHTML = `
            <div class="membership-name">${membership.name}</div>
        `;
        
        option.addEventListener('click', () => {
            if (selectedOption) {
                selectedOption.classList.remove('selected');
            }
            
            option.classList.add('selected');
            selectedOption = option;
            selectedMembership = membership;
            
            proceedToBooking.disabled = false;
        });
        
        membershipOptions.appendChild(option);
    });
    
    proceedToBooking.disabled = true;
    
    membershipModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function hideMembershipModal() {
    membershipModal.classList.remove('active');
    document.body.style.overflow = '';
}

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

function loginUser(username, password) {
    loginMessage.style.display = 'none';
    
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
        loginBtn.textContent = originalText;
        loginBtn.disabled = false;
        
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
                userName.textContent = fullName;
            }
            
            localStorage.setItem('login_data', JSON.stringify(data));
            
            userInfo.style.display = 'flex';
            statsLink.style.display = 'block';
            
            hideLoginModal();
            
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

function showMessage(message, type) {
    loginMessage.textContent = message;
    loginMessage.className = `status-message ${type}`;
    loginMessage.style.display = 'block';
}

proceedToBooking.addEventListener('click', function() {
    if (!selectedCourse || !selectedMembership) {
        return;
    }
    
    hideMembershipModal();
    
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
    
    const foreupUrl = `https://foreupsoftware.com/index.php/booking/${selectedCourse.courseId}/${selectedCourse.facilityId}#teetimes`;
    
    setTimeout(() => {
        window.open(foreupUrl, '_blank');
        document.body.removeChild(notification);
    }, 2500);
});

logoutBtn.addEventListener('click', function() {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_name');
    localStorage.removeItem('foreup_cookies');
    localStorage.removeItem('login_data');
    userInfo.style.display = 'none';
    statsLink.style.display = 'none';
    
    location.reload();
});

if (closeLoginModal) closeLoginModal.addEventListener('click', hideLoginModal);
if (closeMembershipModal) closeMembershipModal.addEventListener('click', hideMembershipModal);

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

function initializeStatsPage() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const statsContainer = document.getElementById('statsContainer');
    const noDataMessage = document.getElementById('noDataMessage');
    const membershipInfo = document.getElementById('membershipInfo');
    const punchInfo = document.getElementById('punchInfo');
    const punchCard = document.getElementById('punchCard');
    const recentActivity = document.getElementById('recentActivity');
    
    if (!checkLogin()) {
        loadingIndicator.style.display = 'none';
        noDataMessage.style.display = 'block';
        return;
    }
    
    const loginDataStr = localStorage.getItem('login_data');
    if (!loginDataStr) {
        loadingIndicator.style.display = 'none';
        noDataMessage.style.display = 'block';
        noDataMessage.innerHTML = `
            <h3>No Stats Available</h3>
            <p>No golf data found. Try logging in again.</p>
        `;
        return;
    }
    
    try {
        const loginData = JSON.parse(loginDataStr);
        const userData = {
            name: `${loginData.first_name} ${loginData.last_name}`,
            email: loginData.email,
            phone: loginData.phone_number || loginData.cell_phone_number || 'N/A'
        };
        
        let membershipData = { name: 'No Membership', expires: 'N/A' };
        let hasPunchPass = false;
        let punchData = null;
        let recentRounds = [];
        
        if (loginData.passes) {
            const passIds = Object.keys(loginData.passes);
            if (passIds.length > 0) {
                const passId = passIds[0];
                const pass = loginData.passes[passId];
                membershipData = {
                    name: pass.name || 'Unknown Membership',
                    expires: formatDate(pass.end_date) || 'N/A',
                    purchased: formatDate(pass.date_purchased) || 'N/A'
                };
                
                if (pass.rules && pass.rules.length > 0) {
                    const punchRule = pass.rules.find(rule => rule.rule_number === 2);
                    if (punchRule) {
                        hasPunchPass = true;
                        let punchesUsed = 0;
                        const punchClassId = punchRule.price_class_id;
                        if (pass.uses && Array.isArray(pass.uses)) {
                            punchesUsed = pass.uses.filter(use => 
                                use.rule_number === "2" && use.price_class_id === String(punchClassId)
                            ).length;
                            recentRounds = pass.uses.map(use => {
                                const isPunch = use.rule_number === "2" && use.price_class_id === String(punchClassId);
                                let courseName = "Unknown Course";
                                const teesheetId = use.teesheet_id;
                                switch(teesheetId) {
                                    case "3564": courseName = "Brackenridge Park"; break;
                                    case "3565": courseName = "Cedar Creek"; break;
                                    case "3566": courseName = "Mission del Lago"; break;
                                    case "3567": courseName = "Northern Hills"; break;
                                    case "3568": courseName = "Olmos Basin"; break;
                                    case "3569": courseName = "Riverside Championship"; break;
                                    case "3570": courseName = "Riverside Teddy Bear"; break;
                                    case "3572": courseName = "San Pedro Par 3"; break;
                                    default: courseName = "Unknown Course";
                                }
                                return {
                                    date: formatDate(use.date),
                                    course: courseName,
                                    isPunch: isPunch
                                };
                            }).sort((a, b) => new Date(b.date) - new Date(a.date));
                        }
                        punchData = {
                            used: punchesUsed,
                            total: 10,
                            percent: (punchesUsed / 10) * 100
                        };
                    }
                }
            }
        }
        
        membershipInfo.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">Name:</span>
                <span>${userData.name}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Membership:</span>
                <span>${membershipData.name}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Expires:</span>
                <span>${membershipData.expires}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Purchase Date:</span>
                <span>${membershipData.purchased}</span>
            </div>
        `;
        
        if (hasPunchPass && punchData) {
            punchInfo.innerHTML = `
                <div class="punch-container">
                    <span>${punchData.used}</span>
                    <div class="punch-bar">
                        <div class="punch-progress" style="width: ${punchData.percent}%"></div>
                        <div class="punch-text">${punchData.used} of ${punchData.total} Used</div>
                    </div>
                    <span>${punchData.total}</span>
                </div>
            `;
        } else {
            punchCard.style.display = 'none';
        }
        
        if (recentRounds.length > 0) {
            const recentFiveRounds = recentRounds.slice(0, 5);
            recentActivity.innerHTML = `
                <ul class="recent-list">
                    ${recentFiveRounds.map(round => `
                        <li class="recent-item ${round.isPunch ? 'punch' : ''}">
                            <div>
                                <div class="course-name">${round.course}</div>
                                <div class="date">${round.date}</div>
                            </div>
                            <span class="badge ${round.isPunch ? 'badge-punch' : 'badge-paid'}">
                                ${round.isPunch ? 'Punch' : 'Paid'}
                            </span>
                        </li>
                    `).join('')}
                </ul>
            `;
        } else {
            recentActivity.innerHTML = '<p>No recent activity found.</p>';
        }
        
        loadingIndicator.style.display = 'none';
        statsContainer.style.display = 'block';
        
    } catch (error) {
        console.error('Error parsing login data:', error);
        loadingIndicator.style.display = 'none';
        noDataMessage.style.display = 'block';
        noDataMessage.innerHTML = `
            <h3>Error Loading Stats</h3>
            <p>There was a problem loading your golf data.</p>
        `;
    }
}

function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    } catch (e) {
        return dateStr;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    checkLogin();
    
    if (document.getElementById('courseGrid')) {
        loadCourses();
    } else if (document.getElementById('statsContainer')) {
        initializeStatsPage();
    }
    
    fetch(`${API_BASE_URL}/health`)
        .then(response => response.json())
        .then(data => {
            console.log('API health check:', data);
        })
        .catch(error => {
            console.error('API health check failed:', error);
        });
});
