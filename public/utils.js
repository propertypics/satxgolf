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

// --- END OF FILE utils.js ---
