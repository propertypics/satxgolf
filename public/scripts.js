const API_BASE_URL = "https://satxgolf.wade-lewis.workers.dev";
const APP_VERSION = "1.0.9"; // Make sure this matches or is updated

// Helper function to safely get elements and log errors if they're not found
function getElement(id, errorMessage, isCritical = true) {
    const element = document.getElementById(id);
    if (!element && isCritical) {
        console.error(errorMessage || `CRITICAL: Element with id '${id}' not found`);
    } else if (!element && !isCritical) {
         console.warn(errorMessage || `Warning: Element with id '${id}' not found`);
    }
    return element;
}

// Get all important elements with error handling
// Core page elements
const courseGrid = getElement('courseGrid', 'Course grid element not found. Course display will fail.', false); // Might not be on stats page
const loadingIndicator = getElement('loadingIndicator', 'Loading indicator not found', false); // Might not be on every page

// Login elements
const loginModal = getElement('loginModal', 'Login modal overlay not found');
const closeLoginModal = getElement('closeLoginModal', 'Close login modal button not found');
const loginForm = getElement('loginForm', 'Login form not found');
const loginMessage = getElement('loginMessage', 'Login message area not found');
const userInfo = getElement('userInfo', 'User info display area not found');
const userName = getElement('userName', 'User name display span not found');
const logoutBtn = getElement('logoutBtn', 'Logout button not found');
const statsLink = getElement('statsLink', 'Stats link not found');

// Tee time modal elements
const teeTimeModal = getElement('teeTimeModal', 'Tee time modal overlay not found');
const closeTeeTimeModal = getElement('closeTeeTimeModal', 'Close tee time modal button not found');
const teeTimeModalTitle = getElement('teeTimeModalTitle', 'Tee time modal title not found');
const dateSelectionView = getElement('dateSelectionView', 'Date selection view not found');
const teeTimeSlotsView = getElement('teeTimeSlotsView', 'Tee time slots view not found');
const calendarMonth = getElement('calendarMonth', 'Calendar month display not found');
const calendarDays = getElement('calendarDays', 'Calendar days grid not found');
const prevMonth = getElement('prevMonth', 'Previous month button not found');
const nextMonth = getElement('nextMonth', 'Next month button not found');
const backToCalendar = getElement('backToCalendar', 'Back to calendar button not found');
const selectedDate = getElement('selectedDate', 'Selected date display not found');
const teeTimesList = getElement('teeTimesList', 'Tee times list container not found');
const teeTimesLoading = getElement('teeTimesLoading', 'Tee times loading indicator not found');
const noTeeTimes = getElement('noTeeTimes', 'No tee times message not found');

// Booking modal elements
const bookingModal = getElement('bookingModal', 'Booking modal overlay not found');
const closeBookingModal = getElement('closeBookingModal', 'Close booking modal button not found');
const bookingDetails = getElement('bookingDetails', 'Booking details display area not found');
const bookingFormContainer = getElement('bookingFormContainer', 'Booking form container not found');
const callNoticeContainer = getElement('callNoticeContainer', 'Call notice container not found');
const bookingForm = getElement('bookingForm', 'Booking form element not found'); // Keep getting this, even if not using submit listener
const playerCountSelect = getElement('playerCount', 'Player count select not found'); // Get specific form elements
const holesSelector = getElement('holesSelector', 'Holes selector div not found');
const cancelBookingBtn = getElement('cancelBookingBtn', 'Cancel booking button not found');
const bookNowBtn = getElement('bookNowBtn', 'Book Now button not found'); // CRITICAL for booking

// Call confirmation elements (if applicable)
const callConfirmModal = getElement('callConfirmModal', 'Call confirm modal not found', false);
const closeCallConfirmModal = getElement('closeCallConfirmModal', 'Close call confirm button not found', false);
const callConfirmDetails = getElement('callConfirmDetails', 'Call confirm details not found', false);
const cancelCallBtn = getElement('cancelCallBtn', 'Cancel call button not found', false); // Shared ID? Check HTML. Assumed unique for now.
const makeCallBtn = getElement('makeCallBtn', 'Make call button not found', false); // Shared ID? Check HTML. Assumed unique for now.

// Check if the crucial booking button was found
if (bookNowBtn) {
    console.log('DEBUG: bookNowBtn element successfully found.');
} else {
    // This is a major problem if booking is expected
    console.error('DEBUG: bookNowBtn element WAS NOT FOUND. Booking will fail.');
}


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

// State variables
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
    "Trail Pass Plus/L2 with Punches": "50530",
    "Trailpass Plus - Senior/Military": "50529",
    "Level I / Trailpass": "3273",
    "Trail Pass/L1": "3273",
    "Level I / Trailpass - Senior/Military": "3274",
    "Trailpass Pro": "50531",
    "Legacy Level II": "3275",
    "Legacy Level II - Senior/Military": "3276",
    "Legacy Die Hard": "5866"
};

