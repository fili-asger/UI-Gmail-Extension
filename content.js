// Gmail Assistant Extension - Content Script

console.log("Gmail Assistant Extension loaded");

// Main function to initialize the extension
function initExtension() {
  // Check if we're in Gmail
  if (!isGmail()) return;

  console.log("Gmail detected, initializing extension");

  // Add styles for the refresh button
  addAssistantStyles();

  // Create and inject the email assistant button
  injectAssistantButton();

  // Setup message listener for communication with background script
  setupMessageListeners();

  // Add handlers for settings buttons
  addSettingsButtonHandlers();

  // Pre-fetch assistants if we have an API key
  chrome.storage.local.get(["openai_api_key"], function (result) {
    if (result.openai_api_key) {
      console.log("API key found on startup, pre-fetching assistants");
      // Fetch assistants in the background
      setTimeout(fetchOpenAIAssistants, 2000);
    }
  });
}

// Check if current page is Gmail
function isGmail() {
  return window.location.hostname === "mail.google.com";
}

// Inject the assistant button into Gmail compose area
function injectAssistantButton() {
  // We'll need to observe DOM changes to detect when compose window appears
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        // Look for compose windows that don't have our button yet
        const composeWindows = document.querySelectorAll(
          ".compose-form:not(.assistant-added)"
        );

        composeWindows.forEach((composeWindow) => {
          // Find the toolbar area in the compose window
          const toolbar = composeWindow.querySelector(".btC");
          if (toolbar) {
            insertAssistantButton(toolbar, composeWindow);
            // Mark this compose window as processed
            composeWindow.classList.add("assistant-added");
          }
        });

        // Also look for reply toolbars that don't have our button yet
        const replyToolbars = document.querySelectorAll(
          ".aDh .btC:not(.assistant-added)"
        );

        replyToolbars.forEach((toolbar) => {
          insertAssistantButton(toolbar, toolbar.closest(".aDh"));
          // Mark this toolbar as processed
          toolbar.classList.add("assistant-added");
        });
      }
    }
  });

  // Start observing the document body for changes
  observer.observe(document.body, { childList: true, subtree: true });
}

// Create and insert the assistant button
function insertAssistantButton(toolbar, composeWindow) {
  console.log("insertAssistantButton called", toolbar);

  // Find the attachment icons container
  const attachmentsSection = toolbar.querySelector(".a8X");

  if (!attachmentsSection) return;

  // Create our button in the Gmail style
  const buttonDiv = document.createElement("div");
  buttonDiv.className = "wG J-Z-I assistant-btn-container";
  buttonDiv.id = "gmail-assistant-btn"; // Add an ID for easier targeting
  buttonDiv.setAttribute("data-tooltip", "AI Assistant");
  buttonDiv.setAttribute("aria-label", "AI Assistant");
  buttonDiv.setAttribute("tabindex", "1");
  buttonDiv.setAttribute("role", "button");

  // Ensure we can find this button with CSS later
  buttonDiv.style.position = "relative";
  buttonDiv.style.zIndex = "10";

  // Use a simple div with background image instead of HTML content
  const button = document.createElement("div");
  button.className = "assistant-btn";
  buttonDiv.appendChild(button);

  // Simplify the click event to ensure it works consistently
  buttonDiv.addEventListener("click", function () {
    console.log("Assistant button clicked in toolbar - direct handler");

    // Try opening the settings modal first if no API key
    chrome.storage.local.get(["openai_api_key"], function (result) {
      if (!result.openai_api_key) {
        console.log("No API key, showing settings modal first");
        showSettingsModal();
      } else {
        openAssistantUI(composeWindow);
      }
    });
  });

  // Insert button into toolbar
  attachmentsSection.appendChild(buttonDiv);
  console.log("Assistant button added to toolbar");
}

// Open the assistant UI
function openAssistantUI(composeWindow) {
  console.log("openAssistantUI called");

  // Get email thread content
  const emailThread = getEmailThreadContent();

  // Create modal container if it doesn't exist
  let modalContainer = document.getElementById("gmail-assistant-modal");
  if (!modalContainer) {
    modalContainer = document.createElement("div");
    modalContainer.id = "gmail-assistant-modal";
    document.body.appendChild(modalContainer);
  }

  // Create and insert assistant UI HTML
  modalContainer.innerHTML = createAssistantUIHTML(emailThread);

  // Force modal to be visible with inline styles
  modalContainer.style.cssText = `
    position: fixed !important;
    display: flex !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    background: rgba(0,0,0,0.5) !important;
    z-index: 9999999 !important;
    justify-content: center !important;
    align-items: center !important;
    overflow: hidden !important;
  `;

  // Set up UI event handlers
  setupUIEventHandlers(composeWindow, emailThread);

  // Check API key and fetch assistants if needed
  checkAPIKeyAndAssistants();
}

// Extract email thread content
function getEmailThreadContent() {
  // Try to get the actual email thread content
  try {
    const subject = document.querySelector(".hP")?.textContent || "No subject";
    const thread = [];

    // Get all email messages in the thread
    const emailContainers = document.querySelectorAll(".gs");

    emailContainers.forEach((container) => {
      const fromElement = container.querySelector(".gD");
      const contentElement = container.querySelector(".a3s");

      if (fromElement && contentElement) {
        thread.push({
          from: fromElement.getAttribute("email") || fromElement.textContent,
          to:
            document.querySelector(".gD[email]")?.getAttribute("email") ||
            "me@example.com",
          content: contentElement.textContent.trim(),
        });
      }
    });

    // If we found thread content, return it
    if (thread.length > 0) {
      return {
        subject,
        thread,
      };
    }
  } catch (error) {
    console.error("Error extracting email content:", error);
  }

  // Fallback to sample thread
  return {
    subject: "Sample subject",
    thread: [
      {
        from: "sender@example.com",
        to: "me@example.com",
        content: "This is a sample email content.",
      },
    ],
  };
}

