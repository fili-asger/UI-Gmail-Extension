// Gmail Assistant Extension - Options Page Script

document.addEventListener("DOMContentLoaded", function () {
  // Elements
  const apiKeyInput = document.getElementById("apiKey");
  const toggleApiVisibilityBtn = document.getElementById("toggleApiVisibility");
  const assistantList = document.getElementById("assistantList");
  const newAssistantInput = document.getElementById("newAssistant");
  const addAssistantBtn = document.getElementById("addAssistantBtn");
  const actionList = document.getElementById("actionList");
  const newActionInput = document.getElementById("newAction");
  const addActionBtn = document.getElementById("addActionBtn");
  const shortcutInput = document.getElementById("quickReplyShortcut");
  const shortcutDisplay = document.getElementById("shortcutDisplay");
  const saveBtn = document.getElementById("saveBtn");
  const resetBtn = document.getElementById("resetBtn");

  // Default settings
  const defaultSettings = {
    apiKey: "",
    assistants: ["HelloFresh", "Podimo", "Factor", "Mofibo"],
    actions: ["Accept", "Reject", "Negotiate", "Help"],
    shortcut: "Cmd+E",
  };

  // Load settings from storage
  function loadSettings() {
    chrome.storage.sync.get(
      ["apiKey", "assistants", "actions", "shortcut"],
      function (result) {
        // API Key
        if (result.apiKey) {
          apiKeyInput.value = result.apiKey;
        }

        // Assistants
        if (result.assistants) {
          renderAssistantList(result.assistants);
        } else {
          renderAssistantList(defaultSettings.assistants);
        }

        // Actions
        if (result.actions) {
          renderActionList(result.actions);
        } else {
          renderActionList(defaultSettings.actions);
        }

        // Shortcut
        if (result.shortcut) {
          shortcutDisplay.textContent = result.shortcut;
        } else {
          shortcutDisplay.textContent = defaultSettings.shortcut;
        }
      }
    );
  }

  // Render assistant list
  function renderAssistantList(assistants) {
    assistantList.innerHTML = "";

    assistants.forEach((assistant) => {
      const item = document.createElement("div");
      item.className = "assistant-item";
      item.innerHTML = `
        <span>${assistant}</span>
        <button class="delete-button" data-assistant="${assistant}">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6L6 18M6 6l12 12"></path>
          </svg>
        </button>
      `;
      assistantList.appendChild(item);
    });

    // Add event listeners to delete buttons
    document
      .querySelectorAll(".delete-button[data-assistant]")
      .forEach((button) => {
        button.addEventListener("click", function () {
          const assistantToDelete = this.getAttribute("data-assistant");
          deleteAssistant(assistantToDelete);
        });
      });
  }

  // Render action list
  function renderActionList(actions) {
    actionList.innerHTML = "";

    actions.forEach((action) => {
      const item = document.createElement("div");
      item.className = "action-item";
      item.innerHTML = `
        <span>${action}</span>
        <button class="delete-button" data-action="${action}">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6L6 18M6 6l12 12"></path>
          </svg>
        </button>
      `;
      actionList.appendChild(item);
    });

    // Add event listeners to delete buttons
    document
      .querySelectorAll(".delete-button[data-action]")
      .forEach((button) => {
        button.addEventListener("click", function () {
          const actionToDelete = this.getAttribute("data-action");
          deleteAction(actionToDelete);
        });
      });
  }

  // Add new assistant
  function addAssistant() {
    const newAssistant = newAssistantInput.value.trim();

    if (!newAssistant) return;

    chrome.storage.sync.get("assistants", function (result) {
      let assistants = result.assistants || defaultSettings.assistants;

      // Add new assistant if it doesn't exist
      if (!assistants.includes(newAssistant)) {
        assistants.push(newAssistant);
        chrome.storage.sync.set({ assistants }, function () {
          renderAssistantList(assistants);
          newAssistantInput.value = "";
        });
      } else {
        alert("This assistant already exists!");
      }
    });
  }

  // Delete assistant
  function deleteAssistant(assistant) {
    chrome.storage.sync.get("assistants", function (result) {
      let assistants = result.assistants || defaultSettings.assistants;

      // Remove assistant
      assistants = assistants.filter((a) => a !== assistant);

      // Save updated list
      chrome.storage.sync.set({ assistants }, function () {
        renderAssistantList(assistants);
      });
    });
  }

  // Add new action
  function addAction() {
    const newAction = newActionInput.value.trim();

    if (!newAction) return;

    chrome.storage.sync.get("actions", function (result) {
      let actions = result.actions || defaultSettings.actions;

      // Add new action if it doesn't exist
      if (!actions.includes(newAction)) {
        actions.push(newAction);
        chrome.storage.sync.set({ actions }, function () {
          renderActionList(actions);
          newActionInput.value = "";
        });
      } else {
        alert("This action already exists!");
      }
    });
  }

  // Delete action
  function deleteAction(action) {
    chrome.storage.sync.get("actions", function (result) {
      let actions = result.actions || defaultSettings.actions;

      // Remove action
      actions = actions.filter((a) => a !== action);

      // Save updated list
      chrome.storage.sync.set({ actions }, function () {
        renderActionList(actions);
      });
    });
  }

  // Save settings
  function saveSettings() {
    const apiKey = apiKeyInput.value.trim();
    const shortcut = shortcutDisplay.textContent;

    chrome.storage.sync.set({ apiKey, shortcut }, function () {
      // Show saved message
      const saveMsg = document.createElement("div");
      saveMsg.className = "save-message";
      saveMsg.textContent = "Settings saved successfully!";
      saveMsg.style.position = "fixed";
      saveMsg.style.bottom = "20px";
      saveMsg.style.right = "20px";
      saveMsg.style.backgroundColor = "#4CAF50";
      saveMsg.style.color = "white";
      saveMsg.style.padding = "10px 20px";
      saveMsg.style.borderRadius = "4px";
      saveMsg.style.transition = "opacity 0.3s";

      document.body.appendChild(saveMsg);

      // Remove message after 3 seconds
      setTimeout(() => {
        saveMsg.style.opacity = "0";
        setTimeout(() => {
          document.body.removeChild(saveMsg);
        }, 300);
      }, 3000);
    });
  }

  // Reset settings to defaults
  function resetSettings() {
    if (confirm("Are you sure you want to reset all settings to defaults?")) {
      chrome.storage.sync.set(defaultSettings, function () {
        loadSettings();
      });
    }
  }

  // Toggle API key visibility
  function toggleApiKeyVisibility() {
    if (apiKeyInput.type === "password") {
      apiKeyInput.type = "text";
      toggleApiVisibilityBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>
      `;
    } else {
      apiKeyInput.type = "password";
      toggleApiVisibilityBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      `;
    }
  }

  // Setup keyboard shortcut recording
  function setupShortcutRecording() {
    let isRecording = false;

    shortcutInput
      .querySelector(".edit-button")
      .addEventListener("click", function () {
        if (!isRecording) {
          isRecording = true;
          shortcutDisplay.textContent = "Press keys...";
          this.textContent = "Cancel";

          // Highlight input
          shortcutInput.style.borderColor = "#1a73e8";
          shortcutInput.style.boxShadow = "0 0 0 2px rgba(26,115,232,0.2)";
        } else {
          // Cancel recording
          isRecording = false;
          chrome.storage.sync.get("shortcut", function (result) {
            shortcutDisplay.textContent =
              result.shortcut || defaultSettings.shortcut;
          });
          this.textContent = "Edit";

          // Remove highlight
          shortcutInput.style.borderColor = "#ddd";
          shortcutInput.style.boxShadow = "none";
        }
      });

    // Listen for key combinations
    document.addEventListener("keydown", function (e) {
      if (!isRecording) return;

      e.preventDefault();

      // Build key combination string
      let keys = [];
      if (e.metaKey) keys.push("Cmd");
      if (e.ctrlKey) keys.push("Ctrl");
      if (e.altKey) keys.push("Alt");
      if (e.shiftKey) keys.push("Shift");

      // Add main key if it's not a modifier
      if (!["Meta", "Control", "Alt", "Shift"].includes(e.key)) {
        keys.push(e.key.toUpperCase());
      }

      // Only accept combinations with at least one modifier
      if (keys.length > 1) {
        shortcutDisplay.textContent = keys.join("+");
        isRecording = false;
        shortcutInput.querySelector(".edit-button").textContent = "Edit";

        // Remove highlight
        shortcutInput.style.borderColor = "#ddd";
        shortcutInput.style.boxShadow = "none";
      }
    });
  }

  // Event listeners
  addAssistantBtn.addEventListener("click", addAssistant);
  newAssistantInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") addAssistant();
  });

  addActionBtn.addEventListener("click", addAction);
  newActionInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") addAction();
  });

  toggleApiVisibilityBtn.addEventListener("click", toggleApiKeyVisibility);
  saveBtn.addEventListener("click", saveSettings);
  resetBtn.addEventListener("click", resetSettings);

  // Initialize
  loadSettings();
  setupShortcutRecording();
});
