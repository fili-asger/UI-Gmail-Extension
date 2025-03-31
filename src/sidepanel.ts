import "./sidepanel.css"; // Import styles

// --- Interfaces for OpenAI API responses ---
interface OpenAIAssistant {
  id: string;
  name: string | null;
  // Add other fields if needed
}

interface OpenAPIAssistantListResponse {
  object: string;
  data: OpenAIAssistant[];
  // Add pagination fields
  first_id?: string;
  last_id?: string;
  has_more?: boolean;
}

interface OpenAPIMessageContentText {
  type: "text";
  text: {
    value: string;
    annotations: any[];
  };
}

interface OpenAPIMessage {
  id: string;
  object: string;
  created_at: number;
  thread_id: string;
  role: "user" | "assistant";
  content: OpenAPIMessageContentText[]; // Assuming text content only for simplicity
  // Add other fields like assistant_id, run_id, attachments if needed
}

interface OpenAPIMessageListResponse {
  object: string;
  data: OpenAPIMessage[];
  first_id?: string;
  last_id?: string;
  has_more?: boolean;
}

interface OpenAPIRun {
  id: string;
  object: string;
  assistant_id: string;
  thread_id: string;
  status:
    | "queued"
    | "in_progress"
    | "requires_action"
    | "cancelling"
    | "cancelled"
    | "failed"
    | "completed"
    | "expired";
  // Add other fields as needed
}

console.log("Side Panel Script Loaded");

// --- DOM Elements ---
// View Containers
const mainContentView = document.getElementById(
  "main-content"
) as HTMLDivElement;
const settingsView = document.getElementById("settings-view") as HTMLDivElement;
const assistantEditView = document.getElementById(
  "assistant-edit-view"
) as HTMLDivElement;

// Top Bar
const settingsBtn = document.getElementById(
  "settings-btn"
) as HTMLButtonElement;

// Main View Elements
const refreshContextLink = document.getElementById(
  "refresh-context-link"
) as HTMLButtonElement;
const assistantSelectLabel = document.querySelector(
  'label[for="assistant-select"]'
) as HTMLLabelElement;
const assistantSelect = document.getElementById(
  "assistant-select"
) as HTMLSelectElement;
const aiSelectBtn = document.getElementById(
  "ai-select-btn"
) as HTMLButtonElement;
const emailContentPre = document.getElementById("email-content");

// Generated Reply Section (now in main view)
const generatedReplySection = document.getElementById(
  "generated-reply-section"
) as HTMLDivElement;
const regenerateLinkBtn = document.getElementById(
  "regenerate-link-btn"
) as HTMLButtonElement;
const replyOutputTextarea = document.getElementById(
  "reply-output"
) as HTMLTextAreaElement;

// Regeneration Controls (now in main view)
const regenerationControls = document.getElementById(
  "regeneration-controls"
) as HTMLDivElement;
const regenInstructionsInput = document.getElementById(
  "regen-instructions"
) as HTMLInputElement;

// Main Action Button (fixed at bottom)
const mainActionBtn = document.getElementById(
  "main-action-btn"
) as HTMLButtonElement;
const mainActionBtnSpan = mainActionBtn.querySelector("span"); // Get span for text updates

// Settings View Elements
const apiKeyInput = document.getElementById("api-key") as HTMLInputElement;
const saveKeyBtn = document.getElementById("save-key-btn") as HTMLButtonElement;
const backBtn = document.getElementById(
  "back-to-main-btn"
) as HTMLButtonElement;

// New elements
const editAssistantsLink = document.getElementById(
  "edit-assistants-link"
) as HTMLButtonElement;
const assistantListContainer = document.getElementById(
  "assistant-list-container"
) as HTMLDivElement;
const saveAssistantFilterBtn = document.getElementById(
  "save-assistant-filter-btn"
) as HTMLButtonElement;
const cancelAssistantFilterBtn = document.getElementById(
  "cancel-assistant-filter-btn"
) as HTMLButtonElement;

// Assistant Edit View Elements
const assistantSearchInput = document.getElementById(
  "assistant-search-input"
) as HTMLInputElement;
const selectAllBtn = document.getElementById(
  "select-all-assistants-btn"
) as HTMLButtonElement;
const deselectAllBtn = document.getElementById(
  "deselect-all-assistants-btn"
) as HTMLButtonElement;

// Global Spinner
const globalSpinner = document.getElementById(
  "global-spinner"
) as HTMLDivElement;

// Instruction Elements
const instructionSelect = document.getElementById(
  "instruction-select"
) as HTMLSelectElement;
const editInstructionsLink = document.getElementById(
  "edit-instructions-link"
) as HTMLButtonElement;
// Instruction Edit View
const instructionEditView = document.getElementById(
  "instruction-edit-view"
) as HTMLDivElement;
const newInstructionInput = document.getElementById(
  "new-instruction-input"
) as HTMLInputElement;
const addInstructionBtn = document.getElementById(
  "add-instruction-btn"
) as HTMLButtonElement;
const instructionListContainer = document.getElementById(
  "instruction-list-container"
) as HTMLDivElement;
const saveInstructionsBtn = document.getElementById(
  "save-instructions-btn"
) as HTMLButtonElement;

