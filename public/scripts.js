

// --- START OF FILE scripts.js ---

const API_BASE_URL = "https://satxgolf.wade-lewis.workers.dev";
const APP_VERSION = "1.0.11"; // Updated version reflecting 2-step booking

// Helper function to safely get elements
function getElement(id, errorMessage, isCritical = true) {
    const element = document.getElementById(id);
    if (!element && isCritical) {
        console.error(errorMessage || `CRITICAL: Element with id '${id}' not found`);
    } else if (!element && !isCritical) {
         console.warn(errorMessage || `Warning: Element with id '${id}' not found`);
    }
    return element;
}

// --- Get DOM Elements ---
const loginHeaderBtn = getElement('loginHeaderBtn', 'Login button in header not found', false);
const courseGrid = getElement('courseGrid', 'Course grid element not found. Course display will fail.', false);
const loadingIndicator = getElement('loadingIndicator', 'Loading indicator not found', false);
const loginModal = getElement('loginModal', 'Login modal overlay not found');
const closeLoginModal = getElement('closeLoginModal', 'Close login modal button not found');
const loginForm = getElement('loginForm', 'Login form not found');
const loginMessage = getElement('loginMessage', 'Login message area not found');
const userInfo = getElement('userInfo', 'User info display area not found');
const userName = getElement('userName', 'User name display span not found');
const logoutBtn = getElement('logoutBtn', 'Logout button not found');
const statsLink = getElement('statsLink', 'Stats link not found');
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
const bookingModal = getElement('bookingModal', 'Booking modal overlay not found');
const closeBookingModal = getElement('closeBookingModal', 'Close booking modal button not found');
const bookingDetails = getElement('bookingDetails', 'Booking details display area not found');
const bookingFormContainer = getElement('bookingFormContainer', 'Booking form container not found');
const callNoticeContainer = getElement('callNoticeContainer', 'Call notice container not found');
const bookingForm = getElement('bookingForm', 'Booking form element not found');
const playerCountSelect = getElement('playerCount', 'Player count select not found');
const holesSelector = getElement('holesSelector', 'Holes selector div not found');
const cancelBookingBtn = getElement('cancelBookingBtn', 'Cancel booking button not found');
const bookNowBtn = getElement('bookNowBtn', 'Book Now button not found');
const callConfirmModal = getElement('callConfirmModal', 'Call confirm modal not found', false);
const closeCallConfirmModal = getElement('closeCallConfirmModal', 'Close call confirm button not found', false);
const callConfirmDetails = getElement('callConfirmDetails', 'Call confirm details not found', false);
const cancelCallBtn = getElement('cancelCallBtn', 'Cancel call button not found', false);
const makeCallBtn = getElement('makeCallBtn', 'Make call button not found', false);

// --- State Variables ---
let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();
let selectedTeeTime = null; // Will store the full object from the tee time list response
let selectedCourse = null;

// --- Constants & Mappings ---
const DEFAULT_BOOKING_CLASS = "3272";
// ---vvv--- Make sure to fill in your actual mappings here ---vvv---
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
// ---^^^--- Make sure to fill in your actual mappings here ---^^^---

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
    setTimeout(() => {
        if (dateSelectionView) dateSelectionView.style.display = 'block';
        if (teeTimeSlotsView) teeTimeSlotsView.style.display = 'none';
    }, 300);
}
function hideBookingModal() { hideModal(bookingModal); }
function showBookingModal() { showModal(bookingModal); }
function hideCallConfirmModal() { hideModal(callConfirmModal); }
function showCallConfirmModal() { showModal(callConfirmModal); }

// --- Login/Auth Functions ---
function checkLogin() {
    const token = localStorage.getItem('jwt_token');
    const storedName = localStorage.getItem('user_name');
    const localUserInfo = document.getElementById('userInfo');
    const localUserName = document.getElementById('userName');
    const localStatsLink = document.getElementById('statsLink');
    const localLoginHeaderBtn = document.getElementById('loginHeaderBtn');

    if (token) { // User IS logged in
        if (storedName && localUserName) localUserName.textContent = storedName;
        if (localUserInfo) localUserInfo.style.display = 'flex';
        if (localStatsLink) localStatsLink.style.display = 'inline';
        if (localLoginHeaderBtn) localLoginHeaderBtn.style.display = 'none';
        return true;
    } else { // User IS NOT logged in
        if (localUserInfo) localUserInfo.style.display = 'none';
        if (localStatsLink) localStatsLink.style.display = 'none';
        if (localLoginHeaderBtn) localLoginHeaderBtn.style.display = 'inline';
        return false;
    }
}




