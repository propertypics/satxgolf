// --- START OF FILE utils.js ---

console.log("utils.js loaded");

// --- Constants ---
const API_BASE_URL = "https://satxgolf.wade-lewis.workers.dev";
const APP_VERSION = "1.0.12"; // Or your current version

// --- Shared Helper Functions ---

/**
 * Safely gets a DOM element by ID. Logs error/warning if not found.
 */
function getElement(id, errorMessage, isCritical = true) {
    const element = document.getElementById(id);
    if (!element && isCritical) {
        console.error(`UTILS: ${errorMessage || `CRITICAL: Element '${id}' not found`}`);
    } else if (!element && !isCritical) {
         console.warn(`UTILS: ${errorMessage || `Warning: Element '${id}' not found`}`);
    }
    return element;
}

/**
 * Checks login status and updates common header elements.
 */
function checkLogin() {
    const token = localStorage.getItem('jwt_token');
    const storedName = localStorage.getItem('user_name');
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    const statsLink = document.getElementById('statsLink');
    const loginHeaderBtn = document.getElementById('loginHeaderBtn');

    if (token) { // Logged in
        if (storedName && userName) userName.textContent = storedName;
        if (userInfo) userInfo.style.display = 'flex';
        if (statsLink) statsLink.style.display = 'inline';
        if (loginHeaderBtn) loginHeaderBtn.style.display = 'none';
        return true;
    } else { // Logged out
        if (userInfo) userInfo.style.display = 'none';
        if (statsLink) statsLink.style.display = 'none';
        if (loginHeaderBtn) loginHeaderBtn.style.display = 'inline';
        return false;
    }
}

/**
 * Formats a date string into 'MMM D, YYYY'.
 */
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    try {
        const date = new Date(dateStr.replace(/-/g, '/').replace(' ', 'T'));
        if (isNaN(date.getTime())) {
            const datePartOnly = dateStr.split(' ')[0];
            const dateOnly = new Date(datePartOnly.replace(/-/g, '/'));
             if (isNaN(dateOnly.getTime())) return dateStr;
             return dateOnly.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        }
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
        console.warn(`UTILS: Could not format date "${dateStr}"`, e);
        return dateStr;
    }
}

/**
 * Provides the static list of San Antonio Golf Trail courses.
 */
function getSanAntonioCourses() {
    // Central source for course data and ID mappings
    return [
        { name: "Brackenridge Park", courseId: "20103", facilityId: "3564" },
        { name: "Cedar Creek", courseId: "20104", facilityId: "3565" },
        { name: "Mission del Lago", courseId: "20105", facilityId: "3566" },
        { name: "Northern Hills", courseId: "20106", facilityId: "3567" },
        { name: "Olmos Basin", courseId: "20107", facilityId: "3568" },
        { name: "Riverside 18", courseId: "20108", facilityId: "3569" },
        { name: "The Teddy Bear Par 3", courseId: "20108", facilityId: "3570" },
        { name: "San Pedro Par 3", courseId: "20109", facilityId: "3572" }
    ];
}

/**
 * Basic hashing function for cache validation.
 */
function simpleHash(str) {
  if (typeof str !== 'string') str = String(str);
  let hash = 0;
  if (str.length === 0) return String(hash);
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return String(hash);
}


/**
 * Shows a modal element.
 */
function showModal(modalElement) {
    if (modalElement instanceof HTMLElement) {
        console.log(`UTILS: Showing modal`, modalElement.id);
        modalElement.classList.add('active');
        document.body.style.overflow = 'hidden';
    } else {
        console.error("UTILS: showModal called with invalid element", modalElement);
    }
}

/**
 * Hides a modal element.
 */
function hideModal(modalElement) {
    if (modalElement instanceof HTMLElement) {
        console.log(`UTILS: Hiding modal`, modalElement.id);
        modalElement.classList.remove('active');
        document.body.style.overflow = '';
    } else {
         console.error("UTILS: hideModal called with invalid element", modalElement);
    }
}

/**
 * Fetches the user's reservation list from the backend worker.
 * Requires user to be logged in (sends JWT/Cookies).
 * @returns {Promise<Array>} A promise resolving with the array of reservation objects (processed by worker).
 */