// State Variables
let currentEmailContent: string | null = null;
let currentReply: string | null = null;
let openAIApiKey: string | null = null;
let allAssistants: OpenAIAssistant[] = []; // Store the full list
let visibleAssistantIds: string[] = []; // IDs to show in the dropdown
let currentThreadId: string | null = null;
let currentActionButtonState: "generate" | "insert" | "regenerate" = "generate"; // Track button state
let savedInstructions: string[] = ["Accept", "Reject", "Negotiate"]; // Default/example instructions

// --- Constants ---
const VISIBLE_ASSISTANTS_STORAGE_KEY = "visible_assistant_ids";
const CACHED_ASSISTANTS_KEY = "cached_all_assistants";
const SAVED_INSTRUCTIONS_KEY = "saved_instructions"; // New key

// --- Status Updates ---
function updateStatus(message: string, isError: boolean = false) {
  // Status div is hidden, just log to console
  // if (statusDiv) {
  //   statusDiv.textContent = message;
  //   statusDiv.style.color = isError ? "red" : "black";
  // } else {
  //     console.warn("Status div not found when trying to update status:", message)
  // }
  console.log(`Status Update (${isError ? "ERROR" : "INFO"}): ${message}`);
}

// --- View Management ---
function showMainView() {
  if (
    mainContentView &&
    settingsView &&
    assistantEditView &&
    instructionEditView
  ) {
    settingsView.classList.remove("active-view");
    assistantEditView.classList.remove("active-view");
    instructionEditView.classList.remove("active-view");
    mainContentView.classList.add("active-view");
    hideGeneratedReply();
  }
}

function showSettingsView() {
  if (
    mainContentView &&
    settingsView &&
    assistantEditView &&
    instructionEditView
  ) {
    mainContentView.classList.remove("active-view");
    assistantEditView.classList.remove("active-view");
    instructionEditView.classList.remove("active-view");
    settingsView.classList.add("active-view");
    hideGeneratedReply();
    if (openAIApiKey !== null) {
      apiKeyInput.value = openAIApiKey;
    }
  }
}

async function showAssistantEditView() {
  if (
    mainContentView &&
    settingsView &&
    assistantEditView &&
    instructionEditView
  ) {
    mainContentView.classList.remove("active-view");
    settingsView.classList.remove("active-view");
    instructionEditView.classList.remove("active-view");
    assistantEditView.classList.add("active-view");
    hideGeneratedReply();
    assistantSearchInput.value = "";
    populateAssistantEditList();
  }
}

function showInstructionEditView() {
  if (
    mainContentView &&
    settingsView &&
    assistantEditView &&
    instructionEditView
  ) {
    mainContentView.classList.remove("active-view");
    settingsView.classList.remove("active-view");
    assistantEditView.classList.remove("active-view");
    instructionEditView.classList.add("active-view");
    newInstructionInput.value = "";
    populateInstructionEditList();
  }
}

// Helper to show/hide reply sections
function showGeneratedReply() {
  if (generatedReplySection) generatedReplySection.style.display = "flex"; // Or 'block' if flex not needed
  // Keep regen controls hidden initially
  if (regenerationControls) regenerationControls.style.display = "none";
}

function hideGeneratedReply() {
  if (generatedReplySection) generatedReplySection.style.display = "none";
  if (regenerationControls) regenerationControls.style.display = "none";
  // Optionally clear reply textarea and instructions
  if (replyOutputTextarea) replyOutputTextarea.value = "";
  if (regenInstructionsInput) regenInstructionsInput.value = "";
  currentReply = null;
}

// Helper to update the main action button
function setMainActionButtonState(
  state: "generate" | "insert" | "regenerate",
  disabled: boolean = false
) {
  currentActionButtonState = state;
  mainActionBtn.disabled = disabled;
  mainActionBtn.classList.remove(
    "loading",
    "button-generate",
    "button-regenerate",
    "button-insert"
  ); // Remove all state classes

  if (mainActionBtnSpan) {
    switch (state) {
      case "generate":
        mainActionBtnSpan.textContent = "Generate Reply";
        mainActionBtn.classList.add("button-generate");
        break;
      case "insert":
        mainActionBtnSpan.textContent = "Insert Reply into Gmail";
        mainActionBtn.classList.add("button-insert");
        break;
      case "regenerate":
        mainActionBtnSpan.textContent = "Regenerate Reply";
        mainActionBtn.classList.add("button-regenerate");
        break;
    }
  }
}

// --- Spinner Control ---
function showSpinner(show: boolean) {
  if (globalSpinner) {
    globalSpinner.classList.toggle("active", show);
  }
}

// --- Utility Functions ---
/** Generic fetch wrapper for OpenAI API calls */
async function fetchOpenAI<T>(
  endpoint: string,
  apiKey: string,
  options: RequestInit = {}
): Promise<T> {
  const defaultHeaders: HeadersInit = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "OpenAI-Beta": "assistants=v2", // Specify Assistants API V2
  };

  const response = await fetch(`https://api.openai.com/v1${endpoint}`, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})); // Attempt to parse error
    console.error("OpenAI API Error Response:", errorData);
    throw new Error(
      `OpenAI API request failed: ${response.status} ${response.statusText}. ${
        errorData?.error?.message || ""
      }`
    );
  }

  return response.json() as Promise<T>;
}

