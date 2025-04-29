// --- START OF FILE mystats.js ---

// Constants can be at top if needed, but avoid function calls like getElement
// const MYSTATS_APP_VERSION = "1.0.11-stats"; // If needed specifically here

console.log("mystats.js executing");

// --- NO Top-Level getElement calls here ---
// const statsUserInfo = getStatsElement(...); // REMOVE
// const statsUserName = getStatsElement(...); // REMOVE
// const statsLogoutBtn = getStatsElement(...); // REMOVE
// etc...

// --- Login/Auth Check ---
// Modified to get elements inside
function statsCheckLogin() { // Or just use global checkLogin from utils.js
    const token = localStorage.getItem('jwt_token');
    const storedName = localStorage.getItem('user_name');
    // Get elements when function is called
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    // const statsLink = document.getElementById('statsLink'); // If needed

    console.log("STATS_PAGE: Running checkLogin"); // Add log

    if (token) {
        if (storedName && userName) userName.textContent = storedName;
        if (userInfo) userInfo.style.display = 'flex';
        // if (statsLink) statsLink.style.display = 'inline';
        return true;
    }
    if (userInfo) userInfo.style.display = 'none';
    // if (statsLink) statsLink.style.display = 'none';
    return false;
}

// --- Stats Page Specific Functions ---

function statsFormatDate(dateStr) { /* ... same as before ... */ }
function statsGetRuleType(ruleName) { /* ... same as before ... */ }
function statsGetSanAntonioCourses() { /* ... return course array ... */ } // Or use global from utils

function initializeStatsPage() {
    console.log('STATS_PAGE: Initializing non-financial stats...');

    // Get elements NEEDED by this function specifically
    // Use the shared getElement from utils.js now
    const statsContainer = getElement('statsContainer', 'Stats container not found');
    const statsNoDataMessage = getElement('noDataMessage', 'No data message element not found');
    const statsMembershipInfo = getElement('membershipInfo', 'Membership info div not found');
    const statsRecentActivity = getElement('recentActivity', 'Recent activity div not found');
    const statsPunchInfo = getElement('punchInfo', 'Punch info div not found', false);
    const statsPunchCard = getElement('punchCard', 'Punch card container not found', false);
    const statsLoadingIndicator = getElement('loadingIndicator', 'Stats loading indicator not found', false); // Get loader here if needed


    if (!statsContainer || !statsNoDataMessage || !statsMembershipInfo || !statsRecentActivity) {
        console.error('STATS_PAGE: Critical elements missing.');
        if (statsLoadingIndicator) statsLoadingIndicator.style.display = 'none'; // Hide if init fails
        return;
    }
    // Don't hide loading indicator here yet - let financials handle it maybe

    statsNoDataMessage.style.display = 'none';

    // Use the shared checkLogin (assuming utils.js loaded first)
    if (!checkLogin()) {
        console.log('STATS_PAGE: User not logged in.');
        if (statsLoadingIndicator) statsLoadingIndicator.style.display = 'none';
        statsNoDataMessage.style.display = 'block';
        statsNoDataMessage.innerHTML = `<h3>No Stats Available</h3><p>Please log in.</p>`;
        return;
    }

    const loginDataStr = localStorage.getItem('login_data');
    if (!loginDataStr) { /* ... handle no login data ... */ return; }

    try {
        console.log('STATS_PAGE: Parsing login_data...');
        const loginData = JSON.parse(loginDataStr);
        console.log('STATS_PAGE: Parsed login_data successfully.');

        // --- Process loginData for non-financial stats ---
        const userData = { name: `${loginData.first_name || ''} ${loginData.last_name || ''}`.trim() };
        let membershipData = { name: 'No Membership Found', expires: 'N/A', purchased: 'N/A' };
        let hasPunchPass = false; let punchData = null; let allRounds = [];
        let roundCounts = { total: 0, punch: 0, loyalty: 0, promo: 0, standard: 0 };
        // Use shared course data function
        const courses = typeof getSanAntonioCourses === 'function' ? getSanAntonioCourses() : [];

        if (loginData.passes && typeof loginData.passes === 'object') {
             // ... same logic as before to process passes, uses, rules ...
             // ... using formatDate, getRuleType from utils.js ...
             // ... calculate punchData, roundCounts, allRounds ...
        }
        console.log('STATS_PAGE: Basic stats processing complete.');

        // --- Populate Basic Stats HTML ---
        if (statsMembershipInfo) statsMembershipInfo.innerHTML = `...`; // Populate membership
        const displayPunchCard = hasPunchPass && punchData && statsPunchCard && statsPunchInfo;
        if (displayPunchCard) { /* ... populate punchInfo ... */ statsPunchCard.style.display = 'block'; }
        else if (statsPunchCard) { statsPunchCard.style.display = 'none'; }
        if (statsRecentActivity) {
            if (allRounds.length > 0) { /* ... populate recentActivity ... */ }
            else { statsRecentActivity.innerHTML = '<p>No activity found.</p>'; }
        }

        // Wait for financials to finish before hiding loader/showing container generally

    } catch (error) {
        console.error('STATS_PAGE: Error processing login data:', error);
        if (statsLoadingIndicator) statsLoadingIndicator.style.display = 'none'; // Hide on error
        if (statsNoDataMessage) {
            statsNoDataMessage.style.display = 'block';
            statsNoDataMessage.innerHTML = `<h3>Error Loading Stats</h3><p>Problem processing data. (${error.message})</p>`;
        }
        // Ensure stats container isn't shown if basic stats failed
         if (statsContainer) statsContainer.style.display = 'none';
    }
}


