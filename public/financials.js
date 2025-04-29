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
    function displaySummary(transactionDetails, saleIdToCourseIdMap) {
        if (!financialSummaryDiv) return;

        if (!transactionDetails || transactionDetails.length === 0) {
             financialSummaryDiv.innerHTML = '<h3>Spending This Year</h3><p>No financial data found.</p>';
             if (exportCsvBtn) exportCsvBtn.style.display = 'none';
             return;
        }

        const currentYear = new Date().getFullYear();
        const spendingByCourse = {};
        const courses = typeof getSanAntonioCourses === 'function' ? getSanAntonioCourses() : [];

        transactionDetails.forEach(saleDetail => {
             const saleAttributes = saleDetail?.data?.attributes;
             const saleId = saleDetail?.data?.id; // Get ID from the fetched detail
             const saleTime = saleAttributes?.saleTime;
             const saleTotal = parseFloat(saleAttributes?.total || 0);

             // *** Look up the courseId using the saleId from the original list ***
             const originalSaleInfo = saleIdToCourseIdMap.find(s => String(s.saleId) === String(saleId));
             const saleCourseId = originalSaleInfo ? originalSaleInfo.courseId : null;
             // *** End lookup ***

             console.log(`FINANCIALS Display: Processing SaleID: ${saleId}, Found CourseID: ${saleCourseId}, Time: ${saleTime}, Total: ${saleTotal}`); // Add log

             if (saleTime && saleCourseId && !isNaN(saleTotal)) {
                 if (new Date(saleTime).getFullYear() === currentYear) {
                      // Map courseId to name
                      const course = courses.find(c => String(c.courseId) === String(saleCourseId));
                      const courseName = course ? course.name : `Course ID ${saleCourseId}`;
                      spendingByCourse[courseName] = (spendingByCourse[courseName] || 0) + saleTotal;
                 }
             } else {
                 console.warn("FINANCIALS Display: Skipping sale for summary due to missing data:", {saleId, saleTime, saleCourseId, saleTotal});
             }
        });

        // Generate HTML (same as before)
        const summaryListHtml = Object.entries(spendingByCourse) /* ... sort ... */ .map(/* ... generate li ... */).join('');
        financialSummaryDiv.innerHTML = `<h3>Spending This Year</h3><ul class="financial-list">${summaryListHtml}${Object.keys(spendingByCourse).length === 0 ? '<li>No spending recorded this year.</li>' : ''}</ul>`;

        // Show export button
        if (exportCsvBtn && transactionDetails.length > 0) exportCsvBtn.style.display = 'inline-block';
        else if (exportCsvBtn) exportCsvBtn.style.display = 'none';

    } // End displaySummary helper


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