/** Sleep helper function */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Helper Functions ---
/** Resets the reply section and action button to the initial state */
function resetReplyState() {
  console.log("Resetting reply state.");
  hideGeneratedReply(); // Hides sections, clears textarea, nullifies currentReply
  setMainActionButtonState("generate"); // Reset button
  currentThreadId = null; // Reset thread ID as the context has changed
  instructionSelect.value = ""; // Reset instruction dropdown to default
}

// --- Initialization ---
async function initialize() {
  // Check for all essential elements including new ones
  if (
    !mainContentView ||
    !settingsView ||
    !assistantEditView ||
    !globalSpinner ||
    !settingsBtn ||
    !refreshContextLink ||
    !assistantSelectLabel ||
    !assistantSelect ||
    !aiSelectBtn ||
    !emailContentPre ||
    !generatedReplySection ||
    !regenerateLinkBtn ||
    !replyOutputTextarea ||
    !regenerationControls ||
    !regenInstructionsInput ||
    !mainActionBtn ||
    !mainActionBtnSpan ||
    !apiKeyInput ||
    !saveKeyBtn ||
    !backBtn ||
    !assistantSearchInput ||
    !selectAllBtn ||
    !deselectAllBtn ||
    !assistantListContainer ||
    !saveAssistantFilterBtn ||
    !cancelAssistantFilterBtn ||
    !editAssistantsLink ||
    !instructionSelect ||
    !instructionEditView ||
    !newInstructionInput ||
    !addInstructionBtn ||
    !instructionListContainer ||
    !saveInstructionsBtn
  ) {
    console.error(
      "One or more essential UI elements not found in sidepanel.html"
    );
    // Attempt to show an error message in the body if possible
    document.body.innerHTML =
      "Error: Side panel UI elements missing or structure incorrect.";
    return;
  }

  try {
    const storageData = await chrome.storage.local.get([
      "openai_api_key",
      VISIBLE_ASSISTANTS_STORAGE_KEY,
      CACHED_ASSISTANTS_KEY,
      SAVED_INSTRUCTIONS_KEY, // Load instructions
    ]);

    // Load Saved Instructions
    if (
      storageData[SAVED_INSTRUCTIONS_KEY] &&
      Array.isArray(storageData[SAVED_INSTRUCTIONS_KEY])
    ) {
      savedInstructions = storageData[SAVED_INSTRUCTIONS_KEY];
    } else {
      await chrome.storage.local.set({
        [SAVED_INSTRUCTIONS_KEY]: savedInstructions,
      });
    }
    console.log("Loaded instructions:", savedInstructions);
    populateInstructionDropdown(); // Populate main dropdown

    // Load Visible IDs
    if (
      storageData[VISIBLE_ASSISTANTS_STORAGE_KEY] &&
      Array.isArray(storageData[VISIBLE_ASSISTANTS_STORAGE_KEY])
    ) {
      visibleAssistantIds = storageData[VISIBLE_ASSISTANTS_STORAGE_KEY];
      console.log("Visible Assistant IDs loaded:", visibleAssistantIds);
    } else {
      visibleAssistantIds = [];
    }

    // Load Cached Assistants
    if (
      storageData[CACHED_ASSISTANTS_KEY] &&
      Array.isArray(storageData[CACHED_ASSISTANTS_KEY])
    ) {
      allAssistants = storageData[CACHED_ASSISTANTS_KEY];
      console.log(`Loaded ${allAssistants.length} assistants from cache.`);
      populateAssistantDropdown(); // Populate dropdown immediately
    } else {
      allAssistants = [];
      console.log("Assistant cache is empty.");
      // Don't populate dropdown yet if cache is empty, wait for API key check
    }

    // Load API Key
    if (storageData.openai_api_key) {
      openAIApiKey = storageData.openai_api_key;
      if (openAIApiKey !== null) {
        apiKeyInput.value = openAIApiKey;
      }
      console.log("API Key loaded.");

      // If cache was empty but we have a key, prompt user
      if (allAssistants.length === 0) {
        updateStatus(
          "No assistants cached. Please 'Edit List' to load them.",
          true
        );
        populateAssistantDropdown(); // Populate with empty state
        editAssistantsLink.style.display = "block"; // Ensure edit link is visible
      }
      showMainView();
    } else {
      // Handle no API key
      console.log("API Key not found.");
      updateStatus("Please save your OpenAI API Key in Settings.");
      assistantSelectLabel.style.display = "none";
      assistantSelect.style.display = "none";
      editAssistantsLink.style.display = "none";
      showSettingsView();
    }
  } catch (error) {
    // Handle storage error
    console.error("Error loading data from storage:", error);
    // Add type check for error
    let errorMsg = "Error loading settings.";
    if (error instanceof Error) {
      errorMsg = `Error loading settings: ${error.message}`;
    }
    updateStatus(errorMsg, true);
    assistantSelectLabel.style.display = "none";
    assistantSelect.style.display = "none";
    editAssistantsLink.style.display = "none";
    allAssistants = [];
    visibleAssistantIds = [];
    populateAssistantDropdown();
    showSettingsView();
  }

  // Ensure reply sections are hidden on load and button is in generate state
  hideGeneratedReply();
  setMainActionButtonState("generate");

  setupEventListeners();
}

