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
 * Extracts a list of {saleId, courseId} pairs from login_data.
 * Handles cases where passes or uses might be missing.
 * @returns {{salesToFetch: Array<{saleId: string, courseId: string}>, identifier: string}}
 */
function extractSalesFromLoginData() {
    console.log("FINANCIALS: Extracting sales info from login_data...");
    const loginDataStr = localStorage.getItem('login_data');
    let salesToFetch = [];
    let salesListString = ''; // For hashing identifier

    if (!loginDataStr) {
        console.warn("FINANCIALS Extract: Login data missing.");
        return { salesToFetch, identifier: simpleHash('') }; // Return empty if no login data
    }

    try {
        const loginData = JSON.parse(loginDataStr);
        const courses = typeof getSanAntonioCourses === 'function' ? getSanAntonioCourses() : [];
        const uniqueSales = new Map();

        // **** Robust Check for passes object ****
        if (loginData.passes && typeof loginData.passes === 'object') {
            const passIds = Object.keys(loginData.passes);
            console.log(`FINANCIALS Extract: Found pass IDs: ${passIds.join(', ')}`);

            if (passIds.length > 0) {
                const firstPassId = passIds[0];
                // **** Access pass correctly ****
                const pass = loginData.passes[firstPassId];

                // **** Check if pass and pass.uses exist and is array ****
                if (pass && pass.uses && Array.isArray(pass.uses)) {
                    const uses = pass.uses;
                    console.log(`FINANCIALS Extract: Found ${uses.length} uses in pass ${firstPassId}.`);
                    uses.forEach(use => {
                        const saleId = use.sale_id;
                        const teesheetId = use.teesheet_id;
                        if (saleId && teesheetId) {
                            const matchingCourse = courses.find(course => String(course.facilityId) === String(teesheetId));
                            const courseId = matchingCourse ? String(matchingCourse.courseId) : null;
                            if (courseId) {
                                const key = `${saleId}-${courseId}`;
                                if (!uniqueSales.has(key)) {
                                    uniqueSales.set(key, { saleId: String(saleId), courseId: courseId });
                                    salesListString += `${key};`; // Add unique key to string
                                }
                            } else { console.warn(`FINANCIALS Extract: Could not map teesheet_id: ${teesheetId}`); }
                        } else { /* console.warn("FINANCIALS Extract: Use entry missing sale_id or teesheet_id:", use); */ }
                    }); // End uses.forEach
                } else { console.log(`FINANCIALS Extract: Pass ${firstPassId} has no valid 'uses' array.`); }
            } else { console.log("FINANCIALS Extract: 'passes' object has no keys (no passes found?)."); }
        } else { console.log("FINANCIALS Extract: No 'passes' object found in login_data."); }

        salesToFetch = Array.from(uniqueSales.values());
        // Use shared simpleHash from utils.js
        const identifier = typeof simpleHash === 'function' ? simpleHash(salesListString.split(';').sort().join(';')) : Date.now().toString();
        console.log(`FINANCIALS Extract: Generated identifier: ${identifier}, Sales count: ${salesToFetch.length}`);
        return { salesToFetch, identifier };

    } catch (e) {
        console.error("FINANCIALS Extract: Error processing login_data:", e);
        // Return empty on error to prevent crashes later
        return { salesToFetch: [], identifier: simpleHash('error') };
    }
}


// --- Replace getFinancialDetails in financials.js ---

/**
 * Fetches (or retrieves from cache) detailed financial transaction data.
 * Uses login_data identifier for cache validation.
 * @param {string} currentLoginDataIdentifier - Hash/identifier of the current login_data's sales list.
 * @param {boolean} [forceRefresh=false] - If true, bypasses cache check.
 * @returns {Promise<Array>} A promise resolving with the array of detailed transaction objects (with app_requested_course_id).
 */
