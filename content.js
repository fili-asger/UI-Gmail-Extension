// Gmail Assistant Extension - Content Script

console.log("Gmail Assistant Extension loaded");

// Main function to initialize the extension
function initExtension() {
  // Check if we're in Gmail
  if (!isGmail()) return;

  console.log("Gmail detected, initializing extension");

  // Create and inject the email assistant button
  injectAssistantButton();

  // Setup message listener for communication with background script
  setupMessageListeners();

  // Add this call after injectAssistantButton:
  setTimeout(function () {
    debugLog("Running deferred initialization");
    addDirectButtonHandler();

    // Force a quick test of the modal
    const testModal = document.createElement("div");
    testModal.id = "test-modal";
    testModal.style.cssText = "position: fixed; top: -9999px; left: -9999px;";
    document.body.appendChild(testModal);
    debugLog("Test modal created and appended:", testModal);

    // Check if styling is applied properly
    const testEl = document.createElement("div");
    testEl.className = "settings-modal active";
    testEl.style.cssText = "position: fixed; top: -9999px; left: -9999px;";
    document.body.appendChild(testEl);
    debugLog("Test element with settings-modal active class:", testEl);
    debugLog(
      "Computed style display:",
      window.getComputedStyle(testEl).display
    );
  }, 2000); // Short timeout to ensure DOM is ready
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
  debugLog("insertAssistantButton called", toolbar);

  // Hack: add direct button handlers on each attempt
  setTimeout(addDirectButtonHandler, 500);

  // Find the attachment icons container
  const attachmentsSection = toolbar.querySelector(".a8X");

  if (!attachmentsSection) return;

  // Create our button in the Gmail style
  const buttonDiv = document.createElement("div");
  buttonDiv.className = "wG J-Z-I assistant-btn-container";
  buttonDiv.setAttribute("data-tooltip", "AI Assistant");
  buttonDiv.setAttribute("aria-label", "AI Assistant");
  buttonDiv.setAttribute("tabindex", "1");
  buttonDiv.setAttribute("role", "button");

  // Use a simple div with background image instead of HTML content
  const button = document.createElement("div");
  button.className = "assistant-btn";
  buttonDiv.appendChild(button);

  // Add click event
  buttonDiv.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openAssistantUI(composeWindow);
  });

  // Insert button into toolbar
  attachmentsSection.appendChild(buttonDiv);
}