// --- OpenAI Assistant Fetching & Population ---

/** Populates the main assistant dropdown based on the visibleAssistantIds filter */
function populateAssistantDropdown() {
  assistantSelect.innerHTML = "";
  let displayedCount = 0;

  const idsToShow =
    visibleAssistantIds.length > 0
      ? visibleAssistantIds
      : allAssistants.map((a) => a.id);

  allAssistants.forEach((assistant) => {
    if (idsToShow.includes(assistant.id)) {
      const option = document.createElement("option");
      option.value = assistant.id;
      option.textContent =
        assistant.name || `Assistant (${assistant.id.substring(0, 6)}...)`;
      assistantSelect.appendChild(option);
      displayedCount++;
    }
  });

  if (displayedCount === 0) {
    if (allAssistants.length > 0) {
      assistantSelect.innerHTML =
        '<option value="">No assistants match filter</option>';
    } else {
      assistantSelect.innerHTML =
        '<option value="">No assistants available</option>';
    }
    assistantSelect.disabled = true;
    editAssistantsLink.style.display = openAIApiKey ? "block" : "none";
  } else {
    assistantSelect.disabled = false;
    editAssistantsLink.style.display = "block";
  }
}

/** Fetches the full list of assistants and stores it */
async function fetchAssistants() {
  if (!openAIApiKey) {
    // Update status or alert if trying to fetch without key?
    console.warn("Attempted to fetch assistants without API Key.");
    throw new Error("API Key not set."); // Throw error to be caught by caller
  }

  console.log("Fetching OpenAI Assistants...");
  allAssistants = []; // Clear previous list before fetching

  let hasMore = true;
  let afterId: string | undefined = undefined;

  try {
    // Pagination loop
    while (hasMore) {
      let endpoint = "/assistants?limit=100";
      if (afterId) {
        endpoint += `&after=${afterId}`;
      }
      console.log(`Fetching assistants page: ${endpoint}`);

      const response = await fetchOpenAI<OpenAPIAssistantListResponse>(
        endpoint,
        openAIApiKey,
        { method: "GET" }
      );

      if (response.data && response.data.length > 0) {
        allAssistants = allAssistants.concat(response.data);
      }
      hasMore = response.has_more ?? false;
      afterId = response.last_id;
      if (!hasMore || !afterId) {
        hasMore = false;
      }
      if (hasMore) await sleep(200);
    }

    console.log(`Fetched a total of ${allAssistants.length} assistants.`);

    // Save to cache
    await chrome.storage.local.set({ [CACHED_ASSISTANTS_KEY]: allAssistants });
    console.log("Saved fetched assistants to cache.");

    // If filter is empty after fetch (first time?), default to all visible
    if (visibleAssistantIds.length === 0 && allAssistants.length > 0) {
      visibleAssistantIds = allAssistants.map((a) => a.id);
      await chrome.storage.local.set({
        [VISIBLE_ASSISTANTS_STORAGE_KEY]: visibleAssistantIds,
      });
      console.log("Defaulting filter to show all assistants after fetch.");
    }

    // Fetch is complete, caller (showAssistantEditView) will handle populating the edit list
  } catch (error) {
    console.error("Error during assistant fetch loop:", error);
    let errorMessage = "Error fetching assistants.";
    if (error instanceof Error) {
      errorMessage = `Error fetching assistants: ${error.message}`;
    }
    allAssistants = []; // Clear local state on error
    // Rethrow the error so the calling function (showAssistantEditView) can handle UI state
    throw new Error(errorMessage);
  }
}

/** Populates the checkbox list in the assistant edit view, optionally filtering by search term */
function populateAssistantEditList(searchTerm: string = "") {
  assistantListContainer.innerHTML = ""; // Clear previous content
  const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();

  const assistantsToDisplay = allAssistants.filter((assistant) => {
    const name = (assistant.name || "").toLowerCase();
    const id = assistant.id.toLowerCase();
    return (
      name.includes(lowerCaseSearchTerm) || id.includes(lowerCaseSearchTerm)
    );
  });

  if (assistantsToDisplay.length === 0) {
    assistantListContainer.innerHTML =
      "<p>No assistants found matching your search.</p>";
    return;
  }

  // Use visibleAssistantIds for initial check state
  const visibleSet = new Set(visibleAssistantIds);

  assistantsToDisplay.forEach((assistant) => {
    const div = document.createElement("div");
    div.className = "assistant-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `edit-${assistant.id}`;
    checkbox.value = assistant.id;
    // Maintain checked status based on the overall visibleAssistantIds, not just the filtered view
    checkbox.checked = visibleSet.has(assistant.id);

    const label = document.createElement("label");
    label.htmlFor = checkbox.id;
    label.textContent =
      assistant.name || `Assistant (${assistant.id.substring(0, 6)}...)`;

    div.appendChild(checkbox);
    div.appendChild(label);
    assistantListContainer.appendChild(div);
  });
}

