/**
 * Utility functions for formatting and handling email text
 */

/**
 * Formats email content for display by preserving line breaks
 * @param {string} text - The raw email content text
 * @returns {string} - Formatted HTML string with proper line breaks
 */
function formatEmailContent(text) {
  if (!text) return "";

  // Convert line breaks to HTML breaks for proper display
  return text
    .replace(/\n\n+/g, "<div><br></div>") // Multiple line breaks become paragraph breaks
    .replace(/\n/g, "<br>"); // Single line breaks become <br> tags
}

/**
 * Formats response text from AI for inserting into Gmail's compose field
 * @param {string} responseText - The raw response text from AI
 * @returns {string} - Properly formatted HTML for Gmail's editor
 */
function formatResponseForGmail(responseText) {
  if (!responseText) return "";

  // Clean up the response text to ensure consistent formatting
  // Remove any excessive line breaks (more than 2 in a row)
  let formattedText = responseText.replace(/\n{3,}/g, "\n\n");

  // Ensure there are proper paragraph breaks for structural elements
  formattedText = formattedText
    // Add break after greeting
    .replace(/^(Hi|Hello|Dear|Greetings)([^,]*),/gm, "$1$2,\n\n")
    // Add break before closing
    .replace(
      /(\.|!|\?)(\s*)(?=Best|Kind|Warm|Regards|Sincerely|Thank)/g,
      "$1\n\n$2"
    )
    // Add break after closing phrase (ensure double line break)
    .replace(
      /(Best regards|Kind regards|Warm regards|Regards|Sincerely|Thank you)([^,]*),(\s*)/g,
      "$1$2,\n\n"
    );

  // Convert line breaks to HTML breaks for Gmail
  return formattedText
    .replace(/\n\n+/g, "<div><br></div>") // Multiple line breaks become paragraph breaks
    .replace(/\n/g, "<br>"); // Single line breaks become <br> tags
}

// Export for both browser and Node.js environments
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    formatEmailContent,
    formatResponseForGmail,
  };
}
