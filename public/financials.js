// --- START OF FILE financials.js ---

// Relies on functions/constants from utils.js being loaded first:
// API_BASE_URL, FINANCIAL_CACHE_KEY (defined below), getElement,
// getSanAntonioCourses, simpleHash, formatDate (if used in CSV/Display)

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

// --- PASTE THIS ENTIRE FUNCTION INTO financials.js ---

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

    // --- Prepare sales list and identifier from current login_data ---
    try {
        const loginData = JSON.parse(loginDataStr);
        let salesListString = '';
        const uniqueSales = new Map();

        if (loginData.passes && typeof loginData.passes === 'object') {
            const passIds = Object.keys(loginData.passes);
            if (passIds.length > 0) {
                const pass = loginData.passes[passIds[0]];
                if (pass && pass.uses && Array.isArray(pass.uses)) {
                    pass.uses.forEach(use => {
                        const saleId = use.sale_id;
                        const teesheetId = use.teesheet_id; // Use teesheet_id for mapping
                        if (saleId && teesheetId) {
                            // Find courseId using the mapping function
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
    // --- End prepare ---

    // --- Check Cache ---
    if (cachedDataString && !forceRefresh) {
        try {
            cachedData = JSON.parse(cachedDataString);
            if (cachedData?.loginDataIdentifier === currentLoginDataIdentifier) {
                console.log("FINANCIALS: Using cached data.");
                return cachedData.transactions; // Return valid cached data
            } else { console.log(`FINANCIALS: Cache invalid.`); localStorage.removeItem(FINANCIAL_CACHE_KEY); }
        } catch (e) { console.error("FINANCIALS: Error parsing cache:", e); localStorage.removeItem(FINANCIAL_CACHE_KEY); }
    }
    // --- End Check Cache ---

    // --- Fetch Fresh Data ---
    if (salesToFetch.length === 0) {
         console.log("FINANCIALS: No sales found to fetch details for.");
         const emptyCache = { loginDataIdentifier: currentLoginDataIdentifier, transactions: [] };
         try { // Wrap cache setting in try-catch
             localStorage.setItem(FINANCIAL_CACHE_KEY, JSON.stringify(emptyCache));
         } catch (cacheError) {
              console.error("FINANCIALS: Error caching empty results:", cacheError);
         }
         return []; // Return empty array
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
        // Basic validation of response structure
        if (!Array.isArray(freshTransactions)) {
             console.error("FINANCIALS: Worker response is not an array:", freshTransactions);
             throw new Error("Received invalid data format from server.");
        }
        console.log(`FINANCIALS: Successfully fetched details for ${freshTransactions.length} sales.`);

        // Cache the fresh data
        const dataToCache = { loginDataIdentifier: currentLoginDataIdentifier, transactions: freshTransactions };
        try { localStorage.setItem(FINANCIAL_CACHE_KEY, JSON.stringify(dataToCache)); console.log("FINANCIALS: Data cached."); }
        catch (e) { console.error("FINANCIALS: Error caching data:", e); } // Continue even if caching fails
        return freshTransactions;

    } catch (error) {
        console.error("FINANCIALS: Error fetching sale details from worker:", error);
        throw error; // Re-throw error to be handled by initializeFinancialsSection
    }
    // --- End Fetch Fresh Data ---
} // --- END OF getFinancialDetails FUNCTION ---

// --- Make sure other functions like generateAndDownloadCsv, downloadCSV, initializeFinancialsSection, clearFinancialCache are also present in financials.js ---


// Main Function to Initialize Financials UI
async function initializeFinancialsSection() {
    console.log("FINANCIALS: Initializing section (async)...");
    const getElementFunc = typeof getElement === 'function' ? getElement : (id) => document.getElementById(id);
    const financialSummaryDiv = getElementFunc('financialSummary', '...', false);
    // ... (get other buttons, loader, container) ...

    let fullTransactionData = []; // Holds the detailed results from the worker
    let originalSalesList = []; // <<< ADDED: Holds the initial {saleId, courseId} list

    // Helper to finalize UI
    const finalizeUI = () => { /* ... hide loader, show container ... */ };

    if (!financialSummaryDiv) { /* ... handle missing element ... */ finalizeUI(); return; }

    financialSummaryDiv.innerHTML = '<p>Loading financial summary...</p>';
    // ... (hide buttons etc.) ...

    try {
        // --- Regenerate the original saleId/courseId list ---
        // This duplicates logic from getFinancialDetails but ensures we have the mapping
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
                        if (!uniqueSales.has(key)) {
                            uniqueSales.set(key, { saleId: String(saleId), courseId: courseId });
                        }
                    }
                }
             });
        }
        originalSalesList = Array.from(uniqueSales.values()); // <<< STORE the mapping list
        console.log("FINANCIALS: Regenerated original sales list for mapping:", originalSalesList);
        // --- End Regenerate ---


        // Get detailed data (cached or fetched)
        fullTransactionData = await getFinancialDetails(); // Use await

        // Calculate and display summary, passing the original list for lookup
        displaySummary(fullTransactionData, originalSalesList); // <<< PASS the mapping list

    } catch (error) {
        console.error("FINANCIALS: Error loading initial financial details:", error);
        if(financialSummaryDiv) financialSummaryDiv.innerHTML = `<p style="color: red;">Error loading financial summary: ${error.message}</p>`;
    } finally {
        finalizeUI(); // Ensure UI updates
        // ... (re-enable refresh button) ...
    }


    // --- Internal helper to display summary ---
    // *** MODIFIED to accept originalSalesList ***

/ --- Internal helper function to display summary ---
    // *** Takes transactionDetails (results) and saleIdToCourseIdMap (original list) ***
    function displaySummary(transactionDetails, saleIdToCourseIdMap) {
        // Use shared getElement from utils.js if available, otherwise fallback
        const getElementFunc = typeof getElement === 'function' ? getElement : (id) => document.getElementById(id);
        const financialSummaryDiv = getElementFunc('financialSummary'); // Get div reference inside function
        const exportCsvBtn = getElementFunc('exportCsvBtn', '', false); // Get button reference inside function

        if (!financialSummaryDiv) {
            console.error("FINANCIALS Display: Cannot find financialSummaryDiv to update.");
            return; // Exit if display area not found
        }

        if (!transactionDetails || transactionDetails.length === 0) {
             financialSummaryDiv.innerHTML = '<h3>Spending This Year</h3><p>No financial data found.</p>';
             if (exportCsvBtn) exportCsvBtn.style.display = 'none';
             return;
        }
        // Ensure the map is valid
        if (!saleIdToCourseIdMap || !Array.isArray(saleIdToCourseIdMap)) {
             console.error("FINANCIALS Display: Invalid or missing saleIdToCourseIdMap.");
             financialSummaryDiv.innerHTML = '<h3>Spending This Year</h3><p style="color:red;">Error: Cannot map sales to courses.</p>';
             if (exportCsvBtn) exportCsvBtn.style.display = 'none';
             return;
        }


        const currentYear = new Date().getFullYear();
        const spendingByCourse = {};
        // Use shared course data source
        const courses = typeof getSanAntonioCourses === 'function' ? getSanAntonioCourses() : [];
        if (courses.length === 0) console.warn("FINANCIALS Display: Course list is empty.");


        console.log("FINANCIALS Display: Starting summary calculation. Input transaction count:", transactionDetails?.length);
        console.log("FINANCIALS Display: Using saleId->courseId map:", saleIdToCourseIdMap);

        // Iterate through the DETAILED transaction data returned by the worker
        transactionDetails.forEach((saleDetail, index) => {
             const saleAttributes = saleDetail?.data?.attributes;
             const saleId = saleDetail?.data?.id; // Get ID from the fetched detail

             // ---vvv--- DETAILED LOGGING ---vvv---
             console.log(`\n--- Processing Sale Detail #${index + 1} ---`);
             // console.log("Raw saleDetail:", saleDetail); // Optional: Log the whole object if needed, can be very verbose
             console.log("Extracted saleId:", saleId, `(Type: ${typeof saleId})`);

             // Look up the courseId using the saleId from the original mapping list
             const originalSaleInfo = saleIdToCourseIdMap.find(s => String(s.saleId) === String(saleId));
             console.log("Lookup result in originalSalesList:", originalSaleInfo);
             const saleCourseId = originalSaleInfo ? originalSaleInfo.courseId : null;
             console.log("Derived saleCourseId:", saleCourseId, `(Type: ${typeof saleCourseId})`);

             // Extract time and total
             const saleTime = saleAttributes?.saleTime;
             const saleTotalRaw = saleAttributes?.total;
             const saleTotal = parseFloat(saleTotalRaw || 'NaN'); // Force NaN if missing/null
             console.log("Extracted saleTime:", saleTime, `(Type: ${typeof saleTime})`);
             console.log("Extracted saleTotalRaw:", saleTotalRaw, `(Type: ${typeof saleTotalRaw})`);
             console.log("Parsed saleTotal:", saleTotal, `(Is NaN: ${isNaN(saleTotal)})`);

             // Check components before the IF
             const isSaleTimeValid = !!saleTime; // Check if saleTime is truthy
             const isCourseIdValid = !!saleCourseId; // Check if saleCourseId was found
             const isTotalValid = !isNaN(saleTotal); // Check if parsing to float worked
             console.log(`Check components: saleTime=${isSaleTimeValid}, saleCourseId=${isCourseIdValid}, !isNaN(saleTotal)=${isTotalValid}`);
             // ---^^^--- END DETAILED LOGGING ---^^^---


             // Check if all necessary components are valid
             if (isSaleTimeValid && isCourseIdValid && isTotalValid) {
                 try { // Add try-catch around date parsing
                     const saleYear = new Date(saleTime).getFullYear();
                     if (saleYear === currentYear) {
                          // Map courseId to name
                          const course = courses.find(c => String(c.courseId) === String(saleCourseId));
                          const courseName = course ? course.name : `Course ID ${saleCourseId}`;
                          // Aggregate spending
                          spendingByCourse[courseName] = (spendingByCourse[courseName] || 0) + saleTotal;
                     }
                 } catch (dateError) {
                      console.error(`FINANCIALS Display: Error parsing saleTime '${saleTime}' for saleId ${saleId}:`, dateError);
                      console.warn("FINANCIALS Display: Skipping sale for summary due to invalid date:", {saleId, saleTime, saleCourseId, saleTotal});
                 }
             } else {
                 // Log why it's being skipped
                 console.warn("FINANCIALS Display: Skipping sale for summary due to missing/invalid data:", {saleId, saleTime, saleCourseId, saleTotal});
             }
        }); // End forEach

        // --- Generate HTML for the summary list ---
        console.log("FINANCIALS Display: Final spendingByCourse:", spendingByCourse);
        const summaryListHtml = Object.entries(spendingByCourse)
            .sort(([nameA], [nameB]) => nameA.localeCompare(nameB)) // Sort courses alphabetically
            .map(([name, total]) => `<li><span class="course-name">${name}</span><span class="amount">$${total.toFixed(2)}</span></li>`)
            .join('');

        // Update the UI
        financialSummaryDiv.innerHTML = `<h3>Spending This Year</h3><ul class="financial-list">${summaryListHtml}${Object.keys(spendingByCourse).length === 0 ? '<li>No spending recorded this year.</li>' : ''}</ul>`;
        console.log("FINANCIALS Display: Updated financialSummaryDiv innerHTML.");

        // Show/hide export button
        if (exportCsvBtn && transactionDetails.length > 0 && Object.keys(spendingByCourse).length > 0) { // Also check if summary has entries
             exportCsvBtn.style.display = 'inline-block';
             console.log("FINANCIALS Display: Showing export button.");
        } else if (exportCsvBtn) {
             exportCsvBtn.style.display = 'none';
             console.log("FINANCIALS Display: Hiding export button.");
        }

    } // --- End displaySummary helper function ---

    // --- Add Listener for Export Button ---
     if (exportCsvBtn) {
        exportCsvBtn.replaceWith(exportCsvBtn.cloneNode(true));
        const newExportCsvBtn = document.getElementById('exportCsvBtn');
        if (newExportCsvBtn) {
            // *** Pass the originalSalesList to the CSV generator too ***
            newExportCsvBtn.addEventListener('click', () => generateAndDownloadCsv(fullTransactionData, originalSalesList));
        }
    }

     // --- Add Listener for Refresh Button ---
    if (refreshFinancialsBtn) {
        refreshFinancialsBtn.replaceWith(refreshFinancialsBtn.cloneNode(true));
        const newRefreshBtn = document.getElementById('refreshFinancialsBtn');
        if (newRefreshBtn) {
             newRefreshBtn.addEventListener('click', async () => {
                 // ... (show refreshing message, disable button) ...
                 try {
                    // We need the latest originalSalesList again after refresh potentially
                    // Re-run the list generation (could be a separate function)
                    const loginDataStr = localStorage.getItem('login_data');
                    if (!loginDataStr) throw new Error("Login data missing for refresh.");
                    const loginData = JSON.parse(loginDataStr);
                    const uniqueSales = new Map(); const courses = getSanAntonioCourses();
                    // ... (loop through loginData.passes.uses to build uniqueSales Map - same as above) ...
                    originalSalesList = Array.from(uniqueSales.values()); // Update the list used for mapping

                    fullTransactionData = await getFinancialDetails(true); // Force refresh
                    displaySummary(fullTransactionData, originalSalesList); // Re-display summary, passing the UPDATED mapping list
                 } catch (error) {
                     // ... (handle refresh error) ...
                 } finally {
                     // ... (re-enable button) ...
                 }
             });
        }
    }
} // End of initializeFinancialsSection

// --- Modify CSV Generation to accept and use the mapping list ---
// *** MODIFIED Signature ***
function generateAndDownloadCsv(transactions, saleIdToCourseIdMap) {
    if (!transactions || transactions.length === 0) { /* ... alert ... */ return; }
    if (!saleIdToCourseIdMap) { console.error("CSV Error: Missing sale ID to Course ID map."); alert("Error generating CSV: Data mapping missing."); return; }

    console.log("FINANCIALS: Generating CSV...");
    const csvData = [];
    csvData.push([ /* ... Headers ... */ ]);
    const courses = typeof getSanAntonioCourses === 'function' ? getSanAntonioCourses() : [];

    transactions.forEach(saleDetail => {
        const saleAttributes = saleDetail?.data?.attributes;
        const saleId = saleDetail?.data?.id;
        // *** Look up CourseID from map ***
        const originalSaleInfo = saleIdToCourseIdMap.find(s => String(s.saleId) === String(saleId));
        const saleCourseId = originalSaleInfo ? originalSaleInfo.courseId : null;
        // *** Get Course Name from looked-up CourseID ***
        const course = courses.find(c => String(c.courseId) === String(saleCourseId));
        const courseName = course ? course.name.replace(/"/g, '""') : `Course ID ${saleCourseId}`;
        // ... (extract saleTime, saleTotal, etc. as before) ...

        if (saleDetail.included && Array.isArray(saleDetail.included)) {
            saleDetail.included.forEach(item => {
                // ... (extract item details) ...
                // *** Use the looked-up courseName ***
                csvData.push([ /* ..., courseName, ... */ ]);
            });
        }
    });
    const csvString = csvData.map(row => row.join(",")).join("\n");
    downloadCSV(csvString);
}


// --- CSV Generation and Download ---
function generateAndDownloadCsv(transactions) {
    // Use shared getElement from utils.js if available, otherwise fallback
    const getElementFunc = typeof getElement === 'function' ? getElement : (id) => document.getElementById(id);

    if (!transactions || transactions.length === 0) { alert("No financial data available to export."); return; }
    console.log("FINANCIALS: Generating CSV...");
    const csvData = [];
    // Define Headers
    csvData.push([ "Sale ID", "Date", "Time", "Course Name", "Item Name", "Item Type", "Quantity", "Unit Price", "Item Subtotal", "Item Tax", "Item Total", "Sale Subtotal", "Sale Tax", "Sale Total" ]);
    // Use shared course data source
    const courses = typeof getSanAntonioCourses === 'function' ? getSanAntonioCourses() : [];

    transactions.forEach(saleDetail => {
        const saleAttributes = saleDetail?.data?.attributes;
        const saleId = saleDetail?.data?.id;
        const saleTimeISO = saleAttributes?.saleTime;
        const saleTotal = saleAttributes?.total ?? '';
        const saleSubtotal = saleAttributes?.subtotal ?? '';
        const saleTax = saleAttributes?.tax ?? '';
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
        } else { console.warn("FINANCIALS: No 'included' items found for sale ID:", saleId); }
    });
    const csvString = csvData.map(row => row.join(",")).join("\n");
    downloadCSV(csvString); // Trigger download
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

    let fullTransactionData = []; // Holds data for export/refresh

    // Set loading message specific to this section
    financialSummaryDiv.innerHTML = '<p>Loading financial summary...</p>';
    if (exportCsvBtn) exportCsvBtn.style.display = 'none';
    if (refreshFinancialsBtn) refreshFinancialsBtn.disabled = true;


    try {
        // Get data (cached or fetched) using await
        fullTransactionData = await getFinancialDetails();

        // Calculate and display summary...
        displaySummary(); // Call internal helper

    } catch (error) {
        console.error("FINANCIALS: Error loading initial financial details:", error);
        if(financialSummaryDiv) financialSummaryDiv.innerHTML = `<p style="color: red;">Error loading financial summary: ${error.message}</p>`;
        // financialsLoadedSuccessfully remains false or isn't needed here
    } finally {
        // This block runs AFTER the try/catch finishes (success or error)
        // Ensure the main UI elements (loader/container) are updated
        finalizeUI();
        // Re-enable refresh button
        if (refreshFinancialsBtn) refreshFinancialsBtn.disabled = false;
    }


    // Internal helper function to display summary
    function displaySummary() {
        if (!financialSummaryDiv) return; // Guard clause

        if (!fullTransactionData || fullTransactionData.length === 0) {
             financialSummaryDiv.innerHTML = '<h3>Spending This Year</h3><p>No financial data found.</p>'; // Add header for consistency
             if (exportCsvBtn) exportCsvBtn.style.display = 'none';
             return;
        }

        const currentYear = new Date().getFullYear();
        const spendingByCourse = {};
        // Use shared course data source
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
             } else {
                 console.warn("FINANCIALS: Skipping sale for summary due to missing data in displaySummary:", saleDetail);
             }
        });

        // Generate HTML for the summary list
        const summaryListHtml = Object.entries(spendingByCourse)
            .sort(([nameA], [nameB]) => nameA.localeCompare(nameB)) // Sort courses alphabetically
            .map(([name, total]) => `<li><span class="course-name">${name}</span><span class="amount">$${total.toFixed(2)}</span></li>`)
            .join('');

        financialSummaryDiv.innerHTML = `<h3>Spending This Year</h3><ul class="financial-list">${summaryListHtml}${Object.keys(spendingByCourse).length === 0 ? '<li>No spending recorded this year.</li>' : ''}</ul>`;

        // Show export button if data exists
        if (exportCsvBtn && fullTransactionData.length > 0) exportCsvBtn.style.display = 'inline-block';
        else if (exportCsvBtn) exportCsvBtn.style.display = 'none';

    } // End displaySummary helper


    // Add Listener for Export Button
     if (exportCsvBtn) {
        exportCsvBtn.replaceWith(exportCsvBtn.cloneNode(true)); // Avoid duplicate listeners
        const newExportCsvBtn = document.getElementById('exportCsvBtn'); // Use basic getElementById
        if (newExportCsvBtn) {
            newExportCsvBtn.addEventListener('click', () => generateAndDownloadCsv(fullTransactionData));
        }
    }

     // Add Listener for Refresh Button
    if (refreshFinancialsBtn) {
        refreshFinancialsBtn.replaceWith(refreshFinancialsBtn.cloneNode(true)); // Avoid duplicate listeners
        const newRefreshBtn = document.getElementById('refreshFinancialsBtn'); // Use basic getElementById
        if (newRefreshBtn) {
             newRefreshBtn.addEventListener('click', async () => {
                 console.log("FINANCIALS: Refresh button clicked.");
                 if (financialSummaryDiv) financialSummaryDiv.innerHTML = '<p>Refreshing financial summary...</p>'; // Show loading state HERE
                 if (exportCsvBtn) exportCsvBtn.style.display = 'none';
                 newRefreshBtn.disabled = true; // Disable button during refresh
                 try {
                    fullTransactionData = await getFinancialDetails(true); // Force refresh
                    displaySummary(); // Re-display summary using internal helper
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
