// Gmail Assistant Extension - Content Script

console.log("Gmail Assistant Extension loaded");

// Safe storage utility function to handle Chrome storage API safely
function safeStorage() {
  const isAvailable =
    typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;

  return {
    get: function (keys, callback) {
      if (isAvailable) {
        try {
          chrome.storage.local.get(keys, callback);
        } catch (error) {
          console.warn("Chrome storage error:", error);
          // Handle context invalidation error
          if (
            error.message &&
            error.message.includes("Extension context invalidated")
          ) {
            console.warn(
              "Extension context has been invalidated. The page needs refreshing."
            );
            showExtensionContextInvalidatedMessage();
          }
          // Provide empty result as fallback
          callback({});
        }
      } else {
        console.warn("Chrome storage API not available for get operation");
        callback({});
      }
    },
    set: function (items, callback) {
      if (isAvailable) {
        try {
          chrome.storage.local.set(items, callback);
        } catch (error) {
          console.warn("Chrome storage error:", error);
          // Handle context invalidation error
          if (
            error.message &&
            error.message.includes("Extension context invalidated")
          ) {
            console.warn(
              "Extension context has been invalidated. The page needs refreshing."
            );
            showExtensionContextInvalidatedMessage();
          }
          // Execute callback even on error
          if (callback) callback();
        }
      } else {
        console.warn("Chrome storage API not available for set operation");
        if (callback) callback();
      }
    },
    // Promise-based versions for use with async/await
    getAsync: function (keys) {
      return new Promise((resolve) => {
        this.get(keys, (result) => resolve(result));
      });
    },
    setAsync: function (items) {
      return new Promise((resolve) => {
        this.set(items, resolve);
      });
    },
    isAvailable: isAvailable,
  };
}

// Function to show a message when extension context is invalidated
function showExtensionContextInvalidatedMessage() {
  // Only show the message once
  if (document.getElementById("extension-invalidated-message")) return;

  const messageDiv = document.createElement("div");
  messageDiv.id = "extension-invalidated-message";
  messageDiv.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background-color: #f44336;
    color: white;
    padding: 15px;
    border-radius: 5px;
    z-index: 10000000;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    max-width: 350px;
    font-family: Arial, sans-serif;
  `;

  messageDiv.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
      <strong style="font-size: 16px;">Extension Needs Refreshing</strong>
      <button id="close-error-message" style="background: none; border: none; color: white; cursor: pointer; font-size: 20px;">&times;</button>
    </div>
    <p style="margin: 0 0 10px 0; line-height: 1.4;">The Gmail AI Assistant extension has been updated or reloaded. Please refresh this page to continue using it.</p>
    <button id="refresh-page-btn" style="background-color: white; color: #f44336; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">Refresh Page</button>
  `;

  document.body.appendChild(messageDiv);

  // Add event listeners to buttons
  document
    .getElementById("close-error-message")
    .addEventListener("click", () => {
      messageDiv.remove();
    });

  document.getElementById("refresh-page-btn").addEventListener("click", () => {
    window.location.reload();
  });
}

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

  // Add keyboard shortcut handler for quick reply (Command+E)
  setupKeyboardShortcuts();

  // No pre-fetching of assistants on startup - we'll use cached data
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
  buttonDiv.addEventListener("click", async function () {
    console.log("Assistant button clicked in toolbar - direct handler");

    try {
      // Use safe storage utility to check for API key
      const result = await safeStorage().getAsync(["openai_api_key"]);
      if (!result.openai_api_key) {
        console.log("No API key, showing settings modal first");
        showSettingsModal();
      } else {
        openAssistantUI(composeWindow);
      }
    } catch (error) {
      console.error("Error accessing storage:", error);
      // Fallback to showing the UI without checking for API key
      showSettingsModal();
    }
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

  // Apply styles through the class - will be managed by CSS now instead of inline
  modalContainer.className = "gmail-assistant-modal";

  // Format the email thread data and populate the email preview
  const formattedEmailContent = {
    subject: emailThread.subject,
    messages: emailThread.thread.map((message) => ({
      sender: message.from,
      recipient: message.to,
      content: formatEmailContent(message.content),
    })),
  };
  populateEmailPreview(formattedEmailContent);

  // Set up UI event handlers
  setupUIEventHandlers(composeWindow, emailThread);

  // Add direct click handlers to magic wand buttons for reliability
  const magicWandButtons = document.querySelectorAll(".magic-wand-button");
  magicWandButtons.forEach((button) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();

      console.log("Magic wand button clicked");

      // Get the aria-label to determine which button this is
      const ariaLabel = this.getAttribute("aria-label");

      if (ariaLabel === "Auto-detect assistant") {
        console.log("Magic wand clicked: Auto-detecting assistant");
        autoDetectAssistant();
      } else if (ariaLabel === "Auto-detect action") {
        console.log("Magic wand clicked: Auto-detecting action");
        autoDetectAction();
      } else {
        // Fallback to the old method of detection
        const parentSection = this.closest("div").parentNode;
        const labelElement = parentSection.querySelector("label");
        if (labelElement && labelElement.getAttribute("for") === "assistant") {
          console.log(
            "Magic wand clicked (fallback): Auto-detecting assistant"
          );
          autoDetectAssistant();
        } else if (
          labelElement &&
          labelElement.getAttribute("for") === "action"
        ) {
          console.log("Magic wand clicked (fallback): Auto-detecting action");
          autoDetectAction();
        }
      }
    });
  });

  // Check API key and use cached assistants
  loadCachedAssistants();
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