async function fetchReservations() {
    console.log("UTILS: Fetching reservations...");
    const token = localStorage.getItem('jwt_token');
    const cookies = localStorage.getItem('foreup_cookies');

    // Check if logged in before attempting fetch
    if (!token) {
        console.error("UTILS: Cannot fetch reservations, user not logged in (no token).");
        // Return an empty array or throw an error, depending on how caller handles it
        // Throwing might be better to indicate failure clearly
        throw new Error("Authentication required to fetch reservations.");
        // return [];
    }

    // Use global API_BASE_URL
    const url = `${API_BASE_URL}/api/reservations`;
    const headers = {
        // No Content-Type needed for GET
        'Authorization': `Bearer ${token}`,
        'X-ForeUp-Cookies': cookies || '' // Send cookies if available
        // Add other headers like Accept if necessary, but usually not required for GET->JSON
    };

    try {
        console.log(`UTILS: Calling GET ${url}`);
        const response = await fetch(url, { method: 'GET', headers: headers });

        console.log(`UTILS: Fetch reservations response status: ${response.status}`);
        if (!response.ok) {
            let errorMsg = `Failed to fetch reservations: ${response.status}`;
            try {
                const errData = await response.json();
                errorMsg = errData.message || errData.error || errorMsg;
            } catch (e) { /* Ignore if response body isn't JSON */ }
            throw new Error(errorMsg);
        }

        const reservations = await response.json();
        if (!Array.isArray(reservations)) {
             console.error("UTILS: Reservations response is not an array:", reservations);
             throw new Error("Invalid data format received for reservations.");
        }
        console.log(`UTILS: Successfully fetched ${reservations.length} reservations.`);
        return reservations; // Return the array of reservation objects

    } catch (error) {
        console.error("UTILS: Error fetching reservations:", error);
        throw error; // Re-throw the error for the caller to handle
    }
}

/**
 * Calls the backend worker to cancel a reservation.
 * @param {string} reservationId - The final TTID of the reservation to cancel.
 * @returns {Promise<object>} Promise resolving with the worker's response object (e.g., {success: true} or {success: false, message: ...}).
 */
async function cancelBookingApi(reservationId) {
    console.log(`UTILS: Attempting to cancel reservation ID: ${reservationId}`);
    const token = localStorage.getItem('jwt_token');
    const cookies = localStorage.getItem('foreup_cookies');

    // Check if user is authenticated client-side first
    if (!token) {
        console.error("UTILS: No token found for cancellation API call.");
        // Return a structured error object
        return { success: false, message: "Authentication required. Please log in again." };
    }

    // Use global API_BASE_URL defined in this file
    if (typeof API_BASE_URL === 'undefined') {
         console.error("UTILS: API_BASE_URL not defined!");
         return { success: false, message: "API configuration error." };
    }
    const url = `${API_BASE_URL}/api/cancel-reservation`;

    try {
        console.log(`UTILS: Sending POST to ${url} for cancellation.`);
        const response = await fetch(url, {
            method: 'POST', // Using POST, expecting ID in body as defined in worker
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-ForeUp-Cookies': cookies || '' // Include cookies if they exist
            },
            body: JSON.stringify({ reservationId: reservationId }) // Send the TTID in the body
        });

        console.log(`UTILS: Cancel API raw response status: ${response.status}`);

        // Try to parse JSON regardless of status to get potential error messages
        let responseData = {};
        try {
            responseData = await response.json();
            console.log("UTILS: Parsed cancellation response data:", responseData);
        } catch (e) {
            // Handle cases where response isn't JSON (e.g., 204 No Content, or server error HTML)
            console.warn("UTILS: Cancel API response was not JSON.");
            if (response.ok) { // If status was OK (like 204) but no body
                 return { success: true, message: "Cancellation processed (No Content)." };
            } else {
                 // If status was error and body wasn't JSON
                 return { success: false, message: `Cancellation failed: Status ${response.status}` };
            }
        }

        // Check if the response indicates logical success, even if status was 200
        // ForeUp might return { success: false, msg: "..." } with a 200 status sometimes
        if (!response.ok || responseData.success === false || responseData.error === true) {
             const errorMsg = responseData.message || responseData.msg || responseData.error || `Cancellation failed with status ${response.status}`;
             console.error("UTILS: Cancellation API reported failure:", errorMsg);
             return { success: false, message: errorMsg };
        }

        // Assume success if response.ok and no explicit error in JSON
        responseData.success = true; // Ensure success flag is set
        return responseData;


    } catch (error) {
        console.error("UTILS: Network error during cancellation API call:", error);
         // Return a structured error object
         return { success: false, message: error.message || "Network error during cancellation." };
    }
}

// --- END OF FILE utils.js ---
