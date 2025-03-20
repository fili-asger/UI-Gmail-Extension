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
      }
    }
  });

  // Start observing the document body for changes
  observer.observe(document.body, { childList: true, subtree: true });
}

// Create and insert the assistant button
function insertAssistantButton(toolbar, composeWindow) {
  const buttonDiv = document.createElement("div");
  buttonDiv.className = "assistant-btn-container";
  buttonDiv.innerHTML = `
    <div class="assistant-btn" title="AI Assistant">
      <img src="${chrome.runtime.getURL(
        "images/icon16.png"
      )}" alt="AI Assistant">
    </div>
  `;

  // Add click event
  buttonDiv.querySelector(".assistant-btn").addEventListener("click", () => {
    openAssistantUI(composeWindow);
  });

  // Insert button into toolbar
  toolbar.appendChild(buttonDiv);
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
  modalContainer.style.display = "block";

  // Set up UI event handlers
  setupUIEventHandlers(composeWindow, emailThread);
}

// Extract email thread content
function getEmailThreadContent() {
  // This is a placeholder - we'll implement the actual extraction logic later
  // For now, return a sample thread
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
  // For now, return a simplified version of our UI
  return `
    <div class="modal-wrapper">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Gmail Assistant</h2>
          <button class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <!-- This will be populated with our UI -->
          <p>Loading assistant...</p>
        </div>
      </div>
    </div>
  `;
}

// Set up event handlers for the UI
function setupUIEventHandlers(composeWindow, emailThread) {
  const modal = document.getElementById("gmail-assistant-modal");

  // Close button
  const closeBtn = modal.querySelector(".close-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      modal.style.display = "none";
    });
  }

  // We'll add more event handlers here later
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
