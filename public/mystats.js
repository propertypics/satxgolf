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
    const statsLoadingIndicator = getElement('loadingIndicator', 'Stats loading indicator not found', false);

    // Early exit if critical elements missing
    if (!statsContainer || !statsNoDataMessage || !statsMembershipInfo || !statsRecentActivity) {
        console.error('STATS_PAGE: Critical elements missing for basic stats.');
        if (statsLoadingIndicator) statsLoadingIndicator.style.display = 'none';
        return;
    }

    statsNoDataMessage.style.display = 'none'; // Hide initially

    // Use shared checkLogin from utils.js
    if (!checkLogin()) {
        console.log('STATS_PAGE: User not logged in.');
        if (statsLoadingIndicator) statsLoadingIndicator.style.display = 'none';
        if (statsNoDataMessage) {
             statsNoDataMessage.style.display = 'block';
             statsNoDataMessage.innerHTML = `<h3>No Stats Available</h3><p>Please log in.</p>`;
        }
        return;
    }

    const loginDataStr = localStorage.getItem('login_data');
    if (!loginDataStr) {
         console.log('STATS_PAGE: No login_data found.');
         if (statsLoadingIndicator) statsLoadingIndicator.style.display = 'none';
          if (statsNoDataMessage) {
              statsNoDataMessage.style.display = 'block';
              statsNoDataMessage.innerHTML = `<h3>No Stats Available</h3><p>Login data missing.</p>`;
          }
         return;
     }

    try {
        console.log('STATS_PAGE: Parsing login_data...');
        const loginData = JSON.parse(loginDataStr);
        console.log('STATS_PAGE: Parsed login_data successfully.');

        // --- Process loginData ---
        const userData = { name: `${loginData.first_name || ''} ${loginData.last_name || ''}`.trim() };
        let membershipData = { name: 'No Membership Found', expires: 'N/A', purchased: 'N/A' };
        let hasPunchPass = false; let punchData = null; let allRounds = [];
        let roundCounts = { total: 0, punch: 0, loyalty: 0, promo: 0, standard: 0 };
        const courses = getSanAntonioCourses(); // Use shared function

        if (loginData.passes && typeof loginData.passes === 'object') {
            const passIds = Object.keys(loginData.passes);
            if (passIds.length > 0) {
                const pass = loginData.passes[passIds[0]];
                if(pass) {
                    membershipData = { name: pass.name || 'Unknown', expires: formatDate(pass.end_date), purchased: formatDate(pass.date_purchased) }; // Use shared formatDate
                    const ruleMapping = {};
                    if (pass.rules && Array.isArray(pass.rules)) { pass.rules.forEach(rule => { ruleMapping[rule.rule_number] = { name: rule.name, type: statsGetRuleType(rule.name) }; }); }
                    const isTrailPassPlus = membershipData.name.includes("Trail Pass Plus");

                    if (pass.uses && Array.isArray(pass.uses)) {
                        roundCounts.total = pass.uses.length;
                        if (isTrailPassPlus) {
                             const freeRoundRule = pass.rules?.find(rule => rule.name?.toLowerCase().includes("free") || rule.rule_number === 2); // Safer access
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
                            return { date: formatDate(use.date), rawDate: new Date(use.date), course: courseName, type: roundType, badgeText: badgeText };
                        }).sort((a, b) => b.rawDate - a.rawDate);
                    }
                }
            }
        }
        console.log('STATS_PAGE: Basic stats processing complete.');

        // --- Populate Basic Stats HTML ---
        if (statsMembershipInfo) statsMembershipInfo.innerHTML = `<div class="stat-item"><span class="stat-label">Name:</span><span>${userData.name}</span></div><div class="stat-item"><span class="stat-label">Membership:</span><span>${membershipData.name}</span></div><div class="stat-item"><span class="stat-label">Expires:</span><span>${membershipData.expires}</span></div><div class="stat-item"><span class="stat-label">Purchased:</span><span>${membershipData.purchased}</span></div>`;
        const displayPunchCard = hasPunchPass && punchData && statsPunchCard && statsPunchInfo;
        if (displayPunchCard) { statsPunchInfo.innerHTML = `<div class="punch-container"><span>${punchData.used}</span><div class="punch-bar"><div class="punch-progress" style="width: ${punchData.percent}%"></div><div class="punch-text">${punchData.used} of ${punchData.total} Used</div></div><span>${punchData.total}</span></div>`; statsPunchCard.style.display = 'block'; }
        else if (statsPunchCard) { statsPunchCard.style.display = 'none'; }

        if (statsRecentActivity) {
             const activityHeader = statsRecentActivity.closest('.stats-card')?.querySelector('h3');
             if (activityHeader) activityHeader.textContent = 'All Activity';
            if (allRounds.length > 0) {
                 let calculatedTotal = roundCounts.punch + roundCounts.loyalty + roundCounts.promo + roundCounts.standard;
                 if (roundCounts.total !== calculatedTotal) { console.warn("STATS_PAGE: Discrepancy between total rounds reported and calculated sum."); }
                 statsRecentActivity.innerHTML = `<div class="round-stats"><div class="stat-item"><span class="stat-label">Total Rounds:</span><span>${roundCounts.total}</span></div>${displayPunchCard ? `<div class="stat-item"><span class="stat-label">Punch Rounds:</span><span>${roundCounts.punch}</span></div>` : ''}<div class="stat-item"><span class="stat-label">Loyalty Rounds:</span><span>${roundCounts.loyalty}</span></div><div class="stat-item"><span class="stat-label">Promo Rounds:</span><span>${roundCounts.promo}</span></div><div class="stat-item"><span class="stat-label">Standard Paid:</span><span>${roundCounts.standard}</span></div></div><ul class="all-rounds-list">${allRounds.map(round => `<li class="round-item ${round.type}"><div><div class="course-name">${round.course}</div><div class="date">${round.date}</div></div><span class="badge badge-${round.type}">${round.badgeText}</span></li>`).join('')}</ul>`;
             } else { statsRecentActivity.innerHTML = '<p>No activity found.</p>'; }
        }
        // Do not hide loader or show container here

    } catch (error) {
        console.error('STATS_PAGE: Error processing login data:', error);
        if (statsLoadingIndicator) statsLoadingIndicator.style.display = 'none';
        if (statsNoDataMessage) { statsNoDataMessage.style.display = 'block'; statsNoDataMessage.innerHTML = `<h3>Error Loading Stats</h3><p>Problem processing data. (${error.message})</p>`; }
        if (statsContainer) statsContainer.style.display = 'none';
    }
}


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
