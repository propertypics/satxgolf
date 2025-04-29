// --- START OF FILE mystats.js ---

// Relies on functions/constants from utils.js being loaded first

console.log("mystats.js executing");

// --- Stats Page Specific Functions ---

// Helper to get rule type (can use global one if preferred)
function statsGetRuleType(ruleName) {
    if (!ruleName) return 'standard';
    const name = ruleName.toLowerCase();
    if (name.includes('free')) return 'punch';
    if (name.includes('loyalty')) return 'loyalty';
    if (name.includes('promo') || name.includes('special')) return 'promo';
    return 'standard';
}

// Main function to initialize non-financial stats display
function initializeStatsPage() {
    console.log('STATS_PAGE: Initializing non-financial stats...');

    // Use shared getElement from utils.js
    const statsContainer = getElement('statsContainer', 'Stats container not found');
    const statsNoDataMessage = getElement('noDataMessage', 'No data message element not found');
    const statsMembershipInfo = getElement('membershipInfo', 'Membership info div not found');
    const statsRecentActivity = getElement('recentActivity', 'Recent activity div not found');
    const statsPunchInfo = getElement('punchInfo', 'Punch info div not found', false);
    const statsPunchCard = getElement('punchCard', 'Punch card container not found', false);
    const statsLoadingIndicator = getElement('loadingIndicator', 'Stats loading indicator not found', false); // Get main loader


    if (!statsContainer || !statsNoDataMessage || !statsMembershipInfo || !statsRecentActivity) {
        console.error('STATS_PAGE: Critical elements missing for basic stats.');
        if (statsLoadingIndicator) statsLoadingIndicator.style.display = 'none'; // Hide loader if basic init fails
        return;
    }

    statsNoDataMessage.style.display = 'none';

    if (!checkLogin()) { // Use shared checkLogin
        console.log('STATS_PAGE: User not logged in.');
        if (statsLoadingIndicator) statsLoadingIndicator.style.display = 'none'; // Hide loader
        if (statsNoDataMessage) { statsNoDataMessage.style.display = 'block'; statsNoDataMessage.innerHTML = `<h3>No Stats Available</h3><p>Please log in.</p>`; }
        return;
    }

    const loginDataStr = localStorage.getItem('login_data');
    if (!loginDataStr) {
         console.log('STATS_PAGE: No login_data found.');
         if (statsLoadingIndicator) statsLoadingIndicator.style.display = 'none'; // Hide loader
         if (statsNoDataMessage) { statsNoDataMessage.style.display = 'block'; statsNoDataMessage.innerHTML = `<h3>No Stats Available</h3><p>Login data missing.</p>`; }
         return;
     }

    try {
        console.log('STATS_PAGE: Parsing login_data...');
        const loginData = JSON.parse(loginDataStr);
        console.log('STATS_PAGE: Parsed login_data successfully.');

        // --- Process loginData for non-financial stats ---
        // ... (Keep all the processing logic for membership, rounds, punches) ...
        const userData = { name: `${loginData.first_name || ''} ${loginData.last_name || ''}`.trim() };
        let membershipData = { name: 'No Membership Found', expires: 'N/A', purchased: 'N/A' };
        let hasPunchPass = false; let punchData = null; let allRounds = [];
        let roundCounts = { total: 0, punch: 0, loyalty: 0, promo: 0, standard: 0 };
        const courses = getSanAntonioCourses(); // Use shared function

        if (loginData.passes && typeof loginData.passes === 'object') {
            // ... process passes, uses, rules ...
            // ... calculate punchData, roundCounts, allRounds ...
        }
        console.log('STATS_PAGE: Basic stats processing complete.');

        // --- Populate Basic Stats HTML ---
        if (statsMembershipInfo) { /* ... populate membershipInfo ... */ }
        const displayPunchCard = hasPunchPass && punchData && statsPunchCard && statsPunchInfo;
        if (displayPunchCard) { /* ... populate punchInfo ... */ statsPunchCard.style.display = 'block'; }
        else if (statsPunchCard) { statsPunchCard.style.display = 'none'; }
        if (statsRecentActivity) { /* ... populate recentActivity ... */ }

        // **** HIDE LOADER & SHOW CONTAINER ****
        // Now that basic stats are ready, update the main UI
        console.log("STATS_PAGE: Hiding main loader and showing stats container.");
        if (statsLoadingIndicator) statsLoadingIndicator.style.display = 'none';
        if (statsContainer) statsContainer.style.display = 'grid'; // Or 'block'
        // **** END HIDE/SHOW ****

        // --- Trigger Financials Loading (but don't wait for it) ---
        // Check if the financial init function exists (loaded from financials.js)
        if (typeof initializeFinancialsSection === 'function') {
             console.log("STATS_PAGE: Triggering asynchronous financial section initialization.");
             initializeFinancialsSection(); // Call it - it will run in the background
        } else {
             console.error('STATS_PAGE: initializeFinancialsSection function missing! Financials will not load.');
             const fsDiv = document.getElementById('financialSummary'); // Try to get element directly
             if(fsDiv) fsDiv.innerHTML = '<p style="color:red;">Error: Financials script missing.</p>';
        }


    } catch (error) {
        console.error('STATS_PAGE: Error processing login data:', error);
        if (statsLoadingIndicator) statsLoadingIndicator.style.display = 'none'; // Hide loader on error
        if (statsNoDataMessage) { /* ... show error message ... */ }
        if (statsContainer) statsContainer.style.display = 'none'; // Keep container hidden on error
    }
} // End initializeStatsPage