// Create the HTML for the assistant UI
function createAssistantUIHTML(emailThread) {
  return `
    <!-- Email Assistant UI -->
    <div class="modal-wrapper">
      <!-- Screen 1: Assistant Selection -->
      <div id="screen1" class="screen active">
        <!-- Header -->
        <div class="gmail-header" style="position: sticky; top: 0; z-index: 2;">
          <h2>AI Assistant</h2>
          <div style="display: flex; align-items: center;">
            <button id="settingsBtn" class="close-btn" aria-label="Settings" style="margin-right: 8px;">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"></path>
              </svg>
            </button>
            <button class="close-btn" aria-label="Close">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- Content - Make scrollable -->
        <div class="p-4 space-y-4" style="overflow-y: auto; max-height: calc(80vh - 60px);">
          <!-- Assistant Selection -->
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <label for="assistant">Select Assistant</label>
              <div class="magic-wand-button" aria-label="Auto-detect assistant">
                <span style="font-size: 18px;">🪄</span>
              </div>
            </div>
            <div style="position: relative;">
              <select id="assistant" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                <option value="">Loading assistants...</option>
              </select>
              <div id="assistant-loading" class="assistant-loading hidden">
                <div class="spinner-sm"></div>
              </div>
              <div id="assistant-error" class="hidden" style="color: red; margin-top: 4px; font-size: 12px;"></div>
            </div>
            <button id="editAssistantListBtn" class="text-blue-600" style="font-size: 13px; margin-top: 4px; background: none; border: none; padding: 0; cursor: pointer; color: #1a73e8;">Edit Assistant List</button>
          </div>

          <!-- Action Selection -->
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <label for="action">Select Action</label>
              <div class="magic-wand-button" aria-label="Auto-detect action">
                <span style="font-size: 18px;">🪄</span>
              </div>
            </div>
            <div style="position: relative;">
              <select id="action" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                <option value="reply">Reply</option>
                <option value="summarize">Summarize</option>
                <option value="extract">Extract Information</option>
                <option value="analyze">Analyze</option>
                <option value="translate">Translate</option>
              </select>
            </div>
            <button id="editActionListBtn" class="text-blue-600" style="font-size: 13px; margin-top: 4px; background: none; border: none; padding: 0; cursor: pointer; color: #1a73e8;">Edit Action List</button>
          </div>

          <!-- Email Preview -->
          <div>
            <label for="emailPreview">Email Content</label>
            <div id="emailPreview" style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; padding: 12px; background-color: #f9f9f9;">
              <div style="text-align: center; color: #666;">
                <div>Loading email content...</div>
                <div style="display: inline-block; margin-top: 10px; width: 20px; height: 20px; border: 2px solid rgba(26, 115, 232, 0.2); border-radius: 50%; border-top-color: #1a73e8; animation: spin 1s linear infinite;"></div>
              </div>
            </div>
          </div>

          <!-- Generate Button -->
          <div style="text-align: right; padding-bottom: 10px;">
            <button id="generateBtn" class="gmail-button">Generate</button>
          </div>
        </div>
      </div>

      <!-- Screen 2: Generated Response -->
      <div id="screen2" class="screen">
        <!-- Header -->
        <div class="gmail-header" style="position: sticky; top: 0; z-index: 2;">
          <h2>Generated Response</h2>
          <div style="display: flex; align-items: center;">
            <button id="settingsBtn2" class="close-btn" aria-label="Settings" style="margin-right: 8px;">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"></path>
              </svg>
            </button>
            <button class="close-btn" aria-label="Close">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- Content -->
        <div class="p-4 space-y-4" style="overflow-y: auto; max-height: calc(80vh - 60px);">
          <div id="responseText" style="border: 1px solid #ddd; border-radius: 4px; padding: 16px; max-height: calc(50vh); overflow-y: auto;">
            <div class="spinner-container">
              <div class="spinner" style="width: 32px; height: 32px; border: 3px solid rgba(26, 115, 232, 0.2); border-radius: 50%; border-top-color: #1a73e8; animation: spin 1s linear infinite;"></div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; padding-bottom: 10px;">
            <div>
              <button id="backBtn" style="background-color: #f2f2f2; color: #444; border: none; padding: 10px 24px; border-radius: 4px; cursor: pointer; font-weight: 500;">Back</button>
              <button id="regenerateBtn" style="background-color: #f2f2f2; color: #444; border: none; padding: 10px 24px; border-radius: 4px; cursor: pointer; font-weight: 500; margin-left: 8px;">Regenerate</button>
            </div>
            <button id="insertBtn" class="gmail-button">Insert</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Helper function to generate HTML for the email thread preview
function generateEmailThreadHTML(emailThread) {
  if (!emailThread || !emailThread.thread || emailThread.thread.length === 0) {
    return '<div class="email-content"><p>No email thread content available.</p></div>';
  }

  let html = `<div class="email-subject">Subject: ${emailThread.subject}</div>`;

  emailThread.thread.forEach((message, index) => {
    if (index > 0) {
      html +=
        '<hr style="margin: 15px 0; border: none; border-top: 1px solid #dcdfe3;">';
    }

    html += `
      <div class="email-sender">${message.from}</div>
      <div class="email-recipient">To: ${message.to}</div>
      <div class="email-content">
        ${formatEmailContent(message.content)}
      </div>
    `;
  });

  return html;
}

// Helper function to format email content with proper paragraphs
function formatEmailContent(content) {
  if (!content) return "<p>No content</p>";

  // Split by newlines and create paragraphs
  return content
    .split(/\n\n+/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p>`)
    .join("");
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
      // Remove the modal from the DOM entirely instead of just hiding it
      const modalContainer = document.getElementById("gmail-assistant-modal");
      if (modalContainer) {
        modalContainer.remove();
      }
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
      safeStorage().get(["openai_api_key"], function (result) {
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

  // Regenerate button
  const regenerateBtn = modal.querySelector("#regenerateBtn");
  if (regenerateBtn) {
    regenerateBtn.addEventListener("click", () => {
      // Show the regenerate modal with the current email thread
      showRegenerateModal(emailThread);
    });
  }

  // Insert button
  const insertBtn = modal.querySelector("#insertBtn");
  if (insertBtn) {
    insertBtn.addEventListener("click", () => {
      const responseText = modal.querySelector("#responseText");
      const responseContent =
        responseText.innerText || responseText.textContent;

      // Insert the response into the Gmail compose field
      insertResponseIntoEmail(responseContent, composeWindow);

      // Remove the modal from the DOM entirely instead of just hiding it
      const modalContainer = document.getElementById("gmail-assistant-modal");
      if (modalContainer) {
        modalContainer.remove();
      }
    });
  }

  // Edit assistant list
  const editAssistantListBtn = modal.querySelector("#editAssistantListBtn");
  if (editAssistantListBtn) {
    editAssistantListBtn.addEventListener("click", () => {
      // Show modal immediately with loading state
      showManageAssistantsModal(true);

      // Then fetch the latest assistants
      console.log("Edit Assistant List clicked, fetching latest assistants");
      fetchOpenAIAssistants(true, function () {
        // Update the modal with assistants after fetching
        showManageAssistantsModal(false);
      });
    });
  }

  // Edit action list
  const editActionListBtn = modal.querySelector("#editActionListBtn");
  if (editActionListBtn) {
    editActionListBtn.addEventListener("click", () => {
      // Call the manage actions modal
      showManageActionsModal();
    });
  }
}

// Function to insert the generated response into the Gmail compose field
function insertResponseIntoEmail(responseContent, composeWindow) {
  try {
    console.log("Inserting response into email field");

    // Clean the response text of any HTML tags if needed
    const cleanedText = responseContent
      .replace(/<div class="spinner-container">.*?<\/div>/g, "")
      .replace(/<[^>]*>/g, "");

    // First, try to find the compose field within the composeWindow
    let composeField = null;

    if (composeWindow) {
      // Try to find the compose field within the provided composeWindow
      composeField = composeWindow.querySelector(
        '.editable[contenteditable="true"]'
      );
    }

    // If not found in composeWindow, try to find it in the document
    if (!composeField) {
      // Look for the active compose field in the document
      composeField = document.querySelector(
        '.aO7 .editable[contenteditable="true"], .Am.Al.editable'
      );
    }

    if (composeField) {
      console.log("Found compose field, inserting response");

      // Focus the field to ensure it's active
      composeField.focus();

      // Check if the field is empty (just contains a <br> tag or is empty)
      const isEmpty =
        composeField.innerHTML.trim() === "<br>" ||
        composeField.innerHTML.trim() === "";

      // Use execCommand to insert text, which preserves Gmail's default formatting
      if (document.queryCommandSupported("insertText")) {
        // For an empty field, we need to clear the <br> first
        if (isEmpty) {
          composeField.innerHTML = "";
        }

        // Use execCommand which preserves Gmail's default formatting
        document.execCommand("insertText", false, cleanedText);
      } else {
        // Fallback: directly set text content which also preserves default formatting
        if (isEmpty) {
          composeField.textContent = cleanedText;
        } else {
          // If field already has content, append to it
          composeField.textContent += cleanedText;
        }
      }

      // Trigger input event to ensure Gmail recognizes the change
      composeField.dispatchEvent(new Event("input", { bubbles: true }));

      console.log("Response inserted successfully");
    } else {
      console.error("Could not find the Gmail compose field");
      alert("Could not find the Gmail compose field. Please try again.");
    }
  } catch (error) {
    console.error("Error inserting response:", error);
    alert("Error inserting response: " + error.message);
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
      // Call the manage actions modal
      showManageActionsModal();
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
    modal.remove();
  }
}

// Function to populate the email preview
function populateEmailPreview(emailContent) {
  const emailPreviewElem = document.getElementById("emailPreview");
  if (emailPreviewElem && emailContent) {
    // Clear previous content
    emailPreviewElem.innerHTML = "";

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

        // Add sender info
        if (message.sender) {
          const senderElem = document.createElement("div");
          senderElem.className = "email-sender";
          senderElem.textContent = message.sender;
          emailPreviewElem.appendChild(senderElem);
        }

        // Add recipient info
        if (message.recipient) {
          const recipientElem = document.createElement("div");
          recipientElem.className = "email-recipient";
          recipientElem.textContent = `To: ${message.recipient}`;
          emailPreviewElem.appendChild(recipientElem);
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

// Function to show regenerate modal
function showRegenerateModal(emailThread) {
  console.log("Showing regenerate modal");

  // Remove any existing regenerate modal
  const existingModal = document.getElementById("regenerate-modal");
  if (existingModal) {
    existingModal.remove();
  }

  // Create modal element
  const regenerateModal = document.createElement("div");
  regenerateModal.id = "regenerate-modal";
  regenerateModal.className = "settings-modal active";

  // Force visibility with higher z-index
  regenerateModal.style.cssText = `
    position: fixed !important;
    display: flex !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    background: rgba(0,0,0,0.5) !important;
    z-index: 10000000 !important;
    justify-content: center !important;
    align-items: center !important;
  `;

  // Create HTML for the modal
  regenerateModal.innerHTML = `
    <div class="settings-content" style="max-width: 400px; width: 80%; box-shadow: 0 2px 10px rgba(0,0,0,0.2); border-radius: 8px; overflow: hidden;">
      <!-- Regenerate Modal Header -->
      <div class="gmail-header px-4 py-3 flex justify-between items-center" style="background-color: #4285f4; padding: 14px 20px;">
        <h2 style="color: white; font-size: 16px; font-weight: 500; margin: 0;">Regenerate Response</h2>
        <div class="flex items-center">
          <button id="closeRegenerateBtn" class="close-btn" style="background: none; border: none; padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="white">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Regenerate Content -->
      <div style="padding: 20px;">
        <div style="width: 100%;">
          <label for="regenerateInstructions" style="font-size: 14px; font-weight: 500; color: #5f6368; margin-bottom: 8px; display: block;">Additional Instructions</label>
          <textarea id="regenerateInstructions" style="width: 100%; padding: 10px; border: 1px solid #dadce0; border-radius: 4px; min-height: 90px; font-size: 14px; resize: vertical; color: #202124; outline: none; box-sizing: border-box; line-height: 1.5; font-family: 'Roboto', Arial, sans-serif;" 
            placeholder="For example: 'Make it more formal', 'Include pricing details', 'Make it shorter'"></textarea>
        </div>
      </div>

      <!-- Regenerate Footer -->
      <div style="padding: 12px 20px; display: flex; justify-content: flex-end; background-color: #f8f9fa; border-top: 1px solid #dadce0;">
        <button id="cancelRegenerateBtn" style="background-color: transparent; color: #1a73e8; border: none; font-size: 14px; font-weight: 500; padding: 10px 16px; border-radius: 4px; cursor: pointer; margin-right: 10px; line-height: 20px;">
          Cancel
        </button>
        <button id="submitRegenerateBtn" style="background-color: #1a73e8; color: white; border: none; font-size: 14px; font-weight: 500; padding: 10px 24px; border-radius: 4px; cursor: pointer; line-height: 20px;">
          Regenerate
        </button>
      </div>
    </div>
  `;

  // Add modal to the DOM
  document.body.appendChild(regenerateModal);

  // Add event listeners
  const closeBtn = document.getElementById("closeRegenerateBtn");
  if (closeBtn) {
    closeBtn.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      regenerateModal.remove();
    };
  }

  const cancelBtn = document.getElementById("cancelRegenerateBtn");
  if (cancelBtn) {
    cancelBtn.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      regenerateModal.remove();
    };
  }

  const submitBtn = document.getElementById("submitRegenerateBtn");
  if (submitBtn) {
    submitBtn.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();

      const instructions = document
        .getElementById("regenerateInstructions")
        .value.trim();

      // Get the modal and hide it
      regenerateModal.remove();

      // Show loading indicator
      const responseText = document.getElementById("responseText");
      responseText.innerHTML = `<div class="spinner-container"><div class="spinner"></div></div>`;

      // Get the assistant ID and action
      const assistantId = document.getElementById("assistant").value;
      const action = document.getElementById("action").value;

      // Get the API key from storage
      safeStorage().get(["openai_api_key"], function (result) {
        if (!result.openai_api_key) {
          responseText.innerHTML = `<p class="text-red-500">Error: API key not found. Please set your OpenAI API key in the extension settings.</p>`;
          return;
        }

        // Call OpenAI API again with instructions
        regenerateResponseWithInstructions(
          result.openai_api_key,
          assistantId,
          action,
          emailThread,
          instructions,
          responseText
        );
      });
    };
  }
}

// Function to regenerate response with instructions
async function regenerateResponseWithInstructions(
  apiKey,
  assistantId,
  action,
  emailThread,
  instructions,
  responseElement
) {
  console.log(
    `Regenerating response with assistant ${assistantId}, action "${action}", and instructions: "${instructions}"`
  );

  try {
    // Format the email thread data for the prompt
    let emailContent = formatEmailThreadForPrompt(emailThread, action);

    // Add the regeneration instructions
    if (instructions) {
      emailContent += `\n\nAdditional instructions: ${instructions}`;
    }

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
    console.error("Error regenerating response:", error);
    responseElement.innerHTML = `<p class="text-red-500">Error: ${error.message}</p>`;
  }
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
  console.log("Auto-detecting assistant using ChatGPT...");

  // Get the email thread content
  const emailThread = getEmailThreadContent();
  if (!emailThread || !emailThread.thread || emailThread.thread.length === 0) {
    console.error("No email thread content available for assistant detection");
    alert(
      "Error: No email content found to analyze. Please make sure you're viewing an email thread."
    );
    return;
  }

  // Get the available assistants from the dropdown
  const assistantSelect = document.getElementById("assistant");
  if (!assistantSelect || assistantSelect.options.length === 0) {
    console.error("No assistants available in the dropdown");
    alert(
      "Error: No assistants available. Please add assistants from your OpenAI account first."
    );
    return;
  }

  // Show loading indicator
  assistantSelect.disabled = true;
  const loadingEl = document.createElement("div");
  loadingEl.className = "assistant-auto-detect-loading";
  loadingEl.innerHTML = `<div style="width: 20px; height: 20px; border: 2px solid rgba(26, 115, 232, 0.2); border-radius: 50%; border-top-color: #1a73e8; animation: spinner-rotate 1s linear infinite; position: absolute; right: 30px; top: 50%; transform: translateY(-50%);"></div>`;
  assistantSelect.parentNode.appendChild(loadingEl);

  // Get the list of favorite assistants (options in the dropdown)
  const availableAssistants = [];
  for (let i = 0; i < assistantSelect.options.length; i++) {
    const option = assistantSelect.options[i];
    if (option.value) {
      availableAssistants.push({
        id: option.value,
        name: option.textContent,
      });
    }
  }

  console.log(`Found ${availableAssistants.length} assistants to choose from`);

  if (availableAssistants.length === 0) {
    console.error("No assistants with valid IDs found in dropdown");
    alert(
      "Error: No assistants with valid IDs available. Please check your OpenAI assistants."
    );
    assistantSelect.disabled = false;
    const loadingIndicator = document.querySelector(
      ".assistant-auto-detect-loading"
    );
    if (loadingIndicator) loadingIndicator.remove();
    return;
  }

  // Get API key from storage using the safe storage utility
  safeStorage().get(["openai_api_key"], function (result) {
    if (!result.openai_api_key) {
      console.error("No API key found for auto-detection");
      alert(
        "Error: No OpenAI API key found. Please add your API key in settings."
      );
      // Remove loading indicator
      assistantSelect.disabled = false;
      const loadingIndicator = document.querySelector(
        ".assistant-auto-detect-loading"
      );
      if (loadingIndicator) loadingIndicator.remove();
      return;
    }

    // Call ChatGPT to determine the best assistant
    detectAssistantWithChatGPT(
      result.openai_api_key,
      emailThread,
      availableAssistants,
      function (bestAssistantId) {
        // Set the selected assistant in the dropdown
        if (bestAssistantId) {
          for (let i = 0; i < assistantSelect.options.length; i++) {
            if (assistantSelect.options[i].value === bestAssistantId) {
              assistantSelect.selectedIndex = i;
              break;
            }
          }
        }

        // Remove loading indicator
        assistantSelect.disabled = false;
        const loadingIndicator = document.querySelector(
          ".assistant-auto-detect-loading"
        );
        if (loadingIndicator) loadingIndicator.remove();
      }
    );
  });
}

// Function to detect the best assistant using ChatGPT
async function detectAssistantWithChatGPT(
  apiKey,
  emailThread,
  availableAssistants,
  callback
) {
  try {
    console.log(
      "Auto-detect: Starting detection with availableAssistants:",
      availableAssistants.length
    );

    if (!availableAssistants || availableAssistants.length === 0) {
      console.error("Auto-detect: No assistants provided to detect from");
      callback(null);
      return;
    }

    // Format the email thread into a string
    let emailContent = `Subject: ${emailThread.subject}\n\n`;
    emailThread.thread.forEach((message, index) => {
      emailContent += `Email ${index + 1}:\n`;
      emailContent += `From: ${message.from}\n`;
      emailContent += `To: ${message.to}\n`;
      emailContent += `Content: ${message.content}\n\n`;
    });

    // Format the list of available assistants
    let assistantsList = "";
    availableAssistants.forEach((assistant, index) => {
      assistantsList += `${index + 1}. ${assistant.name} (ID: ${
        assistant.id
      })\n`;
    });

    // Construct the prompt for ChatGPT
    const prompt = `I need to determine which AI assistant from my list would be best suited to help me reply to this email thread. Here's the email content:

${emailContent}

Here are my available assistants:
${assistantsList}

Please analyze the email content and determine which assistant would be most appropriate for helping me reply. Only respond with the ID of the most appropriate assistant, with no additional text or explanation.`;

    console.log("Auto-detect: Sending prompt to ChatGPT");

    // Make the API request to ChatGPT 4o-mini
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful AI that analyzes email content and determines which specialized AI assistant would be best for replying to it. Respond only with the assistant ID, without any explanation or additional text.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 50,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Auto-detect: OpenAI API error:", errorData);
      throw new Error(errorData.error?.message || response.statusText);
    }

    const data = await response.json();
    console.log("Auto-detect: Got response from ChatGPT:", data);

    // Extract the assistant ID from the response
    const assistantIdResponse = data.choices[0].message.content.trim();
    console.log(
      "Auto-detect: ChatGPT suggested assistant:",
      assistantIdResponse
    );

    // Look for an assistant ID in the response
    let bestAssistantId = null;

    // First try to match the exact ID
    for (const assistant of availableAssistants) {
      if (assistantIdResponse.includes(assistant.id)) {
        bestAssistantId = assistant.id;
        console.log("Auto-detect: Found exact ID match:", bestAssistantId);
        break;
      }
    }

    // If no exact ID match, look for a name match
    if (!bestAssistantId) {
      for (const assistant of availableAssistants) {
        if (
          assistant.name &&
          assistantIdResponse
            .toLowerCase()
            .includes(assistant.name.toLowerCase())
        ) {
          bestAssistantId = assistant.id;
          console.log(
            "Auto-detect: Found name match:",
            bestAssistantId,
            "for name",
            assistant.name
          );
          break;
        }
      }
    }

    // If still no match, use the first assistant as fallback
    if (!bestAssistantId && availableAssistants.length > 0) {
      bestAssistantId = availableAssistants[0].id;
      console.log(
        "Auto-detect: Using first assistant as fallback:",
        bestAssistantId
      );
    }

    console.log("Auto-detect: Final selected assistant ID:", bestAssistantId);
    callback(bestAssistantId);
  } catch (error) {
    console.error("Error detecting assistant with ChatGPT:", error);
    // Try to use the first available assistant as fallback
    if (availableAssistants && availableAssistants.length > 0) {
      console.log(
        "Auto-detect: Error occurred, using first assistant as fallback"
      );
      callback(availableAssistants[0].id);
    } else {
      callback(null);
    }
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

      // Check if the API key has changed
      chrome.storage.local.get(["openai_api_key"], function (result) {
        const oldKey = result.openai_api_key || "";
        const newKey = apiKey;

        // Save the new API key
        chrome.storage.local.set({ openai_api_key: newKey }, function () {
          console.log("API key saved.");

          // Only fetch assistants if the key is new or changed
          if (oldKey !== newKey) {
            console.log("API key changed, fetching assistants...");
            fetchOpenAIAssistants();
          }

          // Close the settings modal
          const modal = document.getElementById("settings-modal");
          if (modal) modal.remove();

          // Show the main modal again
          const mainModal = document.getElementById("gmail-assistant-modal");
          if (mainModal) {
            mainModal.style.display = "flex";
          } else {
            // If there's no main modal open yet, open a new one with the active compose window
            const composeWindow = document.querySelector(".Am.Al.editable");
            if (composeWindow) {
              openAssistantUI(composeWindow);
            }
          }
        });
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
function fetchOpenAIAssistants(forceRefresh = false, callback = null) {
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

  // Get the API key from storage
  safeStorage().get(["openai_api_key"], function (result) {
    if (!result.openai_api_key) {
      console.error("No OpenAI API key found in storage");
      showAssistantError(
        "No API key found. Please add your OpenAI API key in settings."
      );

      // Hide loading indicator
      if (loadingEl) loadingEl.classList.add("hidden");

      // Execute callback if provided
      if (callback) callback();
      return;
    }

    const apiKey = result.openai_api_key;

    // Use the API call with the required beta header and a higher limit
    const apiUrl = "https://api.openai.com/v1/assistants?limit=100&order=desc";
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "OpenAI-Beta": "assistants=v2",
    };

    console.log("Making API call to:", apiUrl);

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

            // Generic error handling
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
          safeStorage().set({ openai_assistants: assistants }, function () {
            console.log("Assistants saved to storage:", assistants.length);

            // Get the selected assistants
            safeStorage().get(["selected_assistants"], function (result) {
              let selectedAssistants = result.selected_assistants || {};

              // If no selections exist yet, default to all assistants selected
              if (Object.keys(selectedAssistants).length === 0) {
                assistants.forEach((assistant) => {
                  selectedAssistants[assistant.id] = true;
                });
                // Save this initial selection
                safeStorage().set({
                  selected_assistants: selectedAssistants,
                });
              }

              // Update dropdown if it exists
              updateAssistantDropdownWithSelection(
                assistants,
                selectedAssistants
              );

              // Execute callback even on error
              if (callback) callback(assistants);
            });
          });
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

        // Show error message
        showAssistantError(`Failed to fetch assistants: ${error.message}`);

        // Hide loading indicator
        if (loadingEl) loadingEl.classList.add("hidden");

        // Execute callback even on error
        if (callback) callback([]);
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
function showManageAssistantsModal(loading = false) {
  console.log("Showing manage assistants modal, loading:", loading);

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

  // If loading, show a loading spinner
  if (loading) {
    const loadingContent = `
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

        <!-- Loading spinner -->
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem 2rem;">
          <div style="width: 40px; height: 40px; border: 3px solid rgba(66, 133, 244, 0.2); border-top-color: #4285f4; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          <p style="margin-top: 1rem; color: #666;">Loading assistants...</p>
        </div>
      </div>
    `;

    manageModal.innerHTML = loadingContent;
    document.body.appendChild(manageModal);

    // Add animation style
    const style = document.createElement("style");
    style.textContent = `
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);

    // Add close button handler
    const closeBtn = manageModal.querySelector("#close-manage-assistants-btn");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        manageModal.remove();
      });
    }

    return;
  }

  // Get assistants from storage for non-loading state
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

      // Create the modal content for regular view
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
// DUPLICATE REMOVED: function updateAssistantDropdown(assistants) {
// DUPLICATE REMOVED:   // Check if we have any selected assistants
// DUPLICATE REMOVED:   safeStorage().get(["selected_assistants"], function (result) {
// DUPLICATE REMOVED:     let selectedAssistants = result.selected_assistants || {};
// DUPLICATE REMOVED:
// DUPLICATE REMOVED:     // If no selections exist yet, default to all assistants selected
// DUPLICATE REMOVED:     if (Object.keys(selectedAssistants).length === 0) {
// DUPLICATE REMOVED:       assistants.forEach((assistant) => {
// DUPLICATE REMOVED:         selectedAssistants[assistant.id] = true;
// DUPLICATE REMOVED:       });
// DUPLICATE REMOVED:       // Save this initial selection
// DUPLICATE REMOVED:       safeStorage().set({ selected_assistants: selectedAssistants });
// DUPLICATE REMOVED:     }
// DUPLICATE REMOVED:
// DUPLICATE REMOVED:     // Update the dropdown using the selection
// DUPLICATE REMOVED:     updateAssistantDropdownWithSelection(assistants, selectedAssistants);
// DUPLICATE REMOVED:   });
// DUPLICATE REMOVED: }
// DUPLICATE REMOVED:
// DUPLICATE REMOVED: // Add these functions back that were accidentally removed
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
      overflow: hidden;
    }
    .screen.active {
      display: flex;
    }
    
    /* Gmail modal global container */
    #gmail-assistant-modal, .gmail-assistant-modal {
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
    }
    
    /* Floating status label for quick reply */
    .floating-status {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999999;
      background-color: white;
      border-radius: 8px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      max-width: 300px;
      font-family: 'Roboto', Arial, sans-serif;
      font-size: 14px;
      transition: opacity 0.3s ease-out;
    }
    
    .floating-status.info {
      border-left: 4px solid #4285f4;
    }
    
    .floating-status.success {
      border-left: 4px solid #34a853;
    }
    
    .floating-status.error {
      border-left: 4px solid #ea4335;
    }
    
    .floating-status.loading {
      border-left: 4px solid #fbbc05;
    }
    
    .status-icon {
      margin-right: 10px;
      font-size: 16px;
    }
    
    .status-icon.loading {
      display: inline-block;
      animation: spin 1s infinite linear;
    }
    
    .status-message {
      color: #202124;
      line-height: 1.4;
    }
    
    .floating-status.fade-out {
      opacity: 0;
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
    
    /* Animation keyframes for spinners */
    @keyframes spinner-rotate {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    /* Fix for CORS issues with Gmail images */
    .assistant-btn {
      width: 24px;
      height: 24px;
      background-repeat: no-repeat;
      background-position: center;
      background-size: 20px;
      opacity: 0.7;
      transition: opacity 0.2s;
      /* Use embedded SVG as data URI instead of an external image */
      background-image: url('data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%235F6368"><path d="M21.928 11.607c-.202-.488-.635-.605-.928-.633V8c0-1.103-.897-2-2-2h-6V4.61c.305-.274.5-.668.5-1.11a1.5 1.5 0 0 0-3 0c0 .442.195.836.5 1.11V6H5c-1.103 0-2 .897-2 2v2.997l-.082.006A1 1 0 0 0 1.99 12v2a1 1 0 0 0 1 1H3v5c0 1.103.897 2 2 2h14c1.103 0 2-.897 2-2v-5a1 1 0 0 0 1-1v-1.938a1.006 1.006 0 0 0-.072-.455zM5 20V8h14l.001 3.996L19 12v2h.001l.001 6H5z"/><ellipse cx="8.5" cy="12" rx="1.5" ry="2"/><ellipse cx="15.5" cy="12" rx="1.5" ry="2"/><path d="M12 18a3.001 3.001 0 0 1-2.83-2h5.66A3.001 3.001 0 0 1 12 18z"/></svg>');
    }
    
    .assistant-btn:hover {
      opacity: 1;
    }
    
    /* Gmail button styles */
    .gmail-button {
      background-color: #1a73e8;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 10px 24px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .gmail-button:hover {
      background-color: #1765cc;
    }
    
    /* Gmail header styles */
    .gmail-header {
      background-color: #1a73e8;
      color: white;
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .gmail-header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 500;
    }
    
    .close-btn {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      width: 24px;
      height: 24px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `;

  document.head.appendChild(style);
}

// Add a function to check API key and show settings if missing
function checkAPIKeyAndAssistants() {
  loadCachedAssistants();
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

// Function to load cached assistants from local storage
function loadCachedAssistants() {
  console.log("Loading cached assistants from storage");

  safeStorage().get(
    ["openai_assistants", "actions", "selected_assistants"],
    function (result) {
      console.log(
        "Storage contains openai_assistants:",
        !!result.openai_assistants,
        result.openai_assistants?.length || 0
      );
      console.log(
        "Storage contains actions:",
        !!result.actions,
        result.actions?.length || 0
      );
      console.log(
        "Storage contains selected_assistants:",
        !!result.selected_assistants,
        Object.keys(result.selected_assistants || {}).length
      );

      // Update the assistant dropdown with cached assistants
      if (result.openai_assistants && result.openai_assistants.length > 0) {
        const selectedAssistants = result.selected_assistants || {};

        // If no selections exist yet, default to all assistants selected
        if (Object.keys(selectedAssistants).length === 0) {
          result.openai_assistants.forEach((assistant) => {
            selectedAssistants[assistant.id] = true;
          });
          // Save this initial selection
          safeStorage().set(
            { selected_assistants: selectedAssistants },
            function () {
              console.log("Initialized selected_assistants for all assistants");
            }
          );
        }

        // Update the dropdown using the selection
        updateAssistantDropdownWithSelection(
          result.openai_assistants,
          selectedAssistants
        );
      } else {
        // If no cached assistants, fetch from API
        console.log("No cached assistants found, fetching from API");
        fetchOpenAIAssistants(true, function (assistants) {
          console.log(
            "fetchOpenAIAssistants callback received assistants:",
            !!assistants,
            assistants?.length || 0
          );
        });
      }

      // Update the actions dropdown with cached actions
      if (result.actions && result.actions.length > 0) {
        updateActionDropdown(result.actions);
      } else {
        // If no cached actions, use defaults
        const defaultActions = [
          "reply",
          "summarize",
          "extract",
          "analyze",
          "translate",
        ];
        safeStorage().set({ actions: defaultActions }, function () {
          console.log("Initialized default actions");
          updateActionDropdown(defaultActions);
        });
      }
    }
  );
}

// Function to show the manage actions modal
function showManageActionsModal() {
  console.log("Showing manage actions modal");

  // Remove any existing manage actions modal first
  const existingModal = document.getElementById("manage-actions-modal");
  if (existingModal) {
    existingModal.remove();
  }

  // Create the modal element
  const manageModal = document.createElement("div");
  manageModal.id = "manage-actions-modal";
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

  // Get actions from storage
  chrome.storage.local.get(["actions"], function (result) {
    let actions = result.actions || [];

    // If no actions exist yet, use defaults
    if (actions.length === 0) {
      actions = ["Accept", "Reject", "Negotiate", "Help"];
    }

    // Create the modal content
    let modalContent = `
    <div class="modal-content" style="background: white; border-radius: 8px; width: 500px; max-width: 90%; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
      <!-- Header -->
      <div class="gmail-header" style="background-color: #4285f4; color: white; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center;">
        <h2 style="font-size: 22px; margin: 0;">Manage Actions</h2>
        <button id="close-manage-actions-btn" class="close-btn" style="background: none; border: none; color: white; cursor: pointer;">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- Actions List -->
      <div id="actions-list-container" style="max-height: 400px; overflow-y: auto; padding: 16px 24px 0;">
        <div id="actions-list" style="display: flex; flex-direction: column; gap: 16px; padding-bottom: 16px;">
    `;

    // Add each action as an item with delete button
    actions.forEach((action, index) => {
      modalContent += `
      <div class="action-item" data-action="${action}" style="display: flex; align-items: center; padding: 12px; border: 1px solid #e0e0e0; border-radius: 4px; justify-content: space-between;">
        <span style="font-size: 16px; color: #333;">${action}</span>
        <button class="delete-action-btn" data-index="${index}" style="background: none; border: none; color: #888; cursor: pointer;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18"></path>
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"></path>
            <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
          </svg>
        </button>
      </div>
      `;
    });

    // Add a message if no actions
    if (actions.length === 0) {
      modalContent += `
      <div style="text-align: center; padding: 20px 0; color: #666;">
        No actions found. Add an action below.
      </div>
    `;
    }

    // Add the add new action button
    modalContent += `
        </div>
        <div style="padding: 16px 0; border-top: 1px solid #e0e0e0; margin-top: 16px;">
          <button id="add-action-btn" style="width: 100%; padding: 12px; text-align: center; display: flex; align-items: center; justify-content: center; background: white; border: 1px dashed #4285f4; border-radius: 4px; color: #4285f4; cursor: pointer; font-size: 16px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add New Action
          </button>
        </div>
      </div>

      <!-- Footer -->
      <div style="border-top: 1px solid #e0e0e0; padding: 16px 24px; display: flex; justify-content: space-between; background: white;">
        <button id="cancel-manage-actions-btn" style="padding: 10px 20px; background: white; border: 1px solid #ddd; border-radius: 4px; font-size: 16px; cursor: pointer;">
          Cancel
        </button>
        <button id="save-manage-actions-btn" style="padding: 10px 20px; background: #4285f4; color: white; border: none; border-radius: 4px; font-size: 16px; cursor: pointer;">
          Save
        </button>
      </div>
    </div>
    `;

    // Set the modal content and add to document
    manageModal.innerHTML = modalContent;
    document.body.appendChild(manageModal);

    // Set up event handlers
    setupManageActionsEventHandlers(manageModal, actions);
  });
}

// Setup event handlers for the manage actions modal
function setupManageActionsEventHandlers(modal, actions) {
  // Close button
  const closeBtn = modal.querySelector("#close-manage-actions-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      modal.remove();
    });
  }

  // Cancel button
  const cancelBtn = modal.querySelector("#cancel-manage-actions-btn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      modal.remove();
    });
  }

  // Save button
  const saveBtn = modal.querySelector("#save-manage-actions-btn");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      // Get all action items
      const actionItems = modal.querySelectorAll(".action-item");
      const updatedActions = Array.from(actionItems).map((item) =>
        item.getAttribute("data-action")
      );

      // Make sure we have the "No action specified" option
      if (!updatedActions.includes("No action specified")) {
        updatedActions.unshift("No action specified");
      }

      // Save to local storage
      chrome.storage.local.set({ actions: updatedActions }, function () {
        // Update the action dropdown
        updateActionDropdown(updatedActions);

        // Close the modal
        modal.remove();
      });
    });
  }

  // Add action button
  const addActionBtn = modal.querySelector("#add-action-btn");
  if (addActionBtn) {
    addActionBtn.addEventListener("click", () => {
      // Prompt for new action name
      const newAction = prompt("Enter new action name:");

      if (newAction && newAction.trim() !== "") {
        // Create a new action item
        const actionsList = modal.querySelector("#actions-list");
        const newIndex = modal.querySelectorAll(".action-item").length;

        const actionItem = document.createElement("div");
        actionItem.className = "action-item";
        actionItem.setAttribute("data-action", newAction.trim());
        actionItem.style.cssText =
          "display: flex; align-items: center; padding: 12px; border: 1px solid #e0e0e0; border-radius: 4px; justify-content: space-between;";

        actionItem.innerHTML = `
          <span style="font-size: 16px; color: #333;">${newAction.trim()}</span>
          <button class="delete-action-btn" data-index="${newIndex}" style="background: none; border: none; color: #888; cursor: pointer;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18"></path>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"></path>
              <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
            </svg>
          </button>
        `;

        // Add delete event handler
        const deleteBtn = actionItem.querySelector(".delete-action-btn");
        deleteBtn.addEventListener("click", (e) => {
          e.target.closest(".action-item").remove();
        });

        // Add to the list
        actionsList.appendChild(actionItem);
      }
    });
  }

  // Delete action buttons
  const deleteButtons = modal.querySelectorAll(".delete-action-btn");
  deleteButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.target.closest(".action-item").remove();
    });
  });
}