// --- Assistant Filter Handlers ---
function handleSelectAllAssistants(selectAll: boolean) {
  // Only affect visible checkboxes based on the current search term
  const checkboxes = assistantListContainer.querySelectorAll<HTMLInputElement>(
    '.assistant-item input[type="checkbox"]'
  );
  checkboxes.forEach((cb) => {
    cb.checked = selectAll;
  });
}

async function saveAssistantFilter() {
  // Important: Read the current overall state before applying changes from the potentially filtered view.
  const currentVisibleSet = new Set(visibleAssistantIds);
  const visibleCheckboxes =
    assistantListContainer.querySelectorAll<HTMLInputElement>(
      '.assistant-item input[type="checkbox"]'
    );

  // Update the set based ONLY on the assistants currently visible in the list
  visibleCheckboxes.forEach((cb) => {
    if (cb.checked) {
      currentVisibleSet.add(cb.value);
    } else {
      currentVisibleSet.delete(cb.value);
    }
  });

  visibleAssistantIds = Array.from(currentVisibleSet); // Update state from the modified set

  try {
    await chrome.storage.local.set({
      [VISIBLE_ASSISTANTS_STORAGE_KEY]: visibleAssistantIds,
    });
    console.log("Saved visible assistant filter:", visibleAssistantIds);
    // Re-populate the main dropdown with the new filter applied
    populateAssistantDropdown();
    showMainView(); // Go back to main view
    updateStatus("Assistant list filter saved.");
  } catch (error) {
    console.error("Error saving assistant filter:", error);
    alert("Could not save assistant filter."); // Simple error feedback
  }
}

function cancelAssistantFilter() {
  // Don't save changes, just go back
  showMainView();
}

// --- Instruction Management ---
function populateInstructionDropdown() {
  instructionSelect.innerHTML =
    '<option value="">No Instruction Selected</option>';
  savedInstructions.forEach((instruction) => {
    const option = document.createElement("option");
    option.value = instruction;
    option.textContent = instruction;
    instructionSelect.appendChild(option);
  });
  instructionSelect.disabled = savedInstructions.length === 0;
}

function populateInstructionEditList() {
  instructionListContainer.innerHTML = "";
  if (savedInstructions.length === 0) {
    instructionListContainer.innerHTML = "<p>No instructions saved yet.</p>";
    return;
  }
  savedInstructions.forEach((instruction, index) => {
    const div = document.createElement("div");
    div.className = "instruction-item";

    const span = document.createElement("span");
    span.textContent = instruction;

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-instruction-btn";
    deleteBtn.innerHTML = "&times;";
    deleteBtn.title = "Delete instruction";
    deleteBtn.addEventListener("click", () => deleteInstruction(index));

    div.appendChild(span);
    div.appendChild(deleteBtn);
    instructionListContainer.appendChild(div);
  });
}

async function addInstruction() {
  const newInstruction = newInstructionInput.value.trim();
  if (newInstruction && !savedInstructions.includes(newInstruction)) {
    savedInstructions.push(newInstruction);
    await saveInstructionsToStorage();
    populateInstructionEditList();
    populateInstructionDropdown();
    newInstructionInput.value = "";
  } else if (!newInstruction) {
    alert("Instruction cannot be empty.");
  } else {
    alert("Instruction already exists.");
  }
  newInstructionInput.focus();
}

async function deleteInstruction(indexToDelete: number) {
  if (indexToDelete >= 0 && indexToDelete < savedInstructions.length) {
    savedInstructions.splice(indexToDelete, 1);
    await saveInstructionsToStorage();
    populateInstructionEditList();
    populateInstructionDropdown();
  }
}

async function saveInstructionsToStorage() {
  try {
    await chrome.storage.local.set({
      [SAVED_INSTRUCTIONS_KEY]: savedInstructions,
    });
    console.log("Instructions saved to storage.");
  } catch (error) {
    console.error("Error saving instructions:", error);
    alert("Failed to save instructions.");
  }
}

