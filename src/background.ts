// Background service worker logic will go here
console.log("Background service worker loaded.");

// --- Configure side panel to open on icon click ---
// This is the preferred way instead of using action.onClicked
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error("Error setting panel behavior:", error));

// --- Listener for the keyboard command ---
chrome.commands.onCommand.addListener(async (command, tab) => {
  console.log(`Command received: ${command}`);

  if (command === "execute-quick-reply") {
    if (tab?.id && tab.url?.includes("mail.google.com")) {
      try {
        // 1. Open the side panel
        console.log("Opening side panel for tab:", tab.id);
        await chrome.sidePanel.open({ tabId: tab.id });
        console.log("Side panel opened or already open.");

        // 2. Send a message to the content script to start the process
        console.log("Sending start-quick-reply to content script...");
        const response = await chrome.tabs.sendMessage(tab.id, {
          action: "start-quick-reply",
        });
        console.log("Content script response to start-quick-reply:", response);
      } catch (error) {
        console.error("Error handling quick reply command:", error);
      }
    } else {
      console.log("Command received on non-Gmail tab or tab without ID.", tab);
    }
  }
});

// Keep the service worker alive briefly after startup if needed
// (might not be necessary if command listener is sufficient)
// chrome.runtime.onStartup.addListener(() => {
//   console.log('Extension started up');
// });