// Function to update the action dropdown with the new actions
function updateActionDropdown(actions) {
  const actionSelect = document.getElementById("action");
  if (actionSelect) {
    // Save the currently selected value if possible
    const currentValue = actionSelect.value;

    // Clear the dropdown
    actionSelect.innerHTML = "";

    // Add all options
    actions.forEach((action) => {
      const option = document.createElement("option");
      option.value = action;
      option.textContent = action;
      actionSelect.appendChild(option);
    });

    // Try to restore the previous selection
    if (actions.includes(currentValue)) {
      actionSelect.value = currentValue;
    }
  }
}

// Add keyboard shortcut handler for quick reply
function setupKeyboardShortcuts() {
  console.log("Setting up keyboard shortcuts");

  document.addEventListener("keydown", function (event) {
    // Check if Command+E (Mac) or Ctrl+E (Windows/Linux) is pressed
    if ((event.metaKey || event.ctrlKey) && event.key === "e") {
      console.log("Command+E shortcut detected");

      // Prevent the default browser behavior for this key combination
      event.preventDefault();

      // Check if currently focused in a compose/reply field
      const activeElement = document.activeElement;
      const isInComposeField =
        activeElement &&
        (activeElement.classList.contains("editable") ||
          activeElement.getAttribute("role") === "textbox" ||
          activeElement.closest(".Am.Al.editable") ||
          activeElement.closest(".aO7 .editable"));

      if (isInComposeField) {
        console.log("Quick reply shortcut activated in compose field");
        handleQuickReply(activeElement);
      }
    }
  });
}

