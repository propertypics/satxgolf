
// Relies on functions/constants from utils.js being loaded first:
// API_BASE_URL, getElement, getSanAntonioCourses, simpleHash, formatDate (if used by displaySummary)

console.log("financials.js loaded");

// --- Constants ---
const FINANCIAL_CACHE_KEY = 'user_financial_details_cache';

// --- Helper Functions needed by Financials ---

/**
 * Extracts a list of {saleId, courseId} pairs from login_data stored in localStorage.
 * Handles cases where passes or uses might be missing.
 * Relies on getSanAntonioCourses() and simpleHash() being available.
 * @returns {{salesToFetch: Array<{saleId: string, courseId: string}>, identifier: string}}
 */
function extractSalesFromLoginData() {
    console.log("FINANCIALS Extract: Extracting sales info from login_data...");
    const loginDataStr = localStorage.getItem('login_data');
    let salesToFetch = [];
    let salesListString = ''; // For hashing identifier
    const getCoursesFunc = typeof getSanAntonioCourses === 'function' ? getSanAntonioCourses : () => { console.error("getSanAntonioCourses not found!"); return []; };
    const simpleHashFunc = typeof simpleHash === 'function' ? simpleHash : (s) => String(s).length; // Basic fallback for hash

    if (!loginDataStr) {
        console.warn("FINANCIALS Extract: Login data missing.");
        return { salesToFetch, identifier: simpleHashFunc('') }; // Return empty if no login data
    }

    try {
        const loginData = JSON.parse(loginDataStr);
        const courses = getCoursesFunc(); // Get course mapping data
        const uniqueSales = new Map();

        // Robust Check for passes object
        if (loginData.passes && typeof loginData.passes === 'object') {
            const passIds = Object.keys(loginData.passes);
            // console.log(`FINANCIALS Extract: Found pass IDs: ${passIds.join(', ')}`); // Verbose log

            if (passIds.length > 0) {
                const firstPassId = passIds[0];
                const pass = loginData.passes[firstPassId]; // Access pass correctly

                // Check if pass and pass.uses exist and is array
                if (pass && pass.uses && Array.isArray(pass.uses)) {
                    const uses = pass.uses;
                    // console.log(`FINANCIALS Extract: Found ${uses.length} uses in pass ${firstPassId}.`); // Verbose log
                    uses.forEach(use => {
                        const saleId = use.sale_id;
                        const teesheetId = use.teesheet_id; // Use teesheet_id for mapping
                        if (saleId && teesheetId) {
                            const matchingCourse = courses.find(course => String(course.facilityId) === String(teesheetId));
                            const courseId = matchingCourse ? String(matchingCourse.courseId) : null;
                            if (courseId) {
                                const key = `${saleId}-${courseId}`;
                                if (!uniqueSales.has(key)) {
                                    uniqueSales.set(key, { saleId: String(saleId), courseId: courseId });
                                    salesListString += `${key};`; // Add unique key to string
                                }
                            } // else: No warning needed if mapping fails, just won't be included
                        }
                    }); // End uses.forEach
                } // else: No warning needed if no uses array
            } // else: No warning needed if no pass IDs
        } // else: No warning needed if no passes object

        salesToFetch = Array.from(uniqueSales.values());
        const identifier = simpleHashFunc(salesListString.split(';').sort().join(';'));
        console.log(`FINANCIALS Extract: Generated identifier: ${identifier}, Sales count: ${salesToFetch.length}`);
        return { salesToFetch, identifier };

    } catch (e) {
        console.error("FINANCIALS Extract: Error processing login_data:", e);
        // Return empty on error to prevent crashes later
        return { salesToFetch: [], identifier: simpleHashFunc('error') };
    }
}


