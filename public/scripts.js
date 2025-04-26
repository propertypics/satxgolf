const API_BASE_URL = "https://satxgolf.wade-lewis.workers.dev";
const APP_VERSION = "1.0.10"; // Updated version

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
// ... (Keep all the getElement calls from the previous full script version) ...
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
let selectedTeeTime = null; // Will store the full object from the tee time list
let selectedCourse = null;

// --- Constants & Mappings ---
const DEFAULT_BOOKING_CLASS = "3272";
const membershipToBookingClass = { /* ... keep your mappings ... */ };
const courseImages = { /* ... keep your image mappings ... */ };

// --- Modal Functions ---
function showModal(modalElement) { /* ... */ }
function hideModal(modalElement) { /* ... */ }
function hideLoginModal() { hideModal(loginModal); }
function showLoginModal() { showModal(loginModal); }
function hideTeeTimeModal() { /* ... includes setTimeout to reset views ... */ }
function hideBookingModal() { hideModal(bookingModal); }
function showBookingModal() { showModal(bookingModal); }
function hideCallConfirmModal() { hideModal(callConfirmModal); }
function showCallConfirmModal() { showModal(callConfirmModal); }

// --- Login/Auth Functions ---
function checkLogin() { /* ... */ }
function loginUser(username, password) { /* ... */ }
function showMessage(message, type) { /* ... */ }
function getUserBookingClassId() { /* ... */ }

// --- Course Loading ---
function loadCourses() { /* ... */ }
function renderCourses(courses) { /* ... (ensure click calls showTeeTimeModal) ... */ }

// --- Tee Time Selection ---
function showTeeTimeModal(course) { /* ... (calls generateCalendar) ... */ }
function generateCalendar(month, year) { /* ... (date range logic) ... */ }
function selectDate(year, month, day, apiDateStr) { /* ... (calls fetchTeeTimes) ... */ }
function fetchTeeTimes(courseId, facilityId, dateStr) { /* ... (proxies request via worker) ... */ }
function showNoTeeTimesMessage(message) { /* ... */ }
function displayTeeTimes(teeTimesData) {
    // Displays tee times from the /api/teetimes response
    // **Crucially, does NOT expect or check for teetime_id here**
    if (!teeTimesList || !teeTimesLoading || !noTeeTimes) return;
    teeTimesLoading.style.display = 'none';

    if (!teeTimesData || teeTimesData.length === 0) {
        showNoTeeTimesMessage(); return;
    }

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
             // ... (display logic for time, spots, price - same as before) ...
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
    teeTimesList.style.display = 'block';
    noTeeTimes.style.display = 'none';
}
function formatTimeString(hour, minute) { /* ... */ }

function selectTeeTime(teeTime, formattedTime) {
    // Stores the selected tee time details globally and shows the booking modal/form
    console.log('Storing selected tee time details:', teeTime);

    // Store the entire object globally
    selectedTeeTime = { ...teeTime, formattedTime: formattedTime };

    // Update booking details display
    if (bookingDetails && selectedDate && selectedCourse) {
        bookingDetails.innerHTML = `
            <strong>${selectedDate.textContent} at ${formattedTime}</strong>
            <span>${selectedCourse.name}</span>
            <span>${teeTime.available_spots} spot${teeTime.available_spots !== 1 ? 's' : ''} available</span>
        `;
    }

    // Show/hide call notice if applicable (e.g., 4 spots available)
    const isSinglePlayerOpenTime = teeTime.available_spots === 4;
    if (bookingFormContainer) bookingFormContainer.style.display = isSinglePlayerOpenTime ? 'none' : 'block';
    if (callNoticeContainer) callNoticeContainer.style.display = isSinglePlayerOpenTime ? 'block' : 'none';

    updatePlayerCountOptions(teeTime.available_spots);
    toggleHolesSelector(selectedCourse ? selectedCourse.facilityId : null);

    hideTeeTimeModal(); // Hide the date/time selection modal
    showBookingModal(); // Show the final confirmation/booking form modal
}
function updatePlayerCountOptions(availableSpots) { /* ... */ }
function toggleHolesSelector(facilityId) { /* ... */ }

// --- Booking Process (Two Steps) ---

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