// Handle the quick reply workflow
function handleQuickReply(composeField) {
  // Get the email thread content
  const emailThread = getEmailThreadContent();
  if (!emailThread || !emailThread.thread || emailThread.thread.length === 0) {
    showFloatingStatus("Error: No email content found", "error");
    return;
  }

  // Show initial status
  showFloatingStatus("Starting quick reply...", "info");

  // Start the quick reply workflow
  quickReplyWorkflow(emailThread, composeField);
}

// Create and show floating status label
function showFloatingStatus(message, type = "info") {
  // Remove any existing status label
  const existingStatus = document.getElementById("quick-reply-status");
  if (existingStatus) {
    existingStatus.remove();
  }

  // Create new status label
  const statusLabel = document.createElement("div");
  statusLabel.id = "quick-reply-status";
  statusLabel.className = `floating-status ${type}`;

  // Add icon based on status type
  let icon = "";
  switch (type) {
    case "info":
      icon = '<span class="status-icon">ℹ️</span>';
      break;
    case "success":
      icon = '<span class="status-icon">✅</span>';
      break;
    case "error":
      icon = '<span class="status-icon">❌</span>';
      break;
    case "loading":
      icon = '<span class="status-icon loading">⟳</span>';
      break;
  }

  statusLabel.innerHTML = `
    ${icon}
    <span class="status-message">${message}</span>
  `;

  // Add to body
  document.body.appendChild(statusLabel);

  // If not an error or loading state, auto-remove after 5 seconds
  if (type !== "error" && type !== "loading") {
    setTimeout(() => {
      statusLabel.classList.add("fade-out");
      setTimeout(() => {
        if (statusLabel.parentNode) {
          statusLabel.remove();
        }
      }, 500);
    }, 5000);
  }

  return statusLabel;
}

