// Content script logic for interacting with Gmail DOM will go here
console.log("Content script loaded on Gmail.");

// --- Debounce Timer ---
let debounceTimer: number | null = null;
const DEBOUNCE_DELAY = 500; // ms delay after DOM change before triggering extraction

// --- Utility Functions ---
/** Sleep helper function */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Core Email Extraction Logic ---
function getEmailThreadContent(): { content: string | null; error?: string } {
  try {
    // --- Extract Subject ---
    let subject = "Subject not found";
    // Subject is typically in h2.hP within div.ha
    const subjectElement = document.querySelector("div.ha > h2.hP");
    if (subjectElement instanceof HTMLElement) {
      subject = subjectElement.innerText.trim();
      console.log("Extracted Subject:", subject);
    } else {
      console.warn(
        "Could not find subject element using selector 'div.ha > h2.hP'."
      );
    }

    // --- Extract Thread Messages ---
    const threadContainer = document.querySelector("div.aeF");
    if (!threadContainer) {
      console.error(
        "Could not find Gmail thread container using selector 'div.aeF'."
      );
      return { content: null, error: "Could not find email thread container." };
    }

    let messageNodes = threadContainer.querySelectorAll("div.gs");
    if (!messageNodes || messageNodes.length === 0) {
      console.log("No messages found with 'div.gs', trying 'div.ii.gt'.");
      messageNodes = threadContainer.querySelectorAll("div.ii.gt");
    }

    if (!messageNodes || messageNodes.length === 0) {
      console.error(
        "Could not find individual message nodes within the thread container."
      );
      return {
        content: null,
        error: "Could not find individual messages in the thread.",
      };
    }

    let latestMessageUniqueContent = "";
    const quotedContentParts: string[] = [];

    messageNodes.forEach((node, index) => {
      const isLastNode = index === messageNodes.length - 1;
      if (isLastNode) {
        const mainBodyElement = node.querySelector("div.a3s.aiL");
        if (mainBodyElement instanceof HTMLElement) {
          latestMessageUniqueContent = mainBodyElement.innerText.trim();
        } else {
          latestMessageUniqueContent = (node as HTMLElement).innerText.trim();
          console.warn(
            "Could not find 'div.a3s.aiL' in the last message node..."
          );
        }
        const quotedWithinLast = node.querySelector(".adL .h5");
        if (quotedWithinLast instanceof HTMLElement) {
          quotedContentParts.unshift(quotedWithinLast.innerText.trim());
        } else {
          const fullNodeText = (node as HTMLElement).innerText.trim();
          if (
            latestMessageUniqueContent &&
            fullNodeText !== latestMessageUniqueContent
          ) {
            const remainingText = fullNodeText
              .replace(latestMessageUniqueContent, "")
              .trim();
            if (remainingText) {
              quotedContentParts.unshift(
                "--- Quoted in last message ---\n" + remainingText
              );
            }
          }
        }
      } else {
        quotedContentParts.unshift((node as HTMLElement).innerText.trim());
      }
    });

    // --- Combine Subject and Messages ---
    let finalContent = `Subject: ${subject}\n\n`; // Start with the subject
    finalContent += `--- Latest message ---\n${latestMessageUniqueContent}\n\n`;
    if (quotedContentParts.length > 0) {
      finalContent += `--- Quoted Content ---\n${quotedContentParts.join(
        "\n\n---\n\n"
      )}`;
    }

    if (!latestMessageUniqueContent && quotedContentParts.length === 0) {
      // If we couldn't extract messages, still return the subject if found
      if (subject !== "Subject not found") {
        console.log("Extracted subject only.");
        return { content: `Subject: ${subject}` };
      }
      console.error(
        "Found message nodes, but failed to extract any text content..."
      );
      return {
        content: null,
        error: "Found messages, but could not extract content.",
      };
    } else {
      console.log(
        `Formatted content from ${messageNodes.length} messages, including subject.`
      );
      return { content: finalContent.trim() };
    }
  } catch (error) {
    console.error("Error during email content extraction:", error);
    let errorMessage = "An unknown error occurred during extraction.";
    if (error instanceof Error) {
      errorMessage = `An error occurred: ${error.message}`;
    }
    return { content: null, error: errorMessage };
  }
}

// --- Send Update to Side Panel ---
function sendContentUpdateToSidePanel(result: {
  content: string | null;
  error?: string;
}) {
  console.log("Sending content update to side panel:", result);
  chrome.runtime.sendMessage(
    { action: "updateEmailContent", ...result },
    (response) => {
      if (chrome.runtime.lastError) {
        console.warn(
          "Could not send message to side panel (it might be closed):",
          chrome.runtime.lastError.message
        );
      } else {
        console.log("Side panel confirmation response:", response);
      }
    }
  );
}

