// --- START OF FILE index.js (Cloudflare Worker) ---

// ForeUp API Proxy - Cloudflare Worker (Version 1.0.7 - Added Cancellation)
// This worker handles API requests to the ForeUp system, avoiding CORS issues

// Define DEBUG mode
const DEBUG = true; // Set to false for production

// Debug logging function
function debug(message, data) {
  if (DEBUG) {
    if (data !== undefined) {
      console.log(`[DEBUG] ${message}`);
      console.dir(data, { depth: null });
    } else {
      console.log(`[DEBUG] ${message}`);
    }
  }
}

// Define CORS headers for all responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Replace with your domain in production
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS, DELETE", // Added DELETE
  "Access-Control-Allow-Headers": "Content-Type, Authorization, api-key, x-fu-golfer-location, x-requested-with, X-ForeUp-Cookies, x-authorization, priority, origin, referer",
  "Access-Control-Max-Age": "86400",
};

// Handle OPTIONS requests (CORS preflight)
function handleOptions(request) {
  debug("Handling OPTIONS request", request.url);
  // Important: Ensure 'DELETE' method and necessary headers for delete are allowed
  return new Response(null, {
    headers: corsHeaders,
    status: 204, // No Content
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
  return jsonResponse({ error: true, success: false, message: message }, status); // Add success: false
}

/**
 * Returns the static list of known San Antonio Golf Trail courses and their IDs.
 * @returns {Array<object>} Array of course objects.
 */
function getSanAntonioCourses() {
  // Central source for course data and ID mappings used by the worker and potentially frontend
  // Ensure courseId and facilityId are correct based on ForeUp URLs/data
  return [
    {
        name: "Brackenridge Park",
        details: "Rating 70.3 / Slope 126 / Par 71 / 6243 Yds",
        // url: "https://foreupsoftware.com/index.php/booking/20103/3564#teetimes", // Optional URL
        courseId: "20103", // Used in API paths like /courses/20103/...
        facilityId: "3564" // Used as schedule_id or teesheet_id
    },
    {
        name: "Cedar Creek",
        details: "Rating 73.4 / Slope 132 / Par 72 / 7158 yds",
        // url: "https://foreupsoftware.com/index.php/booking/20104/3565#/teetimes",
        courseId: "20104",
        facilityId: "3565"
    },
    {
        name: "Mission del Lago",
        details: "Rating 74.1 / Slope 134 / Par 72 / 7044 yds",
        // url: "https://foreupsoftware.com/index.php/booking/20105/3566#teetimes/",
        courseId: "20105",
        facilityId: "3566"
    },
    {
        name: "Northern Hills",
        details: "Rating 70.8 / Slope 118 / Par 72 / 6602 yds",
        // url: "https://foreupsoftware.com/index.php/booking/20106/3567#teetimes",
        courseId: "20106",
        facilityId: "3567"
    },
    {
        name: "Olmos Basin",
        details: "Rating 73.9 / Slope 135 / Par 72 / 7038 yds",
        // url: "https://foreupsoftware.com/index.php/booking/20107/3568#teetimes",
        courseId: "20107",
        facilityId: "3568"
    },
    {
        name: "Riverside 18", // Make sure name matches what frontend expects if using mapping
        details: "Rating 72 / Slope 128 / Par 72 / 6694 yds",
        // url: "https://foreupsoftware.com/index.php/booking/20108/3569#teetimes",
        courseId: "20108", // Note: Same courseId as Par 3
        facilityId: "3569" // Different facilityId
    },
    {
        name: "The Teddy Bear Par 3", // Make sure name matches
        details: "The Par 3 at Riverside",
        // url: "https://foreupsoftware.com/index.php/booking/20108/3570#teetimes",
        courseId: "20108", // Note: Same courseId as 18-hole
        facilityId: "3570" // Different facilityId
    },
    {
        name: "San Pedro Par 3", // Make sure name matches
        details: "Driving Range & Lighted Par 3",
        // url: "https://foreupsoftware.com/index.php/booking/20109/3572#teetimes",
        courseId: "20109",
        facilityId: "3572"
    }
  ];
}

async function handleCoursesRequest(request) {
  debug("Handling courses request");
  try {
      const courses = getSanAntonioCourses(); // Call the function
      // Basic validation
      if (!Array.isArray(courses)) {
          throw new Error("getSanAntonioCourses did not return an array.");
      }
      return jsonResponse(courses); // Return the result using the JSON helper
  } catch (error) {
      console.error("Worker: Error getting course data:", error);
      return errorResponse("Failed to retrieve course list.", 500);
  }
}

// Main request handler
async function handleRequest(request) {
  // ---vvv--- Handle OPTIONS first ---vvv---
  if (request.method === "OPTIONS") {
    return handleOptions(request);
  }
  // ---^^^--- End OPTIONS Handling ---^^^---

  const url = new URL(request.url);
  const path = url.pathname;

  debug(`Received ${request.method} request to ${path}`, {
    url: request.url,
    headers: Object.fromEntries(request.headers.entries())
  });


  try {
    // Route requests based on path
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
    // Add route for fetching reservations
    if (path === "/api/reservations") {
      return await handleReservationsRequest(request);
    }
    // **** ADD THIS ROUTE FOR CANCELLATION ****
    if (path === "/api/cancel-reservation") {
      return await handleCancelReservationRequest(request);
    }
    // **** END ADD CANCELLATION ROUTE ****

    if (path === "/health" || path === "/") {
      return jsonResponse({ status: "ok", message: "ForeUp API Proxy is running", version: "1.0.7", debug: DEBUG });
    }

    // Fallback 404
    return jsonResponse({ error: "Not Found", path: path }, 404);

  } catch (error) {
    console.error(`Worker: Uncaught error in handleRequest for ${path}: ${error.message}\nStack: ${error.stack}`);
    return errorResponse(`Server error: ${error.message}`);
  }
}


// --- Request Handler Functions ---

// ... (Keep existing: handleLoginRequest, handleTeeTimesRequest, handleCoursesRequest, ...)
// ... (Keep existing: handlePendingReservationRequest, handleCompleteReservationRequest, ...)
// ... (Keep existing: handleSaleDetailsRequest) ...
// ... (Keep existing: handleReservationsRequest - the one fetching the USER object) ...



// Handle login requests to ForeUp
async function handleLoginRequest(request) {
  debug("Worker: Handling /api/login request"); // Add identifier
  try {
    let requestData;
    try {
      requestData = await request.json();
      debug("Worker /api/login: Parsed request data", requestData);
    } catch (error) {
      debug("Worker /api/login: Invalid JSON body", error);
      return errorResponse("Invalid JSON in request body", 400);
    }

    if (!requestData.username || !requestData.password) {
       debug("Worker /api/login: Missing username or password");
      return errorResponse("Username and password are required", 400);
    }

    const loginUrl = "https://foreupsoftware.com/index.php/api/booking/users/login";
    const formData = new URLSearchParams();
    formData.append("username", requestData.username);
    formData.append("password", requestData.password);
    formData.append("booking_class_id", ""); // Required empty by ForeUp
    formData.append("api_key", "no_limits");
    formData.append("course_id", "20106"); // Default/Example course ID

    // Headers needed to mimic a browser login request
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "Accept": "application/json, text/javascript, */*; q=0.01",
      "api-key": "no_limits",
      "x-fu-golfer-location": "foreup",
      "x-requested-with": "XMLHttpRequest",
      "Origin": "https://foreupsoftware.com",
      "Referer": "https://foreupsoftware.com/index.php/booking/", // Generic referer
      "User-Agent": "Mozilla/5.0 (compatible; SATXGolfApp-Worker/1.0)" // Identify worker
    };
    debug("Worker /api/login: Sending login request to ForeUp", { url: loginUrl, headers: headers, body: formData.toString().substring(0,100)+"..." }); // Log partial body

    // Make the actual call to ForeUp
    const response = await fetch(loginUrl, { method: "POST", headers: headers, body: formData });
    debug(`Worker /api/login: Received login response from ForeUp status: ${response.status}`);

    // Extract cookies and response body
    const cookies = response.headers.get('set-cookie');
    const responseText = await response.text();
    debug("Worker /api/login: Raw response text (first 200):", responseText.substring(0,200));


    let data;
    try {
      if (!responseText || !responseText.trim()) throw new Error("Empty response from ForeUp login");
      data = JSON.parse(responseText);
      debug("Worker /api/login: Parsed ForeUp login response", data);
      if (cookies) {
          data.cookies = cookies; // Add cookies for frontend to store
          debug("Worker /api/login: Added cookies to response data");
      }
    } catch (error) {
      debug(`Worker /api/login: Error parsing login response JSON: ${error.message}`, { responseText: responseText.substring(0,500) });
      // Return ForeUp's status if possible, but indicate error
      return errorResponse(`Invalid JSON response from ForeUp Login API: ${error.message}`, response.status >= 400 ? response.status : 502);
    }

    // Return the data received from ForeUp (including added cookies)
    return jsonResponse(data, response.status);

  } catch (error) {
    debug(`Worker /api/login: Uncaught error in handler: ${error.message}`, { stack: error.stack });
    return errorResponse(`Login failed: ${error.message}`);
  }
}

/**
 * Handles requests to cancel a specific reservation via ForeUp.
 * Expects a POST request with JSON body: { reservationId: "TTID_..." }
 */
async function handleCancelReservationRequest(request) {
    debug("Worker: Handling /api/cancel-reservation request");

    // 1. Check Method (Using POST as decided)
    if (request.method !== "POST") {
        return errorResponse("Method Not Allowed, use POST", 405);
    }

    try {
        // 2. Parse Body to get reservationId
        let requestData;
        try {
            requestData = await request.json();
            debug("Worker /cancel-reservation: Received request body:", requestData);
        } catch (error) {
            debug("Worker /cancel-reservation: Invalid JSON body", error);
            return errorResponse("Invalid JSON request body", 400);
        }

        const reservationId = requestData?.reservationId;
        // Basic validation for the ID format
        if (!reservationId || typeof reservationId !== 'string' || !reservationId.startsWith('TTID_')) {
            debug("Worker /cancel-reservation: Missing or invalid reservationId in body:", reservationId);
            return errorResponse("Missing or invalid reservationId in request body", 400);
        }

        // 3. Authenticate User
        const jwt = request.headers.get("Authorization")?.replace("Bearer ", "");
        const cookies = request.headers.get("X-ForeUp-Cookies");
        if (!jwt) {
            debug("Worker /cancel-reservation: Missing JWT");
            return errorResponse("Authentication required", 401);
        }
        debug("Worker /cancel-reservation: Authentication headers received.");

        // 4. Construct ForeUp DELETE URL
        const foreupCancelUrl = `https://foreupsoftware.com/index.php/api/booking/users/reservations/${reservationId}`;
        debug(`Worker /cancel-reservation: Target ForeUp URL for DELETE: ${foreupCancelUrl}`);

        // 5. Construct Headers for ForeUp DELETE request (Mimic working curl)
        const headers = {
            'accept': 'application/json, text/javascript, */*; q=0.01',
            'accept-language': 'en-US,en;q=0.9',
            'api-key': 'no_limits',
            'Cookie': cookies || '', // Pass cookies from frontend request
            'dnt': '1', // Optional
            'origin': 'https://foreupsoftware.com', // Important
            'priority': 'u=1, i', // Optional
            'referer': 'https://foreupsoftware.com/index.php/booking/', // Generic Referer
            'sec-ch-ua': '"Chromium";v="133", "Not(A:Brand";v="99"', // Mimic browser
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'user-agent': 'Mozilla/5.0 (compatible; SATXGolfApp-Worker/1.0)', // Identify worker
            'x-authorization': `Bearer ${jwt}`, // Crucial Auth
            'x-fu-golfer-location': 'foreup',
            'x-requested-with': 'XMLHttpRequest'
        };
        debug("Worker /cancel-reservation: Headers for ForeUp DELETE:", headers);

        // 6. Make the DELETE request to ForeUp
        const response = await fetch(foreupCancelUrl, {
            method: 'DELETE',
            headers: headers
        });
        debug(`Worker /cancel-reservation: Received cancel response from ForeUp status: ${response.status}`);

        // 7. Process ForeUp's Response & Respond to Frontend
        let responseData = {};
        let clientResponseStatus = response.status; // Use ForeUp's status initially
        let success = false;

        try {
            // Check common success statuses for DELETE
            if (response.ok || response.status === 204) { // 200-299 or 204 No Content
                 success = true;
                 debug("Worker /cancel-reservation: ForeUp DELETE successful (status OK/204).");
                 clientResponseStatus = 200; // Send 200 OK to frontend on success
                 try {
                      // Try to parse response even on success (might contain info)
                      const body = await response.json();
                      responseData = { ...body, success: true }; // Ensure success flag
                 } catch(e) {
                      // No body or not JSON, which is fine for 204
                      responseData = { success: true, message: response.status === 204 ? "Reservation cancelled." : "Cancellation processed." };
                 }
            } else {
                 // Handle ForeUp error status codes (4xx, 5xx)
                 success = false;
                 console.error(`Worker /cancel-reservation: ForeUp DELETE failed. Status: ${response.status}`);
                 responseData = { success: false, message: `ForeUp rejected cancellation (Status ${response.status})`};
                 try {
                      // Try to get a more specific error message from ForeUp's response body
                      const errBody = await response.json();
                      responseData.message = errBody.message || errBody.error || responseData.message;
                      responseData.foreup_response = errBody; // Include original error details
                 } catch(e) {
                      // If error body isn't JSON, try text
                      try {
                          const errText = await response.text();
                          responseData.message += ` - ${errText.substring(0,100)}`;
                          responseData.foreup_raw_response = errText.substring(0, 500);
                      } catch (readErr) {
                          // Ignore if can't read body
                      }
                 }
                 console.error("Worker /cancel-reservation: ForeUp cancellation failed details:", responseData);
                 // Use ForeUp's error status for the client response
                 clientResponseStatus = response.status;
            }
        } catch (e) {
             // Catch errors during response processing (e.g., JSON parsing on unexpected format)
             console.error("Worker /cancel-reservation: Error processing ForeUp response:", e);
             // Determine success based on original status if parsing failed after request
             success = response.ok || response.status === 204;
             clientResponseStatus = success ? 200 : (response.status || 500);
             responseData = { success: success, message: success ? "Cancellation processed, but response unreadable." : `Cancellation failed (Status ${response.status}, unreadable response).` };
        }

        // Ensure consistent success flag
        responseData.success = success;

        // Return the structured response to the frontend
        return jsonResponse(responseData, clientResponseStatus);

    } catch (error) {
        // Catch errors in overall request handling/parsing within the worker
        debug(`Worker /cancel-reservation: Internal error handling request: ${error.message}`, { stack: error.stack });
        return errorResponse(`Failed to process cancellation request: ${error.message}`);
    }
}


// --- Static Course Data ---
function getSanAntonioCourses() { /* ... keep function ... */ }

// --- Event Listener ---
addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

// --- END OF FILE index.js (Cloudflare Worker) ---