// --- Initialization and Event Listeners ---
document.addEventListener('DOMContentLoaded', function() {
    console.log('STATS_PAGE: DOM content loaded...');

    // Check initial login state for header (using shared function)
    if (typeof checkLogin === 'function') {
        checkLogin();
    } else {
        console.error("STATS_PAGE: checkLogin function not found from utils.js!");
    }


    // Attach logout listener
    // Get button INSIDE the listener
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
         logoutBtn.addEventListener('click', function() {
            console.log('STATS_PAGE: Logout clicked');
            localStorage.removeItem('jwt_token'); localStorage.removeItem('user_name');
            localStorage.removeItem('foreup_cookies'); localStorage.removeItem('login_data');
            localStorage.removeItem('user_bookings');
            // Call shared cache clear from financials.js if it exists
            if(typeof clearFinancialCache === 'function') {
                 clearFinancialCache();
            } else { localStorage.removeItem('user_financial_details_cache'); }
            // Update header state
            if(typeof checkLogin === 'function') checkLogin();
            window.location.href = 'index.html'; // Redirect
        });
    } else {
        console.warn("STATS_PAGE: Logout button not found.");
    }

    // Initialize the basic stats part
    if (typeof initializeStatsPage === 'function') {
        initializeStatsPage();
    } else {
        console.error('STATS_PAGE: initializeStatsPage function is missing!');
    }

    // Initialize the financials part (defined in financials.js)
    if (typeof initializeFinancialsSection === 'function') {
        console.log("STATS_PAGE: Calling initializeFinancialsSection...");
        // This function should handle hiding the main loader and showing statsContainer
        initializeFinancialsSection();
    } else {
         console.error('STATS_PAGE: initializeFinancialsSection function missing! Financials will not load.');
         const fsDiv = document.getElementById('financialSummary');
         if(fsDiv) fsDiv.innerHTML = '<p style="color:red;">Error: Financials script error.</p>';
         // Hide spinner/show container if financials are missing but basic stats might have loaded
         const loadingIndicator = document.getElementById('loadingIndicator');
         const container = document.getElementById('statsContainer');
         if (loadingIndicator) loadingIndicator.style.display = 'none';
         if (container) container.style.display = 'grid'; // Or block
    }

    console.log('STATS_PAGE: Initialization sequence complete.');
});

// --- END OF FILE mystats.js ---