// Create HTML for the assistant UI
function createAssistantUIHTML(emailThread) {
  return `
    <div class="modal-wrapper">
      <!-- Screen 1: Assistant Selection -->
      <div id="screen1" class="screen active">
        <!-- Header -->
        <div class="gmail-header">
          <h2>AI Assistant</h2>
          <div class="flex items-center">
            <button id="desktopViewBtn" class="header-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" />
              </svg>
            </button>
            <button id="settingsBtn" class="header-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
              </svg>
            </button>
            <button id="closeModalBtn" class="close-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Content - Make it scrollable with max-height -->
        <div class="p-4 space-y-4" style="max-height: 70vh; overflow-y: auto;">
          <!-- Assistant Selection -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label for="assistant">Select Assistant</label>
              <div class="flex items-center">
                <button id="refreshAssistantsBtn" class="refresh-btn" title="Refresh assistants list">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                  </svg>
                </button>
                <div class="magic-wand-button" aria-label="Auto-detect assistant">
                  <span>🪄</span>
                </div>
              </div>
            </div>
            <div class="relative">
              <select id="assistant">
                <option value="">Loading assistants...</option>
              </select>
              <div id="assistant-loading" class="assistant-loading hidden">
                <div class="spinner-sm"></div>
              </div>
            </div>
            <a href="#" class="text-blue-600 mt-1" id="editAssistantListBtn">
              Edit Assistant List
            </a>
            <div id="assistant-error" class="text-red-500 text-xs mt-1 hidden"></div>
          </div>

          <!-- Action Selection -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label for="action">Select Action</label>
              <div class="magic-wand-button" aria-label="Auto-detect action">
                <span>🪄</span>
              </div>
            </div>
            <div class="relative">
              <select id="action">
                <option>Accept</option>
                <option>Reject</option>
                <option>Negotiate</option>
                <option>Help</option>
              </select>
            </div>
            <a href="#" class="text-blue-600 mt-1" id="editActionListBtn">
              Edit Action List
            </a>
          </div>

          <!-- Email Thread - Fixed height and scrollable -->
          <div>
            <label>Email Thread</label>
            <div id="emailPreview" style="height: 200px; overflow-y: auto; border: 1px solid #e0e0e0; border-radius: 4px; padding: 12px; background-color: #f9f9f9;">
              <!-- This will be populated with the email thread content -->
              <div class="email-sender">John Doe &lt;john.doe@example.com&gt;</div>
              <div class="email-recipient">To: me</div>
              <div class="email-subject">Subject: Meeting Follow-up</div>
              <div class="email-content">
                <p>Hi there,</p>
                <p>I wanted to follow up on our meeting yesterday. Could you please send me the report we discussed?</p>
                <p>Best regards,<br>John</p>
              </div>
              <hr style="margin: 15px 0; border: none; border-top: 1px solid #dcdfe3;">
              <div class="email-sender">Me &lt;myemail@example.com&gt;</div>
              <div class="email-recipient">To: John Doe</div>
              <div class="email-content">
                <p>Hi John,</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer - Fixed at bottom -->
        <div class="bg-gray-50 px-4 py-3 flex justify-end" style="border-top: 1px solid #e0e0e0;">
          <button id="generateBtn" class="gmail-button">
            Generate Response
          </button>
        </div>
      </div>

      <!-- Screen 2: Generated Response -->
      <div id="screen2" class="screen">
        <!-- Header -->
        <div class="gmail-header">
          <h2>Generated Response</h2>
          <div class="flex items-center">
            <button id="desktopViewBtn2" class="header-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" />
              </svg>
            </button>
            <button id="settingsBtn2" class="header-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
              </svg>
            </button>
            <button id="closeModalBtn2" class="close-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Content -->
        <div class="p-4" style="max-height: 70vh; overflow-y: auto;">
          <!-- Rich Text Editor -->
          <div id="responseText" class="border border-gray-300 rounded-md p-3 min-h-[200px] max-h-[300px] overflow-y-auto" contenteditable="true">
            <div class="spinner-container">
              <div class="spinner"></div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="bg-gray-50 px-4 py-3 flex justify-between" style="border-top: 1px solid #e0e0e0;">
          <button id="backBtn" class="text-gray-700 bg-white border border-gray-300 px-4 py-2 rounded-md text-sm font-medium">
            Back
          </button>
          <div class="flex space-x-2">
            <button id="regenerateBtn" class="text-blue-600 border border-gray-300 px-4 py-2 rounded-md text-sm font-medium">
              Regenerate
            </button>
            <button id="insertBtn" class="gmail-button">
              Insert in Email
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Create HTML for the settings modal
function createSettingsModalHTML() {
  return `
    <div class="modal-wrapper" style="max-width: 500px;">
      <!-- Header -->
      <div class="gmail-header">
        <h2>Settings</h2>
        <div class="flex items-center">
          <button id="closeSettingsBtn" class="close-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="p-4 space-y-4">
        <div>
          <label for="apiKey" class="block text-sm font-medium text-gray-700 mb-1">ChatGPT API Key</label>
          <input type="password" id="apiKey" class="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border" placeholder="sk-...">
          <p class="mt-1 text-xs text-gray-500">Your API key is stored locally and never sent to our servers.</p>
        </div>
      </div>

      <!-- Footer -->
      <div class="bg-gray-50 px-4 py-3 flex justify-end">
        <button id="saveSettingsBtn" class="gmail-button">
          Save
        </button>
      </div>
    </div>
  `;
}

// Set up event handlers for the UI
function setupUIEventHandlers(composeWindow, emailThread) {
  const modal = document.getElementById("gmail-assistant-modal");

  // Function to show a specific screen
  function showScreen(screenId) {
    document.querySelectorAll(".screen").forEach((screen) => {
      screen.classList.remove("active");
    });
    document.getElementById(screenId).classList.add("active");
  }

  // Close buttons
  const closeButtons = modal.querySelectorAll(".close-btn");
  closeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      modal.style.display = "none";
    });
  });

  // Add refresh assistants button handler
  const refreshBtn = modal.querySelector("#refreshAssistantsBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      // Show loading spinner
      const loadingEl = document.getElementById("assistant-loading");
      if (loadingEl) loadingEl.classList.remove("hidden");

      // Clear error message
      const errorEl = document.getElementById("assistant-error");
      if (errorEl) {
        errorEl.classList.add("hidden");
        errorEl.textContent = "";
      }

      // Force refresh assistants
      fetchOpenAIAssistants(true);
    });
  }

  // Populate email preview
  const emailPreview = modal.querySelector("#emailPreview");
  if (emailPreview) {
    let previewHtml = "";

    previewHtml += `
      <div class="space-y-3">
        <div>
          <p class="text-sm font-medium text-gray-900">Subject: ${emailThread.subject}</p>
        </div>
    `;

    emailThread.thread.forEach((message, index) => {
      previewHtml += `
        ${index > 0 ? '<div class="border-t border-gray-200 pt-2">' : "<div>"}
          <p class="text-sm font-medium text-gray-900">
            ${message.from}
          </p>
          <p class="text-xs text-gray-500">To: ${message.to}</p>
          <p class="text-sm mt-1">${message.content.substring(0, 150)}${
        message.content.length > 150 ? "..." : ""
      }</p>
        </div>
      `;
    });

    previewHtml += "</div>";
    emailPreview.innerHTML = previewHtml;
  }

  // Generate response
  const generateBtn = modal.querySelector("#generateBtn");
  if (generateBtn) {
    generateBtn.addEventListener("click", () => {
      // Get selected assistant ID
      const assistantSelect = modal.querySelector("#assistant");
      const assistantId = assistantSelect.value;

      // Check if an assistant is selected
      if (!assistantId) {
        showAssistantError("Please select an assistant first");
        return;
      }

      showScreen("screen2");

      const action = modal.querySelector("#action").value;

      // Show loading indicator
      const responseText = modal.querySelector("#responseText");
      responseText.innerHTML = `<div class="spinner-container"><div class="spinner"></div></div>`;

      // Get the API key from storage first
      chrome.storage.local.get(["openai_api_key"], function (result) {
        if (!result.openai_api_key) {
          responseText.innerHTML = `<p class="text-red-500">Error: API key not found. Please set your OpenAI API key in the extension settings.</p>`;
          return;
        }

        // We have an API key, now call the OpenAI API directly
        generateResponseWithAssistant(
          result.openai_api_key,
          assistantId,
          action,
          emailThread,
          responseText
        );
      });
    });
  }

  // Back button
  const backBtn = modal.querySelector("#backBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      showScreen("screen1");
    });
  }

  // Insert button
  const insertBtn = modal.querySelector("#insertBtn");
  if (insertBtn) {
    insertBtn.addEventListener("click", () => {
      const responseText = modal.querySelector("#responseText").innerText;

      // Find the editable area in the compose window
      let editableArea;

      // Check if it's a reply
      if (composeWindow.classList.contains("aDh")) {
        editableArea = composeWindow.querySelector("[contenteditable='true']");
      } else {
        // Regular compose window
        editableArea = composeWindow.querySelector("[g_editable='true']");
      }

      if (editableArea) {
        // Insert text into compose area
        editableArea.focus();

        // Use document.execCommand for compatibility
        document.execCommand("insertText", false, responseText);

        // Close modal
        modal.style.display = "none";
      }
    });
  }

  // Regenerate button
  const regenerateBtn = modal.querySelector("#regenerateBtn");
  if (regenerateBtn) {
    regenerateBtn.addEventListener("click", () => {
      // Here we would show the regenerate modal
      const assistant = modal.querySelector("#assistant").value;
      const action = modal.querySelector("#action").value;

      // For now, just regenerate without additional instructions
      const responseText = modal.querySelector("#responseText");
      responseText.innerHTML = `<div class="spinner-container"><div class="spinner"></div></div>`;

      chrome.runtime.sendMessage(
        {
          action: "generateResponse",
          data: {
            assistant,
            action,
            emailThread,
          },
        },
        (response) => {
          if (response && response.success) {
            responseText.innerHTML = formatEmailResponse(response.response);
          } else {
            responseText.innerHTML = `<p class="text-red-500">Error: ${
              response?.error || "Failed to generate response"
            }</p>`;
          }
        }
      );
    });
  }

  // Edit assistant list
  const editAssistantListBtn = modal.querySelector("#editAssistantListBtn");
  if (editAssistantListBtn) {
    editAssistantListBtn.addEventListener("click", () => {
      // Show the manage assistants modal
      showManageAssistantsModal();
    });
  }

  // Edit action list
  const editActionListBtn = modal.querySelector("#editActionListBtn");
  if (editActionListBtn) {
    editActionListBtn.addEventListener("click", () => {
      // Show action management UI in main modal
      // This would be implemented later
      alert(
        "Action management will be added to the main modal in a future update"
      );
    });
  }
}

// Format the email response text with proper paragraphs and spacing
function formatEmailResponse(text) {
  // Convert plain text to HTML with paragraphs
  return text
    .split("\n\n")
    .map((paragraph) => {
      // Handle line breaks within paragraphs
      const formattedParagraph = paragraph.replace(/\n/g, "<br>");
      return `<p>${formattedParagraph}</p>`;
    })
    .join("");
}

// Set up message listeners for communication with background script
function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Handle messages from background script
    if (request.action === "openAssistant") {
      const composeWindow = document.querySelector(".compose-form");
      if (composeWindow) {
        openAssistantUI(composeWindow);
      }
    }

    // Handle generate response request
    if (request.action === "generateResponse") {
      const { assistantId, action, emailThread } = request.data;

      // Simulate a response for now - this would be replaced with actual OpenAI API call
      // In a real implementation, this would be handled in background.js
      console.log(
        `Generating response with assistant ${assistantId} and action ${action}`
      );

      // Mock response - replace with actual API call to OpenAI
      setTimeout(() => {
        sendResponse({
          success: true,
          response: `This response was generated using the OpenAI assistant with ID: ${assistantId}\n\nHi there,\n\nThanks for your email. I'm sending over the report as requested.\n\nLet me know if you need anything else.\n\nBest regards,`,
        });
      }, 2000);

      // Return true to indicate we'll respond asynchronously
      return true;
    }

    return true;
  });
}

