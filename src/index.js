// --- START OF FILE index.js (Cloudflare Worker) ---

// ForeUp API Proxy - Cloudflare Worker (Version 1.0.9 - All Features Corrected)
// Handles API requests to the ForeUp system, avoiding CORS issues

// Define DEBUG mode
const DEBUG = true; // Set to false for production

// Debug logging function
function debug(message, data) {
  if (DEBUG) {
    const timestamp = new Date().toISOString();
    if (data !== undefined) {
      console.log(`[${timestamp}] [DEBUG] ${message}`);
      if (typeof data === 'object' && data !== null) {
           console.dir(data, { depth: 3 });
      } else {
           console.log(data);
      }
    } else {
      console.log(`[${timestamp}] [DEBUG] ${message}`);
    }
  }
}

// Define CORS headers for all responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Replace with your domain in production
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS, DELETE", // Allow necessary methods
  "Access-Control-Allow-Headers": "Content-Type, Authorization, api-key, x-fu-golfer-location, x-requested-with, X-ForeUp-Cookies, x-authorization, priority, origin, referer",
  "Access-Control-Max-Age": "86400",
};

// Handle OPTIONS requests (CORS preflight)
function handleOptions(request) {
  debug("Handling OPTIONS request", request.url);
  return new Response(null, {
    headers: corsHeaders,
    status: 204, // No Content
  });
}

