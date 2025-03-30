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
const replyReviewView = document.getElementById(
  "reply-review-view"
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
const generateReplyBtn = document.getElementById(
  "generate-reply-btn"
) as HTMLButtonElement;
const statusDiv = document.getElementById("status");
const emailContentPre = document.getElementById("email-content");

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

// Reply Review View Elements (New)
const replyOutputTextarea = document.getElementById(
  "reply-output"
) as HTMLTextAreaElement;
const insertReplyBtn = document.getElementById(
  "insert-reply-btn"
) as HTMLButtonElement;
const backToMainFromReviewBtn = document.getElementById(
  "back-to-main-from-review-btn"
) as HTMLButtonElement;
const regenInstructionsInput = document.getElementById(
  "regen-instructions"
) as HTMLInputElement;
const regenerateReplyBtn = document.getElementById(
  "regenerate-reply-btn"
) as HTMLButtonElement;

// Global Spinner
const globalSpinner = document.getElementById(
  "global-spinner"
) as HTMLDivElement;

// State Variables
let currentEmailContent: string | null = null;
let currentReply: string | null = null;
let openAIApiKey: string | null = null;
let allAssistants: OpenAIAssistant[] = []; // Store the full list
let visibleAssistantIds: string[] = []; // IDs to show in the dropdown
let currentThreadId: string | null = null;

// --- Constants ---
const VISIBLE_ASSISTANTS_STORAGE_KEY = "visible_assistant_ids";

// --- Status Updates ---
function updateStatus(message: string, isError: boolean = false) {
  // Ensure statusDiv exists before using it (check needed if called before init completes)
  if (statusDiv) {
    statusDiv.textContent = message;
    statusDiv.style.color = isError ? "red" : "black";
  } else {
    console.warn("Status div not found when trying to update status:", message);
  }
  console.log(`Status: ${message}`);
}

// --- View Management ---
function showMainView() {
  if (mainContentView && settingsView && assistantEditView && replyReviewView) {
    settingsView.classList.remove("active-view");
    assistantEditView.classList.remove("active-view");
    replyReviewView.classList.remove("active-view");
    mainContentView.classList.add("active-view");
  }
}

function showSettingsView() {
  if (mainContentView && settingsView && assistantEditView && replyReviewView) {
    mainContentView.classList.remove("active-view");
    assistantEditView.classList.remove("active-view");
    replyReviewView.classList.remove("active-view");
    settingsView.classList.add("active-view");
    // Pre-fill API key input only if it exists
    if (openAIApiKey !== null) {
      apiKeyInput.value = openAIApiKey;
    }
  }
}

function showAssistantEditView() {
  if (mainContentView && settingsView && assistantEditView && replyReviewView) {
    mainContentView.classList.remove("active-view");
    settingsView.classList.remove("active-view");
    replyReviewView.classList.remove("active-view");
    assistantEditView.classList.add("active-view");
    assistantSearchInput.value = ""; // Clear search on view show
    populateAssistantEditList(); // Populate full list initially
  }
}

function showReplyReviewView() {
  if (mainContentView && settingsView && assistantEditView && replyReviewView) {
    mainContentView.classList.remove("active-view");
    settingsView.classList.remove("active-view");
    assistantEditView.classList.remove("active-view");
    replyReviewView.classList.add("active-view");
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

// --- Initialization ---
async function initialize() {
  // Check for all essential elements including new ones
  if (
    !mainContentView ||
    !settingsView ||
    !assistantEditView ||
    !replyReviewView ||
    !settingsBtn ||
    !refreshContextLink ||
    !assistantSelectLabel ||
    !assistantSelect ||
    !generateReplyBtn ||
    !insertReplyBtn ||
    !statusDiv ||
    !emailContentPre ||
    !replyOutputTextarea ||
    !apiKeyInput ||
    !saveKeyBtn ||
    !backBtn ||
    !assistantSearchInput ||
    !selectAllBtn ||
    !deselectAllBtn ||
    !assistantListContainer ||
    !saveAssistantFilterBtn ||
    !cancelAssistantFilterBtn ||
    !backToMainFromReviewBtn ||
    !regenInstructionsInput ||
    !regenerateReplyBtn ||
    !globalSpinner
  ) {
    console.error(
      "One or more essential UI elements not found in sidepanel.html"
    );
    // Attempt to show an error message in the body if possible
    document.body.innerHTML =
      "Error: Side panel UI elements missing or structure incorrect.";
    return;
  }

  // Load API key AND visible assistant IDs from storage
  try {
    const storageData = await chrome.storage.local.get([
      "openai_api_key",
      VISIBLE_ASSISTANTS_STORAGE_KEY, // Load filter
    ]);

    // Load Visible Assistant IDs
    if (
      storageData[VISIBLE_ASSISTANTS_STORAGE_KEY] &&
      Array.isArray(storageData[VISIBLE_ASSISTANTS_STORAGE_KEY])
    ) {
      visibleAssistantIds = storageData[VISIBLE_ASSISTANTS_STORAGE_KEY];
      console.log("Visible Assistant IDs loaded:", visibleAssistantIds);
    } else {
      console.log("No visible assistant filter found in storage.");
      // Default: show all initially, will be set after fetch
      visibleAssistantIds = [];
    }

    // Load API Key
    if (storageData.openai_api_key) {
      openAIApiKey = storageData.openai_api_key;
      if (openAIApiKey !== null) {
        apiKeyInput.value = openAIApiKey;
      }
      console.log("API Key loaded from storage.");
      await fetchAssistants(); // Fetches all, then populates dropdown based on filter
      showMainView();
    } else {
      console.log("API Key not found in storage.");
      updateStatus("Please save your OpenAI API Key in Settings.");
      assistantSelectLabel.style.display = "none";
      assistantSelect.style.display = "none";
      editAssistantsLink.style.display = "none"; // Hide edit link too
      showSettingsView();
    }
  } catch (error) {
    console.error("Error loading data from storage:", error);
    updateStatus("Error loading settings.", true);
    assistantSelectLabel.style.display = "none";
    assistantSelect.style.display = "none";
    editAssistantsLink.style.display = "none";
    showSettingsView();
  }

  setupEventListeners();
}

// --- OpenAI Assistant Fetching & Population ---

/** Populates the main assistant dropdown based on the visibleAssistantIds filter */
function populateAssistantDropdown() {
  assistantSelect.innerHTML = ""; // Clear existing options
  let displayedCount = 0;

  // Use allAssistants if visibleAssistantIds is empty (show all)
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
      // Means filter hid everything
      assistantSelect.innerHTML =
        '<option value="">No assistants match filter</option>';
      updateStatus(
        "No assistants match the current filter. Edit the list.",
        true
      );
    } else {
      // Means no assistants found at all
      assistantSelect.innerHTML =
        '<option value="">No assistants found</option>';
      updateStatus("No OpenAI assistants found in your account.", true);
    }
    assistantSelect.disabled = true;
    editAssistantsLink.style.display =
      allAssistants.length > 0 ? "block" : "none"; // Show edit link only if there are assistants
  } else {
    assistantSelect.disabled = false;
    editAssistantsLink.style.display = "block"; // Show edit link
    // Don't overwrite status if assistants loaded successfully
    // updateStatus("Assistants loaded. Select one and generate reply.");
  }
}

/** Fetches the full list of assistants and stores it */
async function fetchAssistants() {
  if (!openAIApiKey) {
    updateStatus("API Key not set, cannot fetch assistants.", true);
    assistantSelectLabel.style.display = "none";
    assistantSelect.style.display = "none";
    editAssistantsLink.style.display = "none";
    allAssistants = []; // Clear list
    populateAssistantDropdown(); // Update dropdown (will show empty state)
    return;
  }

  updateStatus("Fetching OpenAI Assistants...");
  assistantSelectLabel.style.display = "block";
  assistantSelect.style.display = "block";
  editAssistantsLink.style.display = "none";
  assistantSelect.innerHTML = '<option value="">Loading...</option>';
  assistantSelect.disabled = true;
  allAssistants = []; // Clear previous list

  let hasMore = true;
  let afterId: string | undefined = undefined;

  try {
    // Loop to handle pagination
    while (hasMore) {
      // Construct endpoint with pagination params if needed
      let endpoint = "/assistants?limit=100"; // Fetch 100 at a time
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
        allAssistants = allAssistants.concat(response.data); // Append new assistants
      }
      // Check pagination status from the response
      hasMore = response.has_more ?? false;
      afterId = response.last_id; // Get ID for the next page query (will be undefined if no more pages)

      // Stop if hasMore is false or if afterId is missing (shouldn't happen if has_more is true, but safety check)
      if (!hasMore || !afterId) {
        hasMore = false;
      }

      // Add a small delay to avoid hitting rate limits aggressively
      if (hasMore) await sleep(200);
    }

    console.log(`Fetched a total of ${allAssistants.length} assistants.`);

    // If filter is empty after first full fetch, default to showing all
    if (visibleAssistantIds.length === 0 && allAssistants.length > 0) {
      visibleAssistantIds = allAssistants.map((a) => a.id);
      // Save this default 'show all' state
      await chrome.storage.local.set({
        [VISIBLE_ASSISTANTS_STORAGE_KEY]: visibleAssistantIds,
      });
      console.log("Defaulting filter to show all assistants.");
    }

    populateAssistantDropdown(); // Populate dropdown based on filter
    updateStatus("Assistants loaded.");
  } catch (error) {
    console.error("Error fetching assistants:", error);
    let errorMessage = "An unknown error occurred while fetching assistants.";
    if (error instanceof Error) {
      errorMessage = `Error fetching assistants: ${error.message}`;
    }
    updateStatus(errorMessage, true);
    allAssistants = [];
    populateAssistantDropdown(); // Update dropdown to show error state
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

// --- Event Listeners ---
function setupEventListeners() {
  // Main View Listeners
  refreshContextLink.addEventListener("click", handleGetEmailContent);
  generateReplyBtn.addEventListener("click", () => handleGenerateReply());
  editAssistantsLink.addEventListener("click", showAssistantEditView);

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

  // Reply Review View Listeners
  insertReplyBtn.addEventListener("click", handleInsertReply);
  backToMainFromReviewBtn.addEventListener("click", showMainView);
  regenerateReplyBtn.addEventListener("click", handleRegenerateReply);

  // Listen for proactive updates from content script
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === "updateEmailContent") {
      console.log("Received proactive email content update:", message);
      if (message.content) {
        currentEmailContent = message.content;
        emailContentPre!.textContent = currentEmailContent;
        updateStatus("Email content updated automatically.");
        // Maybe clear the reply textarea when context changes?
        // replyOutputTextarea.value = '';
        // currentReply = null;
      } else {
        // Handle potential error reported by content script
        updateStatus(
          `Error auto-updating content: ${message.error || "Unknown error"}`,
          true
        );
        emailContentPre!.textContent = `Error auto-updating content: ${
          message.error || "Unknown error"
        }`;
        currentEmailContent = null;
      }
      sendResponse({ success: true }); // Acknowledge receipt
    }
    // Note: Be careful if adding more async listeners here; might need to return true.
    // Return false or nothing for synchronous listeners or if not handling the message.
    return false;
  });
}