// --- Modal Functions ---

function showModal(modalElement) {
    if (modalElement) {
        modalElement.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function hideModal(modalElement) {
    if (modalElement) {
        modalElement.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function hideLoginModal() { hideModal(loginModal); }
function showLoginModal() { showModal(loginModal); }
function hideTeeTimeModal() {
    hideModal(teeTimeModal);
     // Reset views after a short delay
    setTimeout(() => {
        if (dateSelectionView) dateSelectionView.style.display = 'block';
        if (teeTimeSlotsView) teeTimeSlotsView.style.display = 'none';
    }, 300);
}
// showTeeTimeModal defined later as it depends on generateCalendar
function hideBookingModal() { hideModal(bookingModal); }
function showBookingModal() { showModal(bookingModal); } // Potentially needed if opening directly
function hideCallConfirmModal() { hideModal(callConfirmModal); }
function showCallConfirmModal() { showModal(callConfirmModal); } // Potentially needed


// --- Login/Auth Functions ---

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
    if (userInfo) userInfo.style.display = 'none'; // Hide if not logged in
    if (statsLink) statsLink.style.display = 'none'; // Hide if not logged in
    return false;
}

function loginUser(username, password) {
    if (!loginMessage || !loginForm) return;

    loginMessage.style.display = 'none';
    const loginBtnElement = loginForm.querySelector('.login-btn'); // More specific query
    if (!loginBtnElement) return;

    const originalText = loginBtnElement.textContent;
    loginBtnElement.textContent = 'Signing in...';
    loginBtnElement.disabled = true;

    console.log('Attempting to log in user:', username);

    fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, password: password })
    })
    .then(response => response.json())
    .then(data => {
        loginBtnElement.textContent = originalText;
        loginBtnElement.disabled = false;
        console.log('Login response received:', data.success !== false ? 'success' : 'failed', data);

        if (data.error) {
            showMessage(data.message || 'Unknown error', 'error'); return;
        }
        if (data.cookies) {
            localStorage.setItem('foreup_cookies', data.cookies);
        }
        if (data.success === false && (data.msg === "Refresh required." || data.msg === "Refresh required")) {
            showMessage('ForeUp requires you to log in through their website first. Please complete login at ForeUp and try again.', 'error'); return;
        }
        if (data.success === false) {
            showMessage(data.msg || 'Login failed', 'error'); return;
        }
        if (data.jwt) {
            localStorage.setItem('jwt_token', data.jwt);
            if (data.first_name && data.last_name) {
                const fullName = `${data.first_name} ${data.last_name}`;
                localStorage.setItem('user_name', fullName);
                if (userName) userName.textContent = fullName;
            }
            localStorage.setItem('login_data', JSON.stringify(data));
            checkLogin(); // Update UI based on new login state
            hideLoginModal();
            if (selectedCourse) { // If login was triggered by booking
                showTeeTimeModal(selectedCourse);
            }
        } else {
            showMessage('No authentication token received', 'error');
        }
    })
    .catch(error => {
        console.error('Login error:', error);
        loginBtnElement.textContent = originalText;
        loginBtnElement.disabled = false;
        showMessage(`Login failed: ${error.message || 'Network error'}`, 'error');
    });
}

function showMessage(message, type) {
    if (loginMessage) {
        loginMessage.textContent = message;
        loginMessage.className = `status-message ${type}`;
        loginMessage.style.display = 'block';
    } else {
        alert(message); // Fallback
    }
}

function getUserBookingClassId() {
    const loginDataStr = localStorage.getItem('login_data');
    if (!loginDataStr) return DEFAULT_BOOKING_CLASS;
    try {
        const loginData = JSON.parse(loginDataStr);
        if (loginData.passes) {
            const passIds = Object.keys(loginData.passes);
            if (passIds.length > 0) {
                const passId = passIds[0];
                const pass = loginData.passes[passId];
                const membershipName = pass.name;
                if (membershipName && membershipToBookingClass[membershipName]) {
                    return membershipToBookingClass[membershipName];
                }
            }
        }
    } catch (error) {
        console.error('Error getting user booking class:', error);
    }
    return DEFAULT_BOOKING_CLASS;
}

// --- Course Loading ---