// Create a standard JSON response with CORS
function jsonResponse(data, status = 200) {
  debug(`Creating JSON response with status ${status}`);
  // debug("Response data:", data); // Uncomment for detailed response logging
  try {
      return new Response(JSON.stringify(data), {
          status: status,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
  } catch (stringifyError) {
      console.error("Worker: Failed to stringify JSON response:", stringifyError);
      // Return a basic error structure if stringify fails
      return new Response(`{"error":true,"success":false,"message":"Internal Server Error: Failed to serialize response."}`, {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
  }
}

// Create an error response with CORS
function errorResponse(message, status = 500) {
  debug(`Creating error response: ${message}, status: ${status}`);
  // Always include success: false for errors
  return jsonResponse({ error: true, success: false, message: message }, status);
}

// --- Main Request Handler ---
async function handleRequest(request) {
  // 1. Handle OPTIONS preflight requests first
  if (request.method === "OPTIONS") {
    return handleOptions(request);
  }

  const url = new URL(request.url);
  const path = url.pathname;

  debug(`Received ${request.method} request to ${path}`, {
    url: request.url,
    headers: Object.fromEntries(request.headers.entries())
  });

  // 2. Route other requests
  try {
    if (path === "/api/login") {
      return await handleLoginRequest(request);
    }
    if (path === "/api/courses") {
      return await handleCoursesRequest(request);
    }
    if (path === "/api/teetimes") {
      return await handleTeeTimesRequest(request);
    }
    if (path === "/api/pending-reservation") {
      return await handlePendingReservationRequest(request);
    }
    if (path === "/api/complete-reservation") {
      return await handleCompleteReservationRequest(request);
    }
    if (path === "/api/sale-details") {
      return await handleSaleDetailsRequest(request);
    }
    if (path === "/api/reservations") {
      return await handleReservationsRequest(request);
    }
    if (path === "/api/cancel-reservation") {
      return await handleCancelReservationRequest(request);
    }
    if (path === "/health" || path === "/") {
      return jsonResponse({ status: "ok", message: "ForeUp API Proxy is running", version: "1.0.9", debug: DEBUG }); // Updated version
    }

    // Fallback 404 for unknown paths
    return jsonResponse({ error: true, success: false, message: `Not Found: ${path}` }, 404);

  } catch (error) {
    // Catch any uncaught errors during request handling
    console.error(`Worker: Uncaught error in handleRequest for ${path}: ${error.message}\nStack: ${error.stack}`);
    return errorResponse(`Server error: ${error.message}`);
  }
}

// --- Request Handler Functions ---

/**
 * Handles user login by proxying to ForeUp.
 */
async function handleLoginRequest(request) {
  debug("Worker: Handling /api/login request");
  try {
    if (request.method !== "POST") return errorResponse("Method Not Allowed", 405);
    let requestData;
    try { requestData = await request.json(); }
    catch (error) { return errorResponse("Invalid JSON in request body", 400); }

    if (!requestData.username || !requestData.password) { return errorResponse("Username and password required", 400); }

    const loginUrl = "https://foreupsoftware.com/index.php/api/booking/users/login";
    const formData = new URLSearchParams({
        username: requestData.username, password: requestData.password,
        booking_class_id: "", api_key: "no_limits", course_id: "20106"
    });
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "Accept": "application/json, text/javascript, */*; q=0.01",
      "api-key": "no_limits", "x-fu-golfer-location": "foreup", "x-requested-with": "XMLHttpRequest",
      "Origin": "https://foreupsoftware.com", "Referer": "https://foreupsoftware.com/index.php/booking/",
      "User-Agent": "Mozilla/5.0 (compatible; SATXGolfApp-Worker/1.0)"
    };
    debug("Worker /api/login: Sending request to ForeUp", { url: loginUrl });

    const response = await fetch(loginUrl, { method: "POST", headers: headers, body: formData });
    debug(`Worker /api/login: ForeUp response status: ${response.status}`);

    const cookies = response.headers.get('set-cookie');
    const responseText = await response.text();
    let data;
    try {
      if (!responseText?.trim()) throw new Error("Empty response");
      data = JSON.parse(responseText);
      if (cookies) data.cookies = cookies;
    } catch (error) {
      debug(`Worker /api/login: Error parsing JSON: ${error.message}`, { responseText: responseText.substring(0,500) });
      return errorResponse(`Invalid JSON response from ForeUp Login API`, response.status >= 400 ? response.status : 502);
    }
    return jsonResponse(data, response.status);
  } catch (error) {
    debug(`Worker /api/login: Error: ${error.message}`, { stack: error.stack });
    return errorResponse(`Login failed: ${error.message}`);
  }
}

/**
 * Handles fetching available tee times by proxying to ForeUp.
 */
async function handleTeeTimesRequest(request) {
  debug("Worker: Handling /api/teetimes request");
  try {
     if (request.method !== "GET") return errorResponse("Method Not Allowed", 405);
    const originalUrl = new URL(request.url);
    const foreupUrl = new URL("https://foreupsoftware.com/index.php/api/booking/times");
    originalUrl.searchParams.forEach((value, key) => foreupUrl.searchParams.append(key, value));
    if (!foreupUrl.searchParams.has('api_key')) foreupUrl.searchParams.append('api_key', 'no_limits');

    const jwt = request.headers.get("Authorization")?.replace("Bearer ", "");
    const cookies = request.headers.get("X-ForeUp-Cookies");
    const headers = {
      "Accept": "application/json, text/javascript, */*; q=0.01", "api-key": "no_limits",
      "x-fu-golfer-location": "foreup", "x-requested-with": "XMLHttpRequest",
      "Origin": "https://foreupsoftware.com", "Referer": "https://foreupsoftware.com/index.php/booking/",
      "User-Agent": "Mozilla/5.0 (compatible; SATXGolfApp-Worker/1.0)"
    };
    if (jwt) headers["x-authorization"] = `Bearer ${jwt}`;
    if (cookies) headers["Cookie"] = cookies;

    debug(`Worker /api/teetimes: Fetching from ForeUp: ${foreupUrl.toString()}`);
    const response = await fetch(foreupUrl.toString(), { method: "GET", headers: headers });
    debug(`Worker /api/teetimes: ForeUp response status: ${response.status}`);

    const responseText = await response.text();
    try {
      const data = JSON.parse(responseText);
      return jsonResponse(data, response.status);
    } catch (error) {
      debug(`Worker /api/teetimes: Error parsing JSON: ${error.message}`, { responseText: responseText.substring(0,500) });
      return errorResponse("Invalid JSON response from ForeUp Tee Times API", 502);
    }
  } catch (error) {
    debug(`Worker /api/teetimes: Error: ${error.message}`, { stack: error.stack });
    return errorResponse(`Failed to fetch tee times: ${error.message}`);
  }
}

/**
 * Handles request for the static course list.
 */
async function handleCoursesRequest(request) {
  debug("Worker: Handling /api/courses request");
   try {
      const courses = getSanAntonioCourses(); // Call the function below
      if (!Array.isArray(courses)) { throw new Error("Course data source invalid."); }
      debug("Worker /api/courses: Returning course list.", courses);
      return jsonResponse(courses);
   } catch (error) {
       console.error("Worker: Error inside handleCoursesRequest:", error);
       return errorResponse(`Failed to retrieve course list: ${error.message}`, 500);
   }
}

/**
 * Handles Step 1 of booking: Creating a pending reservation.
 */
async function handlePendingReservationRequest(request) {
  debug("Worker: Handling /api/pending-reservation request");
  try {
    if (request.method !== "POST") return errorResponse("Method Not Allowed", 405);
    let formData;
    try { formData = new URLSearchParams(await request.text()); }
    catch (error) { return errorResponse("Invalid request data", 400); }

    const jwt = request.headers.get("Authorization")?.replace("Bearer ", "");
    const cookies = request.headers.get("X-ForeUp-Cookies");
    if (!jwt) return errorResponse("Authentication required", 401);

    const pendingReservationUrl = "https://foreupsoftware.com/index.php/api/booking/pending_reservation";
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "Accept": "*/*",
      "api-key": "no_limits", "x-fu-golfer-location": "foreup", "x-requested-with": "XMLHttpRequest",
      "x-authorization": `Bearer ${jwt}`, "Origin": "https://foreupsoftware.com",
      "Referer": "https://foreupsoftware.com/index.php/booking/", "User-Agent": "Mozilla/5.0 (compatible; SATXGolfApp-Worker/1.0)"
    };
    if (cookies) headers["Cookie"] = cookies;

    debug("Worker /api/pending-reservation: Sending request to ForeUp", { url: pendingReservationUrl, body: formData.toString().substring(0,200)+"..." });
    const response = await fetch(pendingReservationUrl, { method: "POST", headers: headers, body: formData });
    debug(`Worker /api/pending-reservation: ForeUp response status: ${response.status}`);

    const responseText = await response.text();
    try {
      const responseData = JSON.parse(responseText);
      return jsonResponse(responseData, response.status);
    } catch (error) {
      debug("Worker /api/pending-reservation: Error parsing JSON", { error, responseText: responseText.substring(0,500) });
      return errorResponse("Invalid JSON response from ForeUp Pending Reservation API", 502);
    }
  } catch (error) {
    debug(`Worker /api/pending-reservation: Error: ${error.message}`, { stack: error.stack });
    return errorResponse(`Failed to create pending reservation: ${error.message}`);
  }
}

/**
 * Handles Step 2 of booking: Completing the reservation.
 */
async function handleCompleteReservationRequest(request) {
  debug("Worker: Handling /api/complete-reservation request");
  try {
    if (request.method !== "POST") return errorResponse("Method Not Allowed", 405);
    let requestData;
    try { requestData = await request.json(); }
    catch (error) { return errorResponse("Invalid JSON in request body", 400); }

    const jwt = request.headers.get("Authorization")?.replace("Bearer ", "");
    const cookies = request.headers.get("X-ForeUp-Cookies");
    if (!jwt) return errorResponse("Authentication required", 401);
    if (!requestData.pending_reservation_id) return errorResponse("Missing pending_reservation_id", 400);

    const reservationUrl = "https://foreupsoftware.com/index.php/api/booking/users/reservations";
    const headers = {
      "Content-Type": "application/json", "Accept": "application/json, text/javascript, */*; q=0.01",
      "api-key": "no_limits", "x-fu-golfer-location": "foreup", "x-requested-with": "XMLHttpRequest",
      "x-authorization": `Bearer ${jwt}`, "Origin": "https://foreupsoftware.com",
      "Referer": "https://foreupsoftware.com/index.php/booking/", "User-Agent": "Mozilla/5.0 (compatible; SATXGolfApp-Worker/1.0)"
      // Add other sec-* headers if needed
    };
    if (cookies) headers["Cookie"] = cookies;

    debug("Worker /api/complete-reservation: Sending request to ForeUp", { url: reservationUrl }); // Don't log full body PII
    const response = await fetch(reservationUrl, { method: "POST", headers: headers, body: JSON.stringify(requestData) });
    debug(`Worker /api/complete-reservation: ForeUp response status: ${response.status}`);

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      if (response.ok && responseData.TTID) { debug("Worker /api/complete-reservation: Success", responseData); }
      else { debug("Worker /api/complete-reservation: Failed or unexpected structure", { status: response.status, data: responseData }); }
      return jsonResponse(responseData, response.status);
    } catch (error) {
      debug("Worker /api/complete-reservation: Error parsing JSON", { error, responseText: responseText.substring(0,500) });
      if (response.ok && responseText) { return new Response(responseText, { status: response.status, headers: { ...corsHeaders, "Content-Type": "text/plain"} }); }
      return errorResponse("Invalid JSON response from ForeUp Complete Reservation API", 502);
    }
  } catch (error) {
    debug(`Worker /api/complete-reservation: Error: ${error.message}`, { stack: error.stack });
    return errorResponse(`Failed to complete reservation: ${error.message}`);
  }
}

/**
 * Handles fetching detailed information for multiple sales.
 */
async function handleSaleDetailsRequest(request) {
  debug("Worker: Handling /api/sale-details request");
  if (request.method !== "POST") return errorResponse("Method Not Allowed", 405);
  try {
    let requestData;
    try { requestData = await request.json(); }
    catch (error) { return errorResponse("Invalid JSON request body", 400); }
    if (!requestData || !Array.isArray(requestData.sales)) return errorResponse("Expected { sales: [...] }", 400);

    const jwt = request.headers.get("Authorization")?.replace("Bearer ", "");
    const cookies = request.headers.get("X-ForeUp-Cookies");
    if (!jwt) return errorResponse("Authentication required", 401);

    const detailedSales = []; const salesToFetch = requestData.sales;
    debug(`Worker /api/sale-details: Attempting fetch for ${salesToFetch.length} sales.`);

    await Promise.all(salesToFetch.map(async (saleInfo) => {
      if (!saleInfo.saleId || !saleInfo.courseId) { console.warn("Worker /api/sale-details: Skipping due to missing ID:", saleInfo); return; }
      const saleDetailUrl = `https://foreupsoftware.com/api_rest/courses/${saleInfo.courseId}/customers/cart/${saleInfo.saleId}/getCompletedSale?include=items`;
      const headers = {
          'accept': 'application/json, text/javascript, */*; q=0.01', 'api-key': 'no_limits', 'Cookie': cookies || '',
          'Referer': `https://foreupsoftware.com/index.php/booking/${saleInfo.courseId}/`, 'User-Agent': 'Mozilla/5.0 (compatible; SATXGolfApp-Worker/1.0)',
          'x-authorization': `Bearer ${jwt}`, 'x-fu-golfer-location': 'foreup', 'x-requested-with': 'XMLHttpRequest'
          // Add optional headers if needed
      };
      try {
        const response = await fetch(saleDetailUrl, { headers: headers });
        if (!response.ok) { const errorText = await response.text(); console.error(`Worker /api/sale-details: Failed fetch for ${saleInfo.saleId}. Status: ${response.status}. Resp: ${errorText.substring(0, 500)}`); return; }
        const saleData = await response.json();
        // Add courseId back for frontend context
        if (!saleData.meta) saleData.meta = {};
        saleData.meta.app_requested_course_id = saleInfo.courseId;
        detailedSales.push(saleData);
      } catch (fetchError) { console.error(`Worker /api/sale-details: Network/parsing error fetching sale ${saleInfo.saleId}:`, fetchError); }
    })); // End Promise.all

    debug(`Worker /api/sale-details: Successfully fetched details for ${detailedSales.length} sales.`);
    return jsonResponse(detailedSales);
  } catch (error) {
    debug(`Worker /api/sale-details: Error: ${error.message}`, { stack: error.stack });
    return errorResponse(`Failed to fetch sale details: ${error.message}`);
  }
}

/**
 * Handles fetching the user's reservation list by scraping USER object.
 */
async function handleReservationsRequest(request) {
    debug("Worker: Handling /api/reservations request");
    if (request.method !== "GET") return errorResponse("Method Not Allowed", 405);
    const jwt = request.headers.get("Authorization")?.replace("Bearer ", "");
    const cookies = request.headers.get("X-ForeUp-Cookies");
    if (!jwt) return errorResponse("Authentication required", 401);

    const foreupBookingPageUrl = 'https://foreupsoftware.com/index.php/booking/20106/3567'; // Default page
    debug("Worker /api/reservations: Fetching ForeUp page:", foreupBookingPageUrl);
    const headers = {
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Cookie': cookies || '',
        'Referer': 'https://foreupsoftware.com/', 'User-Agent': 'Mozilla/5.0 (compatible; SATXGolfApp-Worker/1.0)',
        'x-authorization': `Bearer ${jwt}` // Include JWT
        // Add other sec-* headers if testing shows issues
    };

    try {
        const response = await fetch(foreupBookingPageUrl, { headers: headers });
        debug(`Worker /api/reservations: ForeUp page fetch status: ${response.status}`);
        if (!response.ok) throw new Error(`Failed to fetch user data page: Status ${response.status}`);
        const htmlText = await response.text();
        debug("Worker /api/reservations: Fetched HTML length:", htmlText.length);

        // Extract the USER JSON object string using String Searching
        let userJsonString = null;
        let startMarker = 'USER = {'; // Base marker
        let startIndex = htmlText.indexOf(startMarker);
        // Try alternate markers if base fails
        if (startIndex === -1) {
             const altMarkers = ['var USER = {', 'window.USER = {', ' USER = {'];
             for (const marker of altMarkers) {
                 startIndex = htmlText.indexOf(marker);
                 if (startIndex !== -1) { debug("Worker /api/reservations: Found user data with marker:", marker); startMarker = marker; break; }
             }
        }
        if (startIndex === -1) { throw new Error(`Could not find start of USER data ('USER = {', 'var USER = {', etc.).`); }

        debug("Worker /api/reservations: Found start marker at index:", startIndex);
        let braceCount = 1;
        let endIndex = startIndex + startMarker.length; // Start search right after the opening '{'
        while (endIndex < htmlText.length && braceCount > 0) {
            const char = htmlText[endIndex];
            if (char === '{') { braceCount++; } else if (char === '}') { braceCount--; }
            endIndex++;
            if (endIndex > startIndex + 1000000) { throw new Error("Could not find matching closing brace within limit."); }
        }
        if (braceCount !== 0) { throw new Error("Could not extract structure (unbalanced braces?)."); }
        userJsonString = htmlText.substring(startIndex + startMarker.length - 1, endIndex); // Extract { ... }
        debug("Worker /api/reservations: Extracted USER JSON string (first 300):", userJsonString.substring(0, 300)+"...");

        // Parse the JSON string
        let userData;
        try { userData = JSON.parse(userJsonString); debug("Worker /api/reservations: Successfully parsed USER object."); }
        catch(e) { throw new Error(`Failed to parse reservation data: ${e.message}`); }

        // Extract, Process Dates, and Return the reservations array
        let reservations = [];
        if (userData && Array.isArray(userData.reservations)) {
            reservations = userData.reservations;
            debug(`Worker /api/reservations: Extracted ${reservations.length} reservations.`);

            reservations = reservations.map((res) => { // Use implicit return for map if desired, or keep explicit
                 let teeTimestamp = null; let displayDate = 'Invalid Date'; let displayTime = 'Invalid Time'; let isoDateTime = null;
                 const timeStr = res.time; // Use the correct time field
                 if (timeStr && typeof timeStr === 'string') {
                     isoDateTime = timeStr.includes('T') ? timeStr : timeStr.replace(' ', 'T');
                     try {
                         const parts = timeStr.split(' '); let parsedDate = null;
                         if (parts.length === 2) {
                             const dateParts = parts[0].split('-'); const timeParts = parts[1].split(':');
                             if (dateParts.length === 3 && timeParts.length === 2) {
                                 const year = parseInt(dateParts[0], 10); const month = parseInt(dateParts[1], 10); const day = parseInt(dateParts[2], 10);
                                 const hour = parseInt(timeParts[0], 10); const minute = parseInt(timeParts[1], 10);
                                 if (!isNaN(year) && !isNaN(month) && !isNaN(day) && !isNaN(hour) && !isNaN(minute)) {
                                     parsedDate = new Date(year, month - 1, day, hour, minute); // Month 0-indexed
                                     if (!isNaN(parsedDate.getTime())) {
                                         teeTimestamp = parsedDate.getTime();
                                         // Use shared formatDate if available globally in worker context
                                         const formatDateFunc = typeof formatDate === 'function' ? formatDate : (d) => d.toLocaleDateString('en-US',{weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'});
                                         displayDate = formatDateFunc(parsedDate);
                                         displayTime = parsedDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                                     } else { console.warn(`Worker /api/reservations: Constructed invalid date from 'time': ${timeStr}`); isoDateTime = timeStr; }
                                 } else { console.warn(`Worker /api/reservations: Invalid numeric components in 'time': ${timeStr}`); isoDateTime = timeStr; }
                             } else { console.warn(`Worker /api/reservations: Invalid date/time parts in 'time': ${timeStr}`); isoDateTime = timeStr; }
                         } else { console.warn(`Worker /api/reservations: Invalid format in 'time': ${timeStr}`); isoDateTime = timeStr; }
                     } catch (e) { console.warn(`Worker /api/reservations: Error parsing 'time': ${timeStr}`, e); isoDateTime = timeStr; }
                 } else { console.warn(`Worker /api/reservations: Invalid or missing 'time' field:`, res.TTID || res.teetime_id); }
                 return { ...res, teeTimestamp, displayDate, displayTime, isoDateTime };
            }); // End map

        } else { debug("Worker /api/reservations: 'reservations' array not found."); }
        return jsonResponse(reservations); // Return processed array

    } catch (error) {
        debug(`Worker /api/reservations: Error: ${error.message}`, { stack: error.stack });
        return errorResponse(`Failed to fetch reservations: ${error.message}`);
    }
}


/**
 * Handles requests to cancel a specific reservation via ForeUp.
 */
async function handleCancelReservationRequest(request) {
    debug("Worker: Handling /api/cancel-reservation request");
    if (request.method !== "POST") return errorResponse("Method Not Allowed", 405);
    try {
        let requestData;
        try { requestData = await request.json(); debug("Worker /cancel-reservation: Received request body:", requestData); }
        catch (error) { return errorResponse("Invalid JSON request body", 400); }

        const reservationId = requestData?.reservationId;
        if (!reservationId || typeof reservationId !== 'string' || !reservationId.startsWith('TTID_')) {
             return errorResponse("Missing or invalid reservationId in request body", 400);
        }
        const jwt = request.headers.get("Authorization")?.replace("Bearer ", "");
        const cookies = request.headers.get("X-ForeUp-Cookies");
        if (!jwt) return errorResponse("Authentication required", 401);

        const foreupCancelUrl = `https://foreupsoftware.com/index.php/api/booking/users/reservations/${reservationId}`;
        debug(`Worker /cancel-reservation: Target ForeUp URL for DELETE: ${foreupCancelUrl}`);
        const headers = {
            'accept': 'application/json, text/javascript, */*; q=0.01', 'api-key': 'no_limits',
            'Cookie': cookies || '', 'Referer': `https://foreupsoftware.com/index.php/booking/`,
            'User-Agent': 'Mozilla/5.0 (compatible; SATXGolfApp-Worker/1.0)', 'x-authorization': `Bearer ${jwt}`,
            'x-fu-golfer-location': 'foreup', 'x-requested-with': 'XMLHttpRequest',
            'origin': 'https://foreupsoftware.com'
            // Add other optional headers if needed
        };
        debug("Worker /cancel-reservation: Headers for ForeUp DELETE:", headers);

        const response = await fetch(foreupCancelUrl, { method: 'DELETE', headers: headers });
        debug(`Worker /cancel-reservation: ForeUp response status: ${response.status}`);

        let responseData = {}; let clientResponseStatus = response.status; let success = false;
        try { // Inner try for response processing
            if (response.ok || response.status === 204) {
                 success = true; clientResponseStatus = 200;
                 try { responseData = { ...await response.json(), success: true }; }
                 catch(e) { responseData = { success: true, message: "Reservation cancelled." }; }
            } else {
                 success = false; clientResponseStatus = response.status;
                 responseData = { success: false, message: `ForeUp rejected cancellation (Status ${response.status})`};
                 try { const errBody = await response.json(); responseData.message = errBody.message || errBody.error || responseData.message; responseData.foreup_response = errBody; }
                 catch(e) { try { const errText = await response.text(); responseData.message += ` - ${errText.substring(0,100)}`; responseData.foreup_raw_response = errText.substring(0, 500); } catch (readErr) {} }
                 console.error("Worker /cancel-reservation: ForeUp cancellation failed details:", responseData);
            }
        } catch (processingError) {
             console.error("Worker /cancel-reservation: Error processing ForeUp response:", processingError);
             success = response.ok || response.status === 204; clientResponseStatus = success ? 200 : (response.status || 500);
             responseData = { success: success, message: success ? "Cancellation processed, response unreadable." : `Cancellation failed (Status ${response.status}, unreadable response).` };
        } // End inner try...catch

        responseData.success = success; // Ensure consistent flag
        return jsonResponse(responseData, clientResponseStatus); // Return structured response

    } catch (error) { // Catch errors in outer handler scope
        debug(`Worker /cancel-reservation: Internal error: ${error.message}`, { stack: error.stack });
        return errorResponse(`Failed to process cancellation request: ${error.message}`);
    }
}


// --- Static Course Data ---
function getSanAntonioCourses() {
  // Ensure this list is accurate and complete
  return [
    { name: "Brackenridge Park", details: "Rating 70.3 / Slope 126 / Par 71 / 6243 Yds", courseId: "20103", facilityId: "3564" },
    { name: "Cedar Creek", details: "Rating 73.4 / Slope 132 / Par 72 / 7158 yds", courseId: "20104", facilityId: "3565" },
    { name: "Mission del Lago", details: "Rating 74.1 / Slope 134 / Par 72 / 7044 yds", courseId: "20105", facilityId: "3566" },
    { name: "Northern Hills", details: "Rating 70.8 / Slope 118 / Par 72 / 6602 yds", courseId: "20106", facilityId: "3567" },
    { name: "Olmos Basin", details: "Rating 73.9 / Slope 135 / Par 72 / 7038 yds", courseId: "20107", facilityId: "3568" },
    { name: "Riverside 18", details: "Rating 72 / Slope 128 / Par 72 / 6694 yds", courseId: "20108", facilityId: "3569" },
    { name: "The Teddy Bear Par 3", details: "The Par 3 at Riverside", courseId: "20108", facilityId: "3570" },
    { name: "San Pedro Par 3", details: "Driving Range & Lighted Par 3", courseId: "20109", facilityId: "3572" }
  ];
}


// --- Event Listener ---
addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

// --- END OF FILE index.js (Cloudflare Worker) ---