// Initialize the extension when the page is loaded
window.addEventListener("load", initExtension);

// Also run init on navigation (for Gmail's single-page app nature)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    initExtension();
  }
}).observe(document, { subtree: true, childList: true });

// Initialize event listeners for the assistant UI
function initAssistantUI() {
  // Close button event
  document.addEventListener("click", function (e) {
    if (
      e.target.closest(".close-btn") ||
      e.target.id === "closeModalBtn" ||
      e.target.id === "closeModalBtn2"
    ) {
      closeAssistantUI();
    }
  });

  // Generate button event
  document.addEventListener("click", function (e) {
    if (e.target.id === "generateBtn") {
      showGeneratedResponse();
    }
  });

  // Back button event
  document.addEventListener("click", function (e) {
    if (e.target.id === "backBtn") {
      showScreen("screen1");
    }
  });

  // Insert button event
  document.addEventListener("click", function (e) {
    if (e.target.id === "insertBtn") {
      insertGeneratedText();
    }
  });

  // Regenerate button event
  document.addEventListener("click", function (e) {
    if (e.target.id === "regenerateBtn") {
      regenerateResponse();
    }
  });

  // Settings button event
  document.addEventListener("click", function (e) {
    if (e.target.id === "settingsBtn" || e.target.id === "settingsBtn2") {
      showSettingsModal();
    }
  });

  // Desktop view button event
  document.addEventListener("click", function (e) {
    if (e.target.id === "desktopViewBtn" || e.target.id === "desktopViewBtn2") {
      toggleDesktopView();
    }
  });

  // Edit assistant list button event
  document.addEventListener("click", function (e) {
    if (e.target.id === "editAssistantListBtn") {
      // Will be handled in the main modal
      alert(
        "Assistant management will be added directly to the extension in a future update"
      );
    }
  });

  // Edit action list button event
  document.addEventListener("click", function (e) {
    if (e.target.id === "editActionListBtn") {
      // Will be handled in the main modal
      alert(
        "Action management will be added directly to the extension in a future update"
      );
    }
  });

  // Magic wand buttons
  document.addEventListener("click", function (e) {
    if (e.target.closest(".magic-wand-button")) {
      const parentLabel = e.target
        .closest("div")
        .previousElementSibling.querySelector("label");
      if (parentLabel && parentLabel.getAttribute("for") === "assistant") {
        autoDetectAssistant();
      } else if (parentLabel && parentLabel.getAttribute("for") === "action") {
        autoDetectAction();
      }
    }
  });
}