// Open the assistant UI
function openAssistantUI(composeWindow) {
  debugLog("openAssistantUI called");

  // Add direct settings button handler here as well
  setTimeout(addDirectButtonHandler, 100);

  // Get email thread content
  const emailThread = getEmailThreadContent();

  // Create modal container if it doesn't exist
  let modalContainer = document.getElementById("gmail-assistant-modal");
  if (!modalContainer) {
    modalContainer = document.createElement("div");
    modalContainer.id = "gmail-assistant-modal";
    modalContainer.className = "modal-container";
    document.body.appendChild(modalContainer);
  }

  // Populate the modal with UI content
  modalContainer.innerHTML = createAssistantUIHTML();
  modalContainer.style.display = "flex";

  // Set up UI event handlers
  setupUIEventHandlers(composeWindow, emailThread);

  // Create a specific test to trigger a modal
  const testButton = document.createElement("button");
  testButton.id = "test-settings-btn";
  testButton.textContent = "Test Settings";
  testButton.style.cssText =
    "position: fixed; top: 10px; right: 10px; z-index: 99999; background: red; color: white; padding: 5px;";
  testButton.onclick = function () {
    debugLog("Test settings button clicked");
    showSettingsModal();
    return false;
  };
  document.body.appendChild(testButton);
  debugLog("Test settings button added to DOM", testButton);
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
function createAssistantUIHTML() {
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

        <!-- Content -->
        <div class="p-4 space-y-4">
          <!-- Assistant Selection -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label for="assistant">Select Assistant</label>
              <div class="magic-wand-button" aria-label="Auto-detect assistant">
                <span>🪄</span>
              </div>
            </div>
            <div class="relative">
              <select id="assistant">
                <option>HelloFresh</option>
                <option>Podimo</option>
                <option>Factor</option>
                <option>Mofibo</option>
              </select>
            </div>
            <a href="#" class="text-blue-600 mt-1" id="editAssistantListBtn">
              Edit Assistant List
            </a>
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

          <!-- Email Thread -->
          <div>
            <label>Email Thread</label>
            <div id="emailPreview">
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

        <!-- Footer -->
        <div class="bg-gray-50 px-4 py-3 flex justify-end">
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
        <div class="p-4">
          <!-- Rich Text Editor -->
          <div id="responseText" class="border border-gray-300 rounded-md p-3 min-h-[200px] max-h-[300px] overflow-y-auto" contenteditable="true">
            <div class="spinner-container">
              <div class="spinner"></div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="bg-gray-50 px-4 py-3 flex justify-between">
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

  // Set up settings button events with our improved function
  setupSettingsButtonEvents(modal);

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
      showScreen("screen2");

      const assistant = modal.querySelector("#assistant").value;
      const action = modal.querySelector("#action").value;

      // Call background script to generate response
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
          const responseText = modal.querySelector("#responseText");

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
      // Show assistant management UI in main modal
      // This would be implemented later
      alert(
        "Assistant management will be added to the main modal in a future update"
      );
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

// Function to open the assistant UI
function openAssistantUI() {
  // Get email thread content
  const emailContent = getEmailThreadContent();

  // Create modal if it doesn't exist
  if (!document.getElementById("gmail-assistant-modal")) {
    const modalContainer = document.createElement("div");
    modalContainer.id = "gmail-assistant-modal";
    modalContainer.className = "modal-container";
    modalContainer.innerHTML = createAssistantUIHTML();
    document.body.appendChild(modalContainer);

    // Initialize event listeners
    initAssistantUI();
  } else {
    // Show the modal
    document.getElementById("gmail-assistant-modal").style.display = "flex";
  }

  // Make sure we start on screen 1
  showScreen("screen1");

  // Populate email preview
  populateEmailPreview(emailContent);
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

// Function to edit action list
function editActionList() {
  // Will be implemented in the main modal
  alert(
    "Action management will be added directly to the extension in a future update"
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

// Add this debugging function at the top of the file
function debugLog(message, object) {
  console.log(
    "%c[DEBUG] " + message,
    "background: #ffeb3b; color: black; padding: 2px 4px; border-radius: 2px;",
    object || ""
  );
}

// Function to show the settings modal
function showSettingsModal() {
  debugLog("showSettingsModal called");

  // Remove any existing settings modal first
  const existingModal = document.getElementById("settings-modal");
  if (existingModal) {
    debugLog("Removing existing settings modal", existingModal);
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
          <label for="apiKey" class="block text-sm font-medium text-gray-700 mb-1">ChatGPT API Key</label>
          <input type="password" id="apiKey" class="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border" placeholder="sk-...">
          <p class="mt-1 text-xs text-gray-500">Your API key is stored locally and never sent to our servers.</p>
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

  debugLog("Settings modal created:", settingsModal);

  // Add the modal to document
  document.body.appendChild(settingsModal);

  debugLog("Settings modal added to DOM, classList:", settingsModal.className);
  debugLog(
    "Settings modal style.display:",
    window.getComputedStyle(settingsModal).display
  );

  // Load API key from storage immediately
  chrome.storage.local.get(["openai_api_key"], function (result) {
    const apiKeyInput = document.getElementById("apiKey");
    if (apiKeyInput && result.openai_api_key) {
      debugLog("API key loaded from storage");
      apiKeyInput.value = result.openai_api_key;
    }
  });

  // Set up event handlers directly
  const closeBtn = document.getElementById("closeSettingsBtn");
  if (closeBtn) {
    debugLog("Setting up close button handler");
    closeBtn.onclick = function (e) {
      debugLog("Close button clicked");
      e.preventDefault();
      e.stopPropagation();
      const modal = document.getElementById("settings-modal");
      if (modal) modal.remove();
    };
  }

  const saveBtn = document.getElementById("saveSettingsBtn");
  if (saveBtn) {
    debugLog("Setting up save button handler");
    saveBtn.onclick = function (e) {
      debugLog("Save button clicked");
      e.preventDefault();
      e.stopPropagation();
      const apiKey = document.getElementById("apiKey").value;

      chrome.storage.local.set({ openai_api_key: apiKey }, function () {
        debugLog("API key saved to storage");
        const modal = document.getElementById("settings-modal");
        if (modal) modal.remove();
      });
    };
  }
}

// Modified direct button click handler
function directSettingsButtonHandler() {
  debugLog("Direct settings button click handler called");
  showSettingsModal();
  return false; // Prevent default and stop propagation
}

// Settings buttons - simplified event handling
function setupSettingsButtonEvents(modal) {
  debugLog("Setting up settings button events in modal", modal);

  const settingsButtons = modal.querySelectorAll("#settingsBtn, #settingsBtn2");
  debugLog("Found settings buttons in modal:", settingsButtons.length);

  settingsButtons.forEach((btn) => {
    debugLog("Adding click handler to button:", btn.id);
    // Use onclick instead of addEventListener for more direct binding
    btn.onclick = function (e) {
      debugLog("Settings button clicked (from modal):", this.id);
      e.preventDefault();
      e.stopPropagation();
      showSettingsModal();
      return false;
    };
  });

  // Also bind directly to settings button in the DOM
  const globalButtons = document.querySelectorAll(
    "#settingsBtn, #settingsBtn2, .header-icon"
  );
  debugLog("Found global settings buttons:", globalButtons.length);

  globalButtons.forEach((btn) => {
    debugLog("Adding click handler to global button:", btn.id || btn.className);
    btn.onclick = function (e) {
      debugLog("Settings button clicked (global):", this.id || this.className);
      e.preventDefault();
      e.stopPropagation();
      showSettingsModal();
      return false;
    };
  });

  // Let's try a more direct approach as well
  window.addEventListener(
    "click",
    function (e) {
      if (
        e.target &&
        (e.target.id === "settingsBtn" ||
          e.target.id === "settingsBtn2" ||
          e.target.classList.contains("header-icon") ||
          (e.target.parentElement &&
            (e.target.parentElement.id === "settingsBtn" ||
              e.target.parentElement.id === "settingsBtn2" ||
              e.target.parentElement.classList.contains("header-icon"))))
      ) {
        debugLog(
          "Settings button or child element clicked (global event listener):",
          e.target
        );
        e.preventDefault();
        e.stopPropagation();
        showSettingsModal();
        return false;
      }
    },
    true
  );
}

// Add a function to be called during initialization
function addDirectButtonHandler() {
  debugLog("Adding direct button handler");
  // Try to attach handler directly to all possible settings buttons
  document
    .querySelectorAll("#settingsBtn, #settingsBtn2, .header-icon")
    .forEach((btn) => {
      debugLog("Direct handler for:", btn.id || btn.className);
      btn.onclick = directSettingsButtonHandler;

      // Also add handler to SVG inside button
      const svg = btn.querySelector("svg");
      if (svg) {
        debugLog("Adding handler to SVG inside button");
        svg.onclick = directSettingsButtonHandler;
      }

      // And to the path inside SVG
      const path = btn.querySelector("path");
      if (path) {
        debugLog("Adding handler to path inside SVG");
        path.onclick = directSettingsButtonHandler;
      }
    });
}

// Direct event listeners for debugging
document.addEventListener("DOMContentLoaded", function () {
  debugLog("DOMContentLoaded event fired");
  addGlobalEventListeners();
});

// Also add this in case DOMContentLoaded already fired
setTimeout(addGlobalEventListeners, 1000);

function addGlobalEventListeners() {
  debugLog("Adding global event listeners");

  // Direct document-level click handler
  document.addEventListener(
    "click",
    function (e) {
      // Log all clicks for debugging
      debugLog(
        "Document click event on:",
        e.target.tagName +
          (e.target.id ? "#" + e.target.id : "") +
          (e.target.className
            ? "." + e.target.className.replace(/ /g, ".")
            : "")
      );

      // Check if this is our settings button or its children
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
        debugLog("SETTINGS BUTTON CLICKED!", e.target);
        e.preventDefault();
        e.stopPropagation();

        // Directly show the modal without any other function calls
        const existingModal = document.getElementById("settings-modal");
        if (existingModal) {
          existingModal.remove();
        }

        const modal = document.createElement("div");
        modal.id = "settings-modal";
        modal.className = "settings-modal active";
        modal.innerHTML = `
        <div class="settings-content">
          <div class="gmail-header px-4 py-3 flex justify-between items-center rounded-t-lg">
            <h2>Settings</h2>
            <button id="direct-close-btn">✕ Close</button>
          </div>
          <div class="p-4">
            <p>This is a test settings modal opened by the direct event handler.</p>
          </div>
        </div>
      `;

        document.body.appendChild(modal);
        debugLog("Direct modal added to DOM:", modal);

        // Very important style overrides to ensure visibility
        modal.style.cssText = `
        position: fixed !important;
        display: flex !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background: rgba(0,0,0,0.7) !important;
        z-index: 99999999 !important;
        justify-content: center !important;
        align-items: center !important;
      `;

        // Add a close handler
        const closeBtn = modal.querySelector("#direct-close-btn");
        if (closeBtn) {
          closeBtn.onclick = function () {
            modal.remove();
          };
        }

        // Click on modal background to close
        modal.addEventListener("click", function (e) {
          if (e.target === modal) {
            modal.remove();
          }
        });

        return false;
      }
    },
    true
  ); // Use capture phase to get the event first
}

// Add a MutationObserver to watch for the settings button being added to the DOM
const bodyObserver = new MutationObserver(function (mutations) {
  for (const mutation of mutations) {
    if (mutation.type === "childList" && mutation.addedNodes.length) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const settingsButtons = node.querySelectorAll(
            "#settingsBtn, .header-icon"
          );
          if (settingsButtons.length) {
            debugLog(
              "Settings buttons found in DOM mutation:",
              settingsButtons.length
            );
            settingsButtons.forEach((btn) => {
              btn.onclick = function (e) {
                debugLog(
                  "Settings button clicked via MutationObserver handler"
                );
                e.preventDefault();
                e.stopPropagation();
                showSettingsModal();
                return false;
              };
            });
          }
        }
      }
    }
  }
});

// Start observing the body
setTimeout(function () {
  bodyObserver.observe(document.body, { childList: true, subtree: true });
  debugLog("Body observer started");
}, 1500);