// --- Event Listeners ---
function setupEventListeners() {
  // Main View Listeners
  refreshContextLink.addEventListener("click", handleGetEmailContent);
  mainActionBtn.addEventListener("click", handleMainActionClick);
  aiSelectBtn.addEventListener("click", handleAiSelectAssistant);
  editAssistantsLink.addEventListener("click", showAssistantEditView);
  editInstructionsLink.addEventListener("click", showInstructionEditView);
  regenerateLinkBtn.addEventListener("click", handleRegenerateLinkClick);
  regenInstructionsInput.addEventListener("input", handleRegenInstructionInput);
  // Reset reply if assistant/instruction changed after generation
  assistantSelect.addEventListener("change", () => {
    if (currentReply !== null) {
      // Check if a reply exists
      console.log("Assistant changed after reply generated, resetting state.");
      resetReplyState();
    }
  });
  instructionSelect.addEventListener("change", () => {
    if (currentReply !== null) {
      // Check if a reply exists
      console.log(
        "Instruction changed after reply generated, resetting state."
      );
      resetReplyState();
    }
  });

  // Top Bar Listener
  settingsBtn.addEventListener("click", showSettingsView);

  // Settings View Listeners
  saveKeyBtn.addEventListener("click", handleSaveApiKey);
  backBtn.addEventListener("click", showMainView);

  // Assistant Edit View Listeners
  assistantSearchInput.addEventListener("input", (e) => {
    const searchTerm = (e.target as HTMLInputElement).value;
    populateAssistantEditList(searchTerm);
  });
  selectAllBtn.addEventListener("click", () => handleSelectAllAssistants(true));
  deselectAllBtn.addEventListener("click", () =>
    handleSelectAllAssistants(false)
  );
  saveAssistantFilterBtn.addEventListener("click", saveAssistantFilter);
  cancelAssistantFilterBtn.addEventListener("click", cancelAssistantFilter);

  // Instruction Edit View Listeners
  addInstructionBtn.addEventListener("click", addInstruction);
  saveInstructionsBtn.addEventListener("click", showMainView);
  newInstructionInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      addInstruction();
    }
  });

  // Listen for proactive updates AND quick reply flow trigger
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === "updateEmailContent") {
      console.log("Received proactive email content update:", message);
      if (message.content) {
        currentEmailContent = message.content;
        if (emailContentPre) emailContentPre!.textContent = currentEmailContent; // Update display
        updateStatus("Email content updated automatically.");
        // **** RESET REPLY STATE ****
        resetReplyState();
        // **************************
      } else {
        // Handle potential error reported by content script
        updateStatus(
          `Error auto-updating content: ${message.error || "Unknown error"}`,
          true
        );
        if (emailContentPre)
          emailContentPre!.textContent = `Error auto-updating content: ${
            message.error || "Unknown error"
          }`;
        currentEmailContent = null;
      }
      sendResponse({ success: true });
      return false;
    }

    if (message.action === "execute-quick-reply-flow") {
      console.log("Received quick reply flow trigger:", message);
      if (message.error) {
        console.error(
          "Error reported by content script during quick reply start:",
          message.error
        );
        alert(`Quick Reply Error: ${message.error}`);
        showSpinner(false); // Ensure spinner is off
        sendResponse({ success: false, error: message.error });
        return false;
      }

      if (!message.emailContent) {
        console.error(
          "Quick reply flow started but no email content received."
        );
        alert("Quick Reply Error: Could not retrieve email content.");
        showSpinner(false); // Ensure spinner is off
        sendResponse({ success: false, error: "Missing email content" });
        return false;
      }

      currentEmailContent = message.emailContent;
      if (emailContentPre) emailContentPre!.textContent = currentEmailContent;

      // Reset thread ID before starting quick reply sequence
      currentThreadId = null;
      (async () => {
        try {
          console.log("Quick Reply: Starting AI Select...");
          await handleAiSelectAssistant(); // Wait for AI select to finish
          // Check if an assistant was actually selected
          if (!assistantSelect.value) {
            throw new Error("AI Select did not choose an assistant.");
          }

          console.log("Quick Reply: Starting Generate Reply...");
          // Generate reply (initial generation, not regeneration)
          await handleGenerateReply(false);

          // Check if a reply was actually generated
          if (!currentReply) {
            throw new Error("Reply generation failed or produced no output.");
          }

          console.log("Quick Reply: Starting Insert Reply...");
          await handleInsertReply(); // Insert the generated reply

          console.log("Quick Reply flow completed.");
        } catch (error) {
          console.error("Error during Quick Reply sequence:", error);
          // Alert is handled within the specific functions, just log here
          showSpinner(false); // Ensure spinner is off on error
        } finally {
          // Spinner is turned off within handleAiSelectAssistant/handleGenerateReply
          // No need to turn off again unless error happens before they run
        }
      })();

      sendResponse({ success: true, message: "Quick reply flow initiated" });
      return false;
    }

    // Default for unhandled messages
    return false;
  });
}

// --- Action Handlers ---
async function handleGetEmailContent() {
  updateStatus("Requesting email content from content script...");
  if (emailContentPre) emailContentPre!.textContent = ""; // Clear previous content visually
  currentEmailContent = null; // Clear state

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab && tab.id) {
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "getEmailContent",
      });
      if (response && response.content) {
        currentEmailContent = response.content;
        if (emailContentPre) emailContentPre!.textContent = currentEmailContent; // Update display
        updateStatus("Email content received.");
        // **** RESET REPLY STATE ****
        resetReplyState();
        // **************************
      } else {
        updateStatus("Failed to get email content from content script.", true);
        console.error("No response or content from content script", response);
      }
    } else {
      updateStatus("Could not find active Gmail tab.", true);
    }
  } catch (error) {
    updateStatus("Error communicating with content script.", true);
    console.error("Error sending message to content script:", error);
  }
}