// --- Action Handlers ---
async function handleGetEmailContent() {
  updateStatus("Requesting email content from content script...");
  emailContentPre!.textContent = ""; // Clear previous content
  currentEmailContent = null;

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
        emailContentPre!.textContent = currentEmailContent;
        updateStatus("Email content received.");
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
  const instructions = isRegeneration
    ? regenInstructionsInput.value.trim()
    : null;

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
  generateReplyBtn.disabled = true;
  regenerateReplyBtn.disabled = true;
  showSpinner(true);
  replyOutputTextarea.value = "";
  currentReply = null;

  let threadIdToUse: string;

  try {
    if (isRegeneration) {
      threadIdToUse = currentThreadId!;
      console.log("Using existing thread for regeneration:", threadIdToUse);
      const userMessage = instructions
        ? `Regenerate the previous reply with the following instructions: ${instructions}`
        : "Please regenerate the previous reply.";
      await fetchOpenAI(`/threads/${threadIdToUse}/messages`, openAIApiKey, {
        method: "POST",
        body: JSON.stringify({ role: "user", content: userMessage }),
      });
      console.log("Added regeneration instruction message.");
    } else {
      const thread = await fetchOpenAI<{ id: string }>(
        "/threads",
        openAIApiKey,
        {
          method: "POST",
        }
      );
      threadIdToUse = thread.id;
      currentThreadId = threadIdToUse;
      console.log("Created new thread:", threadIdToUse);

      await fetchOpenAI(`/threads/${threadIdToUse}/messages`, openAIApiKey, {
        method: "POST",
        body: JSON.stringify({
          role: "user",
          content: currentEmailContent,
        }),
      });
      console.log("Added original email content message.");
    }

    console.log("Starting assistant run...");
    const run = await fetchOpenAI<OpenAPIRun>(
      `/threads/${threadIdToUse}/runs`,
      openAIApiKey,
      {
        method: "POST",
        body: JSON.stringify({ assistant_id: selectedAssistantId }),
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
        openAIApiKey,
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
      openAIApiKey,
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
      if (!isRegeneration) {
        showReplyReviewView();
      } else {
        console.log("Reply regenerated successfully.");
        updateStatus("Reply regenerated.");
        regenInstructionsInput.value = "";
      }
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
  } finally {
    generateReplyBtn.disabled = false;
    regenerateReplyBtn.disabled = false;
    showSpinner(false);
  }
}

function handleRegenerateReply() {
  handleGenerateReply(true);
}

async function handleInsertReply() {
  if (!currentReply) {
    // updateStatus("No reply generated yet.", true); // Status hidden
    alert("No reply generated yet.");
    return;
  }

  // updateStatus("Sending reply...", false); // Status hidden
  insertReplyBtn.disabled = true; // Disable button during attempt

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
      if (response && response.success) {
        // showMainView(); // DO NOT switch back to main view
        console.log("Reply successfully inserted by content script.");
        // Optionally provide feedback (e.g., temporarily change button text)
        insertReplyBtn.textContent = "Inserted!";
        setTimeout(() => {
          insertReplyBtn.textContent = "Insert Reply into Gmail";
        }, 1500);
      } else {
        const errorMsg = response?.error || "Unknown error inserting reply.";
        alert(`Failed to insert reply: ${errorMsg}`);
      }
    } else {
      // updateStatus("Could not find active Gmail tab.", true); // Status hidden
      alert("Could not find active Gmail tab to insert reply.");
    }
  } catch (error) {
    // updateStatus("Error communicating...", true); // Status hidden
    console.error("Error sending insert message to content script:", error);
    alert("Error communicating with content script for insertion.");
  } finally {
    insertReplyBtn.disabled = false; // Re-enable button unless successful feedback is shown
  }
}

async function handleSaveApiKey() {
  const key = apiKeyInput.value.trim();
  if (key) {
    try {
      await chrome.storage.local.set({ openai_api_key: key });
      openAIApiKey = key;
      // Don't update statusDiv directly here, fetchAssistants will do it
      console.log("API Key saved.");
      await fetchAssistants(); // Fetch assistants after saving
      showMainView(); // Go back to main view after successful save
      updateStatus("API Key saved successfully."); // Update status after going back
    } catch (error) {
      // Error handling needs to be done within the settings view
      console.error("Error saving API key:", error);
      let errorMessage = "An unknown error occurred while saving the API key.";
      if (error instanceof Error) {
        errorMessage = `Error saving API key: ${error.message}`;
        console.error("Specific save error:", error.message);
      }
      // Display error within the settings view (maybe add a dedicated status element there?)
      alert(`Error saving API Key: ${errorMessage}`); // Use alert for now
      // Do NOT hide assistant select here as we are in settings view
    }
  } else {
    alert("API Key cannot be empty."); // Use alert for now
  }
}

// --- Run Initialization ---
initialize();