function loadCourses() {
    console.log('loadCourses called on page:', window.location.pathname);
    if (!courseGrid) {
        console.warn('Course grid not found on this page, skipping course load.');
        return;
    }
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    courseGrid.innerHTML = ''; // Clear previous

    // Hard-coded fallback
    const fallbackCourses = [
        { name: "Brackenridge Park", details: "Rating 70.3 / Slope 126 / Par 71 / 6243 Yds", courseId: "20103", facilityId: "3564" },
        { name: "Cedar Creek", details: "Rating 73.4 / Slope 132 / Par 72 / 7158 yds", courseId: "20104", facilityId: "3565" }
    ];

    console.log('Attempting to fetch courses from API...');
    fetch(`${API_BASE_URL}/api/courses`)
        .then(response => {
            console.log('API response received:', response.status);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(courses => {
            console.log('Courses data received:', courses ? courses.length : 'none');
            renderCourses(courses && courses.length > 0 ? courses : fallbackCourses);
            if (loadingIndicator) loadingIndicator.style.display = 'none';
        })
        .catch(error => {
            console.error('Error loading courses:', error);
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            courseGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: red;"><h3>Error Loading Courses</h3><p>${error.message}. Using fallback data.</p></div>`;
            renderCourses(fallbackCourses);
        });
}

function renderCourses(courses) {
    if (!courseGrid) return;
    courseGrid.innerHTML = ''; // Clear again just in case

    courses.forEach(course => {
        try {
            const courseCard = document.createElement('div');
            courseCard.className = 'course-card';
            const imageUrl = courseImages[course.name] || courseImages["Brackenridge Park"]; // Default image

            courseCard.innerHTML = `
                <div class="course-img" style="background-image: url('${imageUrl}')"></div>
                <div class="course-info">
                    <h3 class="course-name">${course.name}</h3>
                    <p class="course-details">${course.details || 'Details not available'}</p>
                    <button class="book-btn course-book-btn">Book Tee Time</button> <!-- Unique class -->
                </div>
            `;

            const bookBtn = courseCard.querySelector('.course-book-btn');
            if (bookBtn) {
                bookBtn.addEventListener('click', () => {
                    console.log(`Book button clicked for course: ${course.name}`);
                    selectedCourse = course; // Set the selected course globally
                    if (checkLogin()) {
                        showTeeTimeModal(course);
                    } else {
                        console.log('User not logged in, showing login modal.');
                        showLoginModal(); // Will proceed to tee time modal on successful login
                    }
                });
            }
            courseGrid.appendChild(courseCard);
        } catch (e) {
            console.error('Error rendering course card:', course.name, e);
        }
    });
    console.log('Course rendering complete.');
}


// --- Tee Time Selection ---

function showTeeTimeModal(course) {
    selectedCourse = course; // Ensure it's set
    if (teeTimeModalTitle) {
        teeTimeModalTitle.textContent = `Select Date - ${course.name}`;
    }
    if (dateSelectionView) dateSelectionView.style.display = 'block';
    if (teeTimeSlotsView) teeTimeSlotsView.style.display = 'none';
    generateCalendar(currentMonth, currentYear); // Regenerate calendar
    showModal(teeTimeModal);
}

function generateCalendar(month, year) {
    if (!calendarDays || !calendarMonth) return;
    calendarDays.innerHTML = '';
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const endDate = new Date(today); endDate.setDate(today.getDate() + 8);

    const options = { month: 'long', day: 'numeric' };
    const startDateStr = today.toLocaleDateString('en-US', options);
    const endDateStr = endDate.toLocaleDateString('en-US', options);
    if(calendarMonth) calendarMonth.textContent = `${startDateStr} - ${endDateStr}`;

    const dateRangeContainer = document.createElement('div');
    dateRangeContainer.className = 'date-range-container';

    for (let i = 0; i <= 8; i++) {
        const loopDate = new Date(today);
        loopDate.setDate(today.getDate() + i);

        const dayBox = document.createElement('div');
        dayBox.className = 'day-box available';
        if (i === 0) dayBox.classList.add('today');

        const dayName = loopDate.toLocaleDateString('en-US', { weekday: 'short' });
        const dayNum = loopDate.getDate();
        const monthName = loopDate.toLocaleDateString('en-US', { month: 'short' });

        dayBox.innerHTML = `
            <div class="day-name">${dayName}</div>
            <div class="day-number">${dayNum}</div>
            <div class="month-name">${monthName}</div>
        `;

        const apiDateStr = `${(loopDate.getMonth() + 1).toString().padStart(2, '0')}-${loopDate.getDate().toString().padStart(2, '0')}-${loopDate.getFullYear()}`;

        dayBox.addEventListener('click', () => {
            document.querySelectorAll('.day-box.selected').forEach(el => el.classList.remove('selected'));
            dayBox.classList.add('selected');
            selectDate(loopDate.getFullYear(), loopDate.getMonth(), loopDate.getDate(), apiDateStr);
        });
        dateRangeContainer.appendChild(dayBox);
    }
    calendarDays.appendChild(dateRangeContainer);
    if (prevMonth) prevMonth.style.display = 'none';
    if (nextMonth) nextMonth.style.display = 'none';
}

function selectDate(year, month, day, apiDateStr) {
    const selectedDateObj = new Date(year, month, day);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = selectedDateObj.toLocaleDateString('en-US', options);

    if (selectedDate) selectedDate.textContent = formattedDate;
    if (dateSelectionView) dateSelectionView.style.display = 'none';
    if (teeTimeSlotsView) teeTimeSlotsView.style.display = 'block';
    if (teeTimesLoading) teeTimesLoading.style.display = 'block';
    if (teeTimesList) teeTimesList.style.display = 'none';
    if (noTeeTimes) noTeeTimes.style.display = 'none';

    fetchTeeTimes(selectedCourse.courseId, selectedCourse.facilityId, apiDateStr);
}

function fetchTeeTimes(courseId, facilityId, dateStr) {
    console.log(`Fetching tee times for course ${courseId}, facility ${facilityId}, date ${dateStr}`);
    if (teeTimesLoading) teeTimesLoading.style.display = 'block';
    if (teeTimesList) teeTimesList.style.display = 'none';
    if (noTeeTimes) noTeeTimes.style.display = 'none';

    const primaryBookingClassId = getUserBookingClassId();
    const bookingClasses = [primaryBookingClassId, "3272"]; // Try primary, then public
    let currentAttempt = 0;

    function tryNextBookingClass() {
        if (currentAttempt >= bookingClasses.length) {
            showNoTeeTimesMessage(`Unable to fetch tee times for ${dateStr}. Try another date.`);
            return;
        }
        const bookingClassId = bookingClasses[currentAttempt];
        currentAttempt++;
        console.log(`Attempt ${currentAttempt}: Using booking class ID: ${bookingClassId}`);

        const token = localStorage.getItem('jwt_token');
        const cookies = localStorage.getItem('foreup_cookies');
        if (!token) {
            showNoTeeTimesMessage('Authentication error. Please log in again.'); return;
        }

        // Updated simplified URL structure based on previous findings
        let url = `${API_BASE_URL}/api/teetimes?date=${dateStr}&booking_class=${bookingClassId}&schedule_id=${facilityId}&time=all&holes=all&players=0`;

        // Add common schedule IDs likely needed by the API
        const scheduleIds = ["3564", "3565", "3566", "3567", "3568", "3569", "3570", "3572", "3727"];
        scheduleIds.forEach(id => { url += `&schedule_ids%5B%5D=${id}`; });
        url += '&specials_only=0&api_key=no_limits'; // Append remaining params

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'api-key': 'no_limits' // Ensure API key header is present
        };
        if (cookies) headers['X-ForeUp-Cookies'] = cookies;

        console.log(`Attempt ${currentAttempt}: Fetching URL:`, url);
        console.log(`Attempt ${currentAttempt}: Using headers:`, headers);

        fetch(url, { headers })
            .then(response => {
                console.log(`Attempt ${currentAttempt}: Response status:`, response.status);
                if (!response.ok) throw new Error(`API returned status ${response.status}`);
                return response.text(); // Get raw text first
            })
            .then(text => {
                 console.log(`Attempt ${currentAttempt}: Raw response preview:`, text.substring(0, 200) + '...');
                 if (text === 'false' || !text || text.trim() === '') {
                     console.log(`Attempt ${currentAttempt}: API returned no data or 'false'. Trying next config.`);
                     tryNextBookingClass(); // Move to next attempt
                     return null; // Indicate no valid data
                 }
                 try {
                    return JSON.parse(text);
                 } catch(e) {
                     console.error(`Attempt ${currentAttempt}: Error parsing JSON:`, e);
                     throw new Error('Invalid JSON response from server.'); // Throw to be caught below
                 }
            })
            .then(data => {
                if (data === null) return; // Skip if previous step indicated no data

                if (!Array.isArray(data)) {
                    console.warn(`Attempt ${currentAttempt}: API did not return an array:`, typeof data);
                    tryNextBookingClass(); return;
                }
                console.log(`Attempt ${currentAttempt}: Success! Received ${data.length} potential tee times`);

                const facilityIdNum = parseInt(facilityId);
                const courseTeeTimes = data.filter(time =>
                    time.schedule_id === facilityIdNum || time.schedule_id === facilityId // Filter by schedule_id
                );
                console.log(`Filtered to ${courseTeeTimes.length} tee times for facility ${facilityId}`);

                if (courseTeeTimes.length === 0) {
                    tryNextBookingClass(); return; // Try next if no times for this course
                }
                displayTeeTimes(courseTeeTimes); // Display found times
            })
            .catch(error => {
                console.error(`Attempt ${currentAttempt}: Fetch Error:`, error);
                tryNextBookingClass(); // Try next config on error
            });
    }
    tryNextBookingClass(); // Start the first attempt
}


function showNoTeeTimesMessage(message) {
    if (teeTimesLoading) teeTimesLoading.style.display = 'none';
    if (teeTimesList) teeTimesList.style.display = 'none';
    if (noTeeTimes) {
        noTeeTimes.style.display = 'block';
        noTeeTimes.innerHTML = `<p>${message || 'No tee times available for this date.'}</p>`;
    }
}

function displayTeeTimes(teeTimesData) {
    if (!teeTimesList || !teeTimesLoading || !noTeeTimes) return;
    teeTimesLoading.style.display = 'none';

    if (!teeTimesData || teeTimesData.length === 0) {
        showNoTeeTimesMessage(); return;
    }

    teeTimesList.innerHTML = '';
    const groupedTimes = {};
    teeTimesData.forEach(teeTime => {
        // Expected time format: "YYYY-MM-DD HH:MM" or just "HH:MM"? Adjust accordingly.
        // Assuming "YYYY-MM-DD HH:MM"
        const timePart = teeTime.time.split(' ')[1] || teeTime.time; // Handle both possibilities
        const hour = timePart.split(':')[0];
        if (!groupedTimes[hour]) groupedTimes[hour] = [];
        groupedTimes[hour].push(teeTime);
    });

    Object.keys(groupedTimes).sort().forEach(hour => {
        const hourTimes = groupedTimes[hour].sort((a, b) => (a.time < b.time ? -1 : 1)); // Sort times within the hour
        const hourSection = document.createElement('div');
        hourSection.className = 'hour-section';
        const hourNum = parseInt(hour);
        const ampm = hourNum >= 12 ? 'PM' : 'AM';
        const hour12 = hourNum % 12 || 12;
        hourSection.innerHTML = `<h4 class="hour-header">${hour12} ${ampm}</h4>`;

        hourTimes.forEach(teeTime => {
             const timePart = teeTime.time.split(' ')[1] || teeTime.time;
             const timeParts = timePart.split(':');
             const minute = timeParts[1];
             const formattedTime = formatTimeString(parseInt(hour), parseInt(minute));

             const timeSlot = document.createElement('div');
             timeSlot.className = 'time-slot';
             const greenFeeInfo = teeTime.green_fee_18 ? `$${teeTime.green_fee_18}` : (teeTime.green_fee ? `$${teeTime.green_fee}` : '');
             const cartFeeInfo = teeTime.cart_fee_18 ? `+$${teeTime.cart_fee_18} cart` : (teeTime.cart_fee ? `+$${teeTime.cart_fee} cart`: '');
             const priceInfo = greenFeeInfo ? `${greenFeeInfo} ${cartFeeInfo}`.trim() : '';

             timeSlot.innerHTML = `
                <span class="time">${formattedTime}</span>
                <div class="time-details">
                    <span class="spots">${teeTime.available_spots} spot${teeTime.available_spots !== 1 ? 's' : ''}</span>
                    ${priceInfo ? `<span class="price-info">${priceInfo}</span>` : ''}
                </div>
            `;
             // IMPORTANT: Ensure teeTime.teetime_id exists and is correctly passed
             if (!teeTime.teetime_id) {
                 console.warn("Missing teetime_id for time:", teeTime);
             }
             timeSlot.addEventListener('click', () => {
                 selectTeeTime(teeTime, formattedTime);
             });
             hourSection.appendChild(timeSlot);
        });
        teeTimesList.appendChild(hourSection);
    });
    teeTimesList.style.display = 'block';
    noTeeTimes.style.display = 'none';
}

function formatTimeString(hour, minute) {
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
}

// --- Booking Process ---

function selectTeeTime(teeTime, formattedTime) {
    console.log('Selected tee time:', teeTime); // Log the whole object
    if (!teeTime.teetime_id) {
        console.error("CRITICAL: Selected tee time object is missing 'teetime_id'. Cannot book.", teeTime);
        // Optionally show an error to the user here
        alert("Error: Could not get necessary booking details for this tee time. Please try another time or contact support.");
        return; // Stop the process
    }

    selectedTeeTime = { ...teeTime, formattedTime: formattedTime }; // Store it

    if (bookingDetails) {
        const selectedDateStr = selectedDate ? selectedDate.textContent : 'Selected Date'; // Use fallback
        bookingDetails.innerHTML = `
            <strong>${selectedDateStr} at ${formattedTime}</strong>
            <span>${selectedCourse ? selectedCourse.name : 'Selected Course'}</span>
            <span>${teeTime.available_spots} spot${teeTime.available_spots !== 1 ? 's' : ''} available</span>
        `;
    }

    const isSinglePlayerOpenTime = teeTime.available_spots === 4;
    if (bookingFormContainer) bookingFormContainer.style.display = isSinglePlayerOpenTime ? 'none' : 'block';
    if (callNoticeContainer) callNoticeContainer.style.display = isSinglePlayerOpenTime ? 'block' : 'none';

    updatePlayerCountOptions(teeTime.available_spots);
    toggleHolesSelector(selectedCourse ? selectedCourse.facilityId : null);

    hideTeeTimeModal(); // Hide date/time selection
    showBookingModal(); // Show the booking confirmation/form modal
}

function updatePlayerCountOptions(availableSpots) {
    if (!playerCountSelect) return;
    playerCountSelect.innerHTML = '';
    for (let i = 1; i <= Math.min(4, availableSpots); i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i === 1 ? '1 Player' : `${i} Players`;
        playerCountSelect.appendChild(option);
    }
}

function toggleHolesSelector(facilityId) {
    if (!holesSelector || !facilityId) return;
    const isPar3Course = ['3570', '3572'].includes(String(facilityId)); // Ensure string comparison
    holesSelector.style.display = isPar3Course ? 'none' : 'block';
    if (isPar3Course) {
        const nineHolesRadio = document.querySelector('input[name="holes"][value="9"]');
        if (nineHolesRadio) nineHolesRadio.checked = true;
    } else {
         const eighteenHolesRadio = document.querySelector('input[name="holes"][value="18"]');
         if (eighteenHolesRadio) eighteenHolesRadio.checked = true; // Default to 18 for non-par3
    }
}

// Helper function to reset the book button state
function resetBookNowButton() {
    if (bookNowBtn) {
        bookNowBtn.disabled = false;
        bookNowBtn.classList.remove('loading');
        bookNowBtn.textContent = 'Book Now';
        console.log("DEBUG: Book Now button reset.");
    } else {
        console.error("DEBUG: Could not reset Book Now button, element not found.");
    }
}


function createBooking(bookingData) {
    console.log('===== createBooking CALLED =====');
    console.log('Attempting to create booking with data:', bookingData);

    // **Crucial Check:** Ensure selectedTeeTime and its ID exist
    if (!selectedTeeTime || !selectedTeeTime.teetime_id) {
        console.error('CRITICAL ERROR in createBooking: Missing selectedTeeTime or teetime_id.', selectedTeeTime);
        showBookingError('Cannot proceed with booking: Essential tee time data is missing. Please re-select the time.');
        resetBookNowButton();
        return;
    }
    console.log('Using teetime_id:', selectedTeeTime.teetime_id); // Verify ID being used

    const token = localStorage.getItem('jwt_token');
    const cookies = localStorage.getItem('foreup_cookies');
    if (!token) {
        showBookingError('Authentication required. Please log in again.');
        resetBookNowButton(); return;
    }

    console.log('Making pending reservation fetch call...');
    fetch(`${API_BASE_URL}/api/pending-reservation`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${token}`,
            'X-ForeUp-Cookies': cookies || ''
        },
        body: new URLSearchParams({
            course_id: bookingData.courseId,
            teesheet_id: bookingData.facilityId,
            teetime_id: selectedTeeTime.teetime_id, // Use the ID from the globally stored object
            player_count: bookingData.playerCount,
            holes: bookingData.holes,
            carts: bookingData.cart ? bookingData.playerCount : 0, // Correct cart logic
            booking_class: getUserBookingClassId()
        })
    })
    .then(response => {
        console.log('Pending reservation response status:', response.status);
        if (!response.ok) {
            // Try to get more details from error response
            return response.json().then(errData => {
                 throw new Error(errData.message || `HTTP error! status: ${response.status}`);
            }).catch(() => { throw new Error(`HTTP error! status: ${response.status}`); });
        }
        return response.json();
    })
    .then(data => {
        console.log('Pending reservation response data:', data);
        if (data.error || !data.pendingReservationId) {
            showBookingError(data.message || data.error || 'Failed to create reservation (No ID received)');
            resetBookNowButton(); return;
        }
        // Success, proceed to complete
        completeReservation(data.pendingReservationId, bookingData);
    })
    .catch(error => {
        console.error('Error during pending reservation fetch:', error);
        showBookingError(`Failed to initiate booking: ${error.message || 'Network error'}`);
        resetBookNowButton();
    });
}

function completeReservation(pendingReservationId, bookingData) {
    console.log('Completing reservation:', pendingReservationId);
    const token = localStorage.getItem('jwt_token');
    const cookies = localStorage.getItem('foreup_cookies');
    if (!token) {
        showBookingError('Authentication lost. Please log in again.');
        resetBookNowButton(); return;
    }

    console.log('Making complete reservation fetch call...');
    fetch(`${API_BASE_URL}/api/complete-reservation`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-ForeUp-Cookies': cookies || ''
        },
        body: JSON.stringify({
            pending_reservation_id: pendingReservationId,
            course_id: bookingData.courseId
        })
    })
     .then(response => {
        console.log('Complete reservation response status:', response.status);
        if (!response.ok) {
            return response.json().then(errData => {
                 throw new Error(errData.message || `HTTP error! status: ${response.status}`);
            }).catch(() => { throw new Error(`HTTP error! status: ${response.status}`); });
        }
        return response.json();
    })
    .then(data => {
        console.log('Reservation completion response data:', data);
        resetBookNowButton(); // Reset button regardless of success/error after this point

        if (data.error || data.success === false) { // Check for explicit failure too
            showBookingError(data.message || data.error || 'Failed to complete reservation');
            return;
        }
        // Success!
        showBookingSuccess(pendingReservationId, data);
        storeBookingInLocalStorage(pendingReservationId, bookingData, data);
        hideBookingModal();
    })
    .catch(error => {
        console.error('Error during complete reservation fetch:', error);
        showBookingError(`Failed to finalize booking: ${error.message || 'Network error'}`);
        resetBookNowButton();
    });
}

// --- Notifications & Local Storage ---

function showBookingError(message) {
    // (Keep your existing notification creation code here)
    console.error("Booking Error:", message); // Log error clearly
     alert(`Booking Failed:\n${message}`); // Simple fallback notification
}

function showBookingSuccess(reservationId, data) {
    // (Keep your existing notification creation code here)
     console.log("Booking Success:", reservationId, data);
     alert(`Booking Confirmed!\nConfirmation #: ${reservationId}\nCourse: ${selectedCourse?.name}\nTime: ${selectedTeeTime?.formattedTime}`); // Simple fallback
}


function storeBookingInLocalStorage(reservationId, bookingData, responseData) {
    try {
        const existingBookingsStr = localStorage.getItem('user_bookings');
        const existingBookings = existingBookingsStr ? JSON.parse(existingBookingsStr) : [];
        const newBooking = {
            id: reservationId,
            date: selectedDate ? selectedDate.textContent : 'N/A',
            time: selectedTeeTime ? selectedTeeTime.formattedTime : 'N/A',
            course: selectedCourse ? selectedCourse.name : 'N/A',
            courseId: selectedCourse ? selectedCourse.courseId : 'N/A',
            facilityId: selectedCourse ? selectedCourse.facilityId : 'N/A',
            players: bookingData.playerCount,
            cart: bookingData.cart,
            holes: bookingData.holes,
            createdAt: new Date().toISOString(),
            responseData: responseData // Store the success response
        };
        existingBookings.push(newBooking);
        localStorage.setItem('user_bookings', JSON.stringify(existingBookings));
        console.log('Booking stored in localStorage:', newBooking);
    } catch (e) {
        console.error("Failed to store booking in localStorage", e);
    }
}

// --- Stats Page Functions --- (Keep your existing stats functions)
function getRuleType(ruleName) { /* ... existing code ... */ return 'standard'; }
function initializeStatsPage() { /* ... existing code ... */ console.log('Initializing stats page'); }
function formatDate(dateStr) { /* ... existing code ... */ return 'N/A'; }


// --- Phone Call Functionality --- (Keep if needed)
function makePhoneCall() { /* ... existing code ... */ console.log('Initiating phone call'); }


// --- Initialization and Event Listeners ---

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM content loaded, initializing page...');

    checkLogin(); // Initial check

    // --- Login Modal Listeners ---
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const usernameInput = getElement('username');
            const passwordInput = getElement('password');
            if (usernameInput && passwordInput && usernameInput.value && passwordInput.value) {
                loginUser(usernameInput.value, passwordInput.value);
            } else {
                showMessage('Please enter both username and password.', 'error');
            }
        });
    }
    if (closeLoginModal) closeLoginModal.addEventListener('click', hideLoginModal);
    if (loginModal) loginModal.addEventListener('click', (e) => { if (e.target === loginModal) hideLoginModal(); });

    // --- Logout Listener ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            console.log('Logout clicked');
            localStorage.removeItem('jwt_token');
            localStorage.removeItem('user_name');
            localStorage.removeItem('foreup_cookies');
            localStorage.removeItem('login_data');
            localStorage.removeItem('user_bookings'); // Clear bookings on logout too
            checkLogin(); // Update UI
            if (window.location.pathname.includes('mystats.html')) {
                 window.location.href = 'index3.html'; // Redirect from stats page
            } else {
                 // Optionally reload or just update UI via checkLogin()
                 // window.location.reload();
            }
        });
    }

    // --- Tee Time Modal Listeners ---
    if (closeTeeTimeModal) closeTeeTimeModal.addEventListener('click', hideTeeTimeModal);
    if (teeTimeModal) teeTimeModal.addEventListener('click', (e) => { if (e.target === teeTimeModal) hideTeeTimeModal(); });
    // Calendar navigation listeners (prev/next) were removed as generateCalendar hides them
    if (backToCalendar) {
        backToCalendar.addEventListener('click', function() {
            console.log('Back to calendar clicked');
            if (dateSelectionView) dateSelectionView.style.display = 'block';
            if (teeTimeSlotsView) teeTimeSlotsView.style.display = 'none';
        });
    }

    // --- Booking Modal Listeners ---
    if (closeBookingModal) closeBookingModal.addEventListener('click', hideBookingModal);
    if (cancelBookingBtn) {
         cancelBookingBtn.addEventListener('click', function() {
             console.log('Cancel booking button clicked');
             hideBookingModal();
         });
    }
    if (bookingModal) bookingModal.addEventListener('click', (e) => { if (e.target === bookingModal) hideBookingModal(); });

    // *** THE CRUCIAL BOOKING BUTTON LISTENER ***
    if (bookNowBtn) {
        console.log('DEBUG: Attaching click listener to bookNowBtn');
        bookNowBtn.addEventListener('click', function() {
            // ***** FIRST LINE OF DEFENSE: Check if this log appears *****
            console.log('DEBUG: bookNowBtn CLICKED!');

            // Disable button immediately
            bookNowBtn.disabled = true;
            bookNowBtn.classList.add('loading');
            bookNowBtn.textContent = 'Booking...';
            console.log('DEBUG: Button disabled and loading state set.');

            try {
                // 1. Get Form Values
                const playerCount = playerCountSelect ? playerCountSelect.value : null;
                const cartOptionElement = document.querySelector('input[name="cart"]:checked');
                const cartOption = cartOptionElement ? cartOptionElement.value : null;
                 const holesOptionElement = document.querySelector('input[name="holes"]:checked');
                const holesOption = holesOptionElement ? holesOptionElement.value : null;


                // 2. Validate Inputs
                if (!playerCount || !cartOption || !holesOption) {
                    console.error("Validation Error: Missing form values", { playerCount, cartOption, holesOption });
                    showBookingError("Please ensure all booking options (Players, Cart, Holes) are selected.");
                    resetBookNowButton(); // Re-enable button on validation error
                    return;
                }
                 console.log('DEBUG: Form values retrieved:', { playerCount, cartOption, holesOption });

                if (!selectedCourse || !selectedTeeTime || !selectedTeeTime.teetime_id) {
                     console.error("Validation Error: Missing critical state", { selectedCourse, selectedTeeTime });
                     showBookingError("Course or Tee Time data is missing. Please try selecting the time again.");
                     resetBookNowButton();
                     return;
                }
                 console.log('DEBUG: State validated:', { courseName: selectedCourse.name, teeTimeId: selectedTeeTime.teetime_id });


                // 3. Prepare Booking Data
                const bookingData = {
                    courseId: selectedCourse.courseId,
                    facilityId: selectedCourse.facilityId,
                    // Note: teetime_id is read directly from selectedTeeTime inside createBooking
                    playerCount: parseInt(playerCount),
                    cart: cartOption === 'yes',
                    holes: parseInt(holesOption)
                };
                console.log('DEBUG: Prepared booking data:', bookingData);

                // 4. Call createBooking
                createBooking(bookingData);

            } catch (error) {
                // Catch unexpected errors during the click handler execution
                console.error("FATAL ERROR inside bookNowBtn click handler:", error);
                showBookingError(`An unexpected error occurred: ${error.message}. Please try again.`);
                resetBookNowButton(); // Ensure reset even on unexpected errors
            }
        });
         console.log('DEBUG: Click listener ATTACHED to bookNowBtn.');
    } else {
        console.error('DEBUG: bookNowBtn not found, listener could not be attached.');
    }


    // --- Call Modal Listeners (If using call functionality) ---
    if (closeCallConfirmModal) closeCallConfirmModal.addEventListener('click', hideCallConfirmModal);
    if (callConfirmModal) callConfirmModal.addEventListener('click', (e) => { if (e.target === callConfirmModal) hideCallConfirmModal(); });
    // Make sure cancelCallBtn and makeCallBtn have unique IDs if they are different buttons
    const cancelCallBtnBooking = getElement('cancelCallBtn', 'Cancel call button (booking) not found', false); // Example if IDs differ
    const makeCallBtnBooking = getElement('makeCallBtn', 'Make call button (booking) not found', false); // Example if IDs differ
    if(cancelCallBtnBooking) cancelCallBtnBooking.addEventListener('click', hideBookingModal); // Assumes cancel hides booking modal
    if(makeCallBtnBooking) makeCallBtnBooking.addEventListener('click', makePhoneCall); // Assumes make call proceeds

    // --- Page-Specific Initialization ---
    if (document.getElementById('courseGrid')) {
        console.log('Initializing Course Page...');
        loadCourses();
    } else if (document.getElementById('statsContainer')) {
        console.log('Initializing Stats Page...');
        initializeStatsPage(); // Ensure this function is defined correctly above
    } else {
        console.warn('Unknown page type - no course grid or stats container found.');
    }

    // --- API Health Check ---
    console.log('Performing API health check...');
    fetch(`${API_BASE_URL}/health`)
        .then(response => response.ok ? response.json() : { status: 'error', message: `Health check failed with status ${response.status}` })
        .then(data => console.log('API health check result:', data))
        .catch(error => console.error('API health check failed:', error));

    console.log('Page initialization complete.');
});
