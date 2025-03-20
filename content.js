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
  // Get email thread content
  const emailThread = getEmailThreadContent();

  // Create modal container if it doesn't exist
  let modalContainer = document.getElementById("gmail-assistant-modal");
  if (!modalContainer) {
    modalContainer = document.createElement("div");
    modalContainer.id = "gmail-assistant-modal";
    document.body.appendChild(modalContainer);
  }

  // Populate the modal with UI content
  modalContainer.innerHTML = createAssistantUIHTML();
  modalContainer.style.display = "flex";

  // Set up UI event handlers
  setupUIEventHandlers(composeWindow, emailThread);
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
  // Return UI based on UI.html
  return `
    <div class="modal-wrapper bg-white rounded-lg overflow-hidden">
      <!-- Screen 1: Assistant Selection -->
      <div id="screen1" class="screen active">
        <!-- Header -->
        <div class="gmail-header px-4 py-3 flex justify-between items-center">
          <h2 class="text-lg font-medium text-white">AI Assistant</h2>
          <div class="flex items-center space-x-2">
            <button id="keybindsBtn" class="text-white hover:text-gray-100">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clip-rule="evenodd" />
              </svg>
            </button>
            <button id="settingsBtn" class="text-white hover:text-gray-100">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
              </svg>
            </button>
            <button id="closeModalBtn" class="text-white hover:text-gray-100 close-btn">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
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
              <label for="assistant" class="block text-sm font-medium text-gray-700">Select Assistant</label>
              <div class="relative group">
                <button class="text-blue-500 border border-blue-200 hover:bg-blue-50 h-7 w-7 flex items-center justify-center rounded-full transition-colors" aria-label="Auto-detect assistant">
                  <span class="text-lg">🪄</span>
                </button>
                <div class="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none">
                  Let AI guess the assistant
                  <div class="absolute top-full right-2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            </div>
            <div class="relative">
              <select id="assistant" class="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border">
                <option value="write-professional">Professional Writer</option>
                <option value="write-friendly">Friendly Writer</option>
                <option value="write-concise">Concise Writer</option>
                <option value="custom">Custom Assistant</option>
              </select>
              <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </div>
            </div>
            <button class="text-sm text-blue-600 hover:text-blue-800 mt-1" id="editAssistantListBtn">
              Edit Assistant List
            </button>
          </div>

          <!-- Action Selection -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label for="action" class="block text-sm font-medium text-gray-700">Select Action</label>
              <div class="relative group">
                <button class="text-blue-500 border border-blue-200 hover:bg-blue-50 h-7 w-7 flex items-center justify-center rounded-full transition-colors" aria-label="Auto-detect action">
                  <span class="text-lg">🪄</span>
                </button>
                <div class="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none">
                  Let AI guess the action
                  <div class="absolute top-full right-2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            </div>
            <div class="relative">
              <select id="action" class="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border">
                <option value="write-reply">Write Reply</option>
                <option value="summarize">Summarize Thread</option>
                <option value="suggest-bullets">Suggest Bullet Points</option>
                <option value="translate">Translate</option>
                <option value="custom">Custom Action</option>
              </select>
              <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </div>
            </div>
            <button class="text-sm text-blue-600 hover:text-blue-800 mt-1" id="editActionListBtn">
              Edit Action List
            </button>
          </div>

          <!-- Email Preview -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email Thread</label>
            <div class="border border-gray-300 rounded-md p-3 max-h-64 overflow-y-auto bg-gray-50" id="emailPreview">
              <!-- This will be populated with the email thread content -->
              <div class="text-sm text-gray-500 text-center py-2">Loading email content...</div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="bg-gray-50 px-4 py-3 flex justify-end">
          <button id="generateBtn" class="gmail-button px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
            Generate Response
          </button>
        </div>
      </div>

      <!-- Screen 2: Generated Response -->
      <div id="screen2" class="screen">
        <!-- Header -->
        <div class="gmail-header px-4 py-3 flex justify-between items-center">
          <h2 class="text-lg font-medium text-white">Generated Response</h2>
          <div class="flex items-center space-x-2">
            <button id="keybindsBtn2" class="text-white hover:text-gray-100">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clip-rule="evenodd" />
              </svg>
            </button>
            <button id="settingsBtn2" class="text-white hover:text-gray-100">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
              </svg>
            </button>
            <button id="closeModalBtn2" class="text-white hover:text-gray-100 close-btn">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Content -->
        <div class="p-4">
          <!-- Rich Text Editor -->
          <div id="responseText" class="border border-gray-300 rounded-md p-3 min-h-[200px] max-h-[300px] overflow-y-auto focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" contenteditable="true">
            <div class="spinner-container">
              <div class="spinner"></div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="bg-gray-50 px-4 py-3 flex justify-between">
          <button id="backBtn" class="text-gray-700 bg-white border border-gray-300 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
            Back
          </button>
          <div class="flex space-x-2">
            <button id="regenerateBtn" class="text-blue-600 border border-blue-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
              Regenerate
            </button>
            <button id="insertBtn" class="gmail-button px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
              Insert in Email
            </button>
          </div>
        </div>
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
      // Open options page to the assistant management section
      chrome.runtime.sendMessage({
        action: "openOptionsPage",
        section: "assistants",
      });
    });
  }

  // Edit action list
  const editActionListBtn = modal.querySelector("#editActionListBtn");
  if (editActionListBtn) {
    editActionListBtn.addEventListener("click", () => {
      // Open options page to the action management section
      chrome.runtime.sendMessage({
        action: "openOptionsPage",
        section: "actions",
      });
    });
  }

  // Settings button
  const settingsButtons = modal.querySelectorAll("#settingsBtn, #settingsBtn2");
  settingsButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      chrome.runtime.sendMessage({
        action: "openOptionsPage",
      });
    });
  });
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