// Step 1: Initiate Pending Reservation (Called when user clicks "Book Now")
function initiatePendingReservation() {
    console.log('===== initiatePendingReservation CALLED =====');

    // 1. Validate state
    if (!selectedTeeTime || !selectedCourse) {
        showBookingError("Booking information is incomplete. Please select the tee time again.");
        resetBookNowButton(); return;
    }

    // 2. Get form selections
    const playerCount = playerCountSelect ? playerCountSelect.value : null;
    const cartOptionElement = document.querySelector('input[name="cart"]:checked');
    const cartOption = cartOptionElement ? cartOptionElement.value : null;
    const holesOptionElement = document.querySelector('input[name="holes"]:checked');
    const holesOption = holesOptionElement ? holesOptionElement.value : null;

    if (!playerCount || !cartOption || !holesOption) {
        showBookingError("Please ensure all booking options (Players, Cart, Holes) are selected.");
        resetBookNowButton(); return;
    }
    // Store user's choices
    const bookingSelections = {
        playerCount: parseInt(playerCount),
        cartSelected: cartOption === 'yes', // Boolean
        holesSelected: parseInt(holesOption) // Number (9 or 18)
    };
    console.log("Booking selections:", bookingSelections);
    console.log("Using selected tee time details:", selectedTeeTime);

    // 3. Get Auth
    const token = localStorage.getItem('jwt_token');
    const cookies = localStorage.getItem('foreup_cookies');
    if (!token) {
        showBookingError('Authentication required. Please log in again.');
        resetBookNowButton(); return;
    }

    // 4. Prepare Form Data for Pending Reservation API (using exact field list)
    const formData = new URLSearchParams();
    formData.append('time', selectedTeeTime.time); // e.g., "2025-04-26 16:40"
    formData.append('holes', String(bookingSelections.holesSelected)); // Send user's choice (e.g., "9" or "18")
    formData.append('players', String(bookingSelections.playerCount)); // Send user's choice as string
    formData.append('carts', bookingSelections.cartSelected ? 'true' : 'false'); // Send boolean as string 'true'/'false'
    formData.append('schedule_id', selectedTeeTime.schedule_id);
    formData.append('teesheet_side_id', selectedTeeTime.teesheet_side_id); // Ensure this field exists in selectedTeeTime data
    formData.append('course_id', selectedTeeTime.course_id);
    formData.append('booking_class_id', selectedTeeTime.booking_class_id); // Crucial from tee time data
    formData.append('duration', '1'); // Static based on example
    formData.append('foreup_discount', selectedTeeTime.foreup_discount !== undefined ? selectedTeeTime.foreup_discount : 'false'); // Default to false if missing
    formData.append('foreup_trade_discount_rate', selectedTeeTime.foreup_trade_discount_rate !== undefined ? selectedTeeTime.foreup_trade_discount_rate : '0'); // Default
    formData.append('trade_min_players', selectedTeeTime.trade_min_players !== undefined ? selectedTeeTime.trade_min_players : '0'); // Default

    // Select fees based on chosen holes
    let green_fee, cart_fee, green_fee_tax, cart_fee_tax;
    if (bookingSelections.holesSelected === 9) {
        green_fee = selectedTeeTime.green_fee_9;
        cart_fee = selectedTeeTime.cart_fee_9;
        green_fee_tax = selectedTeeTime.green_fee_tax_9 !== undefined ? selectedTeeTime.green_fee_tax_9 : '0';
        cart_fee_tax = selectedTeeTime.cart_fee_tax_9 !== undefined ? selectedTeeTime.cart_fee_tax_9 : '0';
    } else { // 18 holes
        green_fee = selectedTeeTime.green_fee_18 || selectedTeeTime.green_fee;
        cart_fee = selectedTeeTime.cart_fee_18 || selectedTeeTime.cart_fee;
        green_fee_tax = selectedTeeTime.green_fee_tax_18 !== undefined ? selectedTeeTime.green_fee_tax_18 : '0';
        cart_fee_tax = selectedTeeTime.cart_fee_tax_18 !== undefined ? selectedTeeTime.cart_fee_tax_18 : '0';
    }
    // Append fees, defaulting to 0 if undefined
    formData.append('cart_fee', cart_fee !== undefined ? cart_fee : '0');
    formData.append('cart_fee_tax', cart_fee_tax);
    formData.append('green_fee', green_fee !== undefined ? green_fee : '0');
    formData.append('green_fee_tax', green_fee_tax);


    console.log('Making pending reservation fetch call with form data:', formData.toString());
    fetch(`${API_BASE_URL}/api/pending-reservation`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'X-ForeUp-Cookies': cookies || ''
        },
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(errData => { throw new Error(errData.message || `HTTP ${response.status}`); });
        }
        return response.json();
    })
    .then(data => {
        console.log('Pending reservation response data:', data);
        if (data.success === true && data.reservation_id) {
            console.log('Pending reservation successful. ID:', data.reservation_id);
            // Proceed to final booking step
            completeReservation(data.reservation_id, selectedTeeTime, bookingSelections);
        } else {
            showBookingError(data.msg || data.message || 'Failed to secure temporary reservation.');
            resetBookNowButton();
        }
    })
    .catch(error => {
        console.error('Error during pending reservation fetch:', error);
        showBookingError(`Failed to initiate booking: ${error.message}`);
        resetBookNowButton();
    });
}


