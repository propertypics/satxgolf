// --- START OF FILE financials.js ---

// Relies on functions/constants from utils.js being loaded first

console.log("financials.js loaded");

// --- Constants ---
const FINANCIAL_CACHE_KEY = 'user_financial_details_cache';

// --- Financial Data Fetching & Caching ---

/**
 * Fetches (or retrieves from cache) detailed financial transaction data.
 * Uses login_data identifier for cache validation.
 * @param {boolean} [forceRefresh=false] - If true, bypasses cache check.
 * @returns {Promise<Array>} A promise resolving with the array of detailed transaction objects.
 */
async function getFinancialDetails(forceRefresh = false) {
    console.log(`FINANCIALS: Getting financial details... Force refresh: ${forceRefresh}`);
    // Use shared getElement from utils.js
    const getElementFunc = typeof getElement === 'function' ? getElement : (id) => document.getElementById(id);

    const cachedDataString = localStorage.getItem(FINANCIAL_CACHE_KEY);
    const loginDataStr = localStorage.getItem('login_data');
    let cachedData = null;

    if (!loginDataStr) { console.error("FINANCIALS: Login data not found."); throw new Error("Login data not found."); }

    let currentLoginDataIdentifier = '';
    let salesToFetch = [];

    // Prepare sales list and identifier from login_data
    try {
        const loginData = JSON.parse(loginDataStr);
        let salesListString = '';
        const uniqueSales = new Map();
        // Use shared getSanAntonioCourses from utils.js
        const courses = typeof getSanAntonioCourses === 'function' ? getSanAntonioCourses() : [];
        if (courses.length === 0) console.warn("FINANCIALS: Course list is empty in getFinancialDetails.");

        if (loginData.passes && typeof loginData.passes === 'object') {
            const passIds = Object.keys(loginData.passes);
            if (passIds.length > 0) {
                const pass = loginData.passes[passIds[0]];
                if (pass && pass.uses && Array.isArray(pass.uses)) {
                    pass.uses.forEach(use => {
                        const saleId = use.sale_id;
                        const teesheetId = use.teesheet_id;
                        if (saleId && teesheetId) {
                            const matchingCourse = courses.find(course => String(course.facilityId) === String(teesheetId));
                            const courseId = matchingCourse ? String(matchingCourse.courseId) : null;
                            if (courseId) {
                                const key = `${saleId}-${courseId}`;
                                if (!uniqueSales.has(key)) {
                                    uniqueSales.set(key, { saleId: String(saleId), courseId: courseId });
                                    salesListString += `${key};`;
                                }
                            } else { /* console.warn(`FINANCIALS: Could not map teesheet_id: ${teesheetId}`); */ }
                        }
                    });
                }
            }
        }
        salesToFetch = Array.from(uniqueSales.values());
        // Use shared simpleHash from utils.js
        currentLoginDataIdentifier = typeof simpleHash === 'function' ? simpleHash(salesListString.split(';').sort().join(';')) : Date.now().toString(); // Fallback identifier
        console.log(`FINANCIALS: Current login_data identifier: ${currentLoginDataIdentifier}`);
        console.log(`FINANCIALS: Unique Sales to fetch details for: ${salesToFetch.length}`);
    } catch (e) {
        console.error("FINANCIALS: Error processing login_data:", e);
        throw new Error("Could not process login data.");
    }

    // Check Cache
    if (cachedDataString && !forceRefresh) {
        try {
            cachedData = JSON.parse(cachedDataString);
            if (cachedData?.loginDataIdentifier === currentLoginDataIdentifier) {
                console.log("FINANCIALS: Using cached data.");
                return cachedData.transactions;
            } else { console.log(`FINANCIALS: Cache invalid.`); localStorage.removeItem(FINANCIAL_CACHE_KEY); }
        } catch (e) { console.error("FINANCIALS: Error parsing cache:", e); localStorage.removeItem(FINANCIAL_CACHE_KEY); }
    }

    // Fetch Fresh Data
    if (salesToFetch.length === 0) {
         console.log("FINANCIALS: No sales found to fetch details for.");
         const emptyCache = { loginDataIdentifier: currentLoginDataIdentifier, transactions: [] };
         localStorage.setItem(FINANCIAL_CACHE_KEY, JSON.stringify(emptyCache));
         return [];
    }
    console.log(`FINANCIALS: Fetching fresh details...`);
    const token = localStorage.getItem('jwt_token'); const cookies = localStorage.getItem('foreup_cookies');
    if (!token) throw new Error("Authentication required.");

    // Use shared API_BASE_URL from utils.js
    const workerApiUrl = (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'https://missing-api-base-url.com') + '/api/sale-details'; // Add fallback

    try {
        console.log(`FINANCIALS: Calling worker endpoint: ${workerApiUrl}`);
        const response = await fetch(workerApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'X-ForeUp-Cookies': cookies || '' },
            body: JSON.stringify({ sales: salesToFetch })
        });
        if (!response.ok) { const errorText = await response.text(); throw new Error(`Failed to fetch sale details: ${response.status} - ${errorText}`); }
        const freshTransactions = await response.json();
        console.log(`FINANCIALS: Successfully fetched details for ${freshTransactions.length} sales.`);

        const dataToCache = { loginDataIdentifier: currentLoginDataIdentifier, transactions: freshTransactions };
        try { localStorage.setItem(FINANCIAL_CACHE_KEY, JSON.stringify(dataToCache)); console.log("FINANCIALS: Data cached."); }
        catch (e) { console.error("FINANCIALS: Error caching data:", e); }
        return freshTransactions;
    } catch (error) { console.error("FINANCIALS: Error fetching sale details:", error); throw error; }
}

