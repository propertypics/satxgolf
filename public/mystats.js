// --- START OF FILE mystats.js ---

// Relies on functions/constants from utils.js being loaded first

console.log("mystats.js executing");

// --- Stats Page Specific Functions ---

/**
 * Helper to categorize pass usage rules.
 * @param {string} ruleName - The name of the rule from ForeUp data.
 * @returns {string} The categorized rule type ('punch', 'loyalty', 'promo', 'standard').
 */
function statsGetRuleType(ruleName) {
    if (!ruleName) return 'standard';
    const name = ruleName.toLowerCase();
    if (name.includes('free')) return 'punch';
    if (name.includes('loyalty')) return 'loyalty';
    if (name.includes('promo') || name.includes('special')) return 'promo';
    return 'standard';
}

/**
 * Initializes the display of non-financial stats (Membership, Punch Card, Activity List).
 * Reads data from localStorage and updates the DOM.
 * Hides the main loader and shows the stats container after basic stats are rendered.
 * Triggers the asynchronous loading of financial data.
 */
function initializeStatsPage() {
    console.log('STATS_PAGE: Initializing non-financial stats...');

    // Get elements using shared helper from utils.js
    const statsContainer = getElement('statsContainer', 'Stats container not found');
    const statsNoDataMessage = getElement('noDataMessage', 'No data message element not found');
    const statsMembershipInfo = getElement('membershipInfo', 'Membership info div not found');
    const statsRecentActivity = getElement('recentActivity', 'Recent activity div not found');
    const statsPunchInfo = getElement('punchInfo', 'Punch info div not found', false);
    const statsPunchCard = getElement('punchCard', 'Punch card container not found', false);
    const statsLoadingIndicator = getElement('loadingIndicator', 'Stats loading indicator not found', false);

    // Early exit if critical elements for basic display are missing
    if (!statsContainer || !statsNoDataMessage || !statsMembershipInfo || !statsRecentActivity) {
        console.error('STATS_PAGE: Critical elements missing for basic stats display. Aborting initialization.');
        if (statsLoadingIndicator) statsLoadingIndicator.style.display = 'none'; // Hide loader if page structure is broken
        return;
    }

    statsNoDataMessage.style.display = 'none'; // Hide error message initially

    // Check login status using shared helper
    if (!checkLogin()) {
        console.log('STATS_PAGE: User not logged in. Displaying message.');
        if (statsLoadingIndicator) statsLoadingIndicator.style.display = 'none';
        if (statsNoDataMessage) {
             statsNoDataMessage.style.display = 'block';
             statsNoDataMessage.innerHTML = `<h3>No Stats Available</h3><p>Please log in to view your golf stats.</p>`;
        }
        // Ensure main container is hidden if user is logged out
        if (statsContainer) statsContainer.style.display = 'none';
        return;
    }

    // Get login data
    const loginDataStr = localStorage.getItem('login_data');
    if (!loginDataStr) {
         console.log('STATS_PAGE: No login_data found in localStorage.');
         if (statsLoadingIndicator) statsLoadingIndicator.style.display = 'none';
          if (statsNoDataMessage) {
              statsNoDataMessage.style.display = 'block';
              statsNoDataMessage.innerHTML = `<h3>No Stats Available</h3><p>Login data missing. Please log in again.</p>`;
          }
         if (statsContainer) statsContainer.style.display = 'none';
         return;
     }

    // Process the data and update the DOM
    try {
        console.log('STATS_PAGE: Parsing login_data...');
        const loginData = JSON.parse(loginDataStr);
        console.log('STATS_PAGE: Parsed login_data successfully.');

        // --- Process Data ---
        const userData = { name: `${loginData.first_name || ''} ${loginData.last_name || ''}`.trim() };
        let membershipData = { name: 'No Membership Found', expires: 'N/A', purchased: 'N/A' };
        let hasPunchPass = false; let punchData = null; let allRounds = [];
        let roundCounts = { total: 0, punch: 0, loyalty: 0, promo: 0, standard: 0 };
        const courses = getSanAntonioCourses(); // Use shared function from utils.js
        const formatDateFunc = formatDate; // Use shared function from utils.js

        if (loginData.passes && typeof loginData.passes === 'object' && Object.keys(loginData.passes).length > 0) {
            const passId = Object.keys(loginData.passes)[0];
            const pass = loginData.passes[passId];
            if(pass) {
                membershipData = { name: pass.name || 'Unknown', expires: formatDateFunc(pass.end_date), purchased: formatDateFunc(pass.date_purchased) };
                const ruleMapping = {};
                if (pass.rules && Array.isArray(pass.rules)) { pass.rules.forEach(rule => { ruleMapping[rule.rule_number] = { name: rule.name, type: statsGetRuleType(rule.name) }; }); }
                const isTrailPassPlus = membershipData.name.includes("Trail Pass Plus");

                if (pass.uses && Array.isArray(pass.uses)) {
                    roundCounts.total = pass.uses.length;
                    if (isTrailPassPlus) {
                         const freeRoundRule = pass.rules?.find(rule => rule.name?.toLowerCase().includes("free") || rule.rule_number === 2);
                         if (freeRoundRule) {
                             hasPunchPass = true;
                             const punchUses = pass.uses.filter(use => String(use.rule_number) === String(freeRoundRule.rule_number));
                             roundCounts.punch = punchUses.length;
                             punchData = { used: punchUses.length, total: 10, percent: (punchUses.length / 10) * 100 };
                         }
                    }

                    allRounds = pass.uses.map(use => {
                        const rule = ruleMapping[use.rule_number] || { name: 'Unknown', type: 'standard' };
                        let roundType = 'standard'; let badgeText = 'Paid';
                        if (isTrailPassPlus && (rule.name?.toLowerCase().includes('free') || String(use.rule_number) === "2")) { roundType = 'punch'; badgeText = 'Punch'; }
                        else if (rule.type === 'loyalty') { roundType = 'loyalty'; badgeText = 'Loyalty'; roundCounts.loyalty++; }
                        else if (rule.type === 'promo') { roundType = 'promo'; badgeText = 'Promo'; roundCounts.promo++; }
                        else { if (!isTrailPassPlus || !(rule.name?.toLowerCase().includes('free') || String(use.rule_number) === "2")) { roundCounts.standard++; } }
                        const teesheetId = String(use.teesheet_id);
                        const course = courses.find(c => String(c.facilityId) === teesheetId);
                        const courseName = course ? course.name : `Teesheet ${teesheetId}`;
                        return { date: formatDateFunc(use.date), rawDate: new Date(use.date), course: courseName, type: roundType, badgeText: badgeText };
                    }).sort((a, b) => b.rawDate - a.rawDate);
                }
            }
        }
        console.log('STATS_PAGE: Basic stats processing complete.');
        console.log('STATS_PAGE: Membership Data:', membershipData);
        console.log('STATS_PAGE: Punch Card Data:', punchData);
        console.log('STATS_PAGE: Round Counts:', roundCounts);

        // --- Populate Basic Stats HTML ---
        if (statsMembershipInfo) {
            const membershipHtml = `<div class="stat-item"><span class="stat-label">Name:</span><span>${userData.name}</span></div><div class="stat-item"><span class="stat-label">Membership:</span><span>${membershipData.name}</span></div><div class="stat-item"><span class="stat-label">Expires:</span><span>${membershipData.expires}</span></div><div class="stat-item"><span class="stat-label">Purchased:</span><span>${membershipData.purchased}</span></div>`;
            console.log("STATS_PAGE: Populating Membership Info.");
            statsMembershipInfo.innerHTML = membershipHtml;
        } else { console.warn("STATS_PAGE: statsMembershipInfo element not found."); }

        const displayPunchCard = hasPunchPass && punchData && statsPunchCard && statsPunchInfo;
        console.log("STATS_PAGE: Should display punch card?", displayPunchCard);
        if (displayPunchCard) {
            const punchHtml = `<div class="punch-container"><span>${punchData.used}</span><div class="punch-bar"><div class="punch-progress" style="width: ${punchData.percent}%"></div><div class="punch-text">${punchData.used} of ${punchData.total} Used</div></div><span>${punchData.total}</span></div>`;
             console.log("STATS_PAGE: Populating Punch Card Info.");
            statsPunchInfo.innerHTML = punchHtml;
            statsPunchCard.style.display = 'block';
        } else if (statsPunchCard) {
            statsPunchCard.style.display = 'none';
        }

        if (statsRecentActivity) {
             const activityHeader = statsRecentActivity.closest('.stats-card')?.querySelector('h3');
             if (activityHeader) activityHeader.textContent = 'All Activity';
             console.log("STATS_PAGE: Populating Recent Activity. Round count:", allRounds.length);
            if (allRounds.length > 0) {
                 let calculatedTotal = roundCounts.punch + roundCounts.loyalty + roundCounts.promo + roundCounts.standard;
                 if (roundCounts.total !== calculatedTotal && roundCounts.total > 0) { // Avoid warning if total is 0
                      console.warn(`STATS_PAGE: Discrepancy between total rounds reported (${roundCounts.total}) and calculated sum (${calculatedTotal}).`);
                      // Adjust standard count as fallback if total seems reliable
                      // roundCounts.standard = Math.max(0, roundCounts.total - (roundCounts.punch + roundCounts.loyalty + roundCounts.promo));
                 }
                 const activityHtml = `<div class="round-stats"><div class="stat-item"><span class="stat-label">Total Rounds:</span><span>${roundCounts.total}</span></div>${displayPunchCard ? `<div class="stat-item"><span class="stat-label">Punch Rounds:</span><span>${roundCounts.punch}</span></div>` : ''}<div class="stat-item"><span class="stat-label">Loyalty Rounds:</span><span>${roundCounts.loyalty}</span></div><div class="stat-item"><span class="stat-label">Promo Rounds:</span><span>${roundCounts.promo}</span></div><div class="stat-item"><span class="stat-label">Standard Paid:</span><span>${roundCounts.standard}</span></div></div><ul class="all-rounds-list">${allRounds.map(round => `<li class="round-item ${round.type}"><div><div class="course-name">${round.course}</div><div class="date">${round.date}</div></div><span class="badge badge-${round.type}">${round.badgeText}</span></li>`).join('')}</ul>`;
                  statsRecentActivity.innerHTML = activityHtml;
             } else { statsRecentActivity.innerHTML = '<p>No activity found.</p>'; }
        } else { console.warn("STATS_PAGE: statsRecentActivity element not found."); }


        // **** HIDE LOADER & SHOW CONTAINER ****
        console.log("STATS_PAGE: Hiding main loader and showing stats container.");
        if (statsLoadingIndicator) statsLoadingIndicator.style.display = 'none';
        if (statsContainer) statsContainer.style.display = 'grid'; // Ensure container is shown
        // **** END HIDE/SHOW ****


        // --- Trigger Financials Loading (Defined in financials.js) ---
        if (typeof initializeFinancialsSection === 'function') {
             console.log("STATS_PAGE: Triggering asynchronous financial section initialization.");
             initializeFinancialsSection(); // Call async function - runs in background
        } else {
             console.error('STATS_PAGE: initializeFinancialsSection function not found! Financials will not load.');
             const fsDiv = getElement('financialSummary', '', false); // Use shared getElement
             if(fsDiv) fsDiv.innerHTML = '<p style="color:red;">Error: Financials script missing.</p>';
        }


    } catch (error) {
        console.error('STATS_PAGE: Error processing login data:', error);
        if (statsLoadingIndicator) statsLoadingIndicator.style.display = 'none';
        if (statsNoDataMessage) { statsNoDataMessage.style.display = 'block'; statsNoDataMessage.innerHTML = `<h3>Error Loading Stats</h3><p>Problem processing data. (${error.message})</p>`; }
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
    // Use shared getElement from utils.js
    const logoutBtn = getElement('logoutBtn', 'Logout button not found', false);
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

    // Initialize the basic stats part, which will then trigger financials
    if (typeof initializeStatsPage === 'function') {
        initializeStatsPage();
    } else {
        console.error('STATS_PAGE: initializeStatsPage function is missing!');
        // If basic init fails, hide loader and show error
        const loadingIndicator = getElement('loadingIndicator','',false);
        const noDataMessage = getElement('noDataMessage','',false);
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        if (noDataMessage) { noDataMessage.style.display='block'; noDataMessage.innerHTML = 'Error loading page.'; }
    }

    console.log('STATS_PAGE: Initialization sequence complete (financials loading async).');
});

// --- END OF FILE mystats.js ---
