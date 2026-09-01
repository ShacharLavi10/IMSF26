/**
 * Exposure Festival 2026 - Vercel API Backend
 * 
 * Replace your existing doGet() with this doPost(e) function.
 * You can keep all your other functions (verifyOTP, getGuestPortalData, etc.) exactly as they are.
 */

function doPost(e) {
  // We expect requests to be sent as text/plain to bypass CORS preflight.
  // We parse the stringified JSON here.
  
  // Set default CORS headers (though Google Scripts don't strictly support setting headers via ContentService, 
  // the text/plain trick handles the browser side).
  
  try {
    const bodyText = e.postData.contents;
    if (!bodyText) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Empty request body" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const request = JSON.parse(bodyText);
    const method = request.method;
    const args = request.args || [];
    
    // Safety check - don't allow calling doPost itself
    if (method === 'doPost' || method === 'doGet') {
       return ContentService.createTextOutput(JSON.stringify({ error: "Unauthorized method" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (typeof this[method] === 'function') {
      const result = this[method].apply(this, args);
      return ContentService.createTextOutput(JSON.stringify({ data: result }))
        .setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({ error: "Method not found: " + method }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Optional: Keep doGet for testing to verify the API is alive
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: "API is active. Send POST requests." }))
    .setMimeType(ContentService.MimeType.JSON);
}