// --- V2 ASSISTANTS API FLOW ---
async function handleGenerateReply(isRegeneration: boolean = false) {
  const selectedAssistantId = assistantSelect.value;
  const selectedInstruction = instructionSelect.value;
  const instructions = regenInstructionsInput.value.trim();

  if (!isRegeneration && !currentEmailContent) {
    updateStatus("Please get the email content first.", true);
    alert("Please get the email content first.");
    return;
  }
  if (!openAIApiKey) {
    updateStatus("OpenAI API Key is not set. Please save it first.", true);
    alert("OpenAI API Key is not set. Please save it first.");
    return;
  }
  if (!selectedAssistantId) {
    updateStatus("Please select an assistant first.", true);
    alert("Please select an assistant first.");
    return;
  }
  if (isRegeneration && !currentThreadId) {
    updateStatus("Cannot regenerate, original thread ID not found.", true);
    alert(
      "Cannot regenerate, original thread ID not found. Please generate a reply first."
    );
    return;
  }

  updateStatus("Generating reply...", false);
  setMainActionButtonState(isRegeneration ? "regenerate" : "generate", true);
  mainActionBtn.classList.add("loading");
  showSpinner(true);
  replyOutputTextarea.value = "";
  currentReply = null;

  let threadIdToUse = currentThreadId;

  try {
    if (isRegeneration) {
      if (!threadIdToUse)
        throw new Error("Cannot regenerate without thread ID.");
      console.log("Using existing thread for regeneration:", threadIdToUse);
      const userMessage = instructions
        ? `Regenerate the previous reply with the following instructions: ${instructions}`
        : "Please regenerate the previous reply.";
      await fetchOpenAI(`/threads/${threadIdToUse}/messages`, openAIApiKey!, {
        method: "POST",
        body: JSON.stringify({ role: "user", content: userMessage }),
      });
      console.log("Added regeneration instruction message.");
    } else {
      const thread = await fetchOpenAI<{ id: string }>(
        "/threads",
        openAIApiKey!,
        { method: "POST" }
      );
      threadIdToUse = thread.id;
      currentThreadId = threadIdToUse;
      console.log("Created new thread:", threadIdToUse);
      await fetchOpenAI(`/threads/${threadIdToUse}/messages`, openAIApiKey!, {
        method: "POST",
        body: JSON.stringify({ role: "user", content: currentEmailContent }),
      });
      console.log("Added original email content message.");
    }

    if (selectedInstruction) {
      console.log("Adding selected instruction message:", selectedInstruction);
      await fetchOpenAI(`/threads/${threadIdToUse}/messages`, openAIApiKey!, {
        method: "POST",
        body: JSON.stringify({
          role: "user",
          content: `Apply the following instruction: ${selectedInstruction}`,
        }),
      });
    }

    console.log("Starting assistant run...");
    let runBody: { assistant_id: string } = {
      assistant_id: selectedAssistantId,
    };
    const run = await fetchOpenAI<OpenAPIRun>(
      `/threads/${threadIdToUse}/runs`,
      openAIApiKey!,
      {
        method: "POST",
        body: JSON.stringify(runBody),
      }
    );
    const runId = run.id;
    console.log("Created run:", runId);

    let runStatus: OpenAPIRun;
    let attempts = 0;
    const maxAttempts = 20;
    do {
      await sleep(1500);
      runStatus = await fetchOpenAI<OpenAPIRun>(
        `/threads/${threadIdToUse}/runs/${runId}`,
        openAIApiKey!,
        { method: "GET" }
      );
      console.log("Run status:", runStatus.status);
      updateStatus(`Waiting... (${runStatus.status})`, false);
      attempts++;
    } while (
      (runStatus.status === "queued" || runStatus.status === "in_progress") &&
      attempts < maxAttempts
    );

    if (runStatus.status !== "completed") {
      throw new Error(
        `Run failed or timed out. Final status: ${runStatus.status}`
      );
    }

    const messagesResponse = await fetchOpenAI<OpenAPIMessageListResponse>(
      `/threads/${threadIdToUse}/messages?order=asc`,
      openAIApiKey!,
      { method: "GET" }
    );
    console.log("Messages received:", messagesResponse);

    const assistantMessages = messagesResponse.data.filter(
      (msg) => msg.role === "assistant"
    );
    const latestAssistantMessage =
      assistantMessages[assistantMessages.length - 1];

    if (
      latestAssistantMessage &&
      latestAssistantMessage.content[0]?.type === "text"
    ) {
      currentReply = latestAssistantMessage.content[0].text.value;
      replyOutputTextarea.value = currentReply;
      showGeneratedReply();
      setMainActionButtonState("insert");
      regenerationControls.style.display = "none";
      regenInstructionsInput.value = "";
      updateStatus(isRegeneration ? "Reply regenerated." : "Reply generated.");
    } else {
      throw new Error(
        "Could not find a valid assistant text reply in the thread messages."
      );
    }
  } catch (error) {
    console.error("OpenAI API call failed:", error);
    let errorMessage = "Error generating reply.";
    if (error instanceof Error) {
      errorMessage = `Error generating reply: ${error.message}`;
    }
    alert(errorMessage);
    updateStatus(errorMessage, true);
    currentReply = null;
    replyOutputTextarea.value = errorMessage;
    setMainActionButtonState(isRegeneration ? "regenerate" : "generate");
  } finally {
    mainActionBtn.classList.remove("loading");
    showSpinner(false);
  }
}

function handleRegenerateLinkClick() {
  if (regenerationControls) {
    regenerationControls.style.display = "flex";
    regenInstructionsInput.focus();
    if (!regenInstructionsInput.value) {
      setMainActionButtonState("regenerate");
    }
  }
}

function handleRegenInstructionInput() {
  setMainActionButtonState("regenerate");
}