async function getFinancialDetails(currentLoginDataIdentifier, forceRefresh = false) {
    console.log(`FINANCIALS: Getting financial details... Identifier: ${currentLoginDataIdentifier}, Force: ${forceRefresh}`);
    const cachedDataString = localStorage.getItem(FINANCIAL_CACHE_KEY);
    let cachedData = null;

    // Check Cache first
    if (cachedDataString && !forceRefresh) {
        try {
            cachedData = JSON.parse(cachedDataString);
            // Compare cache's identifier with the one passed in
            if (cachedData?.loginDataIdentifier === currentLoginDataIdentifier) {
                console.log("FINANCIALS: Using cached data (identifier matches).");
                // Ensure data structure is correct (array) before returning
                return Array.isArray(cachedData.transactions) ? cachedData.transactions : [];
            } else {
                console.log(`FINANCIALS: Cache invalid (identifier mismatch: Cache=${cachedData?.loginDataIdentifier}, Current=${currentLoginDataIdentifier}).`);
                localStorage.removeItem(FINANCIAL_CACHE_KEY);
            }
        } catch (e) {
            console.error("FINANCIALS: Error parsing cache:", e);
            localStorage.removeItem(FINANCIAL_CACHE_KEY); // Clear corrupted cache
        }
    }

    // --- If Cache Miss or Force Refresh ---

    // Get the list of sales to fetch using the helper function
    // Assumes extractSalesFromLoginData is defined elsewhere in this file or globally
    if (typeof extractSalesFromLoginData !== 'function') {
         throw new Error("extractSalesFromLoginData function is missing.");
    }
    const extractionResult = extractSalesFromLoginData();
    const salesToFetch = extractionResult.salesToFetch;
    // Note: We use the currentLoginDataIdentifier passed into *this* function for caching later

    if (salesToFetch.length === 0) {
         console.log("FINANCIALS: No sales found to fetch details for.");
         const emptyCache = { loginDataIdentifier: currentLoginDataIdentifier, transactions: [] };
         try { localStorage.setItem(FINANCIAL_CACHE_KEY, JSON.stringify(emptyCache)); } catch (e) {}
         return []; // Return empty array
    }

    console.log(`FINANCIALS: Fetching fresh details for ${salesToFetch.length} sales...`);
    const token = localStorage.getItem('jwt_token'); const cookies = localStorage.getItem('foreup_cookies');
    if (!token) throw new Error("Authentication required for fetching financials.");

    // Use shared API_BASE_URL from utils.js
    const workerApiUrl = (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'https://missing-api-base-url.com') + '/api/sale-details';

    try {
        console.log(`FINANCIALS: Calling worker endpoint: ${workerApiUrl}`);
        const response = await fetch(workerApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'X-ForeUp-Cookies': cookies || '' },
            body: JSON.stringify({ sales: salesToFetch })
        });
        if (!response.ok) { const errorText = await response.text(); throw new Error(`Failed to fetch sale details: ${response.status} - ${errorText}`); }

        const freshTransactions = await response.json(); // Worker should add courseId to meta
        if (!Array.isArray(freshTransactions)) { throw new Error("Received invalid data format from server."); }
        console.log(`FINANCIALS: Successfully fetched details for ${freshTransactions.length} sales.`);

        // Cache the fresh data with the CURRENT identifier passed into this function
        const dataToCache = { loginDataIdentifier: currentLoginDataIdentifier, transactions: freshTransactions };
        try { localStorage.setItem(FINANCIAL_CACHE_KEY, JSON.stringify(dataToCache)); console.log("FINANCIALS: Data cached."); }
        catch (e) { console.error("FINANCIALS: Error caching data:", e); } // Continue even if caching fails

        return freshTransactions;

    } catch (error) {
        console.error("FINANCIALS: Error fetching sale details from worker:", error);
        throw error; // Re-throw error
    }
} // End of getFinancialDetails




// --- Replace generateAndDownloadCsv in financials.js ---

/**
 * Generates a CSV string from transaction details and triggers download.
 * @param {Array} transactions - Array of detailed sale objects (with app_requested_course_id).
 * @param {Array<{saleId: string, courseId: string}>} saleIdToCourseIdMap - Mapping list derived from login_data.
 */