// Step 2: Complete the Reservation (Called after successful pending step)
function completeReservation(pendingReservationId, teeTimeDetails, bookingSelections) {
    console.log('===== completeReservation CALLED =====');
    console.log('Completing reservation ID:', pendingReservationId);

    const token = localStorage.getItem('jwt_token');
    const cookies = localStorage.getItem('foreup_cookies');
    if (!token) { showBookingError("Authentication lost."); resetBookNowButton(); return; }

    // Construct the RICH JSON payload based on the final curl example
    // Start by copying *most* fields directly from the original tee time details
    const payload = { ...teeTimeDetails }; // Shallow copy

    // ---- Critical Override: Add the pending reservation ID ----
    payload.pending_reservation_id = pendingReservationId;

    // ---- Override fields based on user selections ----
    payload.players = String(bookingSelections.playerCount); // Format as string
    payload.carts = bookingSelections.cartSelected; // Send boolean
    payload.holes = String(bookingSelections.holesSelected); // Format as string

    // ---- Remove fields that might be calculated server-side or aren't needed ----
    // Review carefully - remove only if causing issues.
    delete payload.available_spots;
    delete payload.available_spots_9;
    delete payload.available_spots_18;
    delete payload.allowed_group_sizes;
    // Keep fee fields (green_fee, cart_fee etc.) as they were part of the curl request data
    // Remove potentially calculated/generated fields:
    delete payload.total;
    delete payload.pay_total;
    delete payload.pay_subtotal;
    delete payload.subtotal;
    delete payload.details;
    delete payload.airQuotesCart;
    delete payload.formattedTime; // Remove frontend helper field

    // ---- Ensure required static/default fields ----
    payload.promo_code = payload.promo_code || "";
    payload.promo_discount = payload.promo_discount || 0;
    payload.duration = payload.duration || 1; // Make sure duration is present
    payload.notes = payload.notes || [];
    payload.customer_message = payload.customer_message || "";


    console.log('Making complete reservation fetch call with payload:', payload);
    fetch(`${API_BASE_URL}/api/complete-reservation`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json', // Must be JSON
            'Authorization': `Bearer ${token}`,
            'X-ForeUp-Cookies': cookies || ''
        },
        body: JSON.stringify(payload) // Send the constructed JSON payload
    })
    .then(response => {
        console.log('Complete reservation response status:', response.status);
        if (!response.ok) {
            return response.json().then(errData => { throw new Error(errData.message || errData.msg || `HTTP ${response.status}`); });
        }
        return response.json();
    })
    .then(data => {
        console.log('Reservation completion response data:', data);
        resetBookNowButton(); // Reset button state

        // Check for the final confirmation ID ("TTID" based on curl response)
        if (data.TTID) {
            console.log('Reservation completed successfully! Final ID:', data.TTID);
            showBookingSuccess(data.TTID, data); // Use the final ID
            // Store bookingSelections (user choices) along with final response data
            storeBookingInLocalStorage(data.TTID, { ...bookingSelections, ...teeTimeDetails }, data); // Store richer context
            hideBookingModal();
        } else {
            showBookingError(data.msg || data.message || 'Failed to complete reservation (Unknown Reason)');
        }
    })
    .catch(error => {
        console.error('Error during complete reservation fetch:', error);
        showBookingError(`Failed to finalize booking: ${error.message}`);
        resetBookNowButton();
    });
}

// --- Notifications & Local Storage ---
function showBookingError(message) {
    console.error("Booking Error:", message);
    // Implement a more user-friendly notification if desired
    alert(`Booking Failed:\n${message}`);
    resetBookNowButton(); // Ensure button is reset on error display
}

function showBookingSuccess(reservationId, data) {
    console.log("Booking Success:", reservationId, data);
     // Implement a more user-friendly notification
    alert(`Booking Confirmed!\nConfirmation #: ${reservationId}\nCourse: ${selectedCourse?.name}\nTime: ${selectedTeeTime?.formattedTime}`);
}