// --- CSV Generation and Download ---
function generateAndDownloadCsv(transactions) {
    if (!transactions || transactions.length === 0) { alert("No financial data available to export."); return; }
    console.log("FINANCIALS: Generating CSV...");
    const csvData = [];
    csvData.push([ "Sale ID", "Date", "Time", "Course Name", "Item Name", "Item Type", "Quantity", "Unit Price", "Item Subtotal", "Item Tax", "Item Total", "Sale Subtotal", "Sale Tax", "Sale Total" ]);
    // Use shared getSanAntonioCourses from utils.js
    const courses = typeof getSanAntonioCourses === 'function' ? getSanAntonioCourses() : [];

    transactions.forEach(saleDetail => {
        const saleAttributes = saleDetail?.data?.attributes; const saleId = saleDetail?.data?.id;
        const saleTimeISO = saleAttributes?.saleTime; const saleTotal = saleAttributes?.total ?? '';
        const saleSubtotal = saleAttributes?.subtotal ?? ''; const saleTax = saleAttributes?.tax ?? '';
        const saleCourseId = saleDetail?.data?.relationships?.course?.data?.id || saleAttributes?.course_id || saleAttributes?.courseId;
        const course = courses.find(c => String(c.courseId) === String(saleCourseId));
        const courseName = course ? course.name.replace(/"/g, '""') : `Course ID ${saleCourseId}`;
        let saleDate = 'N/A'; let saleTime = 'N/A';
        if (saleTimeISO) { try { const d = new Date(saleTimeISO); saleDate = d.toLocaleDateString('en-CA'); saleTime = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }); } catch (e) { } }

        if (saleDetail.included && Array.isArray(saleDetail.included)) {
            saleDetail.included.forEach(item => {
                if (item.type === 'sales_items') {
                    const itemAttr = item.attributes;
                    const formatCsvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
                    csvData.push([
                        formatCsvCell(saleId), formatCsvCell(saleDate), formatCsvCell(saleTime), formatCsvCell(courseName),
                        formatCsvCell(itemAttr?.name), formatCsvCell(itemAttr?.type), formatCsvCell(itemAttr?.quantity),
                        formatCsvCell(itemAttr?.unitPrice), formatCsvCell(itemAttr?.subTotal), formatCsvCell(itemAttr?.tax),
                        formatCsvCell(itemAttr?.total), formatCsvCell(saleSubtotal), formatCsvCell(saleTax), formatCsvCell(saleTotal)
                    ]);
                }
            });
        }
    });
    const csvString = csvData.map(row => row.join(",")).join("\n");
    downloadCSV(csvString);
}

function downloadCSV(csvString, filename = 'satxgolf_financials.csv') {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url); link.setAttribute("download", filename);
        link.style.visibility = 'hidden'; document.body.appendChild(link);
        link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
    } else { window.open('data:text/csv;charset=utf-8,' + encodeURIComponent(csvString)); }
}

