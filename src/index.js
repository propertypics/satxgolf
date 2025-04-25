// ForeUp API Proxy - Cloudflare Worker (Version 1.0.5)
// This worker handles API requests to the ForeUp system, avoiding CORS issues

// Define DEBUG mode
const DEBUG = true;

// Debug logging function
function debug(message, data) {
  if (DEBUG) {
    if (data) {
      console.log(`[DEBUG] ${message}`, data);
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

// Debug response for troubleshooting
function debugResponse(data, originalResponse) {
  debug("Creating debug response", data);
  return jsonResponse({
    debug: true,
    data: data,
    originalStatus: originalResponse?.status,
    originalHeaders: originalResponse ? Object.fromEntries(originalResponse.headers.entries()) : null,
  });
}

// Main request handler
async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Log incoming request for debugging
  debug(`Received ${request.method} request to ${path}`, {
    headers: Object.fromEntries(request.headers.entries()),
    url: request.url
  });
  
  // Handle preflight OPTIONS request
  if (request.method === "OPTIONS") {
    return handleOptions(request);
  }
  
  try {
  
    // Handle request for creating a pending reservation
    if (path === "/api/pending-reservation") {
        return await handlePendingReservationRequest(request);
    }

    // Handle request for completing a reservation
    if (path === "/api/complete-reservation") {
  	return await handleCompleteReservationRequest(request);
    }

    // Handle login requests
    if (path === "/api/login") {
      return await handleLoginRequest(request);
    }
    
    // Handle tee time requests
    if (path === "/api/teetimes") {
      return await handleTeeTimesRequest(request);
    }
    
    // Handle golf course list requests
    if (path === "/api/courses") {
      return await handleCoursesRequest(request);
    }
    
    // Health check endpoint
    if (path === "/health" || path === "/") {
      return jsonResponse({ 
        status: "ok", 
        message: "ForeUp API Proxy is running", 
        version: "1.0.5",
        debug: DEBUG
      });
    }
    
    // Default response for unknown paths
    return jsonResponse({ error: "Not Found", path: path }, 404);
  } catch (error) {
    console.error(`Error handling request: ${error.message}`);
    debug("Error stack trace", error.stack);
    return errorResponse(`Server error: ${error.message}`);
  }
}

// Handle login requests to ForeUp
async function handleLoginRequest(request) {
  try {
    // Parse the incoming request body
    let requestData;
    try {
      requestData = await request.json();
      debug("Parsed login request data", requestData);
    } catch (error) {
      debug("Error parsing request JSON", error);
      return errorResponse("Invalid JSON in request body", 400);
    }
    
    if (!requestData.username || !requestData.password) {
      debug("Missing username or password");
      return errorResponse("Username and password are required", 400);
    }
    
    debug(`Attempting login for user: ${requestData.username}`);
    
    // Create a new request to the ForeUp login endpoint
    const loginUrl = "https://foreupsoftware.com/index.php/api/booking/users/login";
    debug(`ForeUp login URL: ${loginUrl}`);
    
    // Create form data with all required parameters
    const formData = new URLSearchParams();
    formData.append("username", requestData.username);
    formData.append("password", requestData.password);
    formData.append("booking_class_id", ""); // Empty but required
    formData.append("api_key", "no_limits");
    formData.append("course_id", "20106"); // Default course ID - Northern Hills
    
    // Use the exact headers from the successful curl request
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "Accept": "application/json, text/javascript, */*; q=0.01",
      "api-key": "no_limits",
      "x-fu-golfer-location": "foreup",
      "x-requested-with": "XMLHttpRequest",
      "Origin": "https://foreupsoftware.com",
      "Referer": "https://foreupsoftware.com/index.php/booking/20106/3567",
      "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36"
    };
    
    debug("Login request headers", headers);
    debug("Login request form data", formData.toString());
    
    // Make the request to ForeUp
    debug("Sending login request to ForeUp");
    let response;
    try {
      response = await fetch(loginUrl, {
        method: "POST",
        headers: headers,
        body: formData
      });
      
      debug(`Received response from ForeUp with status: ${response.status}`);
      debug("Response headers", Object.fromEntries(response.headers.entries()));
    } catch (error) {
      debug("Error making request to ForeUp", error);
      return errorResponse(`Failed to connect to ForeUp: ${error.message}`);
    }
    
    // Extract cookies from response
    const cookies = response.headers.get('set-cookie');
    
    // Log response status and cookies
    if (cookies) {
      debug(`Received cookies from ForeUp: ${cookies}`);
    } else {
      debug('No cookies received from ForeUp');
    }
    
    // Try to parse response as JSON
    let data;
    let responseText;
    try {
      responseText = await response.text();
      debug(`Response text from ForeUp: ${responseText}`);
      
      // Only try to parse if there's content
      if (responseText && responseText.trim()) {
        data = JSON.parse(responseText);
        debug("Parsed JSON response", data);
        
        // If we got cookies, include them in the response to the frontend
        if (cookies) {
          data.cookies = cookies;
          debug("Added cookies to response data");
        }
        
        // Check if JWT token is in the response
        if (data.jwt) {
          debug("JWT token found in response", data.jwt.substring(0, 20) + "...");
        } else {
          debug("No JWT token found in response");
        }
      } else {
        debug("Empty response from ForeUp API");
        return errorResponse("Empty response from ForeUp API", 502);
      }
    } catch (error) {
      debug(`Error parsing login response as JSON: ${error.message}`, { responseText });
      return errorResponse(`Invalid JSON response from ForeUp API: ${error.message}`, 502);
    }
    
    // Return the response with CORS headers
    return jsonResponse(data, response.status);
  } catch (error) {
    debug(`Login error: ${error.message}`, { stack: error.stack });
    return errorResponse(`Login failed: ${error.message}`);
  }
}


// Handle tee time requests

async function handleTeeTimesRequest(request) {
  try {
    // Parse the incoming request URL
    const originalUrl = new URL(request.url);
    
    // Create a new URL for ForeUp but preserve all original parameters
    const foreupUrl = new URL("https://foreupsoftware.com/index.php/api/booking/times");
    
    // Copy all parameters from the original request
    originalUrl.searchParams.forEach((value, key) => {
      foreupUrl.searchParams.append(key, value);
    });
    
    // Add api_key if not present
    if (!foreupUrl.searchParams.has('api_key')) {
      foreupUrl.searchParams.append('api_key', 'no_limits');
    }
    
    debug(`Fetching tee times with URL: ${foreupUrl.toString()}`);
    
    // Get JWT token and cookies from the request headers
    const jwt = request.headers.get("Authorization")?.replace("Bearer ", "");
    const cookies = request.headers.get("X-ForeUp-Cookies");
    
    // Build headers for ForeUp request
    const headers = {
      "Accept": "application/json, text/javascript, */*; q=0.01",
      "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36",
      "Origin": "https://foreupsoftware.com",
      "Referer": "https://foreupsoftware.com/index.php/booking/",
      "api-key": "no_limits",
      "x-fu-golfer-location": "foreup",
      "x-requested-with": "XMLHttpRequest"
    };
    
    // Add authorization headers
    if (jwt) {
      headers["x-authorization"] = `Bearer ${jwt}`;
    }
    
    if (cookies) {
      headers["Cookie"] = cookies;
    }
    
    // Make the request to ForeUp
    const response = await fetch(foreupUrl.toString(), {
      method: "GET",
      headers: headers
    });
    
    // Process and return the response
    const responseText = await response.text();
    
    if (!responseText || responseText.trim() === '') {
      debug("Empty response from ForeUp API");
      return errorResponse("Empty response from ForeUp API", 502);
    }
    
    try {
      const data = JSON.parse(responseText);
      return jsonResponse(data, response.status);
    } catch (error) {
      debug(`Error parsing response: ${error.message}`);
      return errorResponse("Invalid JSON response from ForeUp API", 502);
    }
  } catch (error) {
    debug(`Tee times error: ${error.message}`);
    return errorResponse(`Failed to fetch tee times: ${error.message}`);
  }
}

// Handle course list requests
async function handleCoursesRequest(request) {
  debug("Handling courses request");
  
  // Check if we should validate cookies
  const cookies = request.headers.get("X-ForeUp-Cookies");
  const jwt = request.headers.get("Authorization")?.replace("Bearer ", "");
  
  debug("Courses request auth info", {
    hasCookies: !!cookies,
    hasJwt: !!jwt,
    cookiesPreview: cookies ? cookies.substring(0, 30) + "..." : "none",
    jwtPreview: jwt ? jwt.substring(0, 20) + "..." : "none"
  });
  
  if (cookies || jwt) {
    debug("Request includes authentication, will try to validate");
    
    try {
      // Make a simple request to ForeUp to check if auth is valid
      const testUrl = "https://foreupsoftware.com/index.php/api/booking/users/user";
      
      const headers = {
        "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "api-key": "no_limits",
        "x-fu-golfer-location": "foreup",
        "x-requested-with": "XMLHttpRequest",
        "Origin": "https://foreupsoftware.com",
        "Referer": "https://foreupsoftware.com/index.php/booking/20106/3567"
      };
      
      if (cookies) {
        headers["Cookie"] = cookies;
      }
      
      if (jwt) {
        headers["x-authorization"] = `Bearer ${jwt}`;
      }
      
      debug("Auth validation headers", headers);
      
      const testResponse = await fetch(testUrl, {
        headers: headers
      });
      
      debug(`Auth validation response status: ${testResponse.status}`);
      debug("Auth validation response headers", Object.fromEntries(testResponse.headers.entries()));
      
      if (testResponse.ok) {
        debug("Authentication is valid");
        
        // Try to parse the user info
        try {
          const userText = await testResponse.text();
          debug("User info response text", userText.substring(0, 200) + "...");
          
          const userData = JSON.parse(userText);
          debug("User data retrieved", userData);
          
          // Return with the user info included
          return jsonResponse({
            courses: getSanAntonioCourses(),
            user: userData
          });
        } catch (e) {
          debug("Could not parse user data", e);
        }
      } else {
        debug("Authentication is not valid");
      }
    } catch (e) {
      debug("Error validating authentication", e);
    }
  }
  
  // Return the courses with CORS headers
  return jsonResponse(getSanAntonioCourses());
}

// Get San Antonio golf courses data
function getSanAntonioCourses() {
  return [
    { 
      name: "Brackenridge Park", 
      details: "Rating 70.3 / Slope 126 / Par 71 / 6243 Yds", 
      url: "https://foreupsoftware.com/index.php/booking/20103/3564#teetimes",
      courseId: "20103",
      facilityId: "3564" 
    },
    { 
      name: "Cedar Creek", 
      details: "Rating 73.4 / Slope 132 / Par 72 / 7158 yds", 
      url: "https://foreupsoftware.com/index.php/booking/20104/3565#/teetimes",
      courseId: "20104",
      facilityId: "3565"
    },
    { 
      name: "Mission del Lago", 
      details: "Rating 74.1 / Slope 134 / Par 72 / 7044 yds", 
      url: "https://foreupsoftware.com/index.php/booking/20105/3566#teetimes/",
      courseId: "20105",
      facilityId: "3566"
    },
    { 
      name: "Northern Hills", 
      details: "Rating 70.8 / Slope 118 / Par 72 / 6602 yds", 
      url: "https://foreupsoftware.com/index.php/booking/20106/3567#teetimes",
      courseId: "20106",
      facilityId: "3567"
    },
    { 
      name: "Olmos Basin", 
      details: "Rating 73.9 / Slope 135 / Par 72 / 7038 yds", 
      url: "https://foreupsoftware.com/index.php/booking/20107/3568#teetimes",
      courseId: "20107",
      facilityId: "3568"
    },
    { 
      name: "Riverside 18", 
      details: "Rating 72 / Slope 128 / Par 72 / 6694 yds", 
      url: "https://foreupsoftware.com/index.php/booking/20108/3569#teetimes",
      courseId: "20108",
      facilityId: "3569"
    },
    { 
      name: "The Teddy Bear Par 3", 
      details: "The Par 3 at Riverside", 
      url: "https://foreupsoftware.com/index.php/booking/20108/3570#teetimes",
      courseId: "20108",
      facilityId: "3570"
    },
    { 
      name: "San Pedro Par 3", 
      details: "Driving Range & Lighted Par 3", 
      url: "https://foreupsoftware.com/index.php/booking/20109/3572#teetimes",
      courseId: "20109",
      facilityId: "3572"
    }
  ];
}

// Handle creating a pending reservation
async function handlePendingReservationRequest(request) {
  try {
    // Verify this is a POST request
    if (request.method !== "POST") {
      return errorResponse("Method not allowed. Use POST for creating reservations.", 405);
    }
    
    // Get the form data from the request
    let formData;
    try {
      const requestText = await request.text();
      debug("Received pending reservation request data", requestText);
      
      // Parse the form-encoded data
      formData = new URLSearchParams(requestText);
    } catch (error) {
      debug("Error parsing request data", error);
      return errorResponse("Invalid request data", 400);
    }
    
    // Get JWT token and cookies from the request headers
    const jwt = request.headers.get("Authorization")?.replace("Bearer ", "");
    const cookies = request.headers.get("X-ForeUp-Cookies");
    
    if (!jwt) {
      debug("No JWT token found in request");
      return errorResponse("Authentication required", 401);
    }
    
    // Set up the request to ForeUp
    const pendingReservationUrl = "https://foreupsoftware.com/index.php/api/booking/pending_reservation";
    
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "Accept": "*/*",
      "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36",
      "Origin": "https://foreupsoftware.com",
      "Referer": "https://foreupsoftware.com/index.php/booking/",
      "api-key": "no_limits",
      "x-fu-golfer-location": "foreup",
      "x-requested-with": "XMLHttpRequest",
      "x-authorization": `Bearer ${jwt}`
    };
    
    if (cookies) {
      headers["Cookie"] = cookies;
    }
    
    debug("Sending pending reservation request to ForeUp", {
      url: pendingReservationUrl,
      headers: headers,
      formData: formData.toString()
    });
    
    // Make the request to ForeUp
    const response = await fetch(pendingReservationUrl, {
      method: "POST",
      headers: headers,
      body: formData
    });
    
    // Get the response text
    const responseText = await response.text();
    debug("ForeUp pending reservation response", responseText);
    
    // Parse the response as JSON if possible
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (error) {
      debug("Error parsing ForeUp response", error);
      return errorResponse("Invalid response from booking service", 502);
    }
    
    // Return the response with CORS headers
    return jsonResponse(responseData, response.status);
  } catch (error) {
    debug("Error creating pending reservation", error);
    return errorResponse(`Failed to create pending reservation: ${error.message}`);
  }
}

