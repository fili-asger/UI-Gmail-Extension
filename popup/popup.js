// Gmail Assistant Extension - Popup Script

document.addEventListener("DOMContentLoaded", function () {
  // Get elements
  const openAssistantBtn = document.getElementById("openAssistantBtn");
  const openOptionsBtn = document.getElementById("openOptionsBtn");
  const statusIndicator = document.getElementById("status-indicator");
  const statusText = document.getElementById("status-text");

  // Check if API key is set
  chrome.storage.sync.get("apiKey", function (result) {
    if (!result.apiKey) {
      statusIndicator.classList.add("warning");
      statusText.textContent = "API key not set. Please configure settings.";
    }
  });

  // Check if we're in Gmail
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const currentTab = tabs[0];

    // Check if current tab is Gmail
    if (currentTab.url && currentTab.url.includes("mail.google.com")) {
      statusText.textContent = "Ready to assist with your Gmail";
    } else {
      statusIndicator.classList.add("offline");
      statusText.textContent = "Please open Gmail to use this extension";
      openAssistantBtn.disabled = true;
      openAssistantBtn.classList.add("disabled");
    }
  });

  // Open assistant in Gmail tab
  openAssistantBtn.addEventListener("click", function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "openAssistant",
      });
      window.close(); // Close the popup
    });
  });

  // Open options page
  openOptionsBtn.addEventListener("click", function () {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL("options/options.html"));
    }
  });
});
