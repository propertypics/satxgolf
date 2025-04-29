// --- START OF FILE financials.js ---

// Assume API_BASE_URL is globally available or passed in/imported if using modules
// For simplicity now, let's redefine it here if needed, or ensure it's global.
// const API_BASE_URL = "https://satxgolf.wade-lewis.workers.dev"; // Uncomment if not global

console.log("financials.js loaded"); // Log to confirm file loading

// --- Constants ---
const FINANCIAL_CACHE_KEY = 'user_financial_details_cache';

// --- Helper Functions needed by Financials ---

// Basic date formatting (can be shared or duplicated)
function formatFinancialsDate(dateStr) {
    if (!dateStr) return 'N/A';
    try {
        const date = new Date(dateStr.replace(/-/g, '/'));
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) { return dateStr; }
}

// Simple hashing function (can be shared or duplicated)
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return String(hash);
}

// Option 1: Assume a global function exists (defined in another script or globally)
// Option 2: Pass the course list into functions that need it
// Option 3: Redefine it here (simpler for now, but duplicates data)
function getFinancialsSanAntonioCourses() {
     console.warn("getFinancialsSanAntonioCourses using placeholder data. Ensure real data source is used.");
    return [
        { name: "Brackenridge Park", courseId: "20103", facilityId: "3564" },
        { name: "Cedar Creek", courseId: "20104", facilityId: "3565" },
        { name: "Mission del Lago", courseId: "20105", facilityId: "3566" },
        { name: "Northern Hills", courseId: "20106", facilityId: "3567" },
        { name: "Olmos Basin", courseId: "20107", facilityId: "3568" },
        { name: "Riverside 18", courseId: "20108", facilityId: "3569" },
        { name: "The Teddy Bear Par 3", courseId: "20108", facilityId: "3570" },
        { name: "San Pedro Par 3", courseId: "20109", facilityId: "3572" }
    ];
}

// --- Financial Data Fetching & Caching ---
async function getFinancialDetails(forceRefresh = false) {
    console.log(`FINANCIALS: Getting financial details... Force refresh: ${forceRefresh}`);
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
        const courses = getFinancialsSanAntonioCourses(); // Get course mapping

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
                            } else { console.warn(`FINANCIALS: Could not map teesheet_id: ${teesheetId}`); }
                        } else { /* console.warn("FINANCIALS: Skipping use entry - missing sale_id or teesheet_id:", use); */ }
                    });
                }
            }
        }
        salesToFetch = Array.from(uniqueSales.values());
        currentLoginDataIdentifier = simpleHash(salesListString.split(';').sort().join(';'));
        console.log(`FINANCIALS: Current login_data identifier: ${currentLoginDataIdentifier}`);
        console.log(`FINANCIALS: Unique Sales to fetch details for: ${salesToFetch.length}`);
    } catch (e) {
        console.error("FINANCIALS: Error processing login_data:", e);
        throw new Error("Could not process login data for financial fetch.");
    }

    // Check Cache
    if (cachedDataString && !forceRefresh) {
        try {
            cachedData = JSON.parse(cachedDataString);
            if (cachedData?.loginDataIdentifier === currentLoginDataIdentifier) {
                console.log("FINANCIALS: Using cached data (identifier matches).");
                return cachedData.transactions;
            } else { console.log(`FINANCIALS: Cache invalid (identifier mismatch or missing).`); localStorage.removeItem(FINANCIAL_CACHE_KEY); }
        } catch (e) { console.error("FINANCIALS: Error parsing cache:", e); localStorage.removeItem(FINANCIAL_CACHE_KEY); }
    }

    // Fetch Fresh Data
    if (salesToFetch.length === 0) {
         console.log("FINANCIALS: No sales found to fetch details for.");
         const emptyCache = { loginDataIdentifier: currentLoginDataIdentifier, transactions: [] };
         localStorage.setItem(FINANCIAL_CACHE_KEY, JSON.stringify(emptyCache));
         return [];
    }
    console.log(`FINANCIALS: Cache miss or invalid. Fetching fresh details...`);
    const token = localStorage.getItem('jwt_token'); const cookies = localStorage.getItem('foreup_cookies');
    if (!token) throw new Error("Authentication required for fetching financials.");

    // ** IMPORTANT: Make sure API_BASE_URL is accessible here **
    const workerApiUrl = (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'https://satxgolf.wade-lewis.workers.dev') + '/api/sale-details';

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
        try {
            localStorage.setItem(FINANCIAL_CACHE_KEY, JSON.stringify(dataToCache));
            console.log("FINANCIALS: Data cached.");
        } catch (e) { console.error("FINANCIALS: Error caching data:", e); }
        return freshTransactions;
    } catch (error) { console.error("FINANCIALS: Error fetching sale details:", error); throw error; }
}

