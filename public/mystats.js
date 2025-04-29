// --- START OF FILE stats-script.js (Example Name) ---


// --- Get DOM Elements REQUIRED for stats page ---
const userInfo = getElement('userInfo', 'User info display area not found', false); // Assume in header
const userName = getElement('userName', 'User name display span not found', false); // Assume in header
const logoutBtn = getElement('logoutBtn', 'Logout button not found', false);       // Assume in header
const statsLoadingIndicator = getElement('loadingIndicator', 'Stats loading indicator not found');
const statsContainer = getElement('statsContainer', 'Stats container not found');
const noDataMessage = getElement('noDataMessage', 'No data message element not found');
const membershipInfo = getElement('membershipInfo', 'Membership info div not found');
const punchInfo = getElement('punchInfo', 'Punch info div not found', false);       // Optional element
const punchCard = getElement('punchCard', 'Punch card container not found', false); // Optional element
const recentActivity = getElement('recentActivity', 'Recent activity div not found');


// --- Stats Page Specific Functions ---


function getRuleType(ruleName) {
    if (!ruleName) return 'standard';
    const name = ruleName.toLowerCase();
    if (name.includes('free')) return 'punch';
    if (name.includes('loyalty')) return 'loyalty';
    if (name.includes('promo') || name.includes('special')) return 'promo';
    return 'standard';
}