async function handleInsertReply() {
  currentReply = replyOutputTextarea.value.trim();
  if (!currentReply) {
    alert("There is no reply text to insert.");
    return;
  }

  setMainActionButtonState("insert", true);

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab && tab.id) {
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "insertReply",
        replyText: currentReply,
      });

      console.log("Response from content script (insertReply):", response);

      if (response?.success === true) {
        console.log("Reply successfully inserted by content script.");
        if (mainActionBtnSpan) mainActionBtnSpan.textContent = "Inserted!";
        setTimeout(() => {
          if (currentActionButtonState === "insert") {
            setMainActionButtonState("insert");
          }
        }, 1500);
      } else {
        const errorMsg = response?.error || "Unknown error inserting reply.";
        console.warn(
          "Insert successful confirmation not received or error reported:",
          errorMsg,
          "Response:",
          response
        );
        if (response?.success === false) {
          alert(`Failed to insert reply: ${errorMsg}`);
        }
        setMainActionButtonState("insert");
      }
    } else {
      alert("Could not find active Gmail tab to insert reply.");
      setMainActionButtonState("insert");
    }
  } catch (error) {
    console.error("Error sending insert message to content script:", error);
    let errorMsg = "Error communicating with content script for insertion.";
    if (error instanceof Error) {
      errorMsg += ` ${error.message}`;
    }
    alert(errorMsg);
    setMainActionButtonState("insert");
  }
}

async function handleSaveApiKey() {
  const key = apiKeyInput.value.trim();
  if (key) {
    try {
      await chrome.storage.local.set({ openai_api_key: key });
      openAIApiKey = key;
      console.log("API Key saved.");
      await fetchAssistants();
      showMainView();
      updateStatus("API Key saved successfully.");
    } catch (error) {
      console.error("Error saving API key:", error);
      let errorMessage = "An unknown error occurred while saving the API key.";
      if (error instanceof Error) {
        errorMessage = `Error saving API key: ${error.message}`;
        console.error("Specific save error:", error.message);
      }
      alert(`Error saving API Key: ${errorMessage}`);
    }
  } else {
    alert("API Key cannot be empty.");
  }
}

async function handleAiSelectAssistant() {
  if (!openAIApiKey) {
    alert("Please set your OpenAI API Key in Settings first.");
    return;
  }
  if (!currentEmailContent) {
    alert("Please get the email content first (use Refresh).");
    return;
  }
  if (allAssistants.length === 0) {
    alert("No assistants loaded. Please use 'Edit List' first.");
    return;
  }

  showSpinner(true);
  updateStatus("Asking AI for recommendation...", false);

  const visibleOptions = Array.from(assistantSelect.options)
    .filter((opt) => opt.value)
    .map((opt) => ({ id: opt.value, name: opt.textContent || opt.value }));

  if (visibleOptions.length === 0) {
    alert("No assistants available in the dropdown to choose from.");
    showSpinner(false);
    return;
  }

  const assistantListText = visibleOptions
    .map((a) => `- ID: ${a.id}, Name: ${a.name}`)
    .join("\n");

  const prompt = `Given the following email thread content and a list of available OpenAI Assistants, please recommend the single most suitable assistant ID for generating a helpful reply.

Email Thread Content:
---
${currentEmailContent}
---

Available Assistants:
---
${assistantListText}
---

Based on the email content and the likely purpose of each assistant (inferred from name/ID), which assistant ID is the best fit? Please return ONLY the ID of the recommended assistant and nothing else.`;

  console.log("Sending prompt to GPT-4o-mini for recommendation...");

  try {
    const response = await fetchOpenAI<{
      choices: { message: { content: string } }[];
    }>("/chat/completions", openAIApiKey, {
      method: "POST",
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 50,
      }),
      headers: { "OpenAI-Beta": "" },
    });

    if (
      response.choices &&
      response.choices.length > 0 &&
      response.choices[0].message?.content
    ) {
      const recommendedId = response.choices[0].message.content.trim();
      console.log("AI recommended assistant ID:", recommendedId);

      const isValidRecommendation = visibleOptions.some(
        (opt) => opt.id === recommendedId
      );

      if (isValidRecommendation) {
        assistantSelect.value = recommendedId;
        updateStatus("AI recommended assistant selected.");
      } else {
        console.error(
          "AI returned an invalid or non-visible assistant ID:",
          recommendedId
        );
        alert(
          "AI recommended an assistant that is not currently in your visible list."
        );
        updateStatus("AI recommendation was not in the visible list.", true);
      }
    } else {
      throw new Error("Invalid response structure from AI recommendation.");
    }
  } catch (error) {
    console.error("Error getting AI assistant recommendation:", error);
    let errorMsg = "Could not get AI recommendation.";
    if (error instanceof Error) {
      errorMsg = `Error getting AI recommendation: ${error.message}`;
    }
    alert(errorMsg);
    updateStatus(errorMsg, true);
  } finally {
    showSpinner(false);
  }
}

function handleMainActionClick() {
  switch (currentActionButtonState) {
    case "generate":
    case "regenerate":
      handleGenerateReply(currentActionButtonState === "regenerate");
      break;
    case "insert":
      handleInsertReply();
      break;
  }
}

// --- Run Initialization ---
initialize();
