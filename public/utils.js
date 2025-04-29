// --- START OF FILE utils.js ---

console.log("utils.js loaded"); // Log to confirm loading

// --- Constants ---
const API_BASE_URL = "https://satxgolf.wade-lewis.workers.dev";
const APP_VERSION = "1.0.12"; // Update version as needed

// --- Shared Helper Functions ---

/**
 * Safely gets a DOM element by ID.
 * Logs an error or warning if the element is not found.
 * @param {string} id - The ID of the element to find.
 * @param {string} [errorMessage] - Optional custom error message.
 * @param {boolean} [isCritical=true] - If true, logs an error; if false, logs a warning.
 * @returns {HTMLElement|null} The found element or null.
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
 * Checks login status based on localStorage and updates common header elements.
 * Assumes header elements (userInfo, userName, statsLink, loginHeaderBtn) exist in the HTML.
 * @returns {boolean} True if the user is logged in, false otherwise.
 */
function checkLogin() {
    const token = localStorage.getItem('jwt_token');
    const storedName = localStorage.getItem('user_name');

    // Get references within the function to avoid depending on potentially unloaded DOM
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    const statsLink = document.getElementById('statsLink');
    const loginHeaderBtn = document.getElementById('loginHeaderBtn');

    if (token) { // User IS logged in
        if (storedName && userName) userName.textContent = storedName;
        if (userInfo) userInfo.style.display = 'flex';
        if (statsLink) statsLink.style.display = 'inline'; // Or 'block'
        if (loginHeaderBtn) loginHeaderBtn.style.display = 'none';
        // console.log("UTILS: checkLogin - User is LOGGED IN");
        return true;
    } else { // User IS NOT logged in
        if (userInfo) userInfo.style.display = 'none';
        if (statsLink) statsLink.style.display = 'none';
        if (loginHeaderBtn) loginHeaderBtn.style.display = 'inline'; // Or 'block'
        // console.log("UTILS: checkLogin - User is LOGGED OUT");
        return false;
    }
}


/**
 * Formats a date string into 'MMM D, YYYY' format.
 * Handles potential invalid date strings gracefully.
 * @param {string} dateStr - The date string to format.
 * @returns {string} Formatted date string or 'N/A'.
 */
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    try {
        // Try parsing common variations
        const date = new Date(dateStr.replace(/-/g, '/').replace(' ', 'T')); // Handle 'YYYY-MM-DD HH:MM:SS' and 'YYYY/MM/DD'
        if (isNaN(date.getTime())) {
            // If still invalid, try parsing just the date part if time is included
            const datePartOnly = dateStr.split(' ')[0];
            const dateOnly = new Date(datePartOnly.replace(/-/g, '/'));
             if (isNaN(dateOnly.getTime())) return dateStr; // Return original if completely invalid
             return dateOnly.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        }
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
        console.warn(`UTILS: Could not format date "${dateStr}"`, e);
        return dateStr; // Return original string if parsing fails
    }
}

/**
 * Provides the static list of San Antonio Golf Trail courses and their IDs.
 * @returns {Array<object>} Array of course objects.
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
        { name: "The Teddy Bear Par 3", courseId: "20108", facilityId: "3570" }, // Note: Shared courseId
        { name: "San Pedro Par 3", courseId: "20109", facilityId: "3572" }
    ];
}


// --- Optional Shared Modal Functions ---
// Include these if you want modals to be controllable from different scripts,
// otherwise, keep them within scripts.js if only index.html uses them.

/**
 * Shows a modal element by adding the 'active' class.
 * @param {HTMLElement} modalElement - The modal overlay element.
 */
function showModal(modalElement) {
    if (modalElement instanceof HTMLElement) { // Basic type check
        console.log(`UTILS: Showing modal`, modalElement.id);
        modalElement.classList.add('active');
        document.body.style.overflow = 'hidden';
    } else {
        console.error("UTILS: showModal called with invalid element", modalElement);
    }
}

/**
 * Hides a modal element by removing the 'active' class.
 * @param {HTMLElement} modalElement - The modal overlay element.
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


// --- Optional Basic Hashing ---
// Needed by financials.js for cache validation
function simpleHash(str) {
  if (typeof str !== 'string') str = String(str); // Ensure input is string
  let hash = 0;
  if (str.length === 0) return String(hash);
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return String(hash);
}


// --- END OF FILE utils.js ---