// Handle the entire quick reply workflow
function quickReplyWorkflow(emailThread, composeField) {
  // Step 1: Auto-detect the assistant
  showFloatingStatus("Detecting best assistant...", "loading");
  console.log("Quick reply: Starting assistant detection workflow");

  // First get available assistants - fixed key name from cached_assistants to openai_assistants
  safeStorage().get(["openai_assistants"], async function (result) {
    let assistants = result.openai_assistants || [];
    console.log(
      "Quick reply: Initial assistants from storage:",
      assistants.length,
      assistants
    );

    // If no cached assistants, try to fetch them
    if (!assistants || assistants.length === 0) {
      showFloatingStatus("Fetching assistants...", "loading");
      console.log("Quick reply: No assistants in storage, fetching from API");
      // Try to get assistants first
      try {
        assistants = await new Promise((resolve) => {
          fetchOpenAIAssistants(true, () => {
            // After fetching, get the stored assistants
            safeStorage().get(["openai_assistants"], function (freshResult) {
              console.log(
                "Quick reply: Freshly fetched assistants:",
                freshResult.openai_assistants?.length,
                freshResult.openai_assistants
              );
              resolve(freshResult.openai_assistants || []);
            });
          });
        });

        if (!assistants || assistants.length === 0) {
          console.error(
            "Quick reply: Still no assistants available after fetch"
          );
          showFloatingStatus("Error: No assistants available", "error");
          return;
        }
      } catch (error) {
        console.error("Error fetching assistants:", error);
        showFloatingStatus("Error fetching assistants", "error");
        return;
      }
    }

    // Filter for favorite/selected assistants if configured
    safeStorage().get(["selected_assistants"], function (selectionResult) {
      let selectedAssistants = selectionResult.selected_assistants || {};
      console.log(
        "Quick reply: Selected assistants config:",
        selectedAssistants
      );

      // If we have selection preferences, filter the assistants
      if (Object.keys(selectedAssistants).length > 0) {
        console.log(
          "Quick reply: Filtering assistants by selection preferences"
        );
        assistants = assistants.filter(
          (assistant) => selectedAssistants[assistant.id] === true
        );
        console.log(
          "Quick reply: Filtered assistants:",
          assistants.length,
          assistants
        );
      }

      if (assistants.length === 0) {
        console.error("Quick reply: No assistants selected after filtering");
        showFloatingStatus("Error: No assistants selected", "error");
        return;
      }

      // Now we have assistants, let's detect the best one for this email
      console.log(
        "Quick reply: Proceeding to detect best assistant from",
        assistants.length,
        "available assistants"
      );
      detectBestAssistantForQuickReply(assistants, emailThread, composeField);
    });
  });
}