function generateAndDownloadCsv(transactions, saleIdToCourseIdMap) {
    // Use shared getElement from utils.js if available, otherwise fallback
    const getElementFunc = typeof getElement === 'function' ? getElement : (id) => document.getElementById(id);
    // Use shared course data source
    const courses = typeof getSanAntonioCourses === 'function' ? getSanAntonioCourses() : [];

    if (!transactions || transactions.length === 0) { alert("No financial data available to export."); return; }
    // Check if the map needed for course name lookup is provided
    if (!saleIdToCourseIdMap || !Array.isArray(saleIdToCourseIdMap)) {
        console.error("CSV Error: Missing or invalid sale ID to Course ID map.", saleIdToCourseIdMap);
        alert("Error generating CSV: Cannot map sales to courses reliably.");
        return;
    }

    console.log("FINANCIALS CSV: Generating...");
    const csvData = [];
    // Define Headers
    csvData.push([ "Sale ID", "Date", "Time", "Course Name", "Item Name", "Item Type", "Quantity", "Unit Price", "Item Subtotal", "Item Tax", "Item Total", "Sale Subtotal", "Sale Tax", "Sale Total" ]);

    transactions.forEach((saleDetail, index) => {
        const saleAttributes = saleDetail?.data?.attributes;
        const saleId = saleDetail?.data?.id;

        // ---vvv--- DETAILED LOGGING FOR CSV COURSE LOOKUP ---vvv---
        // console.log(`\n--- CSV Processing Sale Detail #${index + 1} ---`);
        // console.log("CSV: Looking for saleId:", saleId);

        // Look up the courseId using the saleId from the mapping list passed in
        const originalSaleInfo = saleIdToCourseIdMap.find(s => String(s.saleId) === String(saleId));
        const saleCourseId = originalSaleInfo ? originalSaleInfo.courseId : null;
        // console.log("CSV: Lookup result:", originalSaleInfo, "Derived courseId:", saleCourseId);
        // ---^^^--- END DETAILED LOGGING ---^^^---

        // Get Course Name from looked-up CourseID
        const course = courses.find(c => String(c.courseId) === String(saleCourseId));
        const courseName = course ? course.name.replace(/"/g, '""') : (saleCourseId ? `Course ID ${saleCourseId}` : 'Unknown Course');
        // console.log("CSV: Final courseName for row:", courseName);

        // Extract other sale-level details
        const saleTimeISO = saleAttributes?.saleTime;
        const saleTotal = saleAttributes?.total ?? '';
        const saleSubtotal = saleAttributes?.subtotal ?? '';
        const saleTax = saleAttributes?.tax ?? '';
        let saleDate = 'N/A'; let saleTime = 'N/A';
        if (saleTimeISO) { try { const d = new Date(saleTimeISO); saleDate = d.toLocaleDateString('en-CA'); saleTime = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }); } catch (e) { } }

        // Process included items
        if (saleDetail.included && Array.isArray(saleDetail.included)) {
            saleDetail.included.forEach(item => {
                if (item.type === 'sales_items') {
                    const itemAttr = item.attributes;
                    const formatCsvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`; // Helper to format/escape
                    csvData.push([
                        formatCsvCell(saleId), formatCsvCell(saleDate), formatCsvCell(saleTime), formatCsvCell(courseName),
                        formatCsvCell(itemAttr?.name), formatCsvCell(itemAttr?.type), formatCsvCell(itemAttr?.quantity),
                        formatCsvCell(itemAttr?.unitPrice), formatCsvCell(itemAttr?.subTotal), formatCsvCell(itemAttr?.tax),
                        formatCsvCell(itemAttr?.total), formatCsvCell(saleSubtotal), formatCsvCell(saleTax), formatCsvCell(saleTotal)
                    ]);
                }
            });
        } else {
            // Optionally, add a summary row for the sale if there are no items
             console.warn("FINANCIALS CSV: No 'included' items found for sale ID:", saleId);
             // const formatCsvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
             // csvData.push([ formatCsvCell(saleId), formatCsvCell(saleDate), formatCsvCell(saleTime), formatCsvCell(courseName), '"Sale Total Row"', '"Summary"', 1, '', '', '', '', formatCsvCell(saleSubtotal), formatCsvCell(saleTax), formatCsvCell(saleTotal) ]);
        }
    }); // End transactions.forEach

    console.log("FINANCIALS CSV: Generation complete. Triggering download.");
    const csvString = csvData.map(row => row.join(",")).join("\n");
    // Assumes downloadCSV function is defined elsewhere (e.g., in this file or utils.js)
    if(typeof downloadCSV === 'function') {
        downloadCSV(csvString);
    } else {
        console.error("CSV Error: downloadCSV function not found.");
        alert("Error: Could not trigger CSV download.");
    }
} // End generateAndDownloadCsv








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


// --- Replace initializeFinancialsSection in financials.js ---

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

    let fullTransactionData = []; // Holds the detailed results { ...saleDetail, app_requested_course_id }
    let originalSalesList = [];   // Holds mapping [{saleId, courseId}, ...]
    let currentLoginDataIdentifier = ''; // Holds hash for cache check

    // Set initial loading message
    financialSummaryDiv.innerHTML = '<p>Loading financial summary...</p>';
    if (exportCsvBtn) exportCsvBtn.style.display = 'none';
    if (refreshFinancialsBtn) refreshFinancialsBtn.disabled = true;

    try {
        // --- Use the helper function to get sales list and identifier ---
        // Assumes extractSalesFromLoginData() is defined in this file or globally
        if (typeof extractSalesFromLoginData !== 'function') {
            throw new Error("extractSalesFromLoginData function is missing.");
        }
        const extractionResult = extractSalesFromLoginData();
        originalSalesList = extractionResult.salesToFetch; // Store the list
        currentLoginDataIdentifier = extractionResult.identifier; // Store the identifier
        // --- End use helper ---

        // Get detailed data (pass identifier to caching function)
        // Assumes getFinancialDetails() is defined in this file or globally
        if (typeof getFinancialDetails !== 'function') {
             throw new Error("getFinancialDetails function is missing.");
        }
        fullTransactionData = await getFinancialDetails(currentLoginDataIdentifier, false); // Pass identifier, forceRefresh=false

        // Calculate and display summary, passing the map derived above
        // Assumes displaySummary() is defined below
        displaySummary(fullTransactionData, originalSalesList); // <<< PASS the mapping list

    } catch (error) {
        console.error("FINANCIALS: Error loading initial financial details:", error);
        if(financialSummaryDiv) financialSummaryDiv.innerHTML = `<p style="color: red;">Error loading financial summary: ${error.message}</p>`;
    } finally {
        // Ensure UI is updated regardless of success/error
        finalizeUI();
        if (refreshFinancialsBtn) refreshFinancialsBtn.disabled = false; // Re-enable refresh button
    }


    // --- Internal helper function to display summary ---
    // (Paste the displaySummary function definition here)


    // --- Add Listener for Export Button ---
     if (exportCsvBtn) {
        exportCsvBtn.replaceWith(exportCsvBtn.cloneNode(true)); // Avoid duplicate listeners
        const newExportCsvBtn = document.getElementById('exportCsvBtn'); // Use basic ID get
        if (newExportCsvBtn) {
            newExportCsvBtn.addEventListener('click', () => {
                 console.log("FINANCIALS Export: Button clicked.");
                 // Assumes generateAndDownloadCsv is defined
                 if (typeof generateAndDownloadCsv === 'function') {
                      generateAndDownloadCsv(fullTransactionData, originalSalesList); // Pass map
                 } else {
                      console.error("FINANCIALS Export: generateAndDownloadCsv function missing.");
                      alert("Error: Could not generate export file.");
                 }
            });
        }
    }

     // --- Add Listener for Refresh Button ---
    if (refreshFinancialsBtn) {
        refreshFinancialsBtn.replaceWith(refreshFinancialsBtn.cloneNode(true)); // Avoid duplicate listeners
        const newRefreshBtn = document.getElementById('refreshFinancialsBtn'); // Use basic ID get
        if (newRefreshBtn) {
             newRefreshBtn.addEventListener('click', async () => {
                 console.log("FINANCIALS: Refresh button clicked.");
                 if (financialSummaryDiv) financialSummaryDiv.innerHTML = '<p>Refreshing financial summary...</p>';
                 if (exportCsvBtn) exportCsvBtn.style.display = 'none';
                 newRefreshBtn.disabled = true;
                 try {
                    // Use the helper function again to get latest map/identifier
                    if (typeof extractSalesFromLoginData !== 'function') {
                        throw new Error("extractSalesFromLoginData function is missing.");
                    }
                    const extractionResult = extractSalesFromLoginData();
                    originalSalesList = extractionResult.salesToFetch; // Update map
                    currentLoginDataIdentifier = extractionResult.identifier; // Update identifier
                    console.log("FINANCIALS Refresh: Regenerated map:", originalSalesList);

                    // Force refresh API call, passing the NEW identifier
                    if (typeof getFinancialDetails !== 'function') {
                         throw new Error("getFinancialDetails function is missing.");
                    }
                    fullTransactionData = await getFinancialDetails(currentLoginDataIdentifier, true);

                    // Re-display, passing UPDATED map
                    // Assumes displaySummary is defined below
                    displaySummary(fullTransactionData, originalSalesList);

                 } catch (error) {
                     console.error("FINANCIALS: Error refreshing financial details:", error);
                     if (financialSummaryDiv) financialSummaryDiv.innerHTML = `<p style="color: red;">Error refreshing financial summary: ${error.message}</p>`;
                 } finally {
                     newRefreshBtn.disabled = false; // Re-enable button
                 }
             });
        }
    }

    // ---vvv--- NEST displaySummary definition inside initializeFinancialsSection ---vvv---
    // This ensures it has access to financialSummaryDiv, exportCsvBtn, etc. from the outer scope
    function displaySummary(transactionDetails, saleIdToCourseIdMap) {
        if (!financialSummaryDiv) return; // Already checked but safe

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

        transactionDetails.forEach((saleDetail, index) => {
             const saleAttributes = saleDetail?.data?.attributes;
             const saleId = saleDetail?.data?.id;

             // Look up the courseId using the saleId from the mapping list passed in
             const originalSaleInfo = saleIdToCourseIdMap.find(s => String(s.saleId) === String(saleId));
             const saleCourseId = originalSaleInfo ? originalSaleInfo.courseId : null;

             const saleTime = saleAttributes?.saleTime;
             const saleTotalRaw = saleAttributes?.total;
             const saleTotal = parseFloat(saleTotalRaw || 'NaN');

             // console.log(`FINANCIALS Display: Processing SaleID: ${saleId}, Found CourseID: ${saleCourseId}, Time: ${saleTime}, Total: ${saleTotal}`); // Verbose log

             const isSaleTimeValid = !!saleTime;
             const isCourseIdValid = !!saleCourseId;
             const isTotalValid = !isNaN(saleTotal);
             // console.log(`Check components: saleTime=${isSaleTimeValid}, saleCourseId=${isCourseIdValid}, !isNaN(saleTotal)=${isTotalValid}`); // Verbose log

             if (isSaleTimeValid && isCourseIdValid && isTotalValid) {
                 try {
                     const saleYear = new Date(saleTime).getFullYear();
                     if (saleYear === currentYear) {
                          const course = courses.find(c => String(c.courseId) === String(saleCourseId));
                          const courseName = course ? course.name : `Course ID ${saleCourseId}`;
                          // Include $0 totals in spending summary for now
                          spendingByCourse[courseName] = (spendingByCourse[courseName] || 0) + saleTotal;
                     }
                 } catch (dateError) { console.error(`FINANCIALS Display: Error parsing saleTime '${saleTime}' for saleId ${saleId}:`, dateError); }
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
    } // ---^^^--- End displaySummary helper function DEFINITION ---^^^---

} // --- End of initializeFinancialsSection ---





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