// Handle completing a reservation
async function handleCompleteReservationRequest(request) {
  try {
    // Verify this is a POST request
    if (request.method !== "POST") {
      return errorResponse("Method not allowed. Use POST for completing reservations.", 405);
    }
    
    // Get the JSON data from the request
    let requestData;
    try {
      requestData = await request.json();
      debug("Received reservation completion request data", requestData);
    } catch (error) {
      debug("Error parsing request JSON", error);
      return errorResponse("Invalid JSON in request body", 400);
    }
    
    // Get JWT token and cookies from the request headers
    const jwt = request.headers.get("Authorization")?.replace("Bearer ", "");
    const cookies = request.headers.get("X-ForeUp-Cookies");
    
    if (!jwt) {
      debug("No JWT token found in request");
      return errorResponse("Authentication required", 401);
    }
    
    // Ensure required fields are present
    if (!requestData.pending_reservation_id || !requestData.course_id) {
      debug("Missing required fields in request", requestData);
      return errorResponse("Missing required fields: pending_reservation_id and course_id are required", 400);
    }
    
    // Set up the request to ForeUp
    const reservationUrl = "https://foreupsoftware.com/index.php/api/booking/users/reservations";
    
    const headers = {
      "Content-Type": "application/json",
      "Accept": "application/json, text/javascript, */*; q=0.01",
      "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36",
      "Origin": "https://foreupsoftware.com",
      "Referer": "https://foreupsoftware.com/index.php/booking/",
      "api-key": "no_limits",
      "x-fu-golfer-location": "foreup",
      "x-requested-with": "XMLHttpRequest",
      "x-authorization": `Bearer ${jwt}`
    };
    
    if (cookies) {
      headers["Cookie"] = cookies;
    }
    
    debug("Sending reservation completion request to ForeUp", {
      url: reservationUrl,
      headers: headers,
      requestData: JSON.stringify(requestData)
    });
    
    // Make the request to ForeUp
    const response = await fetch(reservationUrl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(requestData)
    });
    
    // Get the response text
    const responseText = await response.text();
    debug("ForeUp reservation completion response", responseText);
    
    // Parse the response as JSON if possible
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (error) {
      debug("Error parsing ForeUp response", error);
      return errorResponse("Invalid response from booking service", 502);
    }
    
    // Return the response with CORS headers
    return jsonResponse(responseData, response.status);
  } catch (error) {
    debug("Error completing reservation", error);
    return errorResponse(`Failed to complete reservation: ${error.message}`);
  }
}

// Helper function to get formatted date
function getFormattedDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const year = now.getFullYear();
  return `${month}-${day}-${year}`;
}

// Register the event listener
addEventListener("fetch", event => {
  debug("Received fetch event", event.request.url);
  event.respondWith(handleRequest(event.request));
});