// Function to detect best assistant specifically for quick reply workflow
function detectBestAssistantForQuickReply(
  assistants,
  emailThread,
  composeField
) {
  // Get the API key
  safeStorage().get(["openai_api_key"], function (result) {
    if (!result.openai_api_key) {
      showFloatingStatus(
        "Error: API key not found. Please add your OpenAI API key in settings.",
        "error"
      );
      return;
    }

    // Format assistants for the detection function
    const availableAssistants = assistants.map((assistant) => ({
      id: assistant.id,
      name: assistant.name,
    }));

    // Call ChatGPT to determine the best assistant
    detectAssistantWithChatGPT(
      result.openai_api_key,
      emailThread,
      availableAssistants,
      function (bestAssistantId) {
        if (!bestAssistantId) {
          showFloatingStatus(
            "Error: Could not determine best assistant",
            "error"
          );
          return;
        }

        // Find the assistant details
        const selectedAssistant = assistants.find(
          (a) => a.id === bestAssistantId
        );
        if (!selectedAssistant) {
          showFloatingStatus("Error: Selected assistant not found", "error");
          return;
        }

        // Update status with selected assistant
        showFloatingStatus(
          `Using ${selectedAssistant.name} to generate response...`,
          "loading"
        );

        // Step 2: Generate response with the selected assistant
        generateQuickReply(
          result.openai_api_key,
          selectedAssistant,
          emailThread,
          composeField
        );
      }
    );
  });
}