// --- Initialization and Event Listeners ---
document.addEventListener('DOMContentLoaded', function() {
    console.log('STATS_PAGE: DOM content loaded...');

    // Check initial login state for header (using shared function from utils.js)
    if (typeof checkLogin === 'function') {
        checkLogin();
    } else {
        console.error("STATS_PAGE: checkLogin function not found from utils.js!");
    }

    // Attach logout listener
    const logoutBtn = document.getElementById('logoutBtn'); // Get element directly
    if (logoutBtn) {
         logoutBtn.addEventListener('click', function() {
            console.log('STATS_PAGE: Logout clicked');
            localStorage.removeItem('jwt_token'); localStorage.removeItem('user_name');
            localStorage.removeItem('foreup_cookies'); localStorage.removeItem('login_data');
            localStorage.removeItem('user_bookings');
            // Call shared cache clear from financials.js if it exists
            if(typeof clearFinancialCache === 'function') {
                 clearFinancialCache();
            } else { localStorage.removeItem('user_financial_details_cache'); } // Fallback
            // Update header state using shared function
            if(typeof checkLogin === 'function') checkLogin();
            window.location.href = 'index.html'; // Redirect
        });
    } else { console.warn("STATS_PAGE: Logout button not found."); }

    // Initialize the basic stats part
    if (typeof initializeStatsPage === 'function') {
        initializeStatsPage();
    } else { console.error('STATS_PAGE: initializeStatsPage function is missing!'); }

    // Initialize the financials part (defined in financials.js)
    if (typeof initializeFinancialsSection === 'function') {
        console.log("STATS_PAGE: Calling initializeFinancialsSection...");
        initializeFinancialsSection(); // This should handle final loader/container state
    } else {
         console.error('STATS_PAGE: initializeFinancialsSection function missing! Financials will not load.');
         // If financials is missing, manually hide loader and show container
         const loadingIndicator = document.getElementById('loadingIndicator');
         const container = document.getElementById('statsContainer');
         if (loadingIndicator) loadingIndicator.style.display = 'none';
         if (container) container.style.display = 'grid'; // Or block
         const fsDiv = document.getElementById('financialSummary');
         if(fsDiv) fsDiv.innerHTML = '<p style="color:red;">Error: Financials script missing.</p>';
    }

    console.log('STATS_PAGE: Initialization sequence complete.');
});

// --- END OF FILE mystats.js ---