// Function to show a specific screen
function showScreen(screenId) {
  // Hide all screens
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.remove("active");
  });

  // Show the requested screen
  document.getElementById(screenId).classList.add("active");
}

// Function to close the assistant UI
function closeAssistantUI() {
  const modal = document.getElementById("gmail-assistant-modal");
  if (modal) {
    modal.style.display = "none";
  }
}

// Function to populate the email preview
function populateEmailPreview(emailContent) {
  const emailPreviewElem = document.getElementById("emailPreview");
  if (emailPreviewElem && emailContent) {
    // Clear previous content
    emailPreviewElem.innerHTML = "";

    // Add sender info
    if (emailContent.sender) {
      const senderElem = document.createElement("div");
      senderElem.className = "email-sender";
      senderElem.textContent = emailContent.sender;
      emailPreviewElem.appendChild(senderElem);
    }

    // Add recipient info
    if (emailContent.recipient) {
      const recipientElem = document.createElement("div");
      recipientElem.className = "email-recipient";
      recipientElem.textContent = `To: ${emailContent.recipient}`;
      emailPreviewElem.appendChild(recipientElem);
    }

    // Add subject info
    if (emailContent.subject) {
      const subjectElem = document.createElement("div");
      subjectElem.className = "email-subject";
      subjectElem.textContent = `Subject: ${emailContent.subject}`;
      emailPreviewElem.appendChild(subjectElem);
    }

    // Add messages
    if (emailContent.messages && emailContent.messages.length > 0) {
      emailContent.messages.forEach((message, index) => {
        // Add separator between messages
        if (index > 0) {
          const separator = document.createElement("hr");
          separator.style =
            "margin: 15px 0; border: none; border-top: 1px solid #dcdfe3;";
          emailPreviewElem.appendChild(separator);
        }

        // Add message content
        const contentElem = document.createElement("div");
        contentElem.className = "email-content";
        contentElem.innerHTML = message.content;
        emailPreviewElem.appendChild(contentElem);
      });
    }
  }
}

// Function to show the generated response screen
function showGeneratedResponse() {
  // Get selected assistant and action
  const assistant = document.getElementById("assistant").value;
  const action = document.getElementById("action").value;

  // Show the response screen
  showScreen("screen2");

  // Show loading spinner
  document.getElementById("responseText").innerHTML =
    '<div class="spinner-container"><div class="spinner"></div></div>';

  // Generate the response (simulate API call)
  setTimeout(() => {
    generateResponse(assistant, action);
  }, 1500);
}

// Function to generate a response based on assistant and action
function generateResponse(assistant, action) {
  // This would be replaced with an actual API call to OpenAI or similar
  const responseText = `Here's a generated response using the "${assistant}" assistant with the "${action}" action.\n\nHi John,\n\nThank you for following up. I've attached the report we discussed in our meeting yesterday.\n\nPlease let me know if you need anything else.\n\nBest regards,`;

  // Update the response text area
  document.getElementById("responseText").innerHTML = responseText.replace(
    /\n/g,
    "<br>"
  );
}

// Function to insert the generated text into the email compose area
function insertGeneratedText() {
  const responseText = document.getElementById("responseText").innerText;
  const composeArea = document.querySelector(
    'div[role="textbox"][aria-label*="Body"]'
  );

  if (composeArea) {
    composeArea.innerHTML = responseText;
  }

  // Close the modal
  closeAssistantUI();
}

// Function to regenerate the response
function regenerateResponse() {
  // Show loading spinner
  document.getElementById("responseText").innerHTML =
    '<div class="spinner-container"><div class="spinner"></div></div>';

  // Get selected assistant and action
  const assistant = document.getElementById("assistant").value;
  const action = document.getElementById("action").value;

  // Regenerate the response (simulate API call)
  setTimeout(() => {
    const responseText = `Here's a REGENERATED response using the "${assistant}" assistant with the "${action}" action.\n\nHi John,\n\nThanks for your email. I've attached the report we discussed during yesterday's meeting.\n\nLet me know if you have any questions about it.\n\nKind regards,`;

    // Update the response text area
    document.getElementById("responseText").innerHTML = responseText.replace(
      /\n/g,
      "<br>"
    );
  }, 1500);
}

// Function to open settings
function openSettings() {
  // Replace with direct modal function instead of options page
  showSettingsModal();
}

// Function to toggle desktop view
function toggleDesktopView() {
  // This would open a new window with the assistant UI
  alert("Desktop view is not implemented yet");
}

// Function to edit assistant list
function editAssistantList() {
  // Will be implemented in the main modal
  alert(
    "Assistant management will be added directly to the extension in a future update"
  );
}

// Function to auto-detect assistant
function autoDetectAssistant() {
  // This would analyze the email content and select the appropriate assistant
  const selectElement = document.getElementById("assistant");
  if (selectElement) {
    // Just select a random option for demonstration
    const options = selectElement.options;
    const randomIndex = Math.floor(Math.random() * options.length);
    selectElement.selectedIndex = randomIndex;
  }
}

// Function to auto-detect action
function autoDetectAction() {
  // This would analyze the email content and select the appropriate action
  const selectElement = document.getElementById("action");
  if (selectElement) {
    // Just select a random option for demonstration
    const options = selectElement.options;
    const randomIndex = Math.floor(Math.random() * options.length);
    selectElement.selectedIndex = randomIndex;
  }
}