// Generate response for quick reply
function generateQuickReply(apiKey, assistant, emailThread, composeField) {
  // Default to "reply" action for quick reply
  const action = "reply";

  console.log(
    "Quick Reply: Generating response with assistant:",
    assistant.name,
    assistant.id
  );

  // Create the prompt including email thread and action
  let prompt = `I need you to ${action} to this email conversation. Here's the thread:\n\n`;

  // Format the email thread
  prompt += `Subject: ${emailThread.subject}\n\n`;
  emailThread.thread.forEach((message, index) => {
    prompt += `From: ${message.from}\n`;
    if (message.to) prompt += `To: ${message.to}\n`;
    prompt += `Content: ${message.content}\n\n`;
  });

  prompt += `Please create a concise, professional ${action} based on this thread. 
  
Important formatting instructions:
1. Use proper email structure with greeting, body, and closing.
2. Use line breaks between paragraphs.
3. Format your reply as a proper email with appropriate spacing.
4. Keep the greeting, body, and signature on separate lines.
5. Do not use HTML formatting tags, just use regular line breaks.`;

  // Call the OpenAI API
  fetch("https://api.openai.com/v1/threads/runs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "OpenAI-Beta": "assistants=v2",
    },
    body: JSON.stringify({
      assistant_id: assistant.id,
      thread: {
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      },
    }),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((errorData) => {
          console.error("Quick Reply: API error details:", errorData);
          throw new Error(
            `API error: ${response.status} - ${
              errorData.error?.message || "Unknown error"
            }`
          );
        });
      }
      return response.json();
    })
    .then((data) => {
      console.log("Quick Reply: Thread and Run created:", data);
      // Store run ID and check status
      checkQuickReplyRunStatus(
        apiKey,
        data.thread_id,
        data.id,
        assistant.name,
        composeField
      );
    })
    .catch((error) => {
      console.error("Quick Reply: Error generating response:", error);
      showFloatingStatus(
        `Error: ${error.message || "Failed to generate response"}`,
        "error"
      );
    });
}

