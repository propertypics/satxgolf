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
async function getFinancialDetails(forceRefresh = false) {
    console.log(`FINANCIALS: Getting financial details... Force refresh: ${forceRefresh}`);
    // Use shared getElement from utils.js if available, otherwise fallback
    const getElementFunc = typeof getElement === 'function' ? getElement : (id) => document.getElementById(id);

    const cachedDataString = localStorage.getItem(FINANCIAL_CACHE_KEY);
    const loginDataStr = localStorage.getItem('login_data');
    let cachedData = null;

    if (!loginDataStr) {
        console.error("FINANCIALS: Login data not found.");
        throw new Error("Login data not found. Cannot process financials.");
    }

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
         localStorage.setItem(FINANCIAL_CACHE_KEY, JSON.stringify(emptyCache)); // Cache empty result
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
        console.log(`FINANCIALS: Successfully fetched details for ${freshTransactions.length} sales.`);

        // Cache the fresh data
        const dataToCache = { loginDataIdentifier: currentLoginDataIdentifier, transactions: freshTransactions };
        try { localStorage.setItem(FINANCIAL_CACHE_KEY, JSON.stringify(dataToCache)); console.log("FINANCIALS: Data cached."); }
        catch (e) { console.error("FINANCIALS: Error caching data:", e); } // Continue even if caching fails
        return freshTransactions;
    } catch (error) { console.error("FINANCIALS: Error fetching sale details:", error); throw error; } // Re-throw
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