/**
 * Fetches (or retrieves from cache) detailed financial transaction data.
 * Uses login_data identifier for cache validation.
 * Implements frontend batching for fetching details if cache is invalid.
 * @param {string} currentLoginDataIdentifier - Hash/identifier of the current login_data's sales list.
 * @param {boolean} [forceRefresh=false] - If true, bypasses cache check.
 * @returns {Promise<Array>} A promise resolving with the array of detailed transaction objects (with app_requested_course_id).
 */
async function getFinancialDetails(currentLoginDataIdentifier, forceRefresh = false) {
    console.log(`FINANCIALS: Getting financial details... Identifier: ${currentLoginDataIdentifier}, Force: ${forceRefresh}`);
    const getElementFunc = typeof getElement === 'function' ? getElement : (id) => document.getElementById(id);
    const financialSummaryDiv = getElementFunc('financialSummary', '', false); // For progress updates

    const cachedDataString = localStorage.getItem(FINANCIAL_CACHE_KEY);
    let cachedData = null;

    // --- Check Cache ---
    if (cachedDataString && !forceRefresh) {
        try {
            cachedData = JSON.parse(cachedDataString);
            if (cachedData?.loginDataIdentifier === currentLoginDataIdentifier) {
                console.log("FINANCIALS: Using cached data (identifier matches).");
                return Array.isArray(cachedData.transactions) ? cachedData.transactions : [];
            } else { console.log(`FINANCIALS: Cache invalid.`); localStorage.removeItem(FINANCIAL_CACHE_KEY); }
        } catch (e) { console.error("FINANCIALS: Error parsing cache:", e); localStorage.removeItem(FINANCIAL_CACHE_KEY); }
    }
    // --- End Cache Check ---


    // --- Fetch Fresh Data (with Batching) ---

    // 1. Get the full list of sales to fetch
    if (typeof extractSalesFromLoginData !== 'function') { throw new Error("extractSalesFromLoginData missing."); }
    const extractionResult = extractSalesFromLoginData();
    const allSalesToFetch = extractionResult.salesToFetch; // Full list, e.g., 144 items

    if (allSalesToFetch.length === 0) {
         console.log("FINANCIALS: No sales found to fetch details for.");
         const emptyCache = { loginDataIdentifier: currentLoginDataIdentifier, transactions: [] };
         try { localStorage.setItem(FINANCIAL_CACHE_KEY, JSON.stringify(emptyCache)); } catch (e) {}
         return [];
    }

    console.log(`FINANCIALS: Cache miss or invalid. Need to fetch fresh details for ${allSalesToFetch.length} sales.`);
    const token = localStorage.getItem('jwt_token'); const cookies = localStorage.getItem('foreup_cookies');
    if (!token) throw new Error("Authentication required.");
    const workerApiUrl = (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'https://missing-api-base-url.com') + '/api/sale-details';

    // 2. Define Batch Size and Prepare Batches
    const BATCH_SIZE = 40; // Number of sales details to fetch per worker call (adjust if needed, keep < 50)
    const batches = [];
    for (let i = 0; i < allSalesToFetch.length; i += BATCH_SIZE) {
        batches.push(allSalesToFetch.slice(i, i + BATCH_SIZE));
    }
    console.log(`FINANCIALS: Divided ${allSalesToFetch.length} sales into ${batches.length} batches of size ${BATCH_SIZE}.`);

    // 3. Fetch Batches Sequentially (or concurrently with Promise.all if confident)
    let allFetchedTransactions = [];
    let successCount = 0;
    let errorCount = 0;

    // Update UI to show progress
    if (financialSummaryDiv) financialSummaryDiv.innerHTML = `<p>Loading financial details (0/${batches.length} batches)...</p>`;

    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const batchNum = i + 1;
        console.log(`FINANCIALS: Fetching Batch ${batchNum}/${batches.length} (${batch.length} sales)...`);
        if (financialSummaryDiv) financialSummaryDiv.innerHTML = `<p>Loading financial details (${batchNum}/${batches.length} batches)...</p>`; // Update progress

        try {
            const response = await fetch(workerApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'X-ForeUp-Cookies': cookies || '' },
                body: JSON.stringify({ sales: batch }) // Send only the current batch
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`FINANCIALS: Batch ${batchNum} fetch failed: ${response.status} - ${errorText}`);
                errorCount += batch.length; // Assume all in batch failed
                // Decide how to handle batch failure: continue, stop, retry? Let's continue for now.
            } else {
                const batchResults = await response.json();
                if (Array.isArray(batchResults)) {
                    console.log(`FINANCIALS: Batch ${batchNum} successful, received ${batchResults.length} details.`);
                    allFetchedTransactions = allFetchedTransactions.concat(batchResults); // Add results to main array
                    successCount += batchResults.length;
                    if(batchResults.length < batch.length){
                        errorCount += (batch.length - batchResults.length); // Count discrepancies as errors
                         console.warn(`FINANCIALS: Batch ${batchNum} returned fewer results than expected.`);
                    }
                } else {
                     console.error(`FINANCIALS: Batch ${batchNum} response was not an array.`);
                     errorCount += batch.length;
                }
            }
        } catch (error) {
            console.error(`FINANCIALS: Network error fetching Batch ${batchNum}:`, error);
            errorCount += batch.length; // Assume all in batch failed
        }
         // Optional: Add a small delay between batches if needed to avoid rate limits
         // await new Promise(resolve => setTimeout(resolve, 200)); // e.g., 200ms delay
    } // End batch loop

    console.log(`FINANCIALS: Fetching complete. Success: ${successCount}, Failed/Skipped: ${errorCount}, Total: ${allFetchedTransactions.length}`);

    // 4. Cache the aggregated results
    const dataToCache = { loginDataIdentifier: currentLoginDataIdentifier, transactions: allFetchedTransactions };
    try { localStorage.setItem(FINANCIAL_CACHE_KEY, JSON.stringify(dataToCache)); console.log("FINANCIALS: Aggregated data cached."); }
    catch (e) { console.error("FINANCIALS: Error caching aggregated data:", e); }

    // 5. Return the aggregated results
    return allFetchedTransactions;

} // End of getFinancialDetails


