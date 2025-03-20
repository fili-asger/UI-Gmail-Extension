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
    assistants: [
      {
        id: "HelloFresh",
        name: "HelloFresh",
        description: "Customer relationship / refunds",
      },
      { id: "Podimo", name: "Podimo", description: "Subscription questions" },
      { id: "Factor", name: "Factor", description: "Order management" },
      { id: "Mofibo", name: "Mofibo", description: "Technical support" },
    ],
    actions: [
      { id: "Accept", name: "Accept", description: "Accept customer request" },
      {
        id: "Reject",
        name: "Reject",
        description: "Reject customer request politely",
      },
      {
        id: "Negotiate",
        name: "Negotiate",
        description: "Offer alternative solution",
      },
      { id: "Help", name: "Help", description: "Provide technical support" },
    ],
    shortcuts: {
      openAssistant: "Alt+A",
      generateResponse: "Alt+G",
    },
  };

  // Load settings from storage
  function loadSettings() {
    chrome.storage.sync.get(
      ["apiKey", "assistants", "actions", "shortcuts"],
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

        // Shortcuts
        if (result.shortcuts) {
          shortcuts = result.shortcuts;
          renderShortcuts(result.shortcuts);
        } else {
          shortcuts = defaultSettings.shortcuts;
          renderShortcuts(defaultSettings.shortcuts);
        }
      }
    );
  }

  // Render assistant list
  function renderAssistantList(assistants) {
    assistantList.innerHTML = "";

    assistants.forEach((assistant, index) => {
      const item = document.createElement("div");
      item.className = "assistant-item";
      item.innerHTML = `
        <div class="list-item-content">
          <div>
            <strong>${assistant.name}</strong>
            <p class="text-gray-500">${assistant.description}</p>
          </div>
          <div class="list-item-actions">
            <button class="edit-btn" data-index="${index}">Edit</button>
            <button class="delete-btn" data-index="${index}">Delete</button>
          </div>
        </div>
      `;
      assistantList.appendChild(item);

      // Add event listeners to delete buttons
      item.querySelector(".delete-btn").addEventListener("click", function () {
        deleteAssistant(index);
      });

      // Add event listeners to edit buttons
      item.querySelector(".edit-btn").addEventListener("click", function () {
        editAssistant(index);
      });
    });
  }

  // Render action list
  function renderActionList(actions) {
    actionList.innerHTML = "";

    actions.forEach((action, index) => {
      const item = document.createElement("div");
      item.className = "action-item";
      item.innerHTML = `
        <div class="list-item-content">
          <div>
            <strong>${action.name}</strong>
            <p class="text-gray-500">${action.description}</p>
          </div>
          <div class="list-item-actions">
            <button class="edit-btn" data-index="${index}">Edit</button>
            <button class="delete-btn" data-index="${index}">Delete</button>
          </div>
        </div>
      `;
      actionList.appendChild(item);

      // Add event listeners to delete buttons
      item.querySelector(".delete-btn").addEventListener("click", function () {
        deleteAction(index);
      });

      // Add event listeners to edit buttons
      item.querySelector(".edit-btn").addEventListener("click", function () {
        editAction(index);
      });
    });
  }

  // Add new assistant
  function addAssistant() {
    const name = prompt("Enter assistant name:");
    if (!name) return;

    const description = prompt("Enter assistant description:");
    if (!description) return;

    chrome.storage.sync.get(
      { assistants: defaultSettings.assistants },
      function (data) {
        const assistants = data.assistants;

        // Generate a unique ID
        const id = name.replace(/\s+/g, "");

        // Add new assistant
        assistants.push({
          id: id,
          name: name,
          description: description,
        });

        // Save to storage
        chrome.storage.sync.set({ assistants: assistants }, function () {
          // Re-render the list
          renderAssistantList(assistants);
        });
      }
    );
  }

  // Delete assistant
  function deleteAssistant(index) {
    if (!confirm("Are you sure you want to delete this assistant?")) return;

    chrome.storage.sync.get(
      { assistants: defaultSettings.assistants },
      function (data) {
        const assistants = data.assistants;

        // Remove the assistant
        assistants.splice(index, 1);

        // Save to storage
        chrome.storage.sync.set({ assistants: assistants }, function () {
          // Re-render the list
          renderAssistantList(assistants);
        });
      }
    );
  }

  // Edit assistant
  function editAssistant(index) {
    chrome.storage.sync.get(
      { assistants: defaultSettings.assistants },
      function (data) {
        const assistants = data.assistants;
        const assistant = assistants[index];

        const name = prompt("Enter assistant name:", assistant.name);
        if (!name) return;

        const description = prompt(
          "Enter assistant description:",
          assistant.description
        );
        if (!description) return;

        // Update assistant
        assistants[index] = {
          id: assistant.id, // Keep the same ID
          name: name,
          description: description,
        };

        // Save to storage
        chrome.storage.sync.set({ assistants: assistants }, function () {
          // Re-render the list
          renderAssistantList(assistants);
        });
      }
    );
  }

  // Add new action
  function addAction() {
    const name = prompt("Enter action name:");
    if (!name) return;

    const description = prompt("Enter action description:");
    if (!description) return;

    chrome.storage.sync.get(
      { actions: defaultSettings.actions },
      function (data) {
        const actions = data.actions;

        // Generate a unique ID
        const id = name.replace(/\s+/g, "");

        // Add new action
        actions.push({
          id: id,
          name: name,
          description: description,
        });

        // Save to storage
        chrome.storage.sync.set({ actions: actions }, function () {
          // Re-render the list
          renderActionList(actions);
        });
      }
    );
  }

  // Delete action
  function deleteAction(index) {
    if (!confirm("Are you sure you want to delete this action?")) return;

    chrome.storage.sync.get(
      { actions: defaultSettings.actions },
      function (data) {
        const actions = data.actions;

        // Remove the action
        actions.splice(index, 1);

        // Save to storage
        chrome.storage.sync.set({ actions: actions }, function () {
          // Re-render the list
          renderActionList(actions);
        });
      }
    );
  }

  // Edit action
  function editAction(index) {
    chrome.storage.sync.get(
      { actions: defaultSettings.actions },
      function (data) {
        const actions = data.actions;
        const action = actions[index];

        const name = prompt("Enter action name:", action.name);
        if (!name) return;

        const description = prompt(
          "Enter action description:",
          action.description
        );
        if (!description) return;

        // Update action
        actions[index] = {
          id: action.id, // Keep the same ID
          name: name,
          description: description,
        };

        // Save to storage
        chrome.storage.sync.set({ actions: actions }, function () {
          // Re-render the list
          renderActionList(actions);
        });
      }
    );
  }

  // Save settings
  function saveSettings() {
    const settings = {
      apiKey: apiKeyInput.value,
      shortcuts: shortcuts,
    };

    chrome.storage.sync.set(settings, function () {
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
          chrome.storage.sync.get("shortcuts", function (result) {
            shortcuts = result.shortcuts || defaultSettings.shortcuts;
            renderShortcuts(shortcuts);
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