// Function to show the settings modal
function showSettingsModal() {
  console.log("showSettingsModal called");

  // Remove any existing settings modal first
  const existingModal = document.getElementById("settings-modal");
  if (existingModal) {
    existingModal.remove();
  }

  // Create settings modal element directly
  const settingsModal = document.createElement("div");
  settingsModal.id = "settings-modal";
  settingsModal.className = "settings-modal active";

  // Create the content
  settingsModal.innerHTML = `
    <div class="settings-content">
      <!-- Settings Header -->
      <div class="gmail-header px-4 py-3 flex justify-between items-center rounded-t-lg">
        <h2>Settings</h2>
        <div class="flex items-center">
          <button id="closeSettingsBtn" class="close-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Settings Content -->
      <div class="p-4 space-y-4">
        <div>
          <label for="apiKey" class="block text-sm font-medium text-gray-700 mb-1">OpenAI API Key</label>
          <input type="password" id="apiKey" class="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border" placeholder="sk-...">
          <p class="mt-1 text-xs text-gray-500">Your API key is stored locally and never sent to our servers.</p>
          <p class="mt-1 text-xs text-blue-500">
            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">
              Get your API key from OpenAI →
            </a>
          </p>
        </div>
      </div>

      <!-- Settings Footer -->
      <div class="bg-gray-50 px-4 py-3 flex justify-end rounded-b-lg">
        <button id="saveSettingsBtn" class="gmail-button">
          Save
        </button>
      </div>
    </div>
  `;

  // Force visibility with inline styles
  settingsModal.style.cssText = `
    position: fixed !important;
    display: flex !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    background: rgba(0,0,0,0.5) !important;
    z-index: 9999999 !important;
    justify-content: center !important;
    align-items: center !important;
  `;

  // Add the modal to document
  document.body.appendChild(settingsModal);
  console.log("Settings modal added to DOM:", settingsModal);

  // Load API key from storage immediately
  chrome.storage.local.get(["openai_api_key"], function (result) {
    const apiKeyInput = document.getElementById("apiKey");
    if (apiKeyInput && result.openai_api_key) {
      apiKeyInput.value = result.openai_api_key;
    }
  });

  // Set up event handlers directly
  const closeBtn = document.getElementById("closeSettingsBtn");
  if (closeBtn) {
    closeBtn.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      const modal = document.getElementById("settings-modal");
      if (modal) modal.remove();
    };
  }

  const saveBtn = document.getElementById("saveSettingsBtn");
  if (saveBtn) {
    saveBtn.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();

      const apiKeyInput = document.getElementById("apiKey");
      const apiKey = apiKeyInput ? apiKeyInput.value.trim() : "";

      if (!apiKey) {
        // Highlight the input field if empty
        if (apiKeyInput) {
          apiKeyInput.style.borderColor = "red";
          apiKeyInput.focus();
        }
        return;
      }

      chrome.storage.local.set({ openai_api_key: apiKey }, function () {
        console.log("API key saved. Fetching assistants...");

        // Fetch assistants with the new API key
        fetchOpenAIAssistants();

        // Close the modal
        const modal = document.getElementById("settings-modal");
        if (modal) modal.remove();
      });
    };
  }
}

// Add click handlers to all settings buttons
function addSettingsButtonHandlers() {
  // Find all settings buttons
  const settingsButtons = document.querySelectorAll(
    "#settingsBtn, #settingsBtn2, .header-icon"
  );

  // Add click handler to each button
  settingsButtons.forEach((btn) => {
    btn.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      showSettingsModal();
      return false;
    };

    // Also handle SVG and path inside button
    const svg = btn.querySelector("svg");
    if (svg) {
      svg.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        showSettingsModal();
        return false;
      };
    }
  });
}

// Add a global click handler to catch settings button clicks
document.addEventListener(
  "click",
  function (e) {
    // Handle clicks on the settings button or its children
    if (
      e.target.id === "settingsBtn" ||
      e.target.classList.contains("header-icon") ||
      (e.target.parentElement &&
        (e.target.parentElement.id === "settingsBtn" ||
          e.target.parentElement.classList.contains("header-icon"))) ||
      (e.target.tagName === "svg" &&
        e.target.parentElement &&
        (e.target.parentElement.id === "settingsBtn" ||
          e.target.parentElement.classList.contains("header-icon"))) ||
      (e.target.tagName === "path" &&
        e.target.parentElement &&
        e.target.parentElement.parentElement &&
        (e.target.parentElement.parentElement.id === "settingsBtn" ||
          e.target.parentElement.parentElement.classList.contains(
            "header-icon"
          )))
    ) {
      e.preventDefault();
      e.stopPropagation();
      showSettingsModal();
      return false;
    }
  },
  true
);

// Initialize button handlers when content is loaded
document.addEventListener("DOMContentLoaded", function () {
  addSettingsButtonHandlers();
});

// Watch for new settings buttons added to the DOM
const buttonObserver = new MutationObserver(function (mutations) {
  for (const mutation of mutations) {
    if (mutation.type === "childList" && mutation.addedNodes.length) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if added node is or contains a settings button
          const settingsButtons = node.querySelectorAll(
            "#settingsBtn, #settingsBtn2, .header-icon"
          );
          if (settingsButtons.length) {
            addSettingsButtonHandlers();
            break;
          }
        }
      }
    }
  }
});

// Start observing the body immediately
buttonObserver.observe(document.body, { childList: true, subtree: true });

// Function to fetch OpenAI assistants using the API key
function fetchOpenAIAssistants(forceRefresh = false) {
  console.log("Fetching OpenAI assistants...");

  // Show loading indicator
  const loadingEl = document.getElementById("assistant-loading");
  if (loadingEl) loadingEl.classList.remove("hidden");

  // Clear error message
  const errorEl = document.getElementById("assistant-error");
  if (errorEl) {
    errorEl.classList.add("hidden");
    errorEl.textContent = "";
  }

  // Get the API key from Chrome storage
  chrome.storage.local.get(["openai_api_key"], function (result) {
    if (!result.openai_api_key) {
      console.error("No OpenAI API key found in storage");
      showAssistantError(
        "No API key found. Please add your OpenAI API key in settings."
      );
      return;
    }

    const apiKey = result.openai_api_key;
    console.log("Using API key with prefix:", apiKey.substring(0, 8) + "...");

    // Use the API call with the required beta header and a higher limit
    const apiUrl = "https://api.openai.com/v1/assistants?limit=100&order=desc";
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "OpenAI-Beta": "assistants=v2", // Add the required beta header
    };

    console.log(
      "Making API call to:",
      apiUrl,
      "with beta header:",
      headers["OpenAI-Beta"]
    );

    // Make API request to OpenAI to get assistants
    fetch(apiUrl, {
      method: "GET",
      headers: headers,
    })
      .then((response) => {
        console.log("API response status:", response.status);

        if (!response.ok) {
          return response.text().then((text) => {
            let errorData;
            try {
              // Try to parse JSON
              errorData = JSON.parse(text);
              console.error("Full API error response:", errorData);
            } catch (e) {
              // If not JSON, use text as is
              console.error("API error response (text):", text);
              errorData = { error: { message: text } };
            }

            // Generic error handling without validation on key format
            throw new Error(
              `API request failed with status ${response.status}: ${
                errorData.error?.message || "Unknown error"
              }`
            );
          });
        }
        return response.json();
      })
      .then((data) => {
        console.log("OpenAI assistants fetched successfully:", data);

        // Hide loading indicator
        if (loadingEl) loadingEl.classList.add("hidden");

        // Extract assistant data
        const assistants = data.data || [];

        // Check if we need to fetch more assistants (pagination)
        let allAssistants = [...assistants];

        const fetchMoreAssistants = (nextUrl) => {
          if (!nextUrl) {
            // We've fetched all assistants, now update UI
            finishAssistantsFetch(allAssistants);
            return;
          }

          // Extract the full URL if it's a relative URL
          const fullUrl = nextUrl.startsWith("http")
            ? nextUrl
            : `https://api.openai.com${nextUrl}`;

          console.log("Fetching more assistants from:", fullUrl);

          fetch(fullUrl, {
            method: "GET",
            headers: headers,
          })
            .then((response) => response.json())
            .then((moreData) => {
              const moreAssistants = moreData.data || [];
              allAssistants = [...allAssistants, ...moreAssistants];

              // Check if there are more pages
              if (moreData.has_more && moreData.last_id) {
                fetchMoreAssistants(
                  `/v1/assistants?limit=100&order=desc&after=${moreData.last_id}`
                );
              } else {
                finishAssistantsFetch(allAssistants);
              }
            })
            .catch((error) => {
              console.error("Error fetching additional assistants:", error);
              // Still finish with what we have
              finishAssistantsFetch(allAssistants);
            });
        };

        // Function to finish processing all fetched assistants
        const finishAssistantsFetch = (assistants) => {
          console.log(
            "All assistants fetched, total count:",
            assistants.length
          );

          // Show message if no assistants are found
          if (assistants.length === 0) {
            showAssistantError(
              "No assistants found in your OpenAI account. Please create at least one assistant in the OpenAI dashboard."
            );
          }

          // Save assistants to storage
          chrome.storage.local.set(
            { openai_assistants: assistants },
            function () {
              console.log("Assistants saved to storage:", assistants.length);

              // Update dropdown if it exists
              updateAssistantDropdown(assistants);
            }
          );
        };

        // Check for pagination
        if (data.has_more && data.last_id) {
          fetchMoreAssistants(
            `/v1/assistants?limit=100&order=desc&after=${data.last_id}`
          );
        } else {
          finishAssistantsFetch(allAssistants);
        }
      })
      .catch((error) => {
        console.error("Error fetching OpenAI assistants:", error);

        // Simplified error message that doesn't validate key format
        showAssistantError(`Failed to fetch assistants: ${error.message}`);

        // Hide loading indicator
        if (loadingEl) loadingEl.classList.add("hidden");
      });
  });
}