function storeBookingInLocalStorage(reservationId, bookingContext, responseData) {
    // Stores user selections and tee time details along with confirmation
    try {
        const existingBookingsStr = localStorage.getItem('user_bookings');
        const existingBookings = existingBookingsStr ? JSON.parse(existingBookingsStr) : [];
        const newBooking = {
            id: reservationId, // Final confirmation ID
            date: selectedDate ? selectedDate.textContent : 'N/A',
            time: bookingContext?.formattedTime || 'N/A', // Use formattedTime if available
            course: selectedCourse ? selectedCourse.name : 'N/A',
            players: bookingContext?.playerCount,
            cart: bookingContext?.cartSelected,
            holes: bookingContext?.holesSelected,
            createdAt: new Date().toISOString(),
            teeTimeDetails: bookingContext, // Store context
            confirmationData: responseData // Store the success response
        };
        existingBookings.push(newBooking);
        localStorage.setItem('user_bookings', JSON.stringify(existingBookings));
        console.log('Booking stored in localStorage:', newBooking);
    } catch (e) {
        console.error("Failed to store booking in localStorage", e);
    }
}

// --- Stats Page Functions --- (Keep your existing stats functions)
function getRuleType(ruleName) { /* ... */ return 'standard'; }
function initializeStatsPage() { /* ... */ console.log('Initializing stats page'); }
function formatDate(dateStr) { /* ... */ return 'N/A'; }

// --- Phone Call Functionality --- (Keep if needed)
function makePhoneCall() { /* ... */ console.log('Initiating phone call'); }


// --- Initialization and Event Listeners ---
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM content loaded, initializing page...');

    checkLogin(); // Initial check

    // --- Login Modal Listeners ---
    if (loginForm) { /* ... login listener ... */ }
    if (closeLoginModal) closeLoginModal.addEventListener('click', hideLoginModal);
    if (loginModal) loginModal.addEventListener('click', (e) => { if (e.target === loginModal) hideLoginModal(); });

    // --- Logout Listener ---
    if (logoutBtn) { /* ... logout listener ... */ }

    // --- Tee Time Modal Listeners ---
    if (closeTeeTimeModal) closeTeeTimeModal.addEventListener('click', hideTeeTimeModal);
    if (teeTimeModal) teeTimeModal.addEventListener('click', (e) => { if (e.target === teeTimeModal) hideTeeTimeModal(); });
    if (backToCalendar) { /* ... backToCalendar listener ... */ }

    // --- Booking Modal Listeners ---
    if (closeBookingModal) closeBookingModal.addEventListener('click', hideBookingModal);
    if (cancelBookingBtn) cancelBookingBtn.addEventListener('click', hideBookingModal);
    if (bookingModal) bookingModal.addEventListener('click', (e) => { if (e.target === bookingModal) hideBookingModal(); });

    // *** BOOKING BUTTON LISTENER (Triggers Step 1) ***
    if (bookNowBtn) {
        console.log('DEBUG: Attaching click listener to bookNowBtn');
        bookNowBtn.addEventListener('click', function() {
            console.log('DEBUG: bookNowBtn CLICKED!');
            bookNowBtn.disabled = true;
            bookNowBtn.classList.add('loading');
            bookNowBtn.textContent = 'Booking...';
            console.log('DEBUG: Button disabled and loading state set.');

            try {
                 // Call the Step 1 function: Initiate Pending Reservation
                 initiatePendingReservation();
            } catch (error) {
                 console.error("FATAL ERROR inside bookNowBtn click handler:", error);
                 showBookingError(`An unexpected error occurred: ${error.message}. Please try again.`);
                 resetBookNowButton(); // Ensure reset on unexpected errors
            }
        });
        console.log('DEBUG: Click listener ATTACHED to bookNowBtn.');
    } else {
        console.error('DEBUG: bookNowBtn not found, listener could not be attached.');
    }

    // --- Call Modal Listeners (If using call functionality) ---
    // ... (Ensure unique IDs if needed and attach listeners) ...

    // --- Page-Specific Initialization ---
    if (document.getElementById('courseGrid')) { /* ... loadCourses ... */ }
    else if (document.getElementById('statsContainer')) { /* ... initializeStatsPage ... */ }
    else { /* ... warn unknown page type ... */ }

    // --- API Health Check ---
    /* ... health check fetch ... */

    console.log('Page initialization complete.');
});

// --- END OF FILE scripts.js ---
