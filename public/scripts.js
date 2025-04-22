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

// Tee time related elements
const teeTimeModal = getElement('teeTimeModal');
const closeTeeTimeModal = getElement('closeTeeTimeModal');
const teeTimeModalTitle = getElement('teeTimeModalTitle');
const dateSelectionView = getElement('dateSelectionView');
const teeTimeSlotsView = getElement('teeTimeSlotsView');
const calendarMonth = getElement('calendarMonth');
const calendarDays = getElement('calendarDays');
const prevMonth = getElement('prevMonth');
const nextMonth = getElement('nextMonth');
const backToCalendar = getElement('backToCalendar');
const selectedDate = getElement('selectedDate');
const teeTimesList = getElement('teeTimesList');
const teeTimesLoading = getElement('teeTimesLoading');
const noTeeTimes = getElement('noTeeTimes');

// Call confirmation elements
const callConfirmModal = getElement('callConfirmModal');
const closeCallConfirmModal = getElement('closeCallConfirmModal');
const callConfirmDetails = getElement('callConfirmDetails');
const cancelCallBtn = getElement('cancelCallBtn');
const makeCallBtn = getElement('makeCallBtn');

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

// Calendar state
let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();
let selectedTeeTime = null;
let selectedCourse = null;

// Default booking class if user doesn't have a specific membership
const DEFAULT_BOOKING_CLASS = "3272"; // Public - No Booking Fees

// Mapping from pass/membership names to booking class IDs
const membershipToBookingClass = {
    "Trailpass Plus": "50530",
    "Trailpass Plus - Senior/Military": "50529",
    "Level I / Trailpass": "3273",
    "Level I / Trailpass - Senior/Military": "3274",
    "Trailpass Pro": "50531",
    "Legacy Level II": "3275",
    "Legacy Level II - Senior/Military": "3276",
    "Legacy Die Hard": "5866"
};

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