// Check the status of a quick reply run
function checkQuickReplyRunStatus(
  apiKey,
  threadId,
  runId,
  assistantName,
  composeField
) {
  // Update status
  console.log(
    "Quick Reply: Checking run status for run:",
    runId,
    "in thread:",
    threadId
  );
  showFloatingStatus(`${assistantName} is generating a reply...`, "loading");

  // Check run status with exponential backoff
  const checkStatus = () => {
    fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "OpenAI-Beta": "assistants=v2",
      },
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((errorData) => {
            console.error(
              "Quick Reply: API error checking run status:",
              errorData
            );
            throw new Error(
              `API error: ${response.status} - ${
                errorData.error?.message || "Unknown error"
              }`
            );
          });
        }
        return response.json();
      })
      .then((data) => {
        console.log("Quick Reply: Run status:", data.status);

        if (data.status === "completed") {
          // Get the messages from the thread
          fetchQuickReplyMessages(
            apiKey,
            threadId,
            assistantName,
            composeField
          );
        } else if (
          data.status === "failed" ||
          data.status === "cancelled" ||
          data.status === "expired"
        ) {
          const errorMsg =
            data.last_error?.message ||
            `Run ${data.status} without specific error message`;
          console.error("Quick Reply: Run failed:", errorMsg);
          throw new Error(errorMsg);
        } else {
          // Still in progress, check again after a delay
          setTimeout(checkStatus, 1000);
        }
      })
      .catch((error) => {
        console.error("Quick Reply: Error checking run status:", error);
        showFloatingStatus(
          `Error: ${error.message || "Failed to check run status"}`,
          "error"
        );
      });
  };

  checkStatus();
}

// Fetch messages from a thread
function fetchQuickReplyMessages(
  apiKey,
  threadId,
  assistantName,
  composeField
) {
  console.log("Quick Reply: Fetching messages from thread:", threadId);

  fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "OpenAI-Beta": "assistants=v2",
    },
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((errorData) => {
          console.error("Quick Reply: API error fetching messages:", errorData);
          throw new Error(
            `API error: ${response.status} - ${
              errorData.error?.message || "Unknown error"
            }`
          );
        });
      }
      return response.json();
    })
    .then((data) => {
      console.log(
        "Quick Reply: Got messages from thread:",
        data.data.length,
        "messages"
      );

      // Find the assistant's reply (should be the latest message)
      const assistantMessages = data.data.filter(
        (msg) => msg.role === "assistant"
      );

      if (assistantMessages.length === 0) {
        throw new Error("No assistant response found");
      }

      // Get the latest assistant message
      const latestMessage = assistantMessages[0];
      console.log("Quick Reply: Latest assistant message:", latestMessage.id);

      // Extract text content with proper formatting
      let responseText = "";
      latestMessage.content.forEach((content) => {
        if (content.type === "text") {
          // Add the text value, preserving original line breaks
          responseText += content.text.value;
        }
      });

      if (!responseText) {
        throw new Error("Empty response from assistant");
      }

      // Clean up the response text to ensure consistent formatting
      // Remove any excessive line breaks (more than 2 in a row)
      responseText = responseText.replace(/\n{3,}/g, "\n\n");

      // Ensure there are proper paragraph breaks for structural elements like greeting, body, closing
      // Look for common email patterns and ensure they're separated with double line breaks
      responseText = responseText
        .replace(/^(Hi|Hello|Dear|Greetings)([^,]*),/gm, "$1$2,\n\n") // Add break after greeting
        .replace(
          /(\.|!|\?)(\s*)(?=Best|Kind|Warm|Regards|Sincerely|Thank)/g,
          "$1\n\n$2"
        ) // Add break before closing
        .replace(/(Regards|Sincerely|Thank you)([^,]*),/g, "$1$2,\n\n"); // Add break after closing phrase

      console.log(
        "Quick Reply: Successfully extracted and formatted response text"
      );

      // Insert the response
      insertQuickReplyIntoComposeField(responseText, composeField);
    })
    .catch((error) => {
      console.error("Quick Reply: Error fetching messages:", error);
      showFloatingStatus(
        `Error: ${error.message || "Failed to fetch assistant's response"}`,
        "error"
      );
    });
}

// Insert quick reply into the compose field
function insertQuickReplyIntoComposeField(responseText, composeField) {
  try {
    console.log("Quick Reply: Inserting response into compose field");

    // Focus the compose field
    composeField.focus();

    // Format the text to preserve line breaks
    // Convert all line breaks to <br> tags to ensure proper formatting in Gmail
    const formattedResponse = responseText
      .replace(/\n\n+/g, "<div><br></div>") // Multiple line breaks become paragraph breaks
      .replace(/\n/g, "<br>"); // Single line breaks become <br> tags

    console.log("Quick Reply: Formatted response with preserved line breaks");

    // Check if field is empty
    const isEmpty =
      composeField.innerHTML.trim() === "" ||
      composeField.innerHTML.trim() === "<br>";

    // Insert the text
    if (isEmpty) {
      console.log("Quick Reply: Compose field is empty, replacing content");
      composeField.innerHTML = formattedResponse;
    } else {
      console.log(
        "Quick Reply: Compose field has content, appending at cursor position"
      );

      try {
        // If there's existing text, append to it
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);

        // Create a temporary div to hold the formatted content
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = formattedResponse;

        // Insert each child node to preserve formatting
        const fragment = document.createDocumentFragment();
        while (tempDiv.firstChild) {
          fragment.appendChild(tempDiv.firstChild);
        }

        // Insert at cursor position
        range.deleteContents();
        range.insertNode(fragment);

        // Move cursor to end of inserted text
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      } catch (insertError) {
        console.log(
          "Quick Reply: Error with selection-based insertion, falling back to direct HTML insertion"
        );
        // Fallback: directly append the formatted HTML
        composeField.innerHTML += formattedResponse;
      }
    }

    // Trigger input event to ensure Gmail recognizes the change
    const inputEvent = new Event("input", { bubbles: true });
    composeField.dispatchEvent(inputEvent);

    // Show success message
    console.log("Quick Reply: Successfully inserted response");
    showFloatingStatus("Reply inserted successfully!", "success");
  } catch (error) {
    console.error("Quick Reply: Error inserting reply:", error);
    showFloatingStatus("Error inserting reply. Please try again.", "error");
  }
}