// --- Main Function to Initialize Financials UI ---
async function initializeFinancialsSection() {
    console.log("FINANCIALS: Initializing section...");
    // Use shared getElement from utils.js
    const financialSummaryDiv = getElement('financialSummary', 'Financial summary div not found', false);
    const exportCsvBtn = getElement('exportCsvBtn', 'Export CSV button not found', false);
    const refreshFinancialsBtn = getElement('refreshFinancialsBtn', 'Refresh Financials button not found', false);
    const loadingIndicator = getElement('loadingIndicator', 'Main loading indicator not found in financials', false);
    const statsContainer = getElement('statsContainer', 'Main stats container not found in financials', false);

    // Helper function to finalize UI state (hide loader, show container)
    const finalizeUI = () => {
        console.log("FINANCIALS: Finalizing UI state...");
        if (loadingIndicator) { loadingIndicator.style.display = 'none'; }
        else { console.warn("FINANCIALS: Main loading indicator not found to hide."); }
        if (statsContainer) { statsContainer.style.display = 'grid'; } // Or 'block'
        else { console.warn("FINANCIALS: Main stats container not found to show."); }
    };

    if (!financialSummaryDiv) {
        console.error("FINANCIALS: financialSummary div not found. Cannot initialize.");
        finalizeUI(); // Still finalize UI state even if this section fails
        return;
    }

    let fullTransactionData = [];
    financialSummaryDiv.innerHTML = '<p>Loading financial summary...</p>';
    if (exportCsvBtn) exportCsvBtn.style.display = 'none';

    try {
        fullTransactionData = await getFinancialDetails(); // Use await

        // Calculate and display summary
        displaySummary(); // Call internal helper

    } catch (error) {
        console.error("FINANCIALS: Error loading initial financial details:", error);
        if(financialSummaryDiv) financialSummaryDiv.innerHTML = `<p style="color: red;">Error loading financial summary: ${error.message}</p>`;
    } finally {
        // Ensure UI is updated regardless of success/error in fetching financials
        finalizeUI();
    }


    // Internal helper to display summary
    function displaySummary() {
        if (!financialSummaryDiv) return;
         if (!fullTransactionData || fullTransactionData.length === 0) {
             financialSummaryDiv.innerHTML = '<p>No financial data found.</p>';
             if (exportCsvBtn) exportCsvBtn.style.display = 'none';
             return;
         }
        const currentYear = new Date().getFullYear(); const spendingByCourse = {};
        // Use shared getSanAntonioCourses from utils.js
        const courses = typeof getSanAntonioCourses === 'function' ? getSanAntonioCourses() : [];
        fullTransactionData.forEach(saleDetail => {
            const saleAttributes = saleDetail?.data?.attributes;
            const saleCourseId = saleDetail?.data?.relationships?.course?.data?.id || saleAttributes?.course_id || saleAttributes?.courseId;
            const saleTime = saleAttributes?.saleTime;
            const saleTotal = parseFloat(saleAttributes?.total || 0);
            if (saleTime && saleCourseId && !isNaN(saleTotal)) {
                if (new Date(saleTime).getFullYear() === currentYear) {
                     const course = courses.find(c => String(c.courseId) === String(saleCourseId));
                     const courseName = course ? course.name : `Course ID ${saleCourseId}`;
                     spendingByCourse[courseName] = (spendingByCourse[courseName] || 0) + saleTotal;
                }
            }
        });
        financialSummaryDiv.innerHTML = `<h3>Spending This Year</h3><ul class="financial-list">${Object.entries(spendingByCourse).map(([name, total]) => `<li><span class="course-name">${name}</span><span class="amount">$${total.toFixed(2)}</span></li>`).join('')}${Object.keys(spendingByCourse).length === 0 ? '<li>No spending recorded this year.</li>' : ''}</ul>`;
        if (exportCsvBtn && fullTransactionData.length > 0) exportCsvBtn.style.display = 'inline-block';
    } // End displaySummary helper


    // Add Listener for Export Button
     if (exportCsvBtn) {
        exportCsvBtn.replaceWith(exportCsvBtn.cloneNode(true));
        const newExportCsvBtn = document.getElementById('exportCsvBtn');
        if (newExportCsvBtn) { newExportCsvBtn.addEventListener('click', () => generateAndDownloadCsv(fullTransactionData)); }
    }

     // Add Listener for Refresh Button
    if (refreshFinancialsBtn) {
        refreshFinancialsBtn.replaceWith(refreshFinancialsBtn.cloneNode(true));
        const newRefreshBtn = document.getElementById('refreshFinancialsBtn');
        if (newRefreshBtn) {
             newRefreshBtn.addEventListener('click', async () => {
                 console.log("FINANCIALS: Refresh button clicked.");
                 if (financialSummaryDiv) financialSummaryDiv.innerHTML = '<p>Refreshing financial summary...</p>';
                 if (exportCsvBtn) exportCsvBtn.style.display = 'none';
                 try {
                    fullTransactionData = await getFinancialDetails(true); // Force refresh
                    displaySummary(); // Re-display summary
                 } catch (error) {
                     console.error("FINANCIALS: Error refreshing financial details:", error);
                     if (financialSummaryDiv) financialSummaryDiv.innerHTML = `<p style="color: red;">Error refreshing financial summary: ${error.message}</p>`;
                 }
             });
        }
    }
} // End of initializeFinancialsSection


// --- Function to clear cache (called from logout) ---
function clearFinancialCache() {
    try { // Add try-catch for safety
        localStorage.removeItem(FINANCIAL_CACHE_KEY);
        console.log('FINANCIALS: Cache cleared.');
    } catch (e) {
        console.error("FINANCIALS: Error clearing cache", e);
    }
}

// --- END OF FILE financials.js ---