// --- Trigger Extraction and Update ---
function triggerExtractionAndUpdate() {
  console.log("Triggering email extraction due to DOM change...");
  const result = getEmailThreadContent();
  sendContentUpdateToSidePanel(result);
}

// --- Mutation Observer Setup ---
const observerCallback: MutationCallback = (mutationsList, _observer) => {
  // Check if the mutations likely indicate a new email view
  // This is heuristic - look for addition of nodes, specific class changes etc.
  // A simple check: look for addition of the main thread container or message nodes
  let relevantChange = false;
  for (const mutation of mutationsList) {
    if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
      for (const node of mutation.addedNodes) {
        if (node instanceof Element) {
          // Check if the main view area or a message thread was added
          if (
            node.querySelector("div.aeF") ||
            node.matches("div.aeF") ||
            node.querySelector("div.ii.gt")
          ) {
            relevantChange = true;
            break;
          }
        }
      }
    }
    // Add more sophisticated checks if needed (e.g., attribute changes on specific elements)
    if (relevantChange) break;
  }

  if (relevantChange) {
    console.log("Relevant DOM change detected, scheduling extraction...");
    // Debounce the extraction call
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(triggerExtractionAndUpdate, DEBOUNCE_DELAY);
  }
};

// Start observing when the content script loads
// Target node: Find a stable parent element that contains the email view.
// document.body might be too broad, but let's start there and refine if needed.
// A potentially better target might be a specific Gmail container like '.bkK' or '.nH.bkK'
const targetNode = document.body;
const config: MutationObserverInit = { childList: true, subtree: true };
const observer = new MutationObserver(observerCallback);

// Wait a moment for Gmail UI to likely settle before starting observer
setTimeout(() => {
  if (targetNode) {
    console.log("Starting MutationObserver on target:", targetNode);
    observer.observe(targetNode, config);
  } else {
    console.error("Could not find target node for MutationObserver.");
  }
}, 2000); // Wait 2 seconds after script load

// --- Helper to click the Reply or Reply All button ---
async function openReplyField(): Promise<boolean> {
  // --- Try 'Reply all' first ---
  const replyAllSelector = 'span.ams.bkI[role="link"]'; // Selector for Reply All button container
  let replyAllButton: HTMLElement | null = null;
  const allReplyAllCandidates =
    document.querySelectorAll<HTMLElement>(replyAllSelector);
  for (const span of allReplyAllCandidates) {
    // Check the text content robustly, trim whitespace
    if (span.textContent?.trim().toLowerCase() === "reply all") {
      replyAllButton = span;
      break;
    }
  }

  if (replyAllButton && !replyAllButton.ariaDisabled) {
    console.log(
      "Found 'Reply all' button, attempting to click.",
      replyAllButton
    );
    replyAllButton.click();
    await sleep(500); // Wait longer for Reply All UI changes
    return true;
  }

  // --- If 'Reply all' not found or not clickable, try 'Reply' ---
  console.log("'Reply all' not found or clickable, trying 'Reply' button...");
  // Original selector was 'span.ams.bkH[role="link"]', might need adjustment for English UI
  const replyButtonSelector = 'span.ams.bkH[role="link"]';
  let replyButton: HTMLElement | null = null;
  const allReplyCandidates =
    document.querySelectorAll<HTMLElement>(replyButtonSelector);
  for (const span of allReplyCandidates) {
    if (span.textContent?.trim().toLowerCase() === "reply") {
      // Changed "Svar" to "Reply"
      replyButton = span;
      break;
    }
  }

  // Fallback if the specific selector doesn't work, find any link/button with text "Reply"
  if (!replyButton) {
    console.log(
      "Reply button selector failed, trying broader text search for 'Reply'..."
    );
    const allLinks = document.querySelectorAll<HTMLElement>(
      '[role="link"], [role="button"]'
    );
    for (const el of allLinks) {
      if (
        el.textContent?.trim().toLowerCase() === "reply" &&
        !el.closest(".gmail_signature")
      ) {
        // Avoid signature links
        // Basic check if it's likely a main action button (visible, reasonable size)
        if (
          el.offsetParent !== null &&
          el.offsetHeight > 5 &&
          el.offsetWidth > 5
        ) {
          replyButton = el;
          break;
        }
      }
    }
  }

  if (replyButton && !replyButton.ariaDisabled) {
    console.log("Found 'Reply' button, attempting to click.", replyButton);
    replyButton.click();
    await sleep(300); // Short delay for reply field to potentially open
    return true;
  } else {
    console.error("Could not find a clickable 'Reply all' or 'Reply' button.");
    return false;
  }
}