function initializeStatsPage() {
    console.log('Initializing stats page...');

    // Elements are already retrieved globally for this script

    // Check if essential elements exist (redundant check, but safe)
    if (!statsContainer || !noDataMessage || !membershipInfo || !recentActivity) {
        console.error('CRITICAL: Missing essential stats page elements. Cannot initialize.');
        if (statsLoadingIndicator) statsLoadingIndicator.style.display = 'none';
        const mainElement = document.querySelector('main.container');
        if(mainElement) mainElement.innerHTML = '<p style="color: red; text-align: center;">Error: Page elements missing. Cannot load stats.</p>';
        return;
    }

    if (statsLoadingIndicator) statsLoadingIndicator.style.display = 'block';
    statsContainer.style.display = 'none';
    noDataMessage.style.display = 'none';

    if (!checkLogin()) {
        console.log('User not logged in, showing no data message.');
        if (statsLoadingIndicator) statsLoadingIndicator.style.display = 'none';
        noDataMessage.style.display = 'block';
        noDataMessage.innerHTML = `<h3>No Stats Available</h3><p>Please log in to view your golf stats.</p>`;
        return;
    }

    const loginDataStr = localStorage.getItem('login_data');
    if (!loginDataStr) {
        console.log('No login_data found in localStorage.');
        if (statsLoadingIndicator) statsLoadingIndicator.style.display = 'none';
        noDataMessage.style.display = 'block';
        noDataMessage.innerHTML = `<h3>No Stats Available</h3><p>No golf data found. Try logging in again.</p>`;
        return;
    }

    try {
        console.log('Attempting to parse login_data from localStorage...');
        const loginData = JSON.parse(loginDataStr);
        console.log('Successfully parsed login_data:', loginData);

        // --- Start processing loginData ---
        const userData = {
            name: `${loginData.first_name || ''} ${loginData.last_name || ''}`.trim(),
            email: loginData.email || 'N/A',
            phone: loginData.phone_number || loginData.cell_phone_number || 'N/A'
        };

        let membershipData = { name: 'No Membership Found', expires: 'N/A', purchased: 'N/A' };
        let hasPunchPass = false;
        let punchData = null;
        let allRounds = [];
        let roundCounts = { total: 0, punch: 0, loyalty: 0, promo: 0, standard: 0 };

        if (loginData.passes && typeof loginData.passes === 'object') {
            const passIds = Object.keys(loginData.passes);
            console.log(`Found ${passIds.length} pass(es). Processing first one.`);
            if (passIds.length > 0) {
                const passId = passIds[0];
                const pass = loginData.passes[passId];
                if(pass) {
                    membershipData = { name: pass.name || 'Unknown Membership', expires: formatDate(pass.end_date) || 'N/A', purchased: formatDate(pass.date_purchased) || 'N/A' };
                    console.log('Membership data:', membershipData);
                    const ruleMapping = {};
                    if (pass.rules && Array.isArray(pass.rules)) {
                        pass.rules.forEach(rule => { ruleMapping[rule.rule_number] = { name: rule.name, priceClassId: rule.price_class_id, type: getRuleType(rule.name) }; });
                    }
                    console.log('Rule mapping:', ruleMapping);
                    const isTrailPassPlus = membershipData.name.includes("Trail Pass Plus");

                    if (pass.uses && Array.isArray(pass.uses)) {
                        roundCounts.total = pass.uses.length;
                        console.log(`Total uses/rounds found: ${roundCounts.total}`);
                        if (isTrailPassPlus) {
                             const freeRoundRule = pass.rules.find(rule => rule.name?.toLowerCase().includes("free") || rule.rule_number === 2);
                             if (freeRoundRule) {
                                 hasPunchPass = true;
                                 const punchUses = pass.uses.filter(use => String(use.rule_number) === String(freeRoundRule.rule_number));
                                 roundCounts.punch = punchUses.length;
                                 punchData = { used: punchUses.length, total: 10, percent: (punchUses.length / 10) * 100 };
                                 console.log('Punch data calculated:', punchData);
                             } else { console.log('TrailPass Plus detected, but no "free round" rule found.'); }
                        }

                        allRounds = pass.uses.map(use => {
                            const rule = ruleMapping[use.rule_number] || { name: 'Unknown Rule', type: 'standard' };
                            let roundType = 'standard'; let badgeText = 'Paid';
                            if (isTrailPassPlus && (rule.name?.toLowerCase().includes('free') || String(use.rule_number) === "2")) {
                                roundType = 'punch'; badgeText = 'Punch'; // Counted above
                            } else if (rule.type === 'loyalty') {
                                roundType = 'loyalty'; badgeText = 'Loyalty'; roundCounts.loyalty++;
                            } else if (rule.type === 'promo') {
                                roundType = 'promo'; badgeText = 'Promo'; roundCounts.promo++;
                            } else {
                                // Only count as standard if not already counted as punch
                                if (!isTrailPassPlus || !(rule.name?.toLowerCase().includes('free') || String(use.rule_number) === "2")) {
                                     roundCounts.standard++;
                                }
                            }

                            let courseName = "Unknown Course"; const teesheetId = String(use.teesheet_id);
                            switch(teesheetId) {
                                case "3564": courseName = "Brackenridge Park"; break; case "3565": courseName = "Cedar Creek"; break;
                                case "3566": courseName = "Mission del Lago"; break; case "3567": courseName = "Northern Hills"; break;
                                case "3568": courseName = "Olmos Basin"; break; case "3569": courseName = "Riverside 18"; break;
                                case "3570": courseName = "The Teddy Bear Par 3"; break; case "3572": courseName = "San Pedro Par 3"; break;
                                default: console.warn(`Unknown teesheet_id: ${teesheetId}`);
                            }
                            return { date: formatDate(use.date), rawDate: new Date(use.date), course: courseName, type: roundType, ruleName: rule.name, badgeText: badgeText };
                        }).sort((a, b) => b.rawDate - a.rawDate);
                        console.log(`Processed ${allRounds.length} rounds.`);

                    } else { console.log('No round uses found for this pass.'); }
                } else { console.log('Pass data for the first pass ID is missing or invalid.'); }
            } else { console.log('No passes found in login_data.'); }
        } else { console.log('No "passes" object found in login_data.'); }

        // --- Populate HTML ---
        membershipInfo.innerHTML = `
            <div class="stat-item"><span class="stat-label">Name:</span><span>${userData.name}</span></div>
            <div class="stat-item"><span class="stat-label">Membership:</span><span>${membershipData.name}</span></div>
            <div class="stat-item"><span class="stat-label">Expires:</span><span>${membershipData.expires}</span></div>
            <div class="stat-item"><span class="stat-label">Purchased:</span><span>${membershipData.purchased}</span></div>`;

        const displayPunchCard = hasPunchPass && punchData && punchCard && punchInfo;
        if (displayPunchCard) {
            punchInfo.innerHTML = `<div class="punch-container"><span>${punchData.used}</span><div class="punch-bar"><div class="punch-progress" style="width: ${punchData.percent}%"></div><div class="punch-text">${punchData.used} of ${punchData.total} Used</div></div><span>${punchData.total}</span></div>`;
            punchCard.style.display = 'block';
        } else if (punchCard) { punchCard.style.display = 'none'; }

        const activityHeader = recentActivity.closest('.stats-card')?.querySelector('h3');
        if (activityHeader) activityHeader.textContent = 'All Activity';

        if (allRounds.length > 0) {
            let calculatedTotal = roundCounts.punch + roundCounts.loyalty + roundCounts.promo + roundCounts.standard;
            console.log(`Round Counts: Total=${roundCounts.total}, Calculated=${calculatedTotal}, Punch=${roundCounts.punch}, Loyalty=${roundCounts.loyalty}, Promo=${roundCounts.promo}, Standard=${roundCounts.standard}`);
            if (roundCounts.total !== calculatedTotal) { console.warn("Discrepancy between total rounds reported and calculated sum of types."); }
            recentActivity.innerHTML = `
                <div class="round-stats">
                    <div class="stat-item"><span class="stat-label">Total Rounds:</span><span>${roundCounts.total}</span></div>
                    ${displayPunchCard ? `<div class="stat-item"><span class="stat-label">Punch Rounds:</span><span>${roundCounts.punch}</span></div>` : ''}
                    <div class="stat-item"><span class="stat-label">Loyalty Rounds:</span><span>${roundCounts.loyalty}</span></div>
                    <div class="stat-item"><span class="stat-label">Promo Rounds:</span><span>${roundCounts.promo}</span></div>
                    <div class="stat-item"><span class="stat-label">Standard Paid:</span><span>${roundCounts.standard}</span></div>
                </div>
                <ul class="all-rounds-list">
                    ${allRounds.map(round => `<li class="round-item ${round.type}"><div><div class="course-name">${round.course}</div><div class="date">${round.date}</div></div><span class="badge badge-${round.type}">${round.badgeText}</span></li>`).join('')}
                </ul>`;
        } else { recentActivity.innerHTML = '<p>No activity found.</p>'; }

        if (statsLoadingIndicator) statsLoadingIndicator.style.display = 'none';
        statsContainer.style.display = 'grid';

    } catch (error) {
        console.error('Error processing login data for stats page:', error);
        if (statsLoadingIndicator) statsLoadingIndicator.style.display = 'none';
        noDataMessage.style.display = 'block';
        noDataMessage.innerHTML = `<h3>Error Loading Stats</h3><p>There was a problem parsing your golf data. (${error.message})</p>`;
    }
}


