// ForeUp API Proxy - Cloudflare Worker (Version 1.0.1)
// This worker handles API requests to the ForeUp system, avoiding CORS issues

// Define CORS headers for all responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Replace with your domain in production
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, api-key, x-fu-golfer-location, x-requested-with",
  "Access-Control-Max-Age": "86400",
};


// Add this to your worker code
// Handle cookie validation requests
async function handleValidateCookiesRequest(request) {
  try {
    // Get cookies from the request headers
    const cookies = request.headers.get("X-ForeUp-Cookies");
    
    if (!cookies) {
      return jsonResponse({ valid: false, reason: "No cookies provided" });
    }
    
    console.log(`Validating cookies: ${cookies.substring(0, 20)}...`);
    
    // Try to make a simple request to ForeUp to check if cookies are valid
    const testUrl = "https://foreupsoftware.com/index.php/api/booking/users/user";
    
    const response = await fetch(testUrl, {
      headers: {
        "Cookie": cookies,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      }
    });
    
    console.log(`Cookie validation response status: ${response.status}`);
    
    // Check if we got a successful response
    if (response.ok) {
      return jsonResponse({ valid: true });
    } else {
      return jsonResponse({ valid: false, reason: `Server returned ${response.status}` });
    }
  } catch (error) {
    console.error(`Cookie validation error: ${error.message}`);
    return errorResponse(`Failed to validate cookies: ${error.message}`);
  }
}


// Handle OPTIONS requests (CORS preflight)
function handleOptions(request) {
  return new Response(null, {
    headers: corsHeaders,
    status: 204,
  });
}

// Create a standard JSON response
function jsonResponse(data, status = 200) {
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
  return jsonResponse({ error: true, message: message }, status);
}

// Debug response for troubleshooting
function debugResponse(data, originalResponse) {
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
  console.log(`Received ${request.method} request to ${path}`);
  
  // Handle preflight OPTIONS request
  if (request.method === "OPTIONS") {
    return handleOptions(request);
  }
  
  try {
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
      return await handleCoursesRequest();
    }
    // Handle cookie validation requests (new endpoint)
    if (path === "/api/validate-cookies") {
      return await handleValidateCookiesRequest(request);
    }
    
    // Health check endpoint
    if (path === "/health" || path === "/") {
      return jsonResponse({ 
        status: "ok", 
        message: "ForeUp API Proxy is running", 
        version: "1.0.2" 
      });
    }
    
    // Default response for unknown paths
    return jsonResponse({ error: "Not Found", path: path }, 404);
  } catch (error) {
    console.error(`Error handling request: ${error.message}`);
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
    } catch (error) {
      return errorResponse("Invalid JSON in request body", 400);
    }
    
    if (!requestData.username || !requestData.password) {
      return errorResponse("Username and password are required", 400);
    }
    
    console.log(`Attempting login for user: ${requestData.username}`);
    
    // Create a new request to the ForeUp login endpoint
    const loginUrl = "https://foreupsoftware.com/index.php/api/booking/users/login";
    
    // Convert the request data to URLSearchParams
    const formData = new URLSearchParams();
    formData.append("username", requestData.username);
    formData.append("password", requestData.password);
    
    // Make the request to ForeUp
    const response = await fetch(loginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "api-key": "no_limits",
        "x-fu-golfer-location": "foreup",
        "x-requested-with": "XMLHttpRequest",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Origin": "https://foreupsoftware.com",
        "Referer": "https://foreupsoftware.com/index.php/booking/20103/3564"
      },
      body: formData,
      redirect: 'follow'
    });
    
    // Extract cookies from response
    const cookies = response.headers.get('set-cookie');
    
    // Log response status and cookies
    console.log(`Received login response with status: ${response.status}`);
    if (cookies) {
      console.log(`Received cookies: ${cookies.substring(0, 50)}...`);
    } else {
      console.log('No cookies received');
    }
    
    // Try to parse response as JSON
    let data;
    try {
      const responseText = await response.text();
      console.log(`Response text: ${responseText.substring(0, 200)}...`);
      
      if (responseText && responseText.trim()) {
        data = JSON.parse(responseText);
        
        // If we got cookies, include them in the response to the frontend
        if (cookies) {
          data.cookies = cookies;
        }
        
        // Handle the "Refresh required" error
        if (data.success === false && data.msg === "Refresh required") {
          return jsonResponse({
            success: false,
            msg: "Refresh required",
            openNewWindow: true,
            forceRedirect: true,
            redirectUrl: "https://foreupsoftware.com/index.php/booking/20103/3564#/login"
          });
        }
      } else {
        return errorResponse("Empty response from ForeUp API", 502);
      }
    } catch (error) {
      console.error(`Error parsing login response: ${error.message}`);
      return errorResponse("Invalid JSON response from ForeUp API", 502);
    }
    
    // Return the response with CORS headers
    return jsonResponse(data, response.status);
  } catch (error) {
    console.error(`Login error: ${error.message}`);
    return errorResponse(`Login failed: ${error.message}`);
  }
}

