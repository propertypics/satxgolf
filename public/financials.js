// --- START OF FILE financials.js ---

// Relies on functions/constants from utils.js being loaded first:
// API_BASE_URL, getElement, getSanAntonioCourses, simpleHash, formatDate (if used)

console.log("financials.js loaded");

// --- Constants ---
const FINANCIAL_CACHE_KEY = 'user_financial_details_cache';

// --- Helper Functions Specific to Financials (or rely on utils.js) ---

// Basic date formatting (using global version from utils.js is preferred)
// function formatFinancialsDate(dateStr) { ... }

// --- Financial Data Fetching & Caching ---

/**
 * Fetches (or retrieves from cache) detailed financial transaction data.
 * Uses login_data identifier for cache validation.
 * @param {boolean} [forceRefresh=false] - If true, bypasses cache check.
 * @returns {Promise<Array>} A promise resolving with the array of detailed transaction objects.
 */
async function getFinancialDetails(forceRefresh = false) {
    console.log(`FINANCIALS: Getting financial details... Force refresh: ${forceRefresh}`);
    // Use shared getElement from utils.js if available, otherwise fallback
    const getElementFunc = typeof getElement === 'function' ? getElement : (id) => document.getElementById(id);
    // Use shared course data source
    const courses = typeof getSanAntonioCourses === 'function' ? getSanAntonioCourses() : [];

    const cachedDataString = localStorage.getItem(FINANCIAL_CACHE_KEY);
    const loginDataStr = localStorage.getItem('login_data');
    let cachedData = null;

    if (!loginDataStr) {
        console.error("FINANCIALS: Login data not found.");
        throw new Error("Login data not found. Cannot process financials.");
    }

    let currentLoginDataIdentifier = '';
    let salesToFetch = []; // List of {saleId, courseId}

    // Prepare sales list and identifier from login_data
    try {
        const loginData = JSON.parse(loginDataStr);
        let salesListString = '';
        const uniqueSales = new Map();
        if (courses.length === 0) console.warn("FINANCIALS: Course list is empty in getFinancialDetails.");

        if (loginData.passes && typeof loginData.passes === 'object') {
            const passIds = Object.keys(loginData.passes);
            if (passIds.length > 0) {
                const pass = loginData.passes[passIds[0]];
                if (pass && pass.uses && Array.isArray(pass.uses)) {
                    pass.uses.forEach(use => {
                        const saleId = use.sale_id;
                        const teesheetId = use.teesheet_id; // Use teesheet_id for mapping
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
        currentLoginDataIdentifier = typeof simpleHash === 'function' ? simpleHash(salesListString.split(';').sort().join(';')) : Date.now().toString();
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
                return cachedData.transactions; // Return valid cached data
            } else { console.log(`FINANCIALS: Cache invalid.`); localStorage.removeItem(FINANCIAL_CACHE_KEY); }
        } catch (e) { console.error("FINANCIALS: Error parsing cache:", e); localStorage.removeItem(FINANCIAL_CACHE_KEY); }
    }

    // Fetch Fresh Data
    if (salesToFetch.length === 0) {
         console.log("FINANCIALS: No sales found to fetch details for.");
         const emptyCache = { loginDataIdentifier: currentLoginDataIdentifier, transactions: [] };
         try { localStorage.setItem(FINANCIAL_CACHE_KEY, JSON.stringify(emptyCache)); } catch (e) {}
         return [];
    }
    console.log(`FINANCIALS: Fetching fresh details for ${salesToFetch.length} sales...`);
    const token = localStorage.getItem('jwt_token'); const cookies = localStorage.getItem('foreup_cookies');
    if (!token) throw new Error("Authentication required.");

    // Use shared API_BASE_URL from utils.js
    const workerApiUrl = (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'https://missing-api-base-url.com') + '/api/sale-details';

    try {
        console.log(`FINANCIALS: Calling worker endpoint: ${workerApiUrl}`);
        const response = await fetch(workerApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'X-ForeUp-Cookies': cookies || '' },
            body: JSON.stringify({ sales: salesToFetch }) // Send { sales: [...] } structure
        });
        if (!response.ok) { const errorText = await response.text(); throw new Error(`Failed to fetch sale details: ${response.status} - ${errorText}`); }

        const freshTransactions = await response.json();
        if (!Array.isArray(freshTransactions)) {
             console.error("FINANCIALS: Worker response is not an array:", freshTransactions);
             throw new Error("Received invalid data format from server.");
        }
        console.log(`FINANCIALS: Successfully fetched details for ${freshTransactions.length} sales.`);

        // Cache the fresh data
        const dataToCache = { loginDataIdentifier: currentLoginDataIdentifier, transactions: freshTransactions };
        try { localStorage.setItem(FINANCIAL_CACHE_KEY, JSON.stringify(dataToCache)); console.log("FINANCIALS: Data cached."); }
        catch (e) { console.error("FINANCIALS: Error caching data:", e); }
        return freshTransactions;

    } catch (error) {
        console.error("FINANCIALS: Error fetching sale details from worker:", error);
        throw error; // Re-throw error
    }
}


// --- CSV Generation and Download ---
function generateAndDownloadCsv(transactions, saleIdToCourseIdMap) { // Accept map
    // Use shared getElement from utils.js if available, otherwise fallback
    const getElementFunc = typeof getElement === 'function' ? getElement : (id) => document.getElementById(id);
    // Use shared course data source
    const courses = typeof getSanAntonioCourses === 'function' ? getSanAntonioCourses() : [];

    if (!transactions || transactions.length === 0) { alert("No financial data available to export."); return; }
     if (!saleIdToCourseIdMap) { console.error("CSV Error: Missing sale ID to Course ID map."); alert("Error generating CSV: Data mapping missing."); return; }

    console.log("FINANCIALS: Generating CSV...");
    const csvData = [];
    csvData.push([ "Sale ID", "Date", "Time", "Course Name", "Item Name", "Item Type", "Quantity", "Unit Price", "Item Subtotal", "Item Tax", "Item Total", "Sale Subtotal", "Sale Tax", "Sale Total" ]); // Headers

    transactions.forEach(saleDetail => {
        const saleAttributes = saleDetail?.data?.attributes;
        const saleId = saleDetail?.data?.id;
        // Look up CourseID using the map passed in
        const originalSaleInfo = saleIdToCourseIdMap.find(s => String(s.saleId) === String(saleId));
        const saleCourseId = originalSaleInfo ? originalSaleInfo.courseId : null;
        // Get Course Name
        const course = courses.find(c => String(c.courseId) === String(saleCourseId));
        const courseName = course ? course.name.replace(/"/g, '""') : (saleCourseId ? `Course ID ${saleCourseId}`: 'Unknown Course'); // Handle null courseId

        const saleTimeISO = saleAttributes?.saleTime;
        const saleTotal = saleAttributes?.total ?? '';
        const saleSubtotal = saleAttributes?.subtotal ?? '';
        const saleTax = saleAttributes?.tax ?? '';
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
        } else {
             // Optionally add a row for the sale itself if no items?
             // console.warn("FINANCIALS CSV: No 'included' items found for sale ID:", saleId);
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
    console.log("FINANCIALS: Initializing section (async)...");
    // Use shared getElement from utils.js if available, otherwise fallback
    const getElementFunc = typeof getElement === 'function' ? getElement : (id) => document.getElementById(id);

    const financialSummaryDiv = getElementFunc('financialSummary', 'Financial summary div not found', false);
    const exportCsvBtn = getElementFunc('exportCsvBtn', 'Export CSV button not found', false);
    const refreshFinancialsBtn = getElementFunc('refreshFinancialsBtn', 'Refresh Financials button not found', false);
    const loadingIndicator = getElementFunc('loadingIndicator', 'Main loading indicator not found in financials', false);
    const statsContainer = getElementFunc('statsContainer', 'Main stats container not found in financials', false);

    // Helper to finalize UI state
    const finalizeUI = () => {
        console.log("FINANCIALS: Finalizing UI state...");
        if (loadingIndicator) { loadingIndicator.style.display = 'none'; }
        else { console.warn("FINANCIALS: Main loading indicator not found to hide."); }
        if (statsContainer) { statsContainer.style.display = 'grid'; } // Or 'block'
        else { console.warn("FINANCIALS: Main stats container not found to show."); }
    };

    if (!financialSummaryDiv) {
        console.error("FINANCIALS: financialSummary div not found. Cannot initialize financials display.");
        finalizeUI(); // Still finalize main UI state
        return;
    }

    let fullTransactionData = []; // Holds the detailed results from the worker
    let originalSalesList = []; // Holds the initial {saleId, courseId} list for mapping

    // Set initial loading message
    financialSummaryDiv.innerHTML = '<p>Loading financial summary...</p>';
    if (exportCsvBtn) exportCsvBtn.style.display = 'none';
    if (refreshFinancialsBtn) refreshFinancialsBtn.disabled = true;


    try {
        // --- Regenerate the original saleId/courseId list ---
        // Needed for mapping results back to courses
        const loginDataStr = localStorage.getItem('login_data');
        if (!loginDataStr) throw new Error("Login data missing for financials.");
        const loginData = JSON.parse(loginDataStr);
        const uniqueSales = new Map();
        const courses = typeof getSanAntonioCourses === 'function' ? getSanAntonioCourses() : [];

        if (loginData.passes?.passes[Object.keys(loginData.passes)[0]]?.uses) { // Safer access
             const uses = loginData.passes[Object.keys(loginData.passes)[0]].uses;
             uses.forEach(use => {
                const saleId = use.sale_id;
                const teesheetId = use.teesheet_id;
                if (saleId && teesheetId) {
                    const matchingCourse = courses.find(course => String(course.facilityId) === String(teesheetId));
                    const courseId = matchingCourse ? String(matchingCourse.courseId) : null;
                    if (courseId) {
                        const key = `${saleId}-${courseId}`;
                        if (!uniqueSales.has(key)) { uniqueSales.set(key, { saleId: String(saleId), courseId: courseId }); }
                    }
                }
             });
        }
        originalSalesList = Array.from(uniqueSales.values());
        console.log("FINANCIALS: Regenerated original sales list for mapping:", originalSalesList);
        // --- End Regenerate ---


        // Get detailed data (cached or fetched)
        fullTransactionData = await getFinancialDetails();

        // Calculate and display summary, passing the original list for lookup
        displaySummary(fullTransactionData, originalSalesList); // Pass the mapping list

    } catch (error) {
        console.error("FINANCIALS: Error loading initial financial details:", error);
        if(financialSummaryDiv) financialSummaryDiv.innerHTML = `<p style="color: red;">Error loading financial summary: ${error.message}</p>`;
    } finally {
        // Ensure UI is updated regardless of success/error
        finalizeUI();
        if (refreshFinancialsBtn) refreshFinancialsBtn.disabled = false; // Re-enable refresh button
    }


    // --- Internal helper function to display summary ---
    function displaySummary(transactionDetails, saleIdToCourseIdMap) {
        if (!financialSummaryDiv) return; // Guard clause

        if (!transactionDetails || transactionDetails.length === 0) {
             financialSummaryDiv.innerHTML = '<h3>Spending This Year</h3><p>No financial data found.</p>';
             if (exportCsvBtn) exportCsvBtn.style.display = 'none';
             return;
        }
        if (!saleIdToCourseIdMap || !Array.isArray(saleIdToCourseIdMap)) {
             console.error("FINANCIALS Display: Invalid or missing saleIdToCourseIdMap.");
             financialSummaryDiv.innerHTML = '<h3>Spending This Year</h3><p style="color:red;">Error: Cannot map sales to courses.</p>';
             if (exportCsvBtn) exportCsvBtn.style.display = 'none';
             return;
        }

        const currentYear = new Date().getFullYear();
        const spendingByCourse = {};
        const courses = typeof getSanAntonioCourses === 'function' ? getSanAntonioCourses() : [];

        console.log("FINANCIALS Display: Starting summary calculation. Input transaction count:", transactionDetails?.length);
        // console.log("FINANCIALS Display: Using saleId->courseId map:", saleIdToCourseIdMap); // Can be verbose

        transactionDetails.forEach((saleDetail, index) => {
             const saleAttributes = saleDetail?.data?.attributes;
             const saleId = saleDetail?.data?.id;

             // Look up the courseId using the saleId from the mapping list
             const originalSaleInfo = saleIdToCourseIdMap.find(s => String(s.saleId) === String(saleId));
             const saleCourseId = originalSaleInfo ? originalSaleInfo.courseId : null;

             const saleTime = saleAttributes?.saleTime;
             const saleTotalRaw = saleAttributes?.total;
             const saleTotal = parseFloat(saleTotalRaw || 'NaN');

             // Add detailed logging inside the loop only if needed for debugging specific sales
             // console.log(`--- Processing Sale Detail #${index + 1} ---`);
             // console.log("Derived saleCourseId:", saleCourseId);
             // console.log("Extracted saleTime:", saleTime);
             // console.log("Parsed saleTotal:", saleTotal);
             // const isSaleTimeValid = !!saleTime; const isCourseIdValid = !!saleCourseId; const isTotalValid = !isNaN(saleTotal);
             // console.log(`Check components: saleTime=${isSaleTimeValid}, saleCourseId=${isCourseIdValid}, !isNaN(saleTotal)=${isTotalValid}`);

             if (saleTime && saleCourseId && !isNaN(saleTotal)) {
                 try {
                     const saleYear = new Date(saleTime).getFullYear();
                     if (saleYear === currentYear) {
                          const course = courses.find(c => String(c.courseId) === String(saleCourseId));
                          const courseName = course ? course.name : `Course ID ${saleCourseId}`;
                          spendingByCourse[courseName] = (spendingByCourse[courseName] || 0) + saleTotal;
                     }
                 } catch (dateError) {
                      console.error(`FINANCIALS Display: Error parsing saleTime '${saleTime}' for saleId ${saleId}:`, dateError);
                 }
             } else {
                 console.warn("FINANCIALS Display: Skipping sale for summary due to missing/invalid data:", {saleId, saleTime, saleCourseId, saleTotal});
             }
        }); // End forEach

        console.log("FINANCIALS Display: Final spendingByCourse:", spendingByCourse);
        const summaryListHtml = Object.entries(spendingByCourse)
            .sort(([nameA], [nameB]) => nameA.localeCompare(nameB))
            .map(([name, total]) => `<li><span class="course-name">${name}</span><span class="amount">$${total.toFixed(2)}</span></li>`)
            .join('');

        financialSummaryDiv.innerHTML = `<h3>Spending This Year</h3><ul class="financial-list">${summaryListHtml}${Object.keys(spendingByCourse).length === 0 ? '<li>No spending recorded this year.</li>' : ''}</ul>`;
        console.log("FINANCIALS Display: Updated financialSummaryDiv innerHTML.");

        if (exportCsvBtn && transactionDetails.length > 0 && Object.keys(spendingByCourse).length > 0) {
             exportCsvBtn.style.display = 'inline-block'; console.log("FINANCIALS Display: Showing export button.");
        } else if (exportCsvBtn) {
             exportCsvBtn.style.display = 'none'; console.log("FINANCIALS Display: Hiding export button.");
        }
    } // End displaySummary helper


    // Add Listener for Export Button
     if (exportCsvBtn) {
        exportCsvBtn.replaceWith(exportCsvBtn.cloneNode(true));
        const newExportCsvBtn = document.getElementById('exportCsvBtn');
        if (newExportCsvBtn) {
            newExportCsvBtn.addEventListener('click', () => {
                 // Pass the necessary mapping list to the CSV function
                 generateAndDownloadCsv(fullTransactionData, originalSalesList);
            });
        }
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
                 newRefreshBtn.disabled = true;
                 try {
                    // Regenerate the mapping list before forced refresh
                    const loginDataStr = localStorage.getItem('login_data');
                    if (!loginDataStr) throw new Error("Login data missing for refresh.");
                    const loginData = JSON.parse(loginDataStr);
                    const uniqueSales = new Map(); const courses = typeof getSanAntonioCourses === 'function' ? getSanAntonioCourses() : [];
                    if (loginData.passes?.passes[Object.keys(loginData.passes)[0]]?.uses) {
                         const uses = loginData.passes[Object.keys(loginData.passes)[0]].uses;
                         uses.forEach(use => { /* ... loop to build uniqueSales Map ... */ });
                    }
                    originalSalesList = Array.from(uniqueSales.values()); // Update map
                    console.log("FINANCIALS: Regenerated map for refresh:", originalSalesList);

                    fullTransactionData = await getFinancialDetails(true); // Force refresh
                    displaySummary(fullTransactionData, originalSalesList); // Re-display, passing UPDATED map
                 } catch (error) {
                     console.error("FINANCIALS: Error refreshing financial details:", error);
                     if (financialSummaryDiv) financialSummaryDiv.innerHTML = `<p style="color: red;">Error refreshing financial summary: ${error.message}</p>`;
                 } finally {
                     newRefreshBtn.disabled = false; // Re-enable button
                 }
             });
        }
    }
} // End of initializeFinancialsSection


// --- Function to clear cache (called from logout) ---
function clearFinancialCache() {
    try {
        localStorage.removeItem(FINANCIAL_CACHE_KEY);
        console.log('FINANCIALS: Cache cleared.');
    } catch (e) {
        console.error("FINANCIALS: Error clearing cache", e);
    }
}

// --- END OF FILE financials.js ---