// --- CSV Generation and Download ---
/**
 * Generates a CSV string from transaction details and triggers download.
 * @param {Array} transactions - Array of detailed sale objects (worker adds meta.app_requested_course_id).
 * @param {Array<{saleId: string, courseId: string}>} saleIdToCourseIdMap - Mapping list derived from login_data.
 */
function generateAndDownloadCsv(transactions, saleIdToCourseIdMap) {
    // Use shared functions if available
    const getElementFunc = typeof getElement === 'function' ? getElement : (id) => document.getElementById(id);
    const getCoursesFunc = typeof getSanAntonioCourses === 'function' ? getSanAntonioCourses : () => [];

    if (!transactions || transactions.length === 0) { alert("No financial data available to export."); return; }
    if (!saleIdToCourseIdMap || !Array.isArray(saleIdToCourseIdMap)) {
        console.error("CSV Error: Missing or invalid sale ID to Course ID map.", saleIdToCourseIdMap);
        alert("Error generating CSV: Cannot map sales to courses.");
        return;
    }

    console.log("FINANCIALS CSV: Generating...");
    const csvData = [];
    csvData.push([ "Sale ID", "Date", "Time", "Course Name", "Item Name", "Item Type", "Quantity", "Unit Price", "Item Subtotal", "Item Tax", "Item Total", "Sale Subtotal", "Sale Tax", "Sale Total" ]); // Headers
    const courses = getCoursesFunc();

    transactions.forEach((saleDetail, index) => {
        const saleAttributes = saleDetail?.data?.attributes;
        const saleId = saleDetail?.data?.id;

        // Look up the courseId using the saleId from the mapping list passed in
        const originalSaleInfo = saleIdToCourseIdMap.find(s => String(s.saleId) === String(saleId));
        const saleCourseId = originalSaleInfo ? originalSaleInfo.courseId : saleDetail?.meta?.app_requested_course_id; // Fallback to meta if map fails
        const course = courses.find(c => String(c.courseId) === String(saleCourseId));
        const courseName = course ? course.name.replace(/"/g, '""') : (saleCourseId ? `Course ID ${saleCourseId}` : 'Unknown Course');

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
            console.warn("FINANCIALS CSV: No 'included' items found for sale ID:", saleId);
             // Optionally add a summary row if needed
        }
    });

    console.log("FINANCIALS CSV: Generation complete. Triggering download.");
    const csvString = csvData.map(row => row.join(",")).join("\n");
    // Assumes downloadCSV function is defined below
    downloadCSV(csvString);
}