// --- CSV Generation and Download ---
function generateAndDownloadCsv(transactions) {
    if (!transactions || transactions.length === 0) { alert("No financial data available to export."); return; }
    console.log("FINANCIALS: Generating CSV...");
    const csvData = [];
    csvData.push([ "Sale ID", "Date", "Time", "Course Name", "Item Name", "Item Type", "Quantity", "Unit Price", "Item Subtotal", "Item Tax", "Item Total", "Sale Subtotal", "Sale Tax", "Sale Total" ]); // Headers
    const courses = getFinancialsSanAntonioCourses(); // Get course map

    transactions.forEach(saleDetail => {
        const saleAttributes = saleDetail?.data?.attributes;
        const saleId = saleDetail?.data?.id;
        const saleTimeISO = saleAttributes?.saleTime;
        const saleTotal = saleAttributes?.total ?? '';
        const saleSubtotal = saleAttributes?.subtotal ?? '';
        const saleTax = saleAttributes?.tax ?? '';
        // Find course ID from sale data (check multiple potential locations)
        const saleCourseId = saleDetail?.data?.relationships?.course?.data?.id || saleAttributes?.course_id || saleAttributes?.courseId;
        const course = courses.find(c => String(c.courseId) === String(saleCourseId));
        const courseName = course ? course.name.replace(/"/g, '""') : `Course ID ${saleCourseId}`; // Escape quotes

        let saleDate = 'N/A'; let saleTime = 'N/A';
        if (saleTimeISO) { try { const d = new Date(saleTimeISO); saleDate = d.toLocaleDateString('en-CA'); saleTime = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }); } catch (e) { } }

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
        } else { /* console.warn("FINANCIALS: No 'included' items found for sale ID:", saleId); */ }
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

// --- Main Function to Initialize Financials UI (Called from stats page main script) ---
async function initializeFinancialsSection() {
    console.log("FINANCIALS: Initializing section...");
    const financialSummaryDiv = document.getElementById('financialSummary');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const refreshFinancialsBtn = document.getElementById('refreshFinancialsBtn');

    if (!financialSummaryDiv) {
        console.error("FINANCIALS: financialSummary div not found. Cannot initialize.");
        return;
    }

    let fullTransactionData = []; // Holds data for export/refresh

    const displaySummary = () => {
        if (!financialSummaryDiv) return;
         if (!fullTransactionData || fullTransactionData.length === 0) {
             financialSummaryDiv.innerHTML = '<p>No financial data found.</p>';
             if (exportCsvBtn) exportCsvBtn.style.display = 'none';
             return;
         }
        // Calculate summary
        const currentYear = new Date().getFullYear();
        const spendingByCourse = {};
        const courses = getFinancialsSanAntonioCourses(); // Get map

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
        // Display summary
        financialSummaryDiv.innerHTML = `<h3>Spending This Year</h3><ul class="financial-list">${Object.entries(spendingByCourse).map(([name, total]) => `<li><span class="course-name">${name}</span><span class="amount">$${total.toFixed(2)}</span></li>`).join('')}${Object.keys(spendingByCourse).length === 0 ? '<li>No spending recorded this year.</li>' : ''}</ul>`;
        // Show export button
        if (exportCsvBtn && fullTransactionData.length > 0) exportCsvBtn.style.display = 'inline-block';
    };

    // Initial Load
    financialSummaryDiv.innerHTML = '<p>Loading financial summary...</p>';
    if (exportCsvBtn) exportCsvBtn.style.display = 'none';
    try {
        fullTransactionData = await getFinancialDetails(); // Use await
        displaySummary(); // Display after getting data
    } catch (error) {
        console.error("FINANCIALS: Error loading initial financial details:", error);
        financialSummaryDiv.innerHTML = `<p style="color: red;">Error loading financial summary: ${error.message}</p>`;
    }

    // Add Listener for Export Button
     if (exportCsvBtn) {
        exportCsvBtn.replaceWith(exportCsvBtn.cloneNode(true)); // Avoid duplicate listeners
        const newExportCsvBtn = document.getElementById('exportCsvBtn');
        if (newExportCsvBtn) {
            newExportCsvBtn.addEventListener('click', () => generateAndDownloadCsv(fullTransactionData));
        }
    }

     // Add Listener for Refresh Button
    if (refreshFinancialsBtn) {
        refreshFinancialsBtn.replaceWith(refreshFinancialsBtn.cloneNode(true)); // Avoid duplicate listeners
        const newRefreshBtn = document.getElementById('refreshFinancialsBtn');
        if (newRefreshBtn) {
             newRefreshBtn.addEventListener('click', async () => {
                 console.log("FINANCIALS: Refresh button clicked.");
                 financialSummaryDiv.innerHTML = '<p>Refreshing financial summary...</p>';
                 if (exportCsvBtn) exportCsvBtn.style.display = 'none';
                 try {
                    fullTransactionData = await getFinancialDetails(true); // Force refresh
                    displaySummary(); // Re-display summary
                 } catch (error) {
                     console.error("FINANCIALS: Error refreshing financial details:", error);
                     financialSummaryDiv.innerHTML = `<p style="color: red;">Error refreshing financial summary: ${error.message}</p>`;
                 }
             });
        }
    }
}

// --- Add call to initializeFinancialsSection from your main stats page initialization logic ---
// Example: If using a separate stats-script.js:
/*
document.addEventListener('DOMContentLoaded', function() {
    // ... other stats page setup ...
    initializeStatsPageBasic(); // Function to display non-financial parts
    initializeFinancialsSection(); // Initialize the financials part
});
*/

// --- Function to clear cache (called from logout) ---
function clearFinancialCache() {
    localStorage.removeItem(FINANCIAL_CACHE_KEY);
    console.log('FINANCIALS: Cache cleared.');
}


// --- END OF FILE financials.js ---
