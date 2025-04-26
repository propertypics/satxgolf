// --- START OF FILE index.js (Cloudflare Worker) ---

// ForeUp API Proxy - Cloudflare Worker (Version 1.0.6 - Supports 2-Step Booking)
// This worker handles API requests to the ForeUp system, avoiding CORS issues

// Define DEBUG mode
const DEBUG = true; // Set to false for production

// Debug logging function
function debug(message, data) {
  if (DEBUG) {
    if (data !== undefined) { // Check if data is provided, even if null/false
      // Use console.dir for better object inspection
      console.log(`[DEBUG] ${message}`);
      console.dir(data, { depth: null }); // Log object details
    } else {
      console.log(`[DEBUG] ${message}`);
    }
  }
}

// Define CORS headers for all responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Replace with your domain in production
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, api-key, x-fu-golfer-location, x-requested-with, X-ForeUp-Cookies, x-authorization, priority, origin, referer",
  "Access-Control-Max-Age": "86400",
};

// Handle OPTIONS requests (CORS preflight)
function handleOptions(request) {
  debug("Handling OPTIONS request", request.url);
  return new Response(null, {
    headers: corsHeaders,
    status: 204,
  });
}


// Create a standard JSON response
function jsonResponse(data, status = 200) {
  debug(`Creating JSON response with status ${status}`, data);
  return new Response(JSON.stringify(data), {
    status: status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

// Create an error response
function errorResponse(message, status = 500) {
  debug(`Creating error response: ${message}, status: ${status}`);
  return jsonResponse({ error: true, message: message }, status);
}

// Main request handler
async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  debug(`Received ${request.method} request to ${path}`, {
    url: request.url,
    headers: Object.fromEntries(request.headers.entries())
  });

  if (request.method === "OPTIONS") {
    return handleOptions(request);
  }

  try {
    // Route requests based on path
    if (path === "/api/login") {
      return await handleLoginRequest(request);
    }
    if (path === "/api/courses") {
      return await handleCoursesRequest(request);
    }
    if (path === "/api/teetimes") {
      // Handles fetching the list of available tee times
      return await handleTeeTimesRequest(request);
    }
    if (path === "/api/pending-reservation") {
      // Handles Step 1 of booking (creating temporary reservation)
      return await handlePendingReservationRequest(request);
    }
    if (path === "/api/complete-reservation") {
      // Handles Step 2 of booking (finalizing with pending ID)
      return await handleCompleteReservationRequest(request);
    }
    if (path === "/health" || path === "/") {
      return jsonResponse({ status: "ok", message: "ForeUp API Proxy is running", version: "1.0.6", debug: DEBUG });
    }

    return jsonResponse({ error: "Not Found", path: path }, 404);
  } catch (error) {
    console.error(`Error handling request: ${error.message}\nStack: ${error.stack}`);
    return errorResponse(`Server error: ${error.message}`);
  }
}

// Handle login requests to ForeUp
async function handleLoginRequest(request) {
  try {
    let requestData;
    try {
      requestData = await request.json();
      debug("Parsed login request data", requestData);
    } catch (error) {
      return errorResponse("Invalid JSON in request body", 400);
    }

    if (!requestData.username || !requestData.password) {
      return errorResponse("Username and password are required", 400);
    }

    const loginUrl = "https://foreupsoftware.com/index.php/api/booking/users/login";
    const formData = new URLSearchParams();
    formData.append("username", requestData.username);
    formData.append("password", requestData.password);
    formData.append("booking_class_id", "");
    formData.append("api_key", "no_limits");
    formData.append("course_id", "20106"); // Example course ID

    const headers = {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "Accept": "application/json, text/javascript, */*; q=0.01",
      "api-key": "no_limits",
      "x-fu-golfer-location": "foreup",
      "x-requested-with": "XMLHttpRequest",
      "Origin": "https://foreupsoftware.com",
      "Referer": "https://foreupsoftware.com/index.php/booking/", // Generic referer
      "User-Agent": "Mozilla/5.0 (Cloudflare Worker)" // Identify worker
    };
    debug("Sending login request to ForeUp", { url: loginUrl, headers: headers, body: formData.toString() });

    const response = await fetch(loginUrl, { method: "POST", headers: headers, body: formData });
    debug(`Received login response from ForeUp status: ${response.status}`);

    const cookies = response.headers.get('set-cookie');
    const responseText = await response.text();

    let data;
    try {
      if (!responseText || !responseText.trim()) throw new Error("Empty response");
      data = JSON.parse(responseText);
      debug("Parsed ForeUp login response", data);
      if (cookies) {
          data.cookies = cookies; // Add cookies for frontend
          debug("Added cookies to login response");
      }
    } catch (error) {
      debug(`Error parsing login response JSON: ${error.message}`, { responseText });
      return errorResponse(`Invalid JSON response from ForeUp Login API: ${error.message}`, 502);
    }

    return jsonResponse(data, response.status);
  } catch (error) {
    debug(`Login error: ${error.message}`, { stack: error.stack });
    return errorResponse(`Login failed: ${error.message}`);
  }
}


// Handle tee time list requests (simple proxy)
async function handleTeeTimesRequest(request) {
  try {
    const originalUrl = new URL(request.url);
    const foreupUrl = new URL("https://foreupsoftware.com/index.php/api/booking/times");

    // Copy all original parameters
    originalUrl.searchParams.forEach((value, key) => {
      foreupUrl.searchParams.append(key, value);
    });
    if (!foreupUrl.searchParams.has('api_key')) {
      foreupUrl.searchParams.append('api_key', 'no_limits');
    }
    debug(`Fetching tee times from ForeUp URL: ${foreupUrl.toString()}`);

    const jwt = request.headers.get("Authorization")?.replace("Bearer ", "");
    const cookies = request.headers.get("X-ForeUp-Cookies");

    const headers = {
      "Accept": "application/json, text/javascript, */*; q=0.01",
      "api-key": "no_limits",
      "x-fu-golfer-location": "foreup",
      "x-requested-with": "XMLHttpRequest",
      "Origin": "https://foreupsoftware.com",
      "Referer": "https://foreupsoftware.com/index.php/booking/", // Generic referer
      "User-Agent": "Mozilla/5.0 (Cloudflare Worker)"
    };
    if (jwt) headers["x-authorization"] = `Bearer ${jwt}`;
    if (cookies) headers["Cookie"] = cookies;

    debug("Sending tee times request to ForeUp", { url: foreupUrl.toString(), headers: headers });
    const response = await fetch(foreupUrl.toString(), { method: "GET", headers: headers });
    debug(`Received tee times response from ForeUp status: ${response.status}`);

    // **Important:** Return the response directly without modification.
    // Do NOT attempt to add teetime_id here.
    const responseText = await response.text();
    debug("Raw tee time response from ForeUp (first 200 chars):", responseText.substring(0, 200));

    try {
      const data = JSON.parse(responseText);
      return jsonResponse(data, response.status);
    } catch (error) {
      debug(`Error parsing tee time response: ${error.message}`);
      return errorResponse("Invalid JSON response from ForeUp Tee Times API", 502);
    }
  } catch (error) {
    debug(`Tee times error: ${error.message}`, { stack: error.stack });
    return errorResponse(`Failed to fetch tee times: ${error.message}`);
  }
}

// Handle course list requests (returns static list)
async function handleCoursesRequest(request) {
  debug("Handling courses request");
  // This version simply returns the static list
  // The auth validation part from previous versions is removed for simplicity,
  // as it wasn't strictly necessary for just listing courses.
  return jsonResponse(getSanAntonioCourses());
}

// Get San Antonio golf courses data (Static)
function getSanAntonioCourses() {
  return [
    { name: "Brackenridge Park", details: "Rating 70.3 / Slope 126 / Par 71 / 6243 Yds", url: "...", courseId: "20103", facilityId: "3564" },
    { name: "Cedar Creek", details: "Rating 73.4 / Slope 132 / Par 72 / 7158 yds", url: "...", courseId: "20104", facilityId: "3565" },
    { name: "Mission del Lago", details: "Rating 74.1 / Slope 134 / Par 72 / 7044 yds", url: "...", courseId: "20105", facilityId: "3566" },
    { name: "Northern Hills", details: "Rating 70.8 / Slope 118 / Par 72 / 6602 yds", url: "...", courseId: "20106", facilityId: "3567" },
    { name: "Olmos Basin", details: "Rating 73.9 / Slope 135 / Par 72 / 7038 yds", url: "...", courseId: "20107", facilityId: "3568" },
    { name: "Riverside 18", details: "Rating 72 / Slope 128 / Par 72 / 6694 yds", url: "...", courseId: "20108", facilityId: "3569" },
    { name: "The Teddy Bear Par 3", details: "The Par 3 at Riverside", url: "...", courseId: "20108", facilityId: "3570" },
    { name: "San Pedro Par 3", details: "Driving Range & Lighted Par 3", url: "...", courseId: "20109", facilityId: "3572" }
  ];
}

// Handle creating a pending reservation (Step 1)
async function handlePendingReservationRequest(request) {
  try {
    if (request.method !== "POST") {
      return errorResponse("Method not allowed. Use POST.", 405);
    }

    let formData;
    try {
      // Expecting form data from the frontend for this step
      const requestText = await request.text();
      debug("Received pending reservation request form data string:", requestText);
      formData = new URLSearchParams(requestText);
    } catch (error) {
      return errorResponse("Invalid request data", 400);
    }

    const jwt = request.headers.get("Authorization")?.replace("Bearer ", "");
    const cookies = request.headers.get("X-ForeUp-Cookies");
    if (!jwt) return errorResponse("Authentication required", 401);

    const pendingReservationUrl = "https://foreupsoftware.com/index.php/api/booking/pending_reservation";
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", // Correct Content-Type for form data
      "Accept": "*/*", // Accept any response type
      "api-key": "no_limits",
      "x-fu-golfer-location": "foreup",
      "x-requested-with": "XMLHttpRequest",
      "x-authorization": `Bearer ${jwt}`,
      "Origin": "https://foreupsoftware.com",
      "Referer": "https://foreupsoftware.com/index.php/booking/",
      "User-Agent": "Mozilla/5.0 (Cloudflare Worker)"
    };
    if (cookies) headers["Cookie"] = cookies;

    debug("Sending pending reservation request to ForeUp", { url: pendingReservationUrl, headers: headers, body: formData.toString() });
    const response = await fetch(pendingReservationUrl, { method: "POST", headers: headers, body: formData });
    debug(`Received pending reservation response from ForeUp status: ${response.status}`);

    const responseText = await response.text();
    debug("Raw pending reservation response from ForeUp:", responseText);

    try {
      const responseData = JSON.parse(responseText);
      // Return the full response from ForeUp (should include reservation_id on success)
      return jsonResponse(responseData, response.status);
    } catch (error) {
      debug("Error parsing pending reservation response", error);
      return errorResponse("Invalid JSON response from ForeUp Pending Reservation API", 502);
    }
  } catch (error) {
    debug(`Error creating pending reservation: ${error.message}`, { stack: error.stack });
    return errorResponse(`Failed to create pending reservation: ${error.message}`);
  }
}

// Handle completing a reservation (Step 2)
async function handleCompleteReservationRequest(request) {
  try {
    if (request.method !== "POST") {
      return errorResponse("Method not allowed. Use POST.", 405);
    }

    let requestData;
    try {
      // Expecting rich JSON payload from the frontend for this step
      requestData = await request.json();
      debug("Received reservation completion request JSON payload:", requestData);
    } catch (error) {
      return errorResponse("Invalid JSON in request body", 400);
    }

    const jwt = request.headers.get("Authorization")?.replace("Bearer ", "");
    const cookies = request.headers.get("X-ForeUp-Cookies");
    if (!jwt) return errorResponse("Authentication required", 401);

    // Basic validation: ensure pending_reservation_id is present
    if (!requestData.pending_reservation_id) {
      return errorResponse("Missing required field: pending_reservation_id", 400);
    }

    const reservationUrl = "https://foreupsoftware.com/index.php/api/booking/users/reservations";
    const headers = {
      "Content-Type": "application/json", // MUST be JSON for this ForeUp endpoint
      "Accept": "application/json, text/javascript, */*; q=0.01",
      "api-key": "no_limits",
      "x-fu-golfer-location": "foreup",
      "x-requested-with": "XMLHttpRequest",
      "x-authorization": `Bearer ${jwt}`,
      "Origin": "https://foreupsoftware.com",
      "Referer": "https://foreupsoftware.com/index.php/booking/",
      "User-Agent": "Mozilla/5.0 (Cloudflare Worker)"
    };
    if (cookies) headers["Cookie"] = cookies;

    debug("Sending reservation completion request to ForeUp", { url: reservationUrl, headers: headers, body: JSON.stringify(requestData) });
    const response = await fetch(reservationUrl, { method: "POST", headers: headers, body: JSON.stringify(requestData) });
    debug(`Received reservation completion response from ForeUp status: ${response.status}`);

    const responseText = await response.text();
    debug("Raw reservation completion response from ForeUp:", responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
      // Check for success indicator (e.g., presence of 'TTID' based on curl example)
      if (response.ok && responseData.TTID) {
           debug("Reservation completion successful (ForeUp indicated success)", responseData);
      } else {
           debug("Reservation completion potentially failed or structure unexpected", { status: response.status, data: responseData });
           // Return ForeUp's response even on failure, frontend will check structure
      }
      return jsonResponse(responseData, response.status);
    } catch (error) {
      debug("Error parsing complete reservation response", error);
      // Still try to return the raw text if JSON parsing fails but status was ok-ish
      if (response.ok && responseText) {
          return new Response(responseText, { status: response.status, headers: { ...corsHeaders, "Content-Type": "text/plain"} });
      }
      return errorResponse("Invalid JSON response from ForeUp Complete Reservation API", 502);
    }
  } catch (error) {
    debug(`Error completing reservation: ${error.message}`, { stack: error.stack });
    return errorResponse(`Failed to complete reservation: ${error.message}`);
  }
}

// Register the event listener for Cloudflare Workers
addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

// --- END OF FILE index.js (Cloudflare Worker) ---