// Function to update the assistant dropdown with fetched assistants
function updateAssistantDropdown(assistants) {
  const dropdown = document.getElementById("assistant");
  if (!dropdown) return;

  // Clear existing options
  dropdown.innerHTML = "";

  // Add a default option
  const defaultOption = document.createElement("option");
  defaultOption.textContent = "Select an assistant...";
  defaultOption.value = "";
  dropdown.appendChild(defaultOption);

  // Add assistants to dropdown
  assistants.forEach((assistant) => {
    const option = document.createElement("option");
    option.value = assistant.id;
    option.textContent =
      assistant.name || `Assistant ${assistant.id.substring(0, 8)}`;
    dropdown.appendChild(option);
  });

  // Notify user if no assistants are available
  if (assistants.length === 0) {
    const noAssistantsOption = document.createElement("option");
    noAssistantsOption.textContent =
      "No assistants found - create one in OpenAI dashboard";
    noAssistantsOption.disabled = true;
    dropdown.appendChild(noAssistantsOption);
  }
}

// Function to populate assistant dropdown from storage or fetch if needed
function populateAssistantDropdown() {
  chrome.storage.local.get(["openai_assistants"], function (result) {
    if (result.openai_assistants && result.openai_assistants.length > 0) {
      // Use cached assistants
      updateAssistantDropdown(result.openai_assistants);
    } else {
      // Fetch assistants if none in storage
      fetchOpenAIAssistants();
    }
  });
}

// Function to show error message for assistant dropdown
function showAssistantError(errorMessage) {
  const errorEl = document.getElementById("assistant-error");
  if (errorEl) {
    errorEl.textContent = errorMessage;
    errorEl.classList.remove("hidden");
  }
}

