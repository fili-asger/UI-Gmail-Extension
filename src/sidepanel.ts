import "./sidepanel.css"; // Import styles

// --- Interfaces for OpenAI API responses ---
interface OpenAIAssistant {
  id: string;
  name: string | null;
  instructions?: string | null; // Add instructions field
  model: string; // Add model field (it's required)
  // Add other fields if needed
}

// Add Model Interfaces
interface OpenAIModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  // Add other potentially useful fields if needed
}

interface OpenAIModelListResponse {
  object: string;
  data: OpenAIModel[];
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
const assistantInstructionEditView = document.getElementById(
  "assistant-instruction-edit-view"
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
const refreshAssistantListBtn = document.getElementById(
  "refresh-assistant-list-btn"
) as HTMLButtonElement;
const createAssistantBtn = document.getElementById(
  "create-assistant-btn"
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

// Assistant Instruction Edit View Elements
const editingAssistantNameSpan = document.getElementById(
  "editing-assistant-name"
) as HTMLSpanElement;
const assistantModelSelect = document.getElementById(
  "assistant-model-select"
) as HTMLSelectElement;
const assistantInstructionsTextarea = document.getElementById(
  "assistant-instructions-textarea"
) as HTMLTextAreaElement;
const saveAssistantInstructionsBtn = document.getElementById(
  "save-assistant-instructions-btn"
) as HTMLButtonElement;
const backToMainFromInstructionsBtn = document.getElementById(
  "back-to-main-from-instructions-btn"
) as HTMLButtonElement;
const instructionEditStatusDiv = document.getElementById(
  "instruction-edit-status"
) as HTMLDivElement;
const assistantNameInput = document.getElementById(
  "assistant-name-input"
) as HTMLInputElement;

// New elements
const editAssistantInstructionsLink = document.getElementById(
  "edit-assistant-instructions-link"
) as HTMLButtonElement;

// Add new element references
const customInstructionInput = document.getElementById(
  "custom-instruction-input"
) as HTMLTextAreaElement;
const toggleCustomInstructionButton = document.getElementById(
  "toggle-custom-instruction"
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
let currentEditingAssistantId: string | null = null;

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

function updateAssistantInstructionEditStatus(
  message: string,
  isError: boolean = false
) {
  if (instructionEditStatusDiv) {
    instructionEditStatusDiv.textContent = message;
    instructionEditStatusDiv.className = `status-message ${
      isError ? "error" : ""
    }`;
  }
  console.log(
    `Assistant Instruction Edit Status (${
      isError ? "ERROR" : "INFO"
    }): ${message}`
  );
}

// --- View Management ---
function showMainView() {
  if (
    mainContentView &&
    settingsView &&
    assistantEditView &&
    instructionEditView &&
    assistantInstructionEditView
  ) {
    settingsView.classList.remove("active-view");
    assistantEditView.classList.remove("active-view");
    instructionEditView.classList.remove("active-view");
    assistantInstructionEditView.classList.remove("active-view");
    mainContentView.classList.add("active-view");
    hideGeneratedReply();
    currentEditingAssistantId = null;
  }
}

function showSettingsView() {
  console.log("[View] showSettingsView() called.");
  if (
    mainContentView &&
    settingsView &&
    assistantEditView &&
    instructionEditView &&
    assistantInstructionEditView &&
    backBtn && // Make sure backBtn exists
    apiKeyInput // Make sure apiKeyInput exists
  ) {
    console.log(
      "[View] SettingsView - Removing active class from other views..."
    );
    mainContentView.classList.remove("active-view");
    assistantEditView.classList.remove("active-view");
    instructionEditView.classList.remove("active-view");
    assistantInstructionEditView.classList.remove("active-view");
    console.log(
      "[View] SettingsView - Adding active class to settings view..."
    );
    settingsView.classList.add("active-view");
    hideGeneratedReply();

    // Conditionally show/hide Back button and update input
    if (openAIApiKey) {
      apiKeyInput.value = openAIApiKey;
      console.log("[View] SettingsView - API key exists, showing Back button.");
      backBtn.style.display = ""; // Reset to default (should be visible)
    } else {
      apiKeyInput.value = "";
      console.log("[View] SettingsView - No API key, hiding Back button.");
      backBtn.style.display = "none"; // Hide the Back button
    }
  } else {
    console.error(
      "[View] showSettingsView() - One or more view elements (including backBtn/apiKeyInput) missing!"
    );
  }
}

async function showAssistantEditView() {
  console.log("[View] showAssistantEditView() called."); // Log entry
  if (
    mainContentView &&
    settingsView &&
    assistantEditView &&
    instructionEditView &&
    assistantInstructionEditView
  ) {
    mainContentView.classList.remove("active-view");
    settingsView.classList.remove("active-view");
    instructionEditView.classList.remove("active-view");
    assistantInstructionEditView.classList.remove("active-view");
    assistantEditView.classList.add("active-view");
    hideGeneratedReply();
    assistantSearchInput.value = "";

    // If the list is empty, try fetching from API
    if (allAssistants.length === 0) {
      console.log(
        "[View] showAssistantEditView - Assistant list is empty, attempting to fetch..."
      );
      if (openAIApiKey) {
        // Check if API key exists before fetching
        assistantListContainer.innerHTML =
          "<p>Loading assistants from OpenAI...</p>"; // Show loading message
        showSpinner(true);
        try {
          // Directly call the fetching logic here
          await fetchAllAssistantsFromAPI(openAIApiKey);
          console.log("[View] showAssistantEditView - Fetch completed.");
          // If fetch succeeded, populate the list. If it failed, the catch block will handle status.
          populateAssistantEditList();
        } catch (error) {
          console.error(
            "[View] showAssistantEditView - Error fetching assistants:",
            error
          );
          let errorMsg = "Failed to load assistants from OpenAI.";
          if (error instanceof Error) {
            errorMsg = `Error: ${error.message}`;
          }
          assistantListContainer.innerHTML = `<p class="error-message">${errorMsg}</p>`;
        } finally {
          showSpinner(false);
        }
      } else {
        // Handle case where API key is null (already checked above, but explicit here)
        console.error(
          "[View] showAssistantEditView - Cannot fetch assistants, API Key is null."
        );
        assistantListContainer.innerHTML =
          '<p class="error-message">API Key not set. Cannot load assistants.</p>';
      }
    } else {
      // If assistants are already loaded (from cache/previous fetch), just populate
      console.log(
        "[View] showAssistantEditView - Assistants already loaded, populating list."
      );
      populateAssistantEditList();
    }
  } else {
    console.error(
      "[View] showAssistantEditView() - One or more view elements missing!"
    );
  }
}

function showInstructionEditView() {
  if (
    mainContentView &&
    settingsView &&
    assistantEditView &&
    instructionEditView &&
    assistantInstructionEditView
  ) {
    mainContentView.classList.remove("active-view");
    settingsView.classList.remove("active-view");
    assistantEditView.classList.remove("active-view");
    assistantInstructionEditView.classList.remove("active-view");
    instructionEditView.classList.add("active-view");
    newInstructionInput.value = "";
    populateInstructionEditList();
  }
}

// Modify function signature to accept an optional ID
async function showAssistantInstructionEditView(assistantIdToEdit?: string) {
  // Determine which ID to use: the passed one or the dropdown value
  const selectedAssistantId = assistantIdToEdit || assistantSelect.value;

  if (!selectedAssistantId) {
    // This alert should now only trigger if called from main view with no selection
    alert("Please select an assistant from the dropdown first.");
    return;
  }
  if (!openAIApiKey) {
    alert("API Key not set. Please configure it in Settings.");
    return;
  }

  if (
    mainContentView &&
    settingsView &&
    assistantEditView &&
    instructionEditView &&
    assistantInstructionEditView
  ) {
    mainContentView.classList.remove("active-view");
    settingsView.classList.remove("active-view");
    assistantEditView.classList.remove("active-view");
    instructionEditView.classList.remove("active-view");

    assistantInstructionEditView.classList.add("active-view");
    showSpinner(true);
    updateAssistantInstructionEditStatus(
      "Fetching details and models...",
      false
    );
    assistantInstructionsTextarea.value = "";
    editingAssistantNameSpan.textContent = "Loading...";
    assistantNameInput.value = "";
    assistantModelSelect.innerHTML = ""; // Clear previous models
    assistantModelSelect.disabled = false; // Re-enable in case it was disabled by previous error
    assistantInstructionsTextarea.disabled = false;
    saveAssistantInstructionsBtn.disabled = true; // Disable save until loaded
    currentEditingAssistantId = selectedAssistantId;

    try {
      // Fetch assistant details and available models concurrently
      const [assistant, availableModels] = await Promise.all([
        fetchOpenAI<OpenAIAssistant>(
          `/assistants/${selectedAssistantId}`,
          openAIApiKey,
          { method: "GET" }
        ),
        fetchAvailableModels(openAIApiKey), // Use the new function
      ]);

      console.log("Fetched assistant details:", assistant);
      console.log("Fetched available models:", availableModels);

      // Populate Model Dropdown
      availableModels
        .sort((a, b) => a.id.localeCompare(b.id)) // Sort models alphabetically
        .forEach((model) => {
          const option = document.createElement("option");
          option.value = model.id;
          option.textContent = model.id; // Display model ID
          assistantModelSelect.appendChild(option);
        });

      // Set assistant details
      editingAssistantNameSpan.textContent =
        assistant.name || `ID: ${assistant.id.substring(0, 6)}...`;
      assistantNameInput.value = assistant.name || "";
      assistantInstructionsTextarea.value = assistant.instructions || "";

      // Set the selected model, adding it if it's not in the fetched list
      const currentModelExists = availableModels.some(
        (m) => m.id === assistant.model
      );
      if (!currentModelExists && assistant.model) {
        // Check assistant.model exists
        console.warn(
          `Assistant model '${assistant.model}' is not in the fetched list. Adding it.`
        );
        const option = document.createElement("option");
        option.value = assistant.model;
        option.textContent = `${assistant.model} (Current)`;
        assistantModelSelect.prepend(option); // Add it to the top
      } else if (!assistant.model) {
        console.warn("Assistant does not have a model specified.");
        // Optionally add a placeholder or disable selection
        assistantModelSelect.prepend(
          new Option("No model assigned", "", true, true)
        );
        assistantModelSelect.value = "";
      }

      // Only set value if assistant.model is not null/undefined
      if (assistant.model) {
        assistantModelSelect.value = assistant.model; // Select the current model
      }

      updateAssistantInstructionEditStatus("Details and models loaded.", false);
    } catch (error) {
      console.error("Error fetching assistant details or models:", error);
      let errorMsg = "Failed to load assistant details or models.";
      if (error instanceof Error) {
        errorMsg = `Error: ${error.message}`;
      }
      updateAssistantInstructionEditStatus(errorMsg, true);
      editingAssistantNameSpan.textContent = "Error";
      // Disable fields on error
      assistantModelSelect.innerHTML =
        '<option value="">Error loading models</option>';
      assistantModelSelect.disabled = true;
      assistantInstructionsTextarea.disabled = true;
      saveAssistantInstructionsBtn.disabled = true;
    } finally {
      showSpinner(false);
      // Re-enable save button only if loading was successful
      if (!assistantModelSelect.disabled) {
        saveAssistantInstructionsBtn.disabled = false;
      }
    }
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

/** Fetches the list of available models from OpenAI */
async function fetchAvailableModels(apiKey: string): Promise<OpenAIModel[]> {
  console.log("Fetching available OpenAI models...");
  try {
    const response = await fetchOpenAI<OpenAIModelListResponse>(
      "/models",
      apiKey,
      { method: "GET" }
    );
    // Optionally filter models here if needed (e.g., only show GPT models)
    // For now, return all models
    console.log(`Fetched ${response.data.length} models.`);
    return response.data;
  } catch (error) {
    console.error("Error fetching OpenAI models:", error);
    throw new Error(
      `Failed to fetch models: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
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
  console.log("[Init] Initializing side panel...");
  showSpinner(true);
  try {
    // Check for all essential elements
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
      !saveInstructionsBtn ||
      !assistantInstructionEditView ||
      !editAssistantInstructionsLink ||
      !editingAssistantNameSpan ||
      !assistantInstructionsTextarea ||
      !saveAssistantInstructionsBtn ||
      !backToMainFromInstructionsBtn ||
      !instructionEditStatusDiv ||
      !customInstructionInput ||
      !toggleCustomInstructionButton ||
      !refreshAssistantListBtn ||
      !createAssistantBtn ||
      !assistantNameInput
    ) {
      console.error(
        "One or more essential UI elements not found in sidepanel.html"
      );
      document.body.innerHTML =
        "Error: Side panel UI elements missing or structure incorrect.";
      return; // Stop initialization if elements are missing
    }

    // Load data from storage
    const storageData = await chrome.storage.local.get([
      "openai_api_key",
      VISIBLE_ASSISTANTS_STORAGE_KEY,
      CACHED_ASSISTANTS_KEY,
      SAVED_INSTRUCTIONS_KEY,
    ]);

    // Load Saved Instructions
    if (
      storageData[SAVED_INSTRUCTIONS_KEY] &&
      Array.isArray(storageData[SAVED_INSTRUCTIONS_KEY])
    ) {
      savedInstructions = storageData[SAVED_INSTRUCTIONS_KEY];
    } else {
      // Initialize if not present
      await chrome.storage.local.set({
        [SAVED_INSTRUCTIONS_KEY]: savedInstructions,
      });
    }
    console.log("Loaded instructions:", savedInstructions);
    populateInstructionDropdown();

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
      populateAssistantDropdown();
    } else {
      allAssistants = [];
      console.log("Assistant cache is empty.");
    }

    // Load API Key
    if (storageData.openai_api_key) {
      openAIApiKey = storageData.openai_api_key;
      console.log("[Init] API Key FOUND in storage.");
      if (openAIApiKey !== null) {
        apiKeyInput.value = openAIApiKey;
      }
      console.log("API Key loaded.");

      // **** Ensure Assistant elements are visible ****
      console.log("[Init] Ensuring assistant elements are visible.");
      assistantSelectLabel.style.display = ""; // Reset to default display
      assistantSelect.style.display = ""; // Reset to default display
      editAssistantsLink.style.display = ""; // Reset to default display (usually block/inline-block)
      aiSelectBtn.style.display = ""; // Also ensure AI select button is visible

      if (allAssistants.length === 0) {
        updateStatus(
          "No assistants cached. Please 'Edit List' to load them.",
          true
        );
        populateAssistantDropdown(); // Populate with empty state
        // editAssistantsLink visibility handled above
      }
      showMainView();
    } else {
      console.log("[Init] API Key NOT FOUND in storage.");
      updateStatus("Please save your OpenAI API Key in Settings.");
      // Hide Assistant elements if no key
      assistantSelectLabel.style.display = "none";
      assistantSelect.style.display = "none";
      editAssistantsLink.style.display = "none";
      aiSelectBtn.style.display = "none"; // Hide AI select button too
      console.log(
        "[Init] Attempting to call showSettingsView() due to missing key..."
      );
      showSettingsView();
    }

    // Set initial button state based on API key presence
    setMainActionButtonState("generate", !openAIApiKey);
  } catch (error) {
    console.error("[Init] Error during initialization:", error);
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
    setMainActionButtonState("generate", true); // Disable button on error
  } finally {
    // Ensure spinner is hidden when initialization attempt finishes
    showSpinner(false);
    console.log("[Init] Initialization attempt finished.");
  }

  setupEventListeners(); // Setup listeners after initial load attempt
  setupAssistantListActionListener(); // Call the new setup function
  console.log("[Init] Initialization complete.");
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

/** Populates the checkbox list in the assistant edit view, optionally filtering by search term */
function populateAssistantEditList(searchTerm: string = "") {
  console.log(
    "[View] Populating assistant edit list, search:",
    searchTerm || "(none)"
  );
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

  // Use visibleAssistantIds for initial check state when rebuilding the list
  const visibleSet = new Set(visibleAssistantIds);

  assistantsToDisplay.forEach((assistant) => {
    const div = document.createElement("div");
    div.className = "assistant-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `edit-${assistant.id}`;
    checkbox.value = assistant.id;
    checkbox.checked = visibleSet.has(assistant.id); // Set initial state from current visible IDs
    checkbox.dataset.assistantId = assistant.id; // Add ID for consistency if needed elsewhere

    // *** Add event listener to update state immediately on change ***
    checkbox.addEventListener("change", (event) => {
      const target = event.target as HTMLInputElement;
      const assistantId = target.value;
      const isChecked = target.checked;

      // Use a Set for efficient add/delete
      const currentVisibleSet = new Set(visibleAssistantIds);
      if (isChecked) {
        currentVisibleSet.add(assistantId);
        console.log(`[State] Added ${assistantId} to visibleAssistantIds`);
      } else {
        currentVisibleSet.delete(assistantId);
        console.log(`[State] Removed ${assistantId} from visibleAssistantIds`);
      }
      // Update the main state array
      visibleAssistantIds = Array.from(currentVisibleSet);
    });

    const label = document.createElement("label");
    label.htmlFor = checkbox.id;
    label.textContent =
      assistant.name || `Assistant (${assistant.id.substring(0, 6)}...)`;
    label.className = "assistant-label"; // Add class for styling

    // ** Create container for actions **
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "assistant-actions";

    // ** Create Edit Link **
    const editLink = document.createElement("span");
    editLink.textContent = "Edit";
    editLink.className = "edit-link action-link";
    editLink.dataset.assistantId = assistant.id;

    // ** Create Delete Link **
    const deleteLink = document.createElement("span");
    deleteLink.textContent = "Delete";
    deleteLink.className = "delete-link action-link";
    deleteLink.dataset.assistantId = assistant.id;

    actionsDiv.appendChild(editLink);
    actionsDiv.appendChild(deleteLink);

    div.appendChild(checkbox);
    div.appendChild(label);
    div.appendChild(actionsDiv); // Add actions to the item div
    assistantListContainer.appendChild(div);
  });
}

// --- Assistant Filter Handlers ---
function handleSelectAllAssistants(selectAll: boolean) {
  console.log(`handleSelectAllAssistants called with selectAll: ${selectAll}`);
  const visibleCheckboxes =
    assistantListContainer.querySelectorAll<HTMLInputElement>(
      '.assistant-item input[type="checkbox"]'
    );

  // Create a mutable set of the *full* list of currently selected IDs
  const updatedVisibleSet = new Set(visibleAssistantIds);

  // Iterate over only the checkboxes *currently visible* due to filtering
  visibleCheckboxes.forEach((cb) => {
    // Update the visual state of the visible checkbox
    cb.checked = selectAll;

    // Update the full set based on the action for this *visible* checkbox ID
    if (selectAll) {
      updatedVisibleSet.add(cb.value);
    } else {
      updatedVisibleSet.delete(cb.value);
    }
  });

  // Update the global state array immediately to reflect changes applied to visible items
  visibleAssistantIds = Array.from(updatedVisibleSet);
  console.log(
    "Updated visibleAssistantIds after select/deselect all visible:",
    visibleAssistantIds
  );

  // IMPORTANT: Do NOT save to storage here. Only update the intermediate state.
}

// Restore the original saveAssistantFilter logic
async function saveAssistantFilter() {
  console.log("saveAssistantFilter called.");
  // Get the final state of *all* checkboxes rendered in the list at the moment of saving
  // This reflects the user's final decision, including any filtering/searching they did.
  const checkboxesInDOM =
    assistantListContainer.querySelectorAll<HTMLInputElement>(
      'input[type="checkbox"]'
    );

  // Rebuild the list of visible IDs based *only* on the final state of checkboxes in the DOM
  const finalVisibleSet = new Set<string>();
  checkboxesInDOM.forEach((cb) => {
    if (cb.checked) {
      finalVisibleSet.add(cb.value);
    }
  });

  // This logic above is still potentially flawed if the list is filtered heavily.
  // The most robust way is to merge the state.

  // Let's try the merge approach again for save:
  console.log("Recalculating final save state by merging...");
  const finalMergedVisibleSet = new Set(visibleAssistantIds); // Start with state potentially modified by select/deselect all

  // Iterate over *all* assistants known to the application
  allAssistants.forEach((assistant) => {
    const checkbox = assistantListContainer.querySelector<HTMLInputElement>(
      `#edit-${assistant.id}`
    );
    if (checkbox) {
      // If the checkbox is currently rendered in the DOM (i.e., not filtered out)
      // Use the current checked state from the DOM
      if (checkbox.checked) {
        finalMergedVisibleSet.add(assistant.id);
      } else {
        finalMergedVisibleSet.delete(assistant.id);
      }
    }
    // If the checkbox is *not* rendered (filtered out), its state in finalMergedVisibleSet
    // (which was initialized from visibleAssistantIds, potentially modified by select/deselect all)
    // remains unchanged, preserving the selection state of filtered-out items.
  });

  // Update the global state with the final calculated set
  visibleAssistantIds = Array.from(finalMergedVisibleSet);
  console.log("Final visibleAssistantIds to be saved:", visibleAssistantIds);

  try {
    await chrome.storage.local.set({
      [VISIBLE_ASSISTANTS_STORAGE_KEY]: visibleAssistantIds,
    });
    console.log("Saved visible assistant filter to storage.");
    populateAssistantDropdown(); // Update the main dropdown
    showMainView(); // Go back to main view
    updateStatus("Assistant list filter saved.");
  } catch (error) {
    console.error("Error saving assistant filter:", error);
    alert("Could not save assistant filter.");
  }
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
  console.log("[Event] Setting up event listeners...");
  // Main View Listeners
  refreshContextLink.addEventListener("click", handleGetEmailContent);
  mainActionBtn.addEventListener("click", handleMainActionButtonClick);
  aiSelectBtn.addEventListener("click", handleAiSelectAssistant);
  editAssistantsLink.addEventListener("click", showAssistantEditView);
  editInstructionsLink.addEventListener("click", showInstructionEditView);
  editAssistantInstructionsLink.addEventListener(
    "click",
    () => showAssistantInstructionEditView() // Call without ID uses dropdown
  );
  regenerateLinkBtn.addEventListener("click", handleRegenerateLinkClick);
  regenInstructionsInput.addEventListener("input", handleRegenInstructionInput);
  assistantSelect.addEventListener("change", () => {
    if (currentReply !== null) {
      console.log("Assistant changed after reply generated, resetting state.");
      resetReplyState();
    }
  });
  instructionSelect.addEventListener("change", () => {
    if (currentReply !== null) {
      console.log(
        "Instruction changed after reply generated, resetting state."
      );
      resetReplyState();
    }
  });

  // Custom Instruction Toggle
  if (
    toggleCustomInstructionButton &&
    instructionSelect &&
    customInstructionInput
  ) {
    customInstructionInput.placeholder = "Enter custom instruction...";
    toggleCustomInstructionButton.addEventListener("click", () => {
      const isDropdownVisible = instructionSelect.style.display !== "none";
      if (isDropdownVisible) {
        instructionSelect.style.display = "none";
        customInstructionInput.style.display = "block";
        customInstructionInput.focus();
        toggleCustomInstructionButton.textContent = "Select";
      } else {
        instructionSelect.style.display = "";
        customInstructionInput.style.display = "none";
        toggleCustomInstructionButton.textContent = "Custom";
      }
    });
  } else {
    console.error("Custom instruction toggle elements not found!");
  }

  // Top Bar Listener
  settingsBtn.addEventListener("click", () => {
    console.log("[Event] Settings button clicked!");
    showSettingsView();
  });

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
  cancelAssistantFilterBtn.addEventListener("click", showMainView);
  refreshAssistantListBtn.addEventListener("click", handleRefreshAssistantList);
  createAssistantBtn.addEventListener("click", handleCreateAssistant);

  // Instruction Edit View Listeners
  addInstructionBtn.addEventListener("click", addInstruction);
  saveInstructionsBtn.addEventListener("click", showMainView);
  newInstructionInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      addInstruction();
    }
  });

  // Assistant Instruction Edit View Listeners
  saveAssistantInstructionsBtn.addEventListener(
    "click",
    handleSaveAssistantInstructions
  );
  backToMainFromInstructionsBtn.addEventListener("click", showMainView);

  // Chrome Runtime Message Listener
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
      return false; // Indicate sync response
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
          // Pass null for the instruction parameter as quick reply doesn't use UI instructions
          await handleGenerateReply(false, null);

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
      return false; // Indicate sync response (async work started)
    }
    return false; // Default for unhandled messages
  });
  console.log("[Event] Event listeners set up.");
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
async function handleGenerateReply(
  isRegeneration: boolean = false,
  instruction: string | null // Accept instruction as parameter
) {
  const selectedAssistantId = assistantSelect.value;

  const regenerationInstructions = regenInstructionsInput.value.trim();

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
      const userMessage = regenerationInstructions
        ? `Regenerate the previous reply with the following instructions: ${regenerationInstructions}`
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

    if (instruction) {
      console.log("Adding selected/custom instruction message:", instruction);
      await fetchOpenAI(`/threads/${threadIdToUse}/messages`, openAIApiKey!, {
        method: "POST",
        body: JSON.stringify({
          role: "user",
          content: `Apply the following instruction: ${instruction}`,
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
      updateStatus(isRegeneration ? "Reply regenerated." : "Reply generated.");

      // **** Automatically insert the reply ****
      console.log("Generated reply, now attempting automatic insertion...");
      await handleInsertReply();
      // handleInsertReply will handle button state updates on success/failure.
      // The line below might be redundant now or could briefly override handleInsertReply's state changes.
      // Consider removing setMainActionButtonState("insert"); later if needed.
      setMainActionButtonState("insert");

      regenerationControls.style.display = "none"; // Keep this reset
      regenInstructionsInput.value = ""; // Keep this reset
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

async function handleSaveAssistantInstructions() {
  if (!currentEditingAssistantId) {
    alert("Error: No assistant ID found to update.");
    return;
  }
  if (!openAIApiKey) {
    alert("API Key not set.");
    return;
  }

  const newInstructions = assistantInstructionsTextarea.value;
  const selectedModel = assistantModelSelect.value;
  const newName = assistantNameInput.value.trim();

  if (!newName) {
    alert("Error: Assistant name cannot be empty.");
    return;
  }

  if (!selectedModel) {
    alert("Error: Please select a model.");
    return;
  }

  console.log(`Saving changes for assistant ${currentEditingAssistantId}`);
  showSpinner(true);
  saveAssistantInstructionsBtn.disabled = true;
  updateAssistantInstructionEditStatus("Saving changes...", false);

  const payload = {
    name: newName,
    instructions: newInstructions,
    model: selectedModel,
  };

  console.log("Sending update payload:", JSON.stringify(payload, null, 2)); // Log the exact payload

  try {
    const updatedAssistant = await fetchOpenAI<OpenAIAssistant>(
      `/assistants/${currentEditingAssistantId}`,
      openAIApiKey,
      {
        method: "POST",
        body: JSON.stringify(payload), // Send the logged payload
      }
    );

    console.log("Assistant updated successfully:", updatedAssistant);
    updateAssistantInstructionEditStatus("Changes saved successfully!", false);

    const index = allAssistants.findIndex(
      (a) => a.id === currentEditingAssistantId
    );
    if (index !== -1) {
      allAssistants[index].name = newName;
      allAssistants[index].instructions = newInstructions;
      allAssistants[index].model = selectedModel;
      await chrome.storage.local.set({
        [CACHED_ASSISTANTS_KEY]: allAssistants,
      });
      populateAssistantDropdown();
    }

    setTimeout(() => {
      showMainView();
    }, 1500);
  } catch (error) {
    console.error("Error saving assistant changes:", error);
    let errorMsg = "Failed to save changes.";
    if (error instanceof Error) {
      errorMsg = `Error saving changes: ${error.message}`;
    }
    updateAssistantInstructionEditStatus(errorMsg, true);
    saveAssistantInstructionsBtn.disabled = false;
  } finally {
    showSpinner(false);
    if (!instructionEditStatusDiv.classList.contains("error")) {
    } else {
      saveAssistantInstructionsBtn.disabled = false;
    }
  }
}

// --- Action Handlers (including handleSaveApiKey) ---

// Define handleSaveApiKey if it was removed previously, or modify existing
async function handleSaveApiKey() {
  const newApiKey = apiKeyInput.value.trim();
  if (newApiKey) {
    console.log("Attempting to save API Key...");
    showSpinner(true);
    try {
      // Validate key first
      await fetchAvailableModels(newApiKey);
      console.log("API Key validated successfully.");

      // Key is valid, save it
      await chrome.storage.local.set({ openai_api_key: newApiKey });
      openAIApiKey = newApiKey;
      updateStatus("API Key saved and validated successfully.");
      console.log("API Key saved, re-initializing...");

      // Re-run initialization to load data with the new key
      await initialize(); // Wait for initialize to finish loading data (including allAssistants)

      // *** Navigate based on assistant list state ***
      if (allAssistants.length === 0) {
        console.log(
          "[SaveKey] Assistant list empty after init, showing Edit Assistant view."
        );
        showAssistantEditView(); // Go directly to edit list
      } else {
        console.log("[SaveKey] Assistants loaded, showing Main view.");
        // Only switch view if initialize didn't redirect and we are in settings
        if (settingsView && settingsView.classList.contains("active-view")) {
          showMainView();
        }
      }
    } catch (error) {
      console.error("Error saving or validating API Key:", error);
      let errorMsg = "Failed to save API Key.";
      if (error instanceof Error && error.message.includes("401")) {
        errorMsg = "Invalid API Key. Please check and try again.";
      } else if (error instanceof Error) {
        errorMsg = `Failed to save API Key: ${error.message}`;
      }
      updateStatus(errorMsg, true);
      alert(errorMsg);
      showSpinner(false);
    }
    // Spinner is hidden by initialize() or the catch block
  } else {
    // ... existing handling for empty key ...
    updateStatus("API Key cannot be empty.", true);
    alert("API Key cannot be empty.");
    showSpinner(false);
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
        model: "gpt-4o-mini", // Use a capable model
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 50, // Enough for just the ID
      }),
      headers: { "OpenAI-Beta": "" }, // Don't need assistants beta here
    });

    if (
      response.choices &&
      response.choices.length > 0 &&
      response.choices[0].message?.content
    ) {
      const recommendedId = response.choices[0].message.content.trim();
      console.log("AI recommended assistant ID:", recommendedId);

      // Check if the recommended ID exists in the dropdown
      const isValidRecommendation = visibleOptions.some(
        (opt) => opt.id === recommendedId
      );

      if (isValidRecommendation) {
        assistantSelect.value = recommendedId;
        updateStatus("AI recommended assistant selected.");
        resetReplyState(); // Reset reply if assistant changed
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

async function handleMainActionButtonClick() {
  console.log(
    `Main action button clicked. Current state: ${currentActionButtonState}`
  );

  let instructionToSend: string | null = null;
  if (customInstructionInput.style.display !== "none") {
    instructionToSend = customInstructionInput.value.trim();
    console.log("Using custom instruction:", instructionToSend);
  } else {
    instructionToSend = instructionSelect.value;
    console.log("Using selected instruction:", instructionToSend);
  }
  if (!instructionToSend) {
    instructionToSend = null;
  }

  switch (currentActionButtonState) {
    case "generate":
    case "regenerate":
      await handleGenerateReply(
        currentActionButtonState === "regenerate",
        instructionToSend
      );
      break;
    case "insert":
      await handleInsertReply();
      break;
    default:
      console.error(
        "Unknown main action button state:",
        currentActionButtonState
      );
  }
}

// --- Run Initialization --- (Should be called only once)
initialize(); // Ensure this line is uncommented and present

// Ensure fetchAllAssistantsFromAPI exists and handles updating allAssistants array
// (Based on previous edits, this function should be present)
async function fetchAllAssistantsFromAPI(apiKey: string): Promise<void> {
  console.log("[API] Fetching OpenAI Assistants...");
  // Ensure API key is used correctly (passed as argument)
  if (!apiKey) {
    console.error("[API] fetchAllAssistantsFromAPI called without API Key.");
    throw new Error("API Key not provided for fetching assistants.");
  }

  showSpinner(true); // Show spinner during fetch
  allAssistants = []; // Clear previous list before fetching
  let hasMore = true;
  let afterId: string | undefined = undefined;

  try {
    while (hasMore) {
      let endpoint = "/assistants?limit=100";
      if (afterId) {
        endpoint += `&after=${afterId}`;
      }
      console.log(`[API] Fetching assistants page: ${endpoint}`);
      const response = await fetchOpenAI<any>(
        endpoint,
        apiKey, // Use the passed apiKey
        { method: "GET" }
      );

      if (response.data && response.data.length > 0) {
        allAssistants = allAssistants.concat(response.data);
      }
      hasMore = response.has_more ?? false;
      afterId = response.last_id;
      if (!hasMore || !afterId) hasMore = false;
      if (hasMore) await sleep(200);
    }
    console.log(`[API] Fetched a total of ${allAssistants.length} assistants.`);
    await chrome.storage.local.set({ [CACHED_ASSISTANTS_KEY]: allAssistants });
    console.log("[API] Saved fetched assistants to cache.");

    // If filter is still empty (first time?), default to all visible
    if (visibleAssistantIds.length === 0 && allAssistants.length > 0) {
      visibleAssistantIds = allAssistants.map((a) => a.id);
      await chrome.storage.local.set({
        [VISIBLE_ASSISTANTS_STORAGE_KEY]: visibleAssistantIds,
      });
      console.log(
        "[API] Defaulting filter to show all assistants after fetch."
      );
    }
  } catch (error) {
    console.error("[API] Error during assistant fetch loop:", error);
    allAssistants = []; // Clear local state on error
    // Re-throw error to be handled by the caller (showAssistantEditView)
    throw error;
  } finally {
    showSpinner(false); // Hide spinner when fetch attempt ends
  }
}

// *** Add the new handler function ***
async function handleRefreshAssistantList() {
  console.log("[Action] handleRefreshAssistantList called.");
  if (!openAIApiKey) {
    console.error("[Refresh] No API key available.");
    alert("API Key not set. Please configure it in Settings.");
    return;
  }

  showSpinner(true);
  // Provide feedback in the list container itself
  assistantListContainer.innerHTML =
    "<p>Refreshing assistants from OpenAI...</p>";

  try {
    // Fetch the latest list - this updates allAssistants and caches it
    await fetchAllAssistantsFromAPI(openAIApiKey);
    console.log("[Refresh] Fetch completed.");
    // Repopulate the edit list with the fresh data, preserving any current search filter
    populateAssistantEditList(assistantSearchInput.value);
    console.log("[Refresh] List repopulated.");
    updateStatus("Assistant list refreshed.", false); // Provide status feedback
  } catch (error) {
    console.error("[Refresh] Error refreshing assistants:", error);
    let errorMsg = "Failed to refresh assistants from OpenAI.";
    if (error instanceof Error) {
      errorMsg = `Error: ${error.message}`;
    }
    // Display error within the list container
    assistantListContainer.innerHTML = `<p class="error-message">${errorMsg}</p>`;
    updateStatus("Error refreshing assistant list.", true); // Provide status feedback
  } finally {
    showSpinner(false);
  }
}

// *** Add handler for creating a new assistant ***
async function handleCreateAssistant() {
  console.log("[Action] handleCreateAssistant called.");
  if (!openAIApiKey) {
    console.error("[Create Assistant] No API key available.");
    alert("API Key not set. Please configure it in Settings.");
    return;
  }

  const assistantName = window.prompt("Enter a name for the new assistant:");
  if (!assistantName || assistantName.trim() === "") {
    console.log("[Create Assistant] User cancelled or provided empty name.");
    return;
  }

  showSpinner(true);
  updateStatus("Creating new assistant...", false);

  const payload = {
    name: assistantName.trim(),
    model: "o3-mini", // Default model set to o3-mini as requested
    // instructions: "", // Optionally add default instructions later
    // tools: [], // Optionally add default tools later
  };

  console.log("[Create Assistant] Sending payload:", payload);

  try {
    const newAssistant = await fetchOpenAI<OpenAIAssistant>(
      `/assistants`,
      openAIApiKey,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    console.log(
      "[Create Assistant] Assistant created successfully:",
      newAssistant
    );

    // Add the new assistant to the global list and cache
    allAssistants.unshift(newAssistant); // Add to the beginning for visibility
    await chrome.storage.local.set({ [CACHED_ASSISTANTS_KEY]: allAssistants });
    console.log("[Create Assistant] Updated local cache.");

    // Also add the new assistant's ID to the visible list by default
    if (!visibleAssistantIds.includes(newAssistant.id)) {
      visibleAssistantIds.unshift(newAssistant.id);
      await chrome.storage.local.set({
        [VISIBLE_ASSISTANTS_STORAGE_KEY]: visibleAssistantIds,
      });
      console.log("[Create Assistant] Added new assistant to visible list.");
    }

    // Refresh the edit list to show the new assistant
    populateAssistantEditList(assistantSearchInput.value);
    updateStatus(`Assistant "${assistantName}" created successfully.`, false);
  } catch (error) {
    console.error("[Create Assistant] Error creating assistant:", error);
    let errorMsg = "Failed to create assistant.";
    if (error instanceof Error) {
      errorMsg = `Error: ${error.message}`;
    }
    updateStatus(errorMsg, true);
    alert(`Failed to create assistant: ${errorMsg}`); // Also show alert
  } finally {
    showSpinner(false);
  }
}

// ** Add delegated event listener setup **
function setupAssistantListActionListener() {
  assistantListContainer.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const assistantId = target.dataset.assistantId;

    if (!assistantId) return; // Clicked somewhere else

    if (target.classList.contains("edit-link")) {
      handleEditAssistantClick(assistantId);
    } else if (target.classList.contains("delete-link")) {
      handleDeleteAssistantClick(assistantId);
    }
  });
}

// ** Handler for clicking the Edit link on an assistant **
async function handleEditAssistantClick(assistantId: string) {
  console.log(`[Action] Edit clicked for assistant: ${assistantId}`);

  // Find the assistant to ensure it exists (optional, but good practice)
  const assistantExists = allAssistants.some((a) => a.id === assistantId);
  if (!assistantExists) {
    console.error(
      `[Edit Assistant] Assistant with ID ${assistantId} not found in local list.`
    );
    alert("Could not find the selected assistant to edit.");
    return;
  }

  // Navigate to the assistant instruction edit view, passing the ID directly
  await showAssistantInstructionEditView(assistantId);
}

// ** Handler for clicking the Delete link on an assistant **
async function handleDeleteAssistantClick(assistantId: string) {
  console.log(`[Action] Delete clicked for assistant: ${assistantId}`);

  if (!openAIApiKey) {
    alert("API Key not set. Cannot delete assistant.");
    return;
  }

  const assistant = allAssistants.find((a) => a.id === assistantId);
  const assistantName =
    assistant?.name || `ID: ${assistantId.substring(0, 6)}...`;

  // Confirm deletion
  const confirmed = window.confirm(
    `Are you sure you want to delete the assistant "${assistantName}"? This cannot be undone.`
  );
  if (!confirmed) {
    console.log("[Delete Assistant] User cancelled deletion.");
    return;
  }

  showSpinner(true);
  updateStatus(`Deleting assistant "${assistantName}"...`, false);

  try {
    // Call OpenAI API to delete
    const response = await fetchOpenAI<any>( // Use generic type or specific if available
      `/assistants/${assistantId}`,
      openAIApiKey,
      { method: "DELETE" }
    );

    console.log("[Delete Assistant] API Response:", response);
    // OpenAI delete endpoint returns { deleted: true, id: ..., object: 'assistant.deleted' } on success
    if (!response || !response.deleted) {
      throw new Error("API did not confirm deletion.");
    }

    console.log(
      `[Delete Assistant] Assistant ${assistantId} deleted successfully via API.`
    );

    // Remove from local state
    allAssistants = allAssistants.filter((a) => a.id !== assistantId);
    visibleAssistantIds = visibleAssistantIds.filter(
      (id) => id !== assistantId
    );

    // Update storage
    await chrome.storage.local.set({
      [CACHED_ASSISTANTS_KEY]: allAssistants,
      [VISIBLE_ASSISTANTS_STORAGE_KEY]: visibleAssistantIds,
    });
    console.log("[Delete Assistant] Updated local cache and visible IDs.");

    // Refresh the list view and the main dropdown
    populateAssistantEditList(assistantSearchInput.value);
    populateAssistantDropdown();
    updateStatus(`Assistant "${assistantName}" deleted successfully.`, false);
  } catch (error) {
    console.error("[Delete Assistant] Error deleting assistant:", error);
    let errorMsg = `Failed to delete assistant "${assistantName}".`;
    if (error instanceof Error) {
      errorMsg = `Error: ${error.message}`;
    }
    updateStatus(errorMsg, true);
    alert(errorMsg); // Show alert on error
  } finally {
    showSpinner(false);
  }
}