// Update tee time requests function
// Handle tee time requests
async function handleTeeTimesRequest(request) {
  try {
    // Parse the incoming request for course ID, date, etc.
    const url = new URL(request.url);
    const courseId = url.searchParams.get("courseId") || "20103";
    const facilityId = url.searchParams.get("facilityId") || "3564";
    const date = url.searchParams.get("date") || getFormattedDate();
    
    console.log(`Fetching tee times for course ${courseId}, date ${date}`);
    
    // Create the tee times URL
    const teeTimesUrl = `https://foreupsoftware.com/index.php/api/booking/times?time=&date=${date}&holes=&players=&booking_class=&schedule_id=${courseId}&schedule_ids%5B%5D=${courseId}&specials_only=0&api_key=no_limits`;
    
    // Get JWT token and cookies from the request headers
    const jwt = request.headers.get("Authorization")?.replace("Bearer ", "");
    const cookies = request.headers.get("X-ForeUp-Cookies");
    
    const headers = {
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Origin": "https://foreupsoftware.com",
      "Referer": `https://foreupsoftware.com/index.php/booking/${courseId}/${facilityId}`,
      "api-key": "no_limits",                     // Add this line
      "x-fu-golfer-location": "foreup",           // Add this line
      "x-requested-with": "XMLHttpRequest"        // Add this line
    };
    
    // Add authorization headers based on what we have
    if (jwt) {
      headers["x-authorization"] = `Bearer ${jwt}`;  // CHANGE THIS LINE from "Authorization" to "x-authorization"
    }
    
    if (cookies) {
      headers["Cookie"] = cookies;
    }
    
    // Make the request to ForeUp
    const response = await fetch(teeTimesUrl, {
      method: "GET",
      headers: headers
    });

    
    console.log(`Received tee times response with status: ${response.status}`);
    
    // Try to parse response as JSON
    let data;
    try {
      const responseText = await response.text();
      console.log(`First 200 chars of response: ${responseText.substring(0, 200)}...`);
      
      if (responseText && responseText.trim()) {
        data = JSON.parse(responseText);
      } else {
        return errorResponse("Empty response from ForeUp API", 502);
      }
    } catch (error) {
      console.error(`Error parsing tee times response: ${error.message}`);
      return errorResponse("Invalid JSON response from ForeUp API", 502);
    }
    
    // Return the response with CORS headers
    return jsonResponse(data, response.status);
  } catch (error) {
    console.error(`Tee times error: ${error.message}`);
    return errorResponse(`Failed to fetch tee times: ${error.message}`);
  }
}


// Handle course list requests
async function handleCoursesRequest() {
  // This data is from the CSV you provided
  const courses = [
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
  
  // Return the courses with CORS headers
  return jsonResponse(courses);
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
  event.respondWith(handleRequest(event.request));
});