// Add this new function to show the manage assistants modal
function showManageAssistantsModal() {
  console.log("Showing manage assistants modal");

  // Remove any existing manage assistants modal first
  const existingModal = document.getElementById("manage-assistants-modal");
  if (existingModal) {
    existingModal.remove();
  }

  // Create the modal element
  const manageModal = document.createElement("div");
  manageModal.id = "manage-assistants-modal";
  manageModal.className = "settings-modal active";

  // Force visibility with inline styles
  manageModal.style.cssText = `
    position: fixed !important;
    display: flex !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    background: rgba(0,0,0,0.5) !important;
    z-index: 9999999 !important;
    justify-content: center !important;
    align-items: center !important;
  `;

  // Get assistants from storage
  chrome.storage.local.get(
    ["openai_assistants", "selected_assistants"],
    function (result) {
      let assistants = result.openai_assistants || [];
      let selectedAssistants = result.selected_assistants || {};

      // If no selections exist yet, default to all assistants selected
      if (Object.keys(selectedAssistants).length === 0) {
        assistants.forEach((assistant) => {
          selectedAssistants[assistant.id] = true;
        });
      }

      // Create the modal content
      let modalContent = `
      <div class="modal-content" style="background: white; border-radius: 8px; width: 500px; max-width: 90%; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
        <!-- Header -->
        <div class="gmail-header" style="background-color: #4285f4; color: white; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center;">
          <h2 style="font-size: 22px; margin: 0;">Manage Assistants</h2>
          <button id="close-manage-assistants-btn" class="close-btn" style="background: none; border: none; color: white; cursor: pointer;">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Selection Buttons - Now with white background and border -->
        <div style="padding: 16px 24px; background: white; border-bottom: 1px solid #e0e0e0; position: sticky; top: 0; z-index: 10;">
          <div style="display: flex; align-items: center;">
            <button id="select-all-btn" style="display: flex; align-items: center; color: #4285f4; background: none; border: none; font-size: 16px; font-weight: 500; cursor: pointer; margin-right: 24px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;">
                <polyline points="9 11 12 14 22 4"></polyline>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
              Select All
            </button>
            <button id="deselect-all-btn" style="display: flex; align-items: center; color: #4285f4; background: none; border: none; font-size: 16px; font-weight: 500; cursor: pointer;">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;">
                <path d="M18 6L6 18"></path>
                <path d="M6 6l12 12"></path>
              </svg>
              Deselect All
            </button>
          </div>
        </div>

        <!-- Assistants List - Increased max-height for better visibility -->
        <div style="max-height: 400px; overflow-y: auto; padding: 16px 24px 0;">
          <div style="display: flex; flex-direction: column; gap: 16px; padding-bottom: 16px;">
    `;

      // Add each assistant as a checkbox item
      assistants.forEach((assistant) => {
        const isChecked = selectedAssistants[assistant.id];
        const assistantName =
          assistant.name || `Assistant ${assistant.id.substring(0, 8)}`;

        modalContent += `
        <div class="assistant-item" style="display: flex; align-items: center; padding: 8px 0;">
          <label class="checkbox-container" style="display: flex; align-items: center; cursor: pointer; width: 100%;">
            <input type="checkbox" class="assistant-checkbox" data-id="${
              assistant.id
            }" ${
          isChecked ? "checked" : ""
        } style="width: 20px; height: 20px; margin-right: 12px;">
            <span style="font-size: 16px; color: #333;">${assistantName}</span>
          </label>
        </div>
      `;
      });

      // Add a message if no assistants
      if (assistants.length === 0) {
        modalContent += `
        <div style="text-align: center; padding: 20px 0; color: #666;">
          No assistants found. Create assistants in your OpenAI dashboard.
        </div>
      `;
      }

      // Add footer with buttons
      modalContent += `
          </div>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #e0e0e0; padding: 16px 24px; display: flex; justify-content: space-between; background: white;">
          <button id="cancel-manage-assistants-btn" style="padding: 10px 20px; background: white; border: 1px solid #ddd; border-radius: 4px; font-size: 16px; cursor: pointer;">
            Cancel
          </button>
          <button id="save-manage-assistants-btn" style="padding: 10px 20px; background: #4285f4; color: white; border: none; border-radius: 4px; font-size: 16px; cursor: pointer;">
            Save
          </button>
        </div>
      </div>
    `;

      // Set the modal content and add to document
      manageModal.innerHTML = modalContent;
      document.body.appendChild(manageModal);

      // Set up event handlers

      // Close button
      const closeBtn = document.getElementById("close-manage-assistants-btn");
      if (closeBtn) {
        closeBtn.addEventListener("click", () => {
          manageModal.remove();
        });
      }

      // Cancel button
      const cancelBtn = document.getElementById("cancel-manage-assistants-btn");
      if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
          manageModal.remove();
        });
      }

      // Select All button
      const selectAllBtn = document.getElementById("select-all-btn");
      if (selectAllBtn) {
        selectAllBtn.addEventListener("click", () => {
          const checkboxes = manageModal.querySelectorAll(
            ".assistant-checkbox"
          );
          checkboxes.forEach((checkbox) => {
            checkbox.checked = true;
          });
        });
      }

      // Deselect All button
      const deselectAllBtn = document.getElementById("deselect-all-btn");
      if (deselectAllBtn) {
        deselectAllBtn.addEventListener("click", () => {
          const checkboxes = manageModal.querySelectorAll(
            ".assistant-checkbox"
          );
          checkboxes.forEach((checkbox) => {
            checkbox.checked = false;
          });
        });
      }

      // Save button
      const saveBtn = document.getElementById("save-manage-assistants-btn");
      if (saveBtn) {
        saveBtn.addEventListener("click", () => {
          // Collect selected assistants
          const checkboxes = manageModal.querySelectorAll(
            ".assistant-checkbox"
          );
          const selectedAssistants = {};

          checkboxes.forEach((checkbox) => {
            const assistantId = checkbox.getAttribute("data-id");
            selectedAssistants[assistantId] = checkbox.checked;
          });

          // Save selected assistants to storage
          chrome.storage.local.set(
            { selected_assistants: selectedAssistants },
            function () {
              console.log("Selected assistants saved:", selectedAssistants);

              // Update the dropdown to reflect selected assistants
              updateAssistantDropdownWithSelection(
                assistants,
                selectedAssistants
              );

              // Close the modal
              manageModal.remove();
            }
          );
        });
      }
    }
  );
}

// Update the updateAssistantDropdown function to take selected assistants into account
function updateAssistantDropdownWithSelection(assistants, selectedAssistants) {
  const dropdown = document.getElementById("assistant");
  if (!dropdown) return;

  // Clear existing options
  dropdown.innerHTML = "";

  // Add a default option
  const defaultOption = document.createElement("option");
  defaultOption.textContent = "Select an assistant...";
  defaultOption.value = "";
  dropdown.appendChild(defaultOption);

  // Filter assistants based on selection and add to dropdown
  const filteredAssistants = assistants.filter(
    (assistant) => selectedAssistants[assistant.id]
  );

  filteredAssistants.forEach((assistant) => {
    const option = document.createElement("option");
    option.value = assistant.id;
    option.textContent =
      assistant.name || `Assistant ${assistant.id.substring(0, 8)}`;
    dropdown.appendChild(option);
  });

  // Notify user if no assistants are selected
  if (filteredAssistants.length === 0) {
    const noAssistantsOption = document.createElement("option");
    noAssistantsOption.textContent =
      "No assistants selected - manage your list";
    noAssistantsOption.disabled = true;
    dropdown.appendChild(noAssistantsOption);
  }
}

// Modify the updateAssistantDropdown function to use the selection logic
function updateAssistantDropdown(assistants) {
  // Check if we have any selected assistants
  chrome.storage.local.get(["selected_assistants"], function (result) {
    let selectedAssistants = result.selected_assistants || {};

    // If no selections exist yet, default to all assistants selected
    if (Object.keys(selectedAssistants).length === 0) {
      assistants.forEach((assistant) => {
        selectedAssistants[assistant.id] = true;
      });
      // Save this initial selection
      chrome.storage.local.set({ selected_assistants: selectedAssistants });
    }

    // Update the dropdown using the selection
    updateAssistantDropdownWithSelection(assistants, selectedAssistants);
  });
}