// Function to get the user's booking class ID based on their membership
function getUserBookingClassId() {
    // Get user login data from localStorage
    const loginDataStr = localStorage.getItem('login_data');
    if (!loginDataStr) {
        return DEFAULT_BOOKING_CLASS;
    }
    
    try {
        const loginData = JSON.parse(loginDataStr);
        
        // Check if the user has passes
        if (loginData.passes) {
            const passIds = Object.keys(loginData.passes);
            if (passIds.length > 0) {
                const passId = passIds[0];
                const pass = loginData.passes[passId];
                const membershipName = pass.name;
                
                // If we have a mapping for this membership, use it
                if (membershipName && membershipToBookingClass[membershipName]) {
                    return membershipToBookingClass[membershipName];
                }
            }
        }
    } catch (error) {
        console.error('Error getting user booking class:', error);
    }
    
    // Return default booking class if no match is found
    return DEFAULT_BOOKING_CLASS;
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
                if (checkLogin()) {
                    showTeeTimeModal(course);
                } else {
                    selectedCourse = course;
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

// Function to show the tee time modal with date selection
function showTeeTimeModal(course) {
    selectedCourse = course;
    
    // Update the modal title with course name
    if (teeTimeModalTitle) {
        teeTimeModalTitle.textContent = `Select Date - ${course.name}`;
    }
    
    // Show date selection view, hide tee times view
    if (dateSelectionView) dateSelectionView.style.display = 'block';
    if (teeTimeSlotsView) teeTimeSlotsView.style.display = 'none';
    
    // Generate the calendar for current month
    generateCalendar(currentMonth, currentYear);
    
    // Show the modal
    if (teeTimeModal) {
        teeTimeModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// Function to hide the tee time modal
function hideTeeTimeModal() {
    if (teeTimeModal) {
        teeTimeModal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Function to generate the calendar

// Update the generateCalendar function to properly handle past dates
function generateCalendar(month, year) {
    if (!calendarDays || !calendarMonth) return;
    
    // Clear previous calendar
    calendarDays.innerHTML = '';
    
    // Update month display
    const monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"];
    calendarMonth.textContent = `${monthNames[month]} ${year}`;
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Create empty cells for days before first day of month
    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'day empty';
        calendarDays.appendChild(emptyCell);
    }
    
    // Create cells for each day of the month
    const today = new Date();
    // Set today to beginning of day for proper comparison
    today.setHours(0, 0, 0, 0);
    
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(today.getDate() + 14);
    twoWeeksFromNow.setHours(23, 59, 59, 999);
    
    for (let i = 1; i <= daysInMonth; i++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'day';
        dayCell.textContent = i;
        
        // Check if this day is valid for booking
        const thisDate = new Date(year, month, i);
        thisDate.setHours(0, 0, 0, 0); // Set to beginning of day for proper comparison
        
        if (thisDate < today) {
            // Past date - always disabled
            dayCell.classList.add('disabled');
        } else if (thisDate > twoWeeksFromNow) {
            // More than 2 weeks in the future - also disabled
            dayCell.classList.add('disabled');
        } else {
            // Available date
            dayCell.classList.add('available');
            
            // Add click event to select this date
            dayCell.addEventListener('click', () => {
                selectDate(year, month, i);
            });
        }
        
        // Highlight today
        if (thisDate.getDate() === today.getDate() && 
            thisDate.getMonth() === today.getMonth() && 
            thisDate.getFullYear() === today.getFullYear()) {
            dayCell.classList.add('today');
        }
        
        calendarDays.appendChild(dayCell);
    }
}

// Function to select a date and show tee times
function selectDate(year, month, day) {
    // Format selected date for display
    const selectedDateObj = new Date(year, month, day);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = selectedDateObj.toLocaleDateString('en-US', options);
    
    if (selectedDate) {
        selectedDate.textContent = formattedDate;
    }
    
    // Switch views
    if (dateSelectionView) dateSelectionView.style.display = 'none';
    if (teeTimeSlotsView) teeTimeSlotsView.style.display = 'block';
    
    // Show loading indicator
    if (teeTimesLoading) teeTimesLoading.style.display = 'block';
    if (teeTimesList) teeTimesList.style.display = 'none';
    if (noTeeTimes) noTeeTimes.style.display = 'none';
    
    // Format date for API request (MM-DD-YYYY)
    const apiDateStr = `${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}-${year}`;
    
    // Fetch tee times for this date
    fetchTeeTimes(selectedCourse.courseId, selectedCourse.facilityId, apiDateStr);
}

// Function to fetch tee times from API
function fetchTeeTimes(courseId, facilityId, dateStr) {
    console.log(`Fetching tee times for course ${courseId}, facility ${facilityId}, date ${dateStr}`);
    
    // Show loading indicator
    if (teeTimesLoading) teeTimesLoading.style.display = 'block';
    if (teeTimesList) teeTimesList.style.display = 'none';
    if (noTeeTimes) noTeeTimes.style.display = 'none';
    
    // Force booking class to match the working curl example
    const bookingClassId = "50530"; // Trailpass Plus
    
    // Get auth token and cookies
    const token = localStorage.getItem('jwt_token');
    const cookies = localStorage.getItem('foreup_cookies');
    
    if (!token) {
        console.error('No JWT token found, cannot fetch tee times');
        showNoTeeTimesMessage('Authentication error. Please try logging in again.');
        return;
    }
    
    // Create URL exactly matching the curl format
    let url = `${API_BASE_URL}/api/teetimes?time=all&date=${dateStr}&holes=all&players=0&booking_class=${bookingClassId}&schedule_id=${facilityId}`;
    
    // Schedule IDs exactly as in curl command
    const scheduleIds = [
        "3564", "3565", "3566", "3567", "3568", "3569", "3570", "3572", "3727"
    ];
    
    // Add schedule_ids[] parameters with the format that works
    scheduleIds.forEach(id => {
        url += `&schedule_ids%5B%5D=${id}`;
    });
    
    // Add remaining parameters
    url += '&specials_only=0&api_key=no_limits';
    
    // Set headers to exactly match the curl command
    const headers = {
        'accept': 'application/json, text/javascript, */*; q=0.01',
        'accept-language': 'en-US,en;q=0.9',
        'api-key': 'no_limits',
        'dnt': '1',
        'origin': 'https://satxgolf.pages.dev',
        'priority': 'u=1, i',
        'referer': 'https://satxgolf.pages.dev/',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'cross-site',
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        'x-authorization': `Bearer ${token}`,
        'x-foreup-cookies': cookies,
        'x-fu-golfer-location': 'foreup',
        'x-requested-with': 'XMLHttpRequest'
    };
    
    console.log('Fetching tee times with URL:', url);
    console.log('Using headers:', headers);
    
    // Make the API request
    fetch(url, { headers })
        .then(response => {
            if (!response.ok) {
                throw new Error(`API returned status ${response.status}`);
            }
            return response.text(); // First get the raw text
        })
        .then(text => {
            // Log the raw response
            console.log('Raw API response (first 200 chars):', text.substring(0, 200) + '...');
            
            // Handle false response
            if (text === 'false') {
                console.log('API returned false - no tee times available');
                showNoTeeTimesMessage(`No tee times available for ${dateStr}. Please try another date or check back later.`);
                return [];
            }
            
            // Try to parse as JSON if not false
            try {
                if (!text || text.trim() === '') {
                    // Empty response
                    showNoTeeTimesMessage('No data received from the server.');
                    return [];
                }
                return JSON.parse(text);
            } catch (e) {
                console.error('Error parsing JSON:', e);
                throw new Error('Invalid response format from API');
            }
        })
        .then(data => {
            // Early return if we already handled the false case
            if (!data || (Array.isArray(data) && data.length === 0)) {
                return;
            }
            
            // Check if data is an array
            if (!Array.isArray(data)) {
                console.warn('API did not return an array of tee times, received:', typeof data);
                showNoTeeTimesMessage('No tee time data available for this date.');
                return;
            }
            
            console.log(`Received ${data.length} tee times from API`);
            
            // Filter tee times to only include the selected course
            const facilityIdNum = parseInt(facilityId);
            const courseTeeTimes = data.filter(time => 
                time.teesheet_id === facilityIdNum || 
                time.teesheet_id === facilityId ||
                time.schedule_id === facilityIdNum || 
                time.schedule_id === facilityId
            );
            
            console.log(`Filtered to ${courseTeeTimes.length} tee times for selected course`);
            
            if (courseTeeTimes.length === 0) {
                showNoTeeTimesMessage(`No tee times available for ${dateStr} at this course. Please try another date.`);
                return;
            }
            
            displayTeeTimes(courseTeeTimes);
        })
        .catch(error => {
            console.error('Error fetching tee times:', error);
            showNoTeeTimesMessage(`Error loading tee times: ${error.message}`);
        });
}

// Function to show a custom no-tee-times message
function showNoTeeTimesMessage(message) {
    if (teeTimesLoading) {
        teeTimesLoading.style.display = 'none';
    }
    if (teeTimesList) {
        teeTimesList.style.display = 'none';
    }
    if (noTeeTimes) {
        noTeeTimes.style.display = 'block';
        noTeeTimes.innerHTML = `<p>${message}</p>`;
    }
}


// Function to display tee times
function displayTeeTimes(teeTimesData) {
    if (!teeTimesList || !teeTimesLoading || !noTeeTimes) return;
    
    // Hide loading indicator
    teeTimesLoading.style.display = 'none';
    
    // Check if we have tee times
    if (!teeTimesData || teeTimesData.length === 0) {
        noTeeTimes.style.display = 'block';
        teeTimesList.style.display = 'none';
        return;
    }
    
    // Clear previous tee times
    teeTimesList.innerHTML = '';
    
    // Group tee times by hour for better organization
    const groupedTimes = {};
    teeTimesData.forEach(teeTime => {
        // Extract hour from the time string (format: "YYYY-MM-DD HH:MM")
        const timeParts = teeTime.time.split(' ');
        if (timeParts.length === 2) {
            const hourMin = timeParts[1].split(':');
            const hour = hourMin[0];
            if (!groupedTimes[hour]) {
                groupedTimes[hour] = [];
            }
            groupedTimes[hour].push(teeTime);
        }
    });
    
    // Display tee times by hour
    Object.keys(groupedTimes).sort().forEach(hour => {
        const hourTimes = groupedTimes[hour];
        
        // Create hour section
        const hourSection = document.createElement('div');
        hourSection.className = 'hour-section';
        
        // Determine if it's AM or PM
        const hourNum = parseInt(hour);
        const ampm = hourNum >= 12 ? 'PM' : 'AM';
        const hour12 = hourNum % 12 || 12;
        
        // Create hour header
        const hourHeader = document.createElement('h4');
        hourHeader.className = 'hour-header';
        hourHeader.textContent = `${hour12} ${ampm}`;
        hourSection.appendChild(hourHeader);
        
        // Create time slots for this hour
        hourTimes.forEach(teeTime => {
            // Extract hour and minute from the time string
            const timeParts = teeTime.time.split(' ')[1].split(':');
            const hour = parseInt(timeParts[0]);
            const minute = timeParts[1];
            
            // Format time for display
            const formattedTime = formatTimeString(hour, parseInt(minute));
            
            // Create time slot element
            const timeSlot = document.createElement('div');
            timeSlot.className = 'time-slot';
            
            // Show pricing information
            const greenFeeInfo = teeTime.green_fee_18 ? `$${teeTime.green_fee_18}` : '';
            const cartFeeInfo = teeTime.cart_fee_18 ? `+$${teeTime.cart_fee_18} cart` : '';
            const priceInfo = greenFeeInfo ? `${greenFeeInfo} ${cartFeeInfo}` : '';
            
            timeSlot.innerHTML = `
                <span class="time">${formattedTime}</span>
                <div class="time-details">
                    <span class="spots">${teeTime.available_spots} spot${teeTime.available_spots !== 1 ? 's' : ''} available</span>
                    ${priceInfo ? `<span class="price-info">${priceInfo}</span>` : ''}
                </div>
            `;
            
            // Add click event to book this time
            timeSlot.addEventListener('click', () => {
                selectTeeTime(teeTime, formattedTime);
            });
            
            hourSection.appendChild(timeSlot);
        });
        
        teeTimesList.appendChild(hourSection);
    });
    
    // Show tee times list
    teeTimesList.style.display = 'block';
}

// Function to format time string (e.g., "8:30 AM")
function formatTimeString(hour, minute) {
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
}

// Function to select a tee time
function selectTeeTime(teeTime, formattedTime) {
    selectedTeeTime = {
        ...teeTime,
        formattedTime: formattedTime
    };
    
    // Update confirmation details
    if (callConfirmDetails) {
        const selectedDateObj = new Date(selectedDate.textContent);
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        
        callConfirmDetails.innerHTML = `
            <strong>${selectedDateObj.toLocaleDateString('en-US', options)} at ${formattedTime}</strong>
            <span>${selectedCourse.name}</span>
            ${teeTime.available_spots ? `<span>${teeTime.available_spots} spot${teeTime.available_spots !== 1 ? 's' : ''} available</span>` : ''}
        `;
    }
    
    // Show confirmation modal
    if (callConfirmModal) {
        callConfirmModal.classList.add('active');
    }
}

// Function to hide call confirmation modal
function hideCallConfirmModal() {
    if (callConfirmModal) {
        callConfirmModal.classList.remove('active');
    }
}

// Function to initiate phone call
function makePhoneCall() {
    // Phone number for booking
    const phoneNumber = '12102127572';
    
    // Initiate call
    window.location.href = `tel:${phoneNumber}`;
    
    // Hide modals
    hideCallConfirmModal();
    hideTeeTimeModal();
    
    // Show success notification
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
        <h3 style="margin-top: 0;">Calling Pro Shop</h3>
        <p>You're being connected to book your tee time at ${selectedCourse.name}.</p>
        <p>Time selected: ${selectedTeeTime.formattedTime}</p>
    `;
    document.body.appendChild(notification);
    
    // Auto-remove notification after 5 seconds
    setTimeout(() => {
        if (document.body.contains(notification)) {
            document.body.removeChild(notification);
        }
    }, 5000);
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
                showTeeTimeModal(selectedCourse);
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

// Function to initialize the stats page
function initializeStatsPage() {
    console.log('Initializing stats page...');
    
    const loadingIndicator = document.getElementById('loadingIndicator');
    const statsContainer = document.getElementById('statsContainer');
    const noDataMessage = document.getElementById('noDataMessage');
    const membershipInfo = document.getElementById('membershipInfo');
    const punchInfo = document.getElementById('punchInfo');
    const punchCard = document.getElementById('punchCard');
    const recentActivity = document.getElementById('recentActivity');
    
    if (!loadingIndicator || !statsContainer || !noDataMessage || !membershipInfo || !punchInfo || !punchCard || !recentActivity) {
        console.error('Missing required DOM elements for stats page');
        // Try to show an error message on the page
        const mainElement = document.querySelector('main');
        if (mainElement) {
            mainElement.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: red;">
                    <h3>Error: Stats Page Elements Not Found</h3>
                    <p>There is a technical issue with the page. Please contact support.</p>
                </div>
            `;
        }
        return;
    }
    
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
        console.log('Parsed login data for stats page');
        
        const userData = {
            name: `${loginData.first_name} ${loginData.last_name}`,
            email: loginData.email,
            phone: loginData.phone_number || loginData.cell_phone_number || 'N/A'
        };
        
        let membershipData = { name: 'No Membership', expires: 'N/A', purchased: 'N/A' };
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

// Helper function to format dates
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
    
    // Tee time modal event listeners
    if (closeTeeTimeModal) {
        closeTeeTimeModal.addEventListener('click', hideTeeTimeModal);
    }

    if (teeTimeModal) {
        teeTimeModal.addEventListener('click', function(e) {
            if (e.target === teeTimeModal) {
                hideTeeTimeModal();
            }
        });
    }

    if (prevMonth) {
        prevMonth.addEventListener('click', function() {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            generateCalendar(currentMonth, currentYear);
        });
    }

    if (nextMonth) {
        nextMonth.addEventListener('click', function() {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            generateCalendar(currentMonth, currentYear);
        });
    }

    if (backToCalendar) {
        backToCalendar.addEventListener('click', function() {
            if (dateSelectionView) dateSelectionView.style.display = 'block';
            if (teeTimeSlotsView) teeTimeSlotsView.style.display = 'none';
        });
    }

    // Call confirmation modal event listeners
    if (closeCallConfirmModal) {
        closeCallConfirmModal.addEventListener('click', hideCallConfirmModal);
    }

    if (callConfirmModal) {
        callConfirmModal.addEventListener('click', function(e) {
            if (e.target === callConfirmModal) {
                hideCallConfirmModal();
            }
        });
    }

    if (cancelCallBtn) {
        cancelCallBtn.addEventListener('click', hideCallConfirmModal);
    }

    if (makeCallBtn) {
        makeCallBtn.addEventListener('click', makePhoneCall);
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