function loginUser(username, password) {
    console.log("DEBUG: Entered loginUser function."); // Existing log - GOOD

    if (!loginMessage || !loginForm) {
         console.error("DEBUG: loginMessage or loginForm missing inside loginUser.");
         return; // Exit if essential elements are missing
    }

    loginMessage.style.display = 'none';
    const loginBtnElement = loginForm.querySelector('.login-btn');
    if (!loginBtnElement) {
        console.error("DEBUG: Login button element not found inside loginUser.");
        return; // Exit if button isn't found
    }

    const originalText = loginBtnElement.textContent;
    loginBtnElement.textContent = 'Signing in...';
    loginBtnElement.disabled = true;

    console.log('Attempting to log in user:', username); // Existing log - GOOD
    console.log("DEBUG: About to initiate fetch to /api/login..."); // Log before fetch

    fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, password: password })
    })
    // First .then() to handle the raw response
    .then(response => {
        // Log the raw response object immediately
        console.log("DEBUG: Received response object from fetch:", response);

        // Check the HTTP status code
        if (!response.ok) {
             console.error(`DEBUG: Login fetch failed with status: ${response.status} ${response.statusText}`);
             // Attempt to read the response body as text first to see the error message from the server
             return response.text().then(text => {
                console.error("DEBUG: Failed response body text:", text);
                // Try to parse as JSON for structured error, otherwise use text
                try {
                    const errData = JSON.parse(text);
                    // Throw an error that includes the server's message if possible
                    throw new Error(errData.message || errData.error || `HTTP error ${response.status}`);
                } catch(e) {
                    // If parsing fails or text is empty, use the raw text or status
                    throw new Error(text || `HTTP error ${response.status}`);
                }
             }).catch(err => {
                // Catch errors from response.text() itself (e.g., network issues during read)
                 console.error("DEBUG: Error reading failed response body:", err);
                 throw new Error(`HTTP error ${response.status} - unable to read response body`);
             });
        }
        // If response.ok is true, log and proceed to parse JSON
        console.log("DEBUG: Response OK, attempting to parse JSON...");
        return response.json(); // This promise resolves with the parsed JSON data
    })
    // Second .then() to handle the successfully parsed JSON data
    .then(data => {
        // This block only runs if response.ok was true AND response.json() succeeded
        console.log("DEBUG: Successfully parsed JSON response.");
        loginBtnElement.textContent = originalText; // Reset button on success/failure *after* processing
        loginBtnElement.disabled = false;

        // --- Start processing the login 'data' object ---
        console.log('Login data received from API:', data); // Log the actual data

        // Check for errors reported within the JSON data itself
        if (data.error || data.success === false) {
             // Use ForeUp's message if available
             const errorMessage = data.message || data.msg || data.error || 'Login failed (API reported error)';
             console.error("DEBUG: API reported login failure:", errorMessage);
             showMessage(errorMessage, 'error'); // Show specific error
             return; // Stop further processing
        }

        // Handle specific cases like "Refresh required"
        if (data.msg === "Refresh required." || data.msg === "Refresh required") {
             console.warn("DEBUG: ForeUp requires refresh.");
             showMessage('ForeUp requires login via their website first. Please log in there and try again.', 'error');
             return;
        }

        // --- Process successful login ---
        if (data.jwt) {
            console.log("DEBUG: JWT received, processing successful login.");
            if (data.cookies) {
                localStorage.setItem('foreup_cookies', data.cookies);
                console.log("DEBUG: ForeUp cookies stored.");
            }
            localStorage.setItem('jwt_token', data.jwt);
            if (data.first_name && data.last_name) {
                const fullName = `${data.first_name} ${data.last_name}`;
                localStorage.setItem('user_name', fullName);
                if (userName) userName.textContent = fullName;
            }
            localStorage.setItem('login_data', JSON.stringify(data));
            console.log("DEBUG: Auth token and login data stored.");

            checkLogin(); // Update UI based on new login state
            hideLoginModal(); // Close modal

            // Proceed to tee time selection if login was triggered by booking attempt
            if (selectedCourse) {
                console.log("DEBUG: Login successful, proceeding to show tee time modal.");
                showTeeTimeModal(selectedCourse);
            }
        } else {
            // This case should ideally be caught by the success/error checks above, but as a fallback:
            console.error("DEBUG: Login success reported, but no JWT token received.");
            showMessage('Login successful, but authentication token missing.', 'error');
        }
    })
    // .catch() block handles errors from the fetch itself OR errors thrown in the .then() blocks
    .catch(error => {
        // This catches network errors, HTTP errors (if thrown from first .then), JSON parsing errors,
        // and any other unexpected errors in the promise chain.
        console.error("DEBUG: Error caught in login fetch promise chain:", error);

        // Ensure button is reset even on error
        if (loginBtnElement) { // Check if element still exists
             loginBtnElement.textContent = originalText;
             loginBtnElement.disabled = false;
        }

        // Show specific error message from the caught error
        showMessage(`Login failed: ${error.message || 'Unknown error'}`, 'error');
    });

    // This log shows that the fetch call was initiated, but the promise hasn't resolved yet
    console.log("DEBUG: Fetch call initiated (execution continues synchronously).");
}