// --- Initialization and Event Listeners ---
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM content loaded, initializing STATS page...');
    checkLogin(); // Initial login check for header display

    // Attach listener SPECIFICALLY for the logout button (common element)
    if (logoutBtn) {
         logoutBtn.addEventListener('click', function() {
            console.log('Logout clicked on stats page');
            localStorage.removeItem('jwt_token');
            localStorage.removeItem('user_name');
            localStorage.removeItem('foreup_cookies');
            localStorage.removeItem('login_data');
            localStorage.removeItem('user_bookings');
            checkLogin(); // Update UI immediately
            window.location.href = 'index.html'; // Redirect to courses page after logout
        });
    } else {
        console.warn("Logout button not found on stats page.");
    }

    // Directly initialize the stats page functionality
    if (typeof initializeStatsPage === 'function') {
        initializeStatsPage();
    } else {
        console.error('initializeStatsPage function is missing!');
        // Display error if function is missing
        if (statsLoadingIndicator) statsLoadingIndicator.style.display = 'none';
        if (noDataMessage) {
             noDataMessage.style.display = 'block';
             noDataMessage.innerHTML = `<h3>Error Loading Page</h3><p>A required script function is missing.</p>`;
        }
    }

    // Optional: API Health Check (can run here too)
    console.log('Performing API health check (from stats page)...');
    fetch(`${API_BASE_URL}/health`)
        .then(response => response.ok ? response.json() : { status: 'error', message: `Health check failed with status ${response.status}` })
        .then(data => console.log('API health check result:', data))
        .catch(error => console.error('API health check failed:', error));

    console.log('Stats page initialization complete.');
});

// --- END OF FILE stats-script.js (Example Name) ---
