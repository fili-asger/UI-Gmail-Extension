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

// --- Helper to click the Reply button ---
async function openReplyField(): Promise<boolean> {
  // Selector based on user provided HTML: span with specific classes and text 'Svar'
  const replyButtonSelector =
    'span.ams.bkH[role="link"]:not([aria-disabled="true"])';
  let replyButton = document.querySelector<HTMLElement>(replyButtonSelector);

  // Fallback if the simple selector doesn't work, try finding by text content
  if (!replyButton) {
    console.log("Reply button selector failed, trying text search...");
    const allSpans = document.querySelectorAll('span[role="link"].ams');
    for (const span of allSpans) {
      if (span.textContent?.trim() === "Svar") {
        replyButton = span as HTMLElement;
        break;
      }
    }
  }

  if (replyButton) {
    console.log("Found reply button, attempting to click.", replyButton);
    replyButton.click();
    await sleep(300); // Short delay for reply field to potentially open
    return true;
  } else {
    console.error("Could not find the Reply button ('Svar').");
    return false;
  }
}

// --- Helper to check if reply field is already open ---
function isReplyFieldOpen(): boolean {
  const replyBoxSelector =
    'div[aria-label="Meddelelsens tekst"][contenteditable="true"]';
  return !!document.querySelector(replyBoxSelector);
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
    const primarySelector =
      'div[aria-label="Meddelelsens tekst"][contenteditable="true"]';
    const replyBox = document.querySelector(primarySelector);

    if (replyBox instanceof HTMLElement) {
      replyBox.focus();
      replyBox.innerText = message.replyText;
      console.log("Reply inserted using primary selector.");
      sendResponse({ success: true });
    } else {
      const fallbackSelector =
        'div[aria-label*="Message"][contenteditable="true"]';
      console.log(
        `Primary selector ('${primarySelector}') failed, trying fallback ('${fallbackSelector}').`
      );
      const fallbackReplyBox = document.querySelector(fallbackSelector);

      if (fallbackReplyBox instanceof HTMLElement) {
        fallbackReplyBox.focus();
        fallbackReplyBox.innerText = message.replyText;
        console.log("Reply inserted using fallback selector.");
        sendResponse({ success: true });
      } else {
        console.error(
          "Could not find Gmail reply box using primary or fallback selectors."
        );
        sendResponse({ success: false, error: "Reply box not found" });
      }
    }
    return true;
  }

  // Optional: Handle other message types or return false if not handled
  // return false;
});