function showMessage(message, type) {
    if (loginMessage) {
        loginMessage.textContent = message; loginMessage.className = `status-message ${type}`;
        loginMessage.style.display = 'block';
    } else { alert(message); }
}
function getUserBookingClassId() {
    const loginDataStr = localStorage.getItem('login_data');
    if (!loginDataStr) return DEFAULT_BOOKING_CLASS;
    try {
        const loginData = JSON.parse(loginDataStr);
        if (loginData.passes) {
            const passIds = Object.keys(loginData.passes);
            if (passIds.length > 0) {
                const pass = loginData.passes[passIds[0]];
                if (pass.name && membershipToBookingClass[pass.name]) return membershipToBookingClass[pass.name];
            }
        }
    } catch (error) { console.error('Error getting user booking class:', error); }
    return DEFAULT_BOOKING_CLASS;
}

// --- Course Loading ---
function loadCourses() {
    console.log('loadCourses called');
    if (!courseGrid) { console.warn('Course grid not found, skipping course load.'); return; }
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    courseGrid.innerHTML = '';
    console.log('Attempting to fetch courses from API...');
    fetch(`${API_BASE_URL}/api/courses`)
        .then(response => {
            console.log('Courses API response status:', response.status);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(courses => {
            console.log('Courses data received:', courses ? courses.length : 'none');
            renderCourses(courses && courses.length > 0 ? courses : []); // Pass empty array if no courses
            if (loadingIndicator) loadingIndicator.style.display = 'none';
        })
        .catch(error => {
            console.error('Error loading courses:', error);
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            courseGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: red;"><h3>Error Loading Courses</h3><p>${error.message}.</p></div>`;
            // Optionally render fallback courses here if desired
        });
}
function renderCourses(courses) {
    if (!courseGrid) return;
    courseGrid.innerHTML = '';
    if (courses.length === 0) {
         courseGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem;"><p>No courses found.</p></div>`;
         return;
    }
    courses.forEach(course => {
        try {
            const courseCard = document.createElement('div');
            courseCard.className = 'course-card';
            const imageUrl = courseImages[course.name] || courseImages["Brackenridge Park"];
            courseCard.innerHTML = `
                <div class="course-img" style="background-image: url('${imageUrl}')"></div>
                <div class="course-info">
                    <h3 class="course-name">${course.name}</h3>
                    <p class="course-details">${course.details || 'Details not available'}</p>
                    <button class="book-btn course-book-btn">Book Tee Time</button>
                </div>
            `;
            const bookBtn = courseCard.querySelector('.course-book-btn');
            if (bookBtn) {
                bookBtn.addEventListener('click', () => {
                    console.log(`Book button clicked for course: ${course.name}`);
                    selectedCourse = course;
                    if (checkLogin()) { showTeeTimeModal(course); }
                    else { console.log('User not logged in, showing login modal.');
	                   console.log('Is loginModal element available right before showing?', loginModal);
                        if (!loginModal) {
                             console.error("CRITICAL: Global loginModal variable is null/undefined before calling showLoginModal!");
                        } showLoginModal(); }
                });
            }
            courseGrid.appendChild(courseCard);
        } catch (e) { console.error('Error rendering course card:', course.name, e); }
    });
    console.log('Course rendering complete.');
}

// --- Tee Time Selection ---
function showTeeTimeModal(course) {
    selectedCourse = course;
    if (teeTimeModalTitle) teeTimeModalTitle.textContent = `Select Date - ${course.name}`;
    if (dateSelectionView) dateSelectionView.style.display = 'block';
    if (teeTimeSlotsView) teeTimeSlotsView.style.display = 'none';
    generateCalendar(currentMonth, currentYear);
    showModal(teeTimeModal);
}
function generateCalendar(month, year) {
    if (!calendarDays || !calendarMonth) return;
    calendarDays.innerHTML = '';
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const endDate = new Date(today); endDate.setDate(today.getDate() + 8);
    const options = { month: 'long', day: 'numeric' };
    if(calendarMonth) calendarMonth.textContent = `${today.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
    const dateRangeContainer = document.createElement('div');
    dateRangeContainer.className = 'date-range-container';
    for (let i = 0; i <= 8; i++) {
        const loopDate = new Date(today); loopDate.setDate(today.getDate() + i);
        const dayBox = document.createElement('div'); dayBox.className = 'day-box available';
        if (i === 0) dayBox.classList.add('today');
        const dayName = loopDate.toLocaleDateString('en-US', { weekday: 'short' });
        const dayNum = loopDate.getDate();
        const monthName = loopDate.toLocaleDateString('en-US', { month: 'short' });
        dayBox.innerHTML = `<div class="day-name">${dayName}</div><div class="day-number">${dayNum}</div><div class="month-name">${monthName}</div>`;
        const apiDateStr = `${(loopDate.getMonth() + 1).toString().padStart(2, '0')}-${loopDate.getDate().toString().padStart(2, '0')}-${loopDate.getFullYear()}`;
        dayBox.addEventListener('click', () => {
            document.querySelectorAll('.day-box.selected').forEach(el => el.classList.remove('selected'));
            dayBox.classList.add('selected');
            selectDate(loopDate.getFullYear(), loopDate.getMonth(), loopDate.getDate(), apiDateStr);
        });
        dateRangeContainer.appendChild(dayBox);
    }
    calendarDays.appendChild(dateRangeContainer);
    if (prevMonth) prevMonth.style.display = 'none'; if (nextMonth) nextMonth.style.display = 'none';
}
function selectDate(year, month, day, apiDateStr) {
    const selectedDateObj = new Date(year, month, day);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    if (selectedDate) selectedDate.textContent = selectedDateObj.toLocaleDateString('en-US', options);
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
    const bookingClasses = [primaryBookingClassId, DEFAULT_BOOKING_CLASS];
    let currentAttempt = 0;
    function tryNextBookingClass() {
        if (currentAttempt >= bookingClasses.length) {
            showNoTeeTimesMessage(`Unable to fetch tee times for ${dateStr}. Try another date.`); return;
        }
        const bookingClassId = bookingClasses[currentAttempt++];
        console.log(`Attempt ${currentAttempt}: Using booking class ID: ${bookingClassId}`);
        const token = localStorage.getItem('jwt_token'); const cookies = localStorage.getItem('foreup_cookies');
        if (!token) { showNoTeeTimesMessage('Authentication error.'); return; }
        let url = `${API_BASE_URL}/api/teetimes?date=${dateStr}&booking_class=${bookingClassId}&schedule_id=${facilityId}&time=all&holes=all&players=0`;
        const scheduleIds = ["3564", "3565", "3566", "3567", "3568", "3569", "3570", "3572", "3727"];
        scheduleIds.forEach(id => { url += `&schedule_ids%5B%5D=${id}`; });
        url += '&specials_only=0&api_key=no_limits';
        const headers = { 'Authorization': `Bearer ${token}`, 'api-key': 'no_limits' };
        if (cookies) headers['X-ForeUp-Cookies'] = cookies;
        console.log(`Attempt ${currentAttempt}: Fetching URL:`, url);
        fetch(url, { headers })
            .then(response => {
                console.log(`Attempt ${currentAttempt}: Response status:`, response.status);
                if (!response.ok) throw new Error(`API returned status ${response.status}`);
                return response.text();
            })
            .then(text => {
                 console.log(`Attempt ${currentAttempt}: Raw response preview:`, text.substring(0, 200) + '...');
                 if (text === 'false' || !text || text.trim() === '') {
                     console.log(`Attempt ${currentAttempt}: No data/false response.`); tryNextBookingClass(); return null;
                 }
                 return JSON.parse(text);
            })
            .then(data => {
                if (data === null) return;
                if (!Array.isArray(data)) { console.warn(`Attempt ${currentAttempt}: Not an array.`); tryNextBookingClass(); return; }
                console.log(`Attempt ${currentAttempt}: Success! Received ${data.length} potential tee times`);
                const facilityIdNum = parseInt(facilityId);
                const courseTeeTimes = data.filter(time => time.schedule_id === facilityIdNum || time.schedule_id === facilityId);
                console.log(`Filtered to ${courseTeeTimes.length} tee times for facility ${facilityId}`);
                if (courseTeeTimes.length === 0) { tryNextBookingClass(); return; }
                displayTeeTimes(courseTeeTimes);
            })
            .catch(error => { console.error(`Attempt ${currentAttempt}: Fetch Error:`, error); tryNextBookingClass(); });
    }
    tryNextBookingClass();
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
    // Displays tee times from the /api/teetimes response
    // **Crucially, does NOT expect or check for teetime_id here**
    if (!teeTimesList || !teeTimesLoading || !noTeeTimes) return;
    teeTimesLoading.style.display = 'none';
    if (!teeTimesData || teeTimesData.length === 0) { showNoTeeTimesMessage(); return; }
    teeTimesList.innerHTML = '';
    const groupedTimes = {};
    teeTimesData.forEach(teeTime => {
        const timePart = teeTime.time.split(' ')[1] || teeTime.time;
        const hour = timePart.split(':')[0];
        if (!groupedTimes[hour]) groupedTimes[hour] = [];
        groupedTimes[hour].push(teeTime);
    });
    Object.keys(groupedTimes).sort().forEach(hour => {
        const hourTimes = groupedTimes[hour].sort((a, b) => (a.time < b.time ? -1 : 1));
        const hourSection = document.createElement('div'); hourSection.className = 'hour-section';
        const hourNum = parseInt(hour); const ampm = hourNum >= 12 ? 'PM' : 'AM'; const hour12 = hourNum % 12 || 12;
        hourSection.innerHTML = `<h4 class="hour-header">${hour12} ${ampm}</h4>`;
        hourTimes.forEach(teeTime => {
             const timePart = teeTime.time.split(' ')[1] || teeTime.time; const timeParts = timePart.split(':'); const minute = timeParts[1];
             const formattedTime = formatTimeString(parseInt(hour), parseInt(minute));
             const timeSlot = document.createElement('div'); timeSlot.className = 'time-slot';
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
             // Add click listener to store details and show booking form
             timeSlot.addEventListener('click', () => {
                 selectTeeTime(teeTime, formattedTime); // Pass the full object
             });
             hourSection.appendChild(timeSlot);
        });
        teeTimesList.appendChild(hourSection);
    });
    teeTimesList.style.display = 'block'; noTeeTimes.style.display = 'none';
}
function formatTimeString(hour, minute) {
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
}
function selectTeeTime(teeTime, formattedTime) {
    // Stores the selected tee time details globally and shows the booking modal/form
    console.log('Storing selected tee time details:', teeTime);
    selectedTeeTime = { ...teeTime, formattedTime: formattedTime }; // Store the full object
    if (bookingDetails && selectedDate && selectedCourse) {
        bookingDetails.innerHTML = `<strong>${selectedDate.textContent} at ${formattedTime}</strong><span>${selectedCourse.name}</span><span>${teeTime.available_spots} spot${teeTime.available_spots !== 1 ? 's' : ''} available</span>`;
    }
    const isSinglePlayerOpenTime = teeTime.available_spots === 4;
    if (bookingFormContainer) bookingFormContainer.style.display = isSinglePlayerOpenTime ? 'none' : 'block';
    if (callNoticeContainer) callNoticeContainer.style.display = isSinglePlayerOpenTime ? 'block' : 'none';
    updatePlayerCountOptions(teeTime.available_spots);
    toggleHolesSelector(selectedCourse ? selectedCourse.facilityId : null);
    hideTeeTimeModal();
    showBookingModal(); // Show the final form modal
}
function updatePlayerCountOptions(availableSpots) {
    if (!playerCountSelect) return; playerCountSelect.innerHTML = '';
    for (let i = 1; i <= Math.min(4, availableSpots); i++) {
        const option = document.createElement('option'); option.value = i; option.textContent = i === 1 ? '1 Player' : `${i} Players`;
        playerCountSelect.appendChild(option);
    }
}
function toggleHolesSelector(facilityId) {
    if (!holesSelector || !facilityId) return;
    const isPar3Course = ['3570', '3572'].includes(String(facilityId));
    holesSelector.style.display = isPar3Course ? 'none' : 'block';
    const targetHoleValue = isPar3Course ? '9' : '18';
    const targetRadio = document.querySelector(`input[name="holes"][value="${targetHoleValue}"]`);
    if (targetRadio) targetRadio.checked = true;
}

// --- Booking Process (Two Steps) ---
function resetBookNowButton() {
    if (bookNowBtn) {
        bookNowBtn.disabled = false; bookNowBtn.classList.remove('loading'); bookNowBtn.textContent = 'Book Now';
        console.log("DEBUG: Book Now button reset.");
    } else { console.error("DEBUG: Could not reset Book Now button, element not found."); }
}
// Step 1: Initiate Pending Reservation
function initiatePendingReservation() {
    console.log('===== initiatePendingReservation CALLED =====');
    if (!selectedTeeTime || !selectedCourse) {
        showBookingError("Booking information incomplete. Please select the tee time again."); resetBookNowButton(); return;
    }
    const playerCount = playerCountSelect ? playerCountSelect.value : null;
    const cartOptionElement = document.querySelector('input[name="cart"]:checked'); const cartOption = cartOptionElement ? cartOptionElement.value : null;
    const holesOptionElement = document.querySelector('input[name="holes"]:checked'); const holesOption = holesOptionElement ? holesOptionElement.value : null;
    if (!playerCount || !cartOption || !holesOption) {
        showBookingError("Please ensure all booking options are selected."); resetBookNowButton(); return;
    }
    const bookingSelections = { playerCount: parseInt(playerCount), cartSelected: cartOption === 'yes', holesSelected: parseInt(holesOption) };
    console.log("Booking selections:", bookingSelections); console.log("Using selected tee time details:", selectedTeeTime);
    const token = localStorage.getItem('jwt_token'); const cookies = localStorage.getItem('foreup_cookies');
    if (!token) { showBookingError('Authentication required.'); resetBookNowButton(); return; }

    const formData = new URLSearchParams();
    // Fields from selectedTeeTime and bookingSelections matching the required list
    formData.append('time', selectedTeeTime.time);
    formData.append('holes', String(bookingSelections.holesSelected));
    formData.append('players', String(bookingSelections.playerCount));
    formData.append('carts', bookingSelections.cartSelected ? 'true' : 'false'); // Send boolean as string
    formData.append('schedule_id', selectedTeeTime.schedule_id);
    formData.append('teesheet_side_id', selectedTeeTime.teesheet_side_id); // Ensure this exists in API response
    formData.append('course_id', selectedTeeTime.course_id);
    formData.append('booking_class_id', selectedTeeTime.booking_class_id);
    formData.append('duration', '1'); // Static
    formData.append('foreup_discount', selectedTeeTime.foreup_discount !== undefined ? selectedTeeTime.foreup_discount : 'false');
    formData.append('foreup_trade_discount_rate', selectedTeeTime.foreup_trade_discount_rate !== undefined ? selectedTeeTime.foreup_trade_discount_rate : '0');
    formData.append('trade_min_players', selectedTeeTime.trade_min_players !== undefined ? selectedTeeTime.trade_min_players : '0');

    let green_fee, cart_fee, green_fee_tax, cart_fee_tax; // Determine fees based on holes
    if (bookingSelections.holesSelected === 9) {
        green_fee = selectedTeeTime.green_fee_9; cart_fee = selectedTeeTime.cart_fee_9;
        green_fee_tax = selectedTeeTime.green_fee_tax_9 !== undefined ? selectedTeeTime.green_fee_tax_9 : '0';
        cart_fee_tax = selectedTeeTime.cart_fee_tax_9 !== undefined ? selectedTeeTime.cart_fee_tax_9 : '0';
    } else {
        green_fee = selectedTeeTime.green_fee_18 || selectedTeeTime.green_fee; cart_fee = selectedTeeTime.cart_fee_18 || selectedTeeTime.cart_fee;
        green_fee_tax = selectedTeeTime.green_fee_tax_18 !== undefined ? selectedTeeTime.green_fee_tax_18 : '0';
        cart_fee_tax = selectedTeeTime.cart_fee_tax_18 !== undefined ? selectedTeeTime.cart_fee_tax_18 : '0';
    }
    formData.append('cart_fee', cart_fee !== undefined ? cart_fee : '0');
    formData.append('cart_fee_tax', cart_fee_tax);
    formData.append('green_fee', green_fee !== undefined ? green_fee : '0');
    formData.append('green_fee_tax', green_fee_tax);

    console.log('Making pending reservation fetch call with form data:', formData.toString());
    fetch(`${API_BASE_URL}/api/pending-reservation`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'X-ForeUp-Cookies': cookies || '' }, body: formData })
    .then(response => {
        if (!response.ok) { return response.json().then(errData => { throw new Error(errData.message || `HTTP ${response.status}`); }); }
        return response.json();
    })
    .then(data => {
        console.log('Pending reservation response data:', data);
        if (data.success === true && data.reservation_id) {
            console.log('Pending reservation successful. ID:', data.reservation_id);
            completeReservation(data.reservation_id, selectedTeeTime, bookingSelections);
        } else { showBookingError(data.msg || data.message || 'Failed to secure temporary reservation.'); resetBookNowButton(); }
    })
    .catch(error => { console.error('Error during pending reservation fetch:', error); showBookingError(`Failed to initiate booking: ${error.message}`); resetBookNowButton(); });
}
// Step 2: Complete the Reservation
function completeReservation(pendingReservationId, teeTimeDetails, bookingSelections) {
    console.log('===== completeReservation CALLED ====='); console.log('Completing reservation ID:', pendingReservationId);
    const token = localStorage.getItem('jwt_token'); const cookies = localStorage.getItem('foreup_cookies');
    if (!token) { showBookingError("Authentication lost."); resetBookNowButton(); return; }

    const payload = { ...teeTimeDetails }; // Start with original tee time details
    payload.pending_reservation_id = pendingReservationId; // Add the crucial ID
    payload.players = String(bookingSelections.playerCount); // Override with user selection (string)
    payload.carts = bookingSelections.cartSelected; // Override with user selection (boolean)
    payload.holes = String(bookingSelections.holesSelected); // Override with user selection (string)

    // Remove potentially calculated/generated fields before sending final request
    delete payload.available_spots; delete payload.available_spots_9; delete payload.available_spots_18;
    delete payload.allowed_group_sizes; delete payload.total; delete payload.pay_total;
    delete payload.pay_subtotal; delete payload.subtotal; delete payload.details;
    delete payload.airQuotesCart; delete payload.formattedTime;

    // Ensure static fields have defaults if missing
    payload.promo_code = payload.promo_code || ""; payload.promo_discount = payload.promo_discount || 0;
    payload.duration = payload.duration || 1; payload.notes = payload.notes || [];
    payload.customer_message = payload.customer_message || "";

    console.log('Making complete reservation fetch call with payload:', payload);
    fetch(`${API_BASE_URL}/api/complete-reservation`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'X-ForeUp-Cookies': cookies || '' }, body: JSON.stringify(payload) })
    .then(response => {
        console.log('Complete reservation response status:', response.status);
        if (!response.ok) { return response.json().then(errData => { throw new Error(errData.message || errData.msg || `HTTP ${response.status}`); }); }
        return response.json();
    })
    .then(data => {
        console.log('Reservation completion response data:', data); resetBookNowButton();
        if (data.TTID) { // Check for final confirmation ID from ForeUp
            console.log('Reservation completed successfully! Final ID:', data.TTID);
            showBookingSuccess(data.TTID, data);
            storeBookingInLocalStorage(data.TTID, { ...bookingSelections, ...teeTimeDetails, formattedTime: teeTimeDetails.formattedTime }, data); // Store richer context
            hideBookingModal();
        } else { showBookingError(data.msg || data.message || 'Failed to complete reservation (Confirmation ID missing)'); }
    })
    .catch(error => { console.error('Error during complete reservation fetch:', error); showBookingError(`Failed to finalize booking: ${error.message}`); resetBookNowButton(); });
}

// --- Notifications & Local Storage ---
function showBookingError(message) {
    console.error("Booking Error:", message);
    alert(`Booking Failed:\n${message}`); // Replace with better UI element if desired
    resetBookNowButton();
}
function showBookingSuccess(reservationId, data) {
    console.log("Booking Success:", reservationId, data);
    alert(`Booking Confirmed!\nConfirmation #: ${reservationId}\nCourse: ${selectedCourse?.name}\nTime: ${selectedTeeTime?.formattedTime}`); // Replace with better UI element
}
function storeBookingInLocalStorage(reservationId, bookingContext, responseData) {
    try {
        const existingBookingsStr = localStorage.getItem('user_bookings');
        const existingBookings = existingBookingsStr ? JSON.parse(existingBookingsStr) : [];
        const newBooking = {
            id: reservationId, date: selectedDate ? selectedDate.textContent : 'N/A',
            time: bookingContext?.formattedTime || 'N/A', course: selectedCourse ? selectedCourse.name : 'N/A',
            players: bookingContext?.playerCount, cart: bookingContext?.cartSelected, holes: bookingContext?.holesSelected,
            createdAt: new Date().toISOString(), teeTimeDetails: bookingContext, confirmationData: responseData
        };
        existingBookings.push(newBooking); localStorage.setItem('user_bookings', JSON.stringify(existingBookings));
        console.log('Booking stored in localStorage:', newBooking);
    } catch (e) { console.error("Failed to store booking in localStorage", e); }
}

// --- Stats Page Functions --- (Include if used)
function getRuleType(ruleName) { if (!ruleName) return 'standard'; /* ... more logic ... */ return 'standard'; }
function initializeStatsPage() { console.log('Initializing stats page...'); /* ... full implementation ... */ }
function formatDate(dateStr) { if (!dateStr) return 'N/A'; try { /* ... date formatting ... */ } catch(e){ return dateStr; } }

// --- Phone Call Functionality --- (Include if used)
function makePhoneCall() { const phoneNumber = '12102127572'; window.location.href = `tel:${phoneNumber}`; /* ... rest of function ... */ }


// --- Initialization and Event Listeners ---
// --- Initialization and Event Listeners ---
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM content loaded, initializing page...');
    // **** 1. Call checkLogin FIRST to set initial button states ****
    checkLogin();

    // **** 2. ADD Listener for Header Login Button ****
    const loginHeaderBtn = getElement('loginHeaderBtn', 'Login button in header not found', false); // Get reference
    if (loginHeaderBtn) {
        console.log("DEBUG: Attaching click listener to loginHeaderBtn");
        loginHeaderBtn.addEventListener('click', () => {
            console.log("DEBUG: Header Login Button Clicked!");
            selectedCourse = null; // Ensure login doesn't auto-proceed to tee times
            showLoginModal(); // Show the modal
        });
         console.log("DEBUG: Click listener ATTACHED to loginHeaderBtn.");
    } else {
         console.warn("DEBUG: loginHeaderBtn not found (may be expected on stats page).");
    }

    // **** 3. MODIFY Logout Listener ****
    const logoutBtn = getElement('logoutBtn', 'Logout button not found', false); // Get reference
    if (logoutBtn) {
         logoutBtn.addEventListener('click', function() {
            console.log('Logout clicked');
            // Clear local storage
            localStorage.removeItem('jwt_token'); localStorage.removeItem('user_name');
            localStorage.removeItem('foreup_cookies'); localStorage.removeItem('login_data');
            localStorage.removeItem('user_bookings');
            // Update UI immediately using checkLogin
            checkLogin();
            // Redirect logic (UPDATED for index.html)
            if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
                 window.location.href = 'index.html'; // Go back to index.html if not already there
            }
        });
    }

    // **** 4. Keep Page-Specific Logic Structure ****
    if (document.getElementById('courseGrid')) {
        // --- Code specific to index.html ---
        console.log('Initializing Course Page (index.html)...');

        // Get elements needed for this page (can re-get safely or trust globals if careful)
        const loginModal = getElement('loginModal');
        const closeLoginModal = getElement('closeLoginModal');
        const loginForm = getElement('loginForm');
        const bookNowBtn = getElement('bookNowBtn');
        const cancelBookingBtn = getElement('cancelBookingBtn');
        const bookingModal = getElement('bookingModal');
        const closeTeeTimeModal = getElement('closeTeeTimeModal');
        const teeTimeModal = getElement('teeTimeModal');
        const backToCalendar = getElement('backToCalendar');
        // ... get other needed elements ...

        // Login Modal Listeners (Index Page Specific)
        if (loginForm) {
            console.log("DEBUG: Attaching submit listener to loginForm (Course Page)");
            loginForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const usernameInput = document.getElementById('username');
                const passwordInput = document.getElementById('password');
                if (usernameInput && passwordInput && usernameInput.value && passwordInput.value) {
                    loginUser(usernameInput.value, passwordInput.value);
                } else {
                     if(typeof showMessage === 'function') { showMessage('Please enter both Email/Username and Password.', 'error'); }
                     else { alert('Please enter both Email/Username and Password.'); }
                }
            });
            console.log("DEBUG: Submit listener ATTACHED to loginForm (Course Page).");
        } else { console.error("DEBUG: loginForm element not found on Course Page!"); }

        if (closeLoginModal) closeLoginModal.addEventListener('click', () => hideModal(loginModal));
        if (loginModal) loginModal.addEventListener('click', (e) => { if (e.target === loginModal) hideModal(loginModal); });

        // Tee Time Modal Listeners (Index Page Specific)
        if (closeTeeTimeModal) closeTeeTimeModal.addEventListener('click', hideTeeTimeModal);
        if (teeTimeModal) teeTimeModal.addEventListener('click', (e) => { if (e.target === teeTimeModal) hideTeeTimeModal(); });
        if (backToCalendar) { backToCalendar.addEventListener('click', function() { /* ... back to calendar logic ... */ }); }


        // Booking Modal Listeners (Index Page Specific)
        if (closeBookingModal) closeBookingModal.addEventListener('click', hideBookingModal);
        if (cancelBookingBtn) cancelBookingBtn.addEventListener('click', hideBookingModal);
        if (bookingModal) bookingModal.addEventListener('click', (e) => { if (e.target === bookingModal) hideBookingModal(); });


        // Booking Button Listener (Index Page Specific)
        if (bookNowBtn) {
            console.log('DEBUG: Attaching click listener to bookNowBtn (Course Page)');
            bookNowBtn.addEventListener('click', function() { /* ... booking logic ... */ initiatePendingReservation(); });
            console.log('DEBUG: Click listener ATTACHED to bookNowBtn (Course Page).');
        } else { console.error('DEBUG: bookNowBtn not found on Course page!'); }

        // Call Modal Listeners (Index Page Specific - if using Call feature)
        const closeCallConfirmModal = getElement('closeCallConfirmModal', '', false);
        const callConfirmModal = getElement('callConfirmModal', '', false);
        const cancelCallBtnBooking = getElement('cancelCallBtn', '', false);
        const makeCallBtnBooking = getElement('makeCallBtn', '', false);
        if (closeCallConfirmModal) closeCallConfirmModal.addEventListener('click', hideCallConfirmModal);
        if (callConfirmModal) callConfirmModal.addEventListener('click', (e) => { if (e.target === callConfirmModal) hideCallConfirmModal(); });
        if(cancelCallBtnBooking) cancelCallBtnBooking.addEventListener('click', hideBookingModal);
        if(makeCallBtnBooking) makeCallBtnBooking.addEventListener('click', makePhoneCall);

        // Load Courses (Index Page Specific)
        loadCourses();

    } else if (document.getElementById('statsContainer')) {
        // --- Code specific to mystats.html ---
        console.log('Initializing Stats Page (mystats.html)...');
        // Stats page specific listeners (if any) would go here
        if (typeof initializeStatsPage === 'function') {
            initializeStatsPage();
        } else { console.error('initializeStatsPage function missing'); }
      // **** ADD CALL TO INITIALIZE FINANCIALS ****
        if (typeof initializeFinancialsSection === 'function') {
             initializeFinancialsSection(); // Call the function from financials.js
        } else {
             console.error('initializeFinancialsSection function missing! Financials will not load.');
             const fsDiv = document.getElementById('financialSummary');
             if(fsDiv) fsDiv.innerHTML = '<p style="color:red;">Error: Financials script missing.</p>';
        }

    } else {
        // --- Fallback for Unknown Pages ---
        console.warn('Unknown page type - no course grid or stats container found.');
    }

   // API Health Check (Common - runs on all pages)
    console.log('Performing API health check...');
    fetch(`${API_BASE_URL}/health`)
        .then(response => response.ok ? response.json() : { status: 'error', message: `Health check failed with status ${response.status}` })
        .then(data => console.log('API health check result:', data))
        .catch(error => console.error('API health check failed:', error));

    console.log('Page initialization complete.');
});