/**
 * Triggers the download of a CSV string as a file.
 * @param {string} csvString - The CSV data as a string.
 * @param {string} [filename='satxgolf_financials.csv'] - The desired filename.
 */
function downloadCSV(csvString, filename = 'satxgolf_financials.csv') {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url); link.setAttribute("download", filename);
        link.style.visibility = 'hidden'; document.body.appendChild(link);
        link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
    } else {
        // Fallback for older browsers
        window.open('data:text/csv;charset=utf-8,' + encodeURIComponent(csvString));
    }
}


// --- Main Function to Initialize Financials UI ---
/**
 * Initializes the financial summary section, handles data fetching/caching,
 * displays the summary, and sets up export/refresh buttons.
 */
async function initializeFinancialsSection() {
    console.log("FINANCIALS: Initializing section (async)...");
    // Use shared getElement from utils.js if available, otherwise fallback
    const getElementFunc = typeof getElement === 'function' ? getElement : (id, msg, crit) => document.getElementById(id);

    const financialSummaryDiv = getElementFunc('financialSummary', 'Financial summary div not found', false);
    // Reference buttons later, just before adding listeners
    let fullTransactionData = []; // Holds the detailed results
    let originalSalesList = [];   // Holds mapping [{saleId, courseId}, ...]
    let currentLoginDataIdentifier = ''; // Holds hash for cache check

    // Helper to finalize UI state (hide loader, show container)
    const finalizeUI = () => {
        console.log("FINANCIALS: Finalizing UI state...");
        const loadingIndicator = getElementFunc('loadingIndicator', 'Main loading indicator not found', false);
        const statsContainer = getElementFunc('statsContainer', 'Main stats container not found', false);
        if (loadingIndicator) { loadingIndicator.style.display = 'none'; }
        else { console.warn("FINANCIALS: Main loading indicator not found to hide."); }
        if (statsContainer) { statsContainer.style.display = 'grid'; } // Use grid or block
        else { console.warn("FINANCIALS: Main stats container not found to show."); }
    };

    if (!financialSummaryDiv) {
        console.error("FINANCIALS: financialSummary div not found. Cannot initialize financials display.");
        finalizeUI(); // Still finalize main UI state
        return;
    }

    // Set initial loading message
    financialSummaryDiv.innerHTML = '<p>Loading financial summary...</p>';
    const initialExportBtn = getElementFunc('exportCsvBtn', '', false);
    const initialRefreshBtn = getElementFunc('refreshFinancialsBtn', '', false);
    if (initialExportBtn) initialExportBtn.style.display = 'none';
    if (initialRefreshBtn) initialRefreshBtn.disabled = true;

    try {
        // Get sales list and identifier using the helper function
        if (typeof extractSalesFromLoginData !== 'function') { throw new Error("extractSalesFromLoginData function missing."); }
        const extractionResult = extractSalesFromLoginData();
        originalSalesList = extractionResult.salesToFetch;
        currentLoginDataIdentifier = extractionResult.identifier;

        // Get detailed data (pass identifier to caching function)
        if (typeof getFinancialDetails !== 'function') { throw new Error("getFinancialDetails function missing."); }
        fullTransactionData = await getFinancialDetails(currentLoginDataIdentifier, false);

        // Calculate and display summary, passing the map derived above
        displaySummary(fullTransactionData, originalSalesList); // Call internal helper

    } catch (error) {
        console.error("FINANCIALS: Error loading initial financial details:", error);
        if(financialSummaryDiv) financialSummaryDiv.innerHTML = `<p style="color: red;">Error loading financial summary: ${error.message}</p>`;
    } finally {
        // Ensure UI is updated regardless of success/error
        finalizeUI();
        const refreshBtn = getElementFunc('refreshFinancialsBtn','',false); // Get fresh reference
        if (refreshBtn) refreshBtn.disabled = false; // Re-enable refresh button
    }


    // --- Internal helper function to display summary ---
    function displaySummary(transactionDetails, saleIdToCourseIdMap) {
        // Get element references inside the function for safety
        const summaryDiv = getElementFunc('financialSummary');
        const exportBtn = getElementFunc('exportCsvBtn','',false);

        if (!summaryDiv) { console.error("FINANCIALS Display: summaryDiv missing"); return; } // Guard clause

        if (!transactionDetails || transactionDetails.length === 0) {
             summaryDiv.innerHTML = '<h3>Spending This Year</h3><p>No financial data found.</p>';
             if (exportBtn) exportBtn.style.display = 'none';
             return;
        }
        if (!saleIdToCourseIdMap || !Array.isArray(saleIdToCourseIdMap)) {
             console.error("FINANCIALS Display: Invalid or missing saleIdToCourseIdMap.");
             summaryDiv.innerHTML = '<h3>Spending This Year</h3><p style="color:red;">Error: Cannot map sales to courses.</p>';
             if (exportBtn) exportBtn.style.display = 'none';
             return;
        }

        const currentYear = new Date().getFullYear();
        const spendingByCourse = {};
        const courses = typeof getSanAntonioCourses === 'function' ? getSanAntonioCourses() : [];

        console.log("FINANCIALS Display: Starting summary calculation.");

        transactionDetails.forEach((saleDetail) => {
             const saleAttributes = saleDetail?.data?.attributes;
             const saleId = saleDetail?.data?.id;
             const originalSaleInfo = saleIdToCourseIdMap.find(s => String(s.saleId) === String(saleId));
             const saleCourseId = originalSaleInfo ? originalSaleInfo.courseId : saleDetail?.meta?.app_requested_course_id; // Fallback to meta
             const saleTime = saleAttributes?.saleTime;
             const saleTotalRaw = saleAttributes?.total;
             const saleTotal = parseFloat(saleTotalRaw || 'NaN');

             if (saleTime && saleCourseId && !isNaN(saleTotal)) {
                 try {
                     if (new Date(saleTime).getFullYear() === currentYear) {
                          const course = courses.find(c => String(c.courseId) === String(saleCourseId));
                          const courseName = course ? course.name : `Course ID ${saleCourseId}`;
                          spendingByCourse[courseName] = (spendingByCourse[courseName] || 0) + saleTotal;
                     }
                 } catch (dateError) { console.error(`FINANCIALS Display: Error parsing saleTime '${saleTime}'...`, dateError); }
             } else { /* console.warn("FINANCIALS Display: Skipping sale for summary..."); */ }
        });

        console.log("FINANCIALS Display: Final spendingByCourse:", spendingByCourse);
        const summaryListHtml = Object.entries(spendingByCourse)
            .sort(([nameA], [nameB]) => nameA.localeCompare(nameB))
            .map(([name, total]) => `<li><span class="course-name">${name}</span><span class="amount">$${total.toFixed(2)}</span></li>`)
            .join('');

        summaryDiv.innerHTML = `<h3>Spending This Year</h3><ul class="financial-list">${summaryListHtml}${Object.keys(spendingByCourse).length === 0 ? '<li>No spending recorded this year.</li>' : ''}</ul>`;
        console.log("FINANCIALS Display: Updated financialSummaryDiv innerHTML.");

        if (exportBtn && transactionDetails.length > 0 && Object.keys(spendingByCourse).length > 0) {
             exportBtn.style.display = 'inline-block'; console.log("FINANCIALS Display: Showing export button.");
        } else if (exportBtn) {
             exportBtn.style.display = 'none'; console.log("FINANCIALS Display: Hiding export button.");
        }
    } // --- End displaySummary helper function ---


    // --- Add Listener for Export Button ---
    // Get element reference HERE, just before adding listener
    const exportButtonElement = getElementFunc('exportCsvBtn', 'Export button not found for listener setup', false);
    if (exportButtonElement) {
        console.log("FINANCIALS: Found export button, setting up listener.");
        const newExportCsvBtn = exportButtonElement.cloneNode(true);
        exportButtonElement.parentNode.replaceChild(newExportCsvBtn, exportButtonElement);
        newExportCsvBtn.addEventListener('click', () => {
            console.log("FINANCIALS Export: Button clicked.");
            if (typeof generateAndDownloadCsv === 'function') { generateAndDownloadCsv(fullTransactionData, originalSalesList); }
            else { console.error("FINANCIALS Export: generateAndDownloadCsv function missing."); alert("Error: Could not generate export file."); }
        });
    } else { console.warn("FINANCIALS: Export button element not found when setting up listener."); }

    // --- Add Listener for Refresh Button ---
     // Get element reference HERE, just before adding listener
    const refreshButtonElement = getElementFunc('refreshFinancialsBtn', 'Refresh button not found for listener setup', false);
    if (refreshButtonElement) {
        console.log("FINANCIALS: Found refresh button, setting up listener.");
        const newRefreshBtn = refreshButtonElement.cloneNode(true);
        refreshButtonElement.parentNode.replaceChild(newRefreshBtn, refreshButtonElement); // Replace to clear old listeners implicitly
        newRefreshBtn.addEventListener('click', async () => {
            console.log("FINANCIALS: Refresh button clicked.");
            if (financialSummaryDiv) financialSummaryDiv.innerHTML = '<p>Refreshing financial summary...</p>';
            const currentExportBtn = document.getElementById('exportCsvBtn'); // Re-find export button
            if (currentExportBtn) currentExportBtn.style.display = 'none';
            newRefreshBtn.disabled = true;
            try {
               if (typeof extractSalesFromLoginData !== 'function') throw new Error("extractSalesFromLoginData missing.");
               const extractionResult = extractSalesFromLoginData(); // Get latest map/identifier
               originalSalesList = extractionResult.salesToFetch;
               currentLoginDataIdentifier = extractionResult.identifier;
               console.log("FINANCIALS Refresh: Regenerated map:", originalSalesList);

               if (typeof getFinancialDetails !== 'function') throw new Error("getFinancialDetails missing.");
               fullTransactionData = await getFinancialDetails(currentLoginDataIdentifier, true); // Force refresh

               displaySummary(fullTransactionData, originalSalesList); // Re-display, passing UPDATED map
            } catch (error) {
                console.error("FINANCIALS: Error refreshing financial details:", error);
                if (financialSummaryDiv) financialSummaryDiv.innerHTML = `<p style="color: red;">Error refreshing financial summary: ${error.message}</p>`;
            } finally {
                newRefreshBtn.disabled = false; // Re-enable button
            }
        });
    } else { console.warn("FINANCIALS: Refresh button element not found when setting up listener."); }

} // --- End of initializeFinancialsSection ---


// --- Function to clear cache (called from logout) ---
function clearFinancialCache() {
    try {
        localStorage.removeItem(FINANCIAL_CACHE_KEY);
        console.log('FINANCIALS: Cache cleared.');
    } catch (e) {
        console.error("FINANCIALS: Error clearing cache", e);
    }
}