// --- Helper to check if reply field is already open ---
function isReplyFieldOpen(): boolean {
  const replyBoxSelector =
    'div[aria-label="Message Body"][contenteditable="true"]'; // Updated selector
  const fallbackSelector = 'div[g_editable="true"][role="textbox"]';
  return !!(
    document.querySelector(replyBoxSelector) ||
    document.querySelector(fallbackSelector)
  );
}

// --- Message Listener ---
chrome.runtime.onMessage.addListener(async (message, _sender, sendResponse) => {
  console.log("Message received in content script:", message);

  if (message.action === "start-quick-reply") {
    console.log("Handling start-quick-reply request...");
    let replyFieldWasOpened = false;
    let success = true;
    let errorMsg: string | undefined = undefined;

    // 1. Get Email Content
    const emailResult = getEmailThreadContent();
    if (!emailResult.content) {
      console.error("Failed to get email content for quick reply.");
      success = false;
      errorMsg = emailResult.error || "Failed to get email content";
    }

    // 2. Check/Open Reply Field (only if content extraction succeeded)
    if (success) {
      if (!isReplyFieldOpen()) {
        console.log(
          "Reply field not open, attempting to click reply button..."
        );
        replyFieldWasOpened = await openReplyField();
        if (!replyFieldWasOpened) {
          success = false;
          errorMsg = "Could not find or click the reply button.";
        } else {
          // Verify it opened after clicking
          if (!isReplyFieldOpen()) {
            console.warn("Clicked reply, but reply field still not found!");
            // Proceed anyway, maybe insertion will work later?
          }
        }
      } else {
        console.log("Reply field is already open.");
      }
    }

    // 3. Send result (content + status) directly to Side Panel
    //    The background script only initiated this.
    console.log("Sending quick reply data to side panel");
    chrome.runtime.sendMessage({
      action: "execute-quick-reply-flow", // New action for side panel
      emailContent: emailResult.content,
      error: success ? undefined : errorMsg,
    });

    // Send simple ack back to background script
    sendResponse({ ack: true, success: success });
    return true; // Keep channel open briefly
  }

  if (message.action === "getEmailContent") {
    // Manual trigger still uses the extraction function
    console.log("Manual trigger for getEmailContent");
    const result = getEmailThreadContent();
    sendResponse(result);
    return true; // Keep channel open for async response
  }

  if (message.action === "insertReply") {
    console.log("Attempting to insert reply:", message.replyText);

    // 1. Check if reply field is open, try to open if not (will now try Reply All first)
    if (!isReplyFieldOpen()) {
      // isReplyFieldOpen might need selector update too
      console.log(
        "Reply field not open for insert, attempting to open (Reply All priority)..."
      );
      const opened = await openReplyField();
      if (!opened) {
        console.error("Failed to open reply/reply-all field before inserting.");
        sendResponse({ success: false, error: "Could not open reply field." });
        return true; // Indicate async response handled
      }
      // Add a small delay after opening seems necessary sometimes
      await sleep(300);
    }

    // 2. Try to find the reply field and insert
    // Update selector for English UI
    const primarySelector =
      'div[aria-label="Message Body"][contenteditable="true"]'; // Changed from "Meddelelsens tekst"
    let replyBox = document.querySelector(primarySelector);

    // Add fallback selectors if primary fails
    if (!replyBox) {
      const fallbackSelectors = [
        'div[aria-label*="Message body"][contenteditable="true"]', // Case variation
        'div[g_editable="true"][role="textbox"]', // More generic Gmail selector
      ];
      for (const selector of fallbackSelectors) {
        console.log(`Primary selector failed, trying fallback: ${selector}`);
        replyBox = document.querySelector(selector);
        if (replyBox) break; // Stop if found
      }
    }

    if (replyBox instanceof HTMLElement) {
      replyBox.focus();
      // Use innerText for simple text, or consider innerHTML if formatting needed
      replyBox.innerText = message.replyText;
      console.log("Reply inserted into text area.");
      sendResponse({ success: true });
    } else {
      console.error(
        "Could not find Gmail reply box using primary or fallback selectors after attempting to open."
      );
      sendResponse({
        success: false,
        error: "Reply box not found after attempt",
      });
    }
    return true; // Keep message channel open
  }

  // Default for unhandled messages
  return false;
});