// Add these functions back that were accidentally removed
// Add some styles for the refresh button and loading spinner
function addAssistantStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .refresh-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 1px solid #e0e0e0;
      background: white;
      color: #1a73e8;
      margin-right: 8px;
      cursor: pointer;
    }
    .refresh-btn:hover {
      background: #f0f0f0;
    }
    .assistant-loading {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
    }
    .spinner-sm {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(26, 115, 232, 0.2);
      border-radius: 50%;
      border-top-color: #1a73e8;
      animation: spinner-rotate 1s linear infinite;
    }
    .hidden {
      display: none;
    }
    
    /* Modal styles to ensure proper layout */
    .modal-wrapper {
      background: white;
      border-radius: 8px;
      width: 550px;
      max-width: 95vw;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      overflow: hidden;
    }
    
    /* Screen layout */
    .screen {
      display: none;
      flex-direction: column;
      height: 100%;
      max-height: 90vh;
    }
    .screen.active {
      display: flex;
    }
    
    /* Email preview styles */
    #emailPreview {
      font-size: 14px;
      line-height: 1.5;
    }
    .email-sender {
      font-weight: 500;
      margin-bottom: 4px;
    }
    .email-recipient, .email-subject {
      color: #666;
      margin-bottom: 4px;
    }
    .email-content {
      margin-top: 8px;
    }
    .email-content p {
      margin-bottom: 8px;
    }
  `;
  document.head.appendChild(style);
}

// Add a function to check API key and show settings if missing
function checkAPIKeyAndAssistants() {
  chrome.storage.local.get(
    ["openai_api_key", "openai_assistants"],
    function (result) {
      if (!result.openai_api_key) {
        console.log("No API key found, showing settings");
        showSettingsModal();
        return;
      }

      if (!result.openai_assistants || result.openai_assistants.length === 0) {
        console.log("No assistants found, fetching from API");
        fetchOpenAIAssistants();
      }
    }
  );
}

// Add function to generate a response using OpenAI Assistants API
async function generateResponseWithAssistant(
  apiKey,
  assistantId,
  action,
  emailThread,
  responseElement
) {
  console.log(
    `Generating response with assistant ${assistantId} and action "${action}"`
  );

  try {
    // Format the email thread data for the prompt
    const emailContent = formatEmailThreadForPrompt(emailThread, action);

    // Step 1: Create a thread
    const threadResponse = await fetch("https://api.openai.com/v1/threads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "OpenAI-Beta": "assistants=v2",
      },
      body: JSON.stringify({}),
    });

    if (!threadResponse.ok) {
      const errorData = await threadResponse.json();
      throw new Error(
        `Failed to create thread: ${
          errorData.error?.message || threadResponse.statusText
        }`
      );
    }

    const threadData = await threadResponse.json();
    const threadId = threadData.id;
    console.log("Thread created:", threadId);

    // Step 2: Add a message to the thread
    const messageResponse = await fetch(
      `https://api.openai.com/v1/threads/${threadId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "OpenAI-Beta": "assistants=v2",
        },
        body: JSON.stringify({
          role: "user",
          content: emailContent,
        }),
      }
    );

    if (!messageResponse.ok) {
      const errorData = await messageResponse.json();
      throw new Error(
        `Failed to add message: ${
          errorData.error?.message || messageResponse.statusText
        }`
      );
    }

    console.log("Message added to thread");

    // Step 3: Run the assistant on the thread
    const runResponse = await fetch(
      `https://api.openai.com/v1/threads/${threadId}/runs`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "OpenAI-Beta": "assistants=v2",
        },
        body: JSON.stringify({
          assistant_id: assistantId,
        }),
      }
    );

    if (!runResponse.ok) {
      const errorData = await runResponse.json();
      throw new Error(
        `Failed to run assistant: ${
          errorData.error?.message || runResponse.statusText
        }`
      );
    }

    const runData = await runResponse.json();
    const runId = runData.id;
    console.log("Assistant run started:", runId);

    // Step 4: Poll for the run completion
    await pollRunStatus(apiKey, threadId, runId, responseElement);
  } catch (error) {
    console.error("Error generating response:", error);
    responseElement.innerHTML = `<p class="text-red-500">Error: ${error.message}</p>`;
  }
}

// Add function to poll the run status
async function pollRunStatus(apiKey, threadId, runId, responseElement) {
  try {
    let completed = false;
    let attempts = 0;
    const maxAttempts = 30; // Prevent infinite polling

    while (!completed && attempts < maxAttempts) {
      attempts++;

      // Wait a bit between polls (2 seconds)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check run status
      const statusResponse = await fetch(
        `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "OpenAI-Beta": "assistants=v2",
          },
        }
      );

      if (!statusResponse.ok) {
        const errorData = await statusResponse.json();
        throw new Error(
          `Failed to check run status: ${
            errorData.error?.message || statusResponse.statusText
          }`
        );
      }

      const statusData = await statusResponse.json();
      console.log("Run status:", statusData.status);

      if (statusData.status === "completed") {
        completed = true;
        // Get the assistant's response messages
        await getAssistantResponse(apiKey, threadId, responseElement);
      } else if (
        statusData.status === "failed" ||
        statusData.status === "cancelled" ||
        statusData.status === "expired"
      ) {
        throw new Error(
          `Run ${statusData.status}: ${
            statusData.last_error?.message || "Unknown error"
          }`
        );
      }

      // If we're still running, update the UI to show progress
      if (!completed && attempts % 3 === 0) {
        responseElement.innerHTML = `
          <div class="spinner-container">
            <div class="spinner"></div>
            <p class="mt-3 text-gray-500">Still thinking... (${
              attempts * 2
            }s)</p>
          </div>
        `;
      }
    }

    if (!completed) {
      throw new Error("Response generation timed out. Please try again.");
    }
  } catch (error) {
    console.error("Error polling run status:", error);
    responseElement.innerHTML = `<p class="text-red-500">Error: ${error.message}</p>`;
  }
}

// Add function to get the assistant's response
async function getAssistantResponse(apiKey, threadId, responseElement) {
  try {
    const messagesResponse = await fetch(
      `https://api.openai.com/v1/threads/${threadId}/messages?limit=1`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "OpenAI-Beta": "assistants=v2",
        },
      }
    );

    if (!messagesResponse.ok) {
      const errorData = await messagesResponse.json();
      throw new Error(
        `Failed to get messages: ${
          errorData.error?.message || messagesResponse.statusText
        }`
      );
    }

    const messagesData = await messagesResponse.json();

    // Extract the assistant's last message
    const assistantMessages = messagesData.data.filter(
      (msg) => msg.role === "assistant"
    );
    if (assistantMessages.length === 0) {
      throw new Error("No response received from assistant");
    }

    // Get the content from the latest assistant message
    const latestMessage = assistantMessages[0];
    let responseContent = "";

    // Extract text from the message content (handling different content formats)
    if (latestMessage.content && latestMessage.content.length > 0) {
      for (const contentItem of latestMessage.content) {
        if (contentItem.type === "text") {
          responseContent += contentItem.text.value + "\n\n";
        }
      }
    }

    if (!responseContent) {
      throw new Error("Empty response received from assistant");
    }

    console.log("Assistant response received");

    // Display the response
    responseElement.innerHTML = formatEmailResponse(responseContent.trim());
  } catch (error) {
    console.error("Error getting assistant response:", error);
    responseElement.innerHTML = `<p class="text-red-500">Error: ${error.message}</p>`;
  }
}

// Function to format the email thread data for the prompt
function formatEmailThreadForPrompt(emailThread, action) {
  let prompt = `I'm using you to help me respond to an email thread. The action I want to take is: "${action}"\n\n`;

  prompt += `Subject: ${emailThread.subject}\n\n`;

  // Add each message in the thread
  emailThread.thread.forEach((message, index) => {
    prompt += `--- Message ${index + 1} ---\n`;
    prompt += `From: ${message.from}\n`;
    prompt += `To: ${message.to}\n\n`;
    prompt += `${message.content}\n\n`;
  });

  prompt += `Based on this email thread, please generate a professional response that I can use to reply. The tone should be appropriate for the action "${action}".`;

  return prompt;
}
