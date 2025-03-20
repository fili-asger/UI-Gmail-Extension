// Gmail Assistant Extension - Background Script

// Listen for extension installation
chrome.runtime.onInstalled.addListener(function () {
  console.log("Gmail Assistant Extension installed");

  // Initialize default settings
  chrome.storage.sync.get(["apiKey", "assistants", "actions"], (result) => {
    // Set default assistants if not existing
    if (!result.assistants) {
      const defaultAssistants = ["HelloFresh", "Podimo", "Factor", "Mofibo"];
      chrome.storage.sync.set({ assistants: defaultAssistants });
    }

    // Set default actions if not existing
    if (!result.actions) {
      const defaultActions = ["Accept", "Reject", "Negotiate", "Help"];
      chrome.storage.sync.set({ actions: defaultActions });
    }
  });
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log("Message received:", request);

  if (request.action === "openOptionsPage") {
    // Open the options page
    const optionsUrl = chrome.runtime.getURL("options/options.html");

    // Check if we need to open a specific tab
    if (request.tab) {
      chrome.tabs.create({ url: `${optionsUrl}?tab=${request.tab}` });
    } else {
      chrome.tabs.create({ url: optionsUrl });
    }
  }

  if (request.action === "generateResponse") {
    // Get API key from storage
    chrome.storage.sync.get("apiKey", (result) => {
      if (!result.apiKey) {
        sendResponse({
          success: false,
          error:
            "API key not found. Please set your OpenAI API key in the extension settings.",
        });
        return;
      }

      // Call OpenAI API to generate response
      generateOpenAIResponse(result.apiKey, request.data)
        .then((response) => {
          sendResponse({ success: true, response });
        })
        .catch((error) => {
          console.error("Error generating response:", error);
          sendResponse({
            success: false,
            error: `Error generating response: ${error.message}`,
          });
        });
    });

    // Return true to indicate we will respond asynchronously
    return true;
  }

  if (request.action === "getSettings") {
    chrome.storage.sync.get(["apiKey", "assistants", "actions"], (result) => {
      sendResponse({
        apiKey: result.apiKey || "",
        assistants: result.assistants || [],
        actions: result.actions || [],
      });
    });

    // Return true to indicate we will respond asynchronously
    return true;
  }

  if (request.action === "saveSettings") {
    chrome.storage.sync.set(
      {
        apiKey: request.data.apiKey,
        assistants: request.data.assistants,
        actions: request.data.actions,
      },
      () => {
        sendResponse({ success: true });
      }
    );

    // Return true to indicate we will respond asynchronously
    return true;
  }

  // Always return true when using sendResponse asynchronously
  return true;
});

// Function to call OpenAI API to generate response
async function generateOpenAIResponse(apiKey, data) {
  const { assistant, action, emailThread } = data;

  // Construct prompt based on assistant and action
  const prompt = constructPrompt(assistant, action, emailThread);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are an AI assistant specialized in writing email responses for ${assistant}. Your task is to ${action.toLowerCase()} the sender's email in a professional and appropriate manner.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 500,
      }),
    });

    const responseData = await response.json();

    if (responseData.error) {
      throw new Error(responseData.error.message);
    }

    return responseData.choices[0].message.content;
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    throw error;
  }
}

// Function to construct prompt based on assistant and action
function constructPrompt(assistant, action, emailThread) {
  let prompt = `Please write a response to the following email thread as if you were working for ${assistant}. `;

  // Add action-specific instructions
  switch (action) {
    case "Accept":
      prompt +=
        "Accept the request or offer in the email in a professional manner.";
      break;
    case "Reject":
      prompt += "Politely decline the request or offer in the email.";
      break;
    case "Negotiate":
      prompt +=
        "Propose a counter-offer or negotiation to the email's request.";
      break;
    case "Help":
      prompt +=
        "Provide helpful information in response to the query in the email.";
      break;
    default:
      prompt += "Respond appropriately to the email.";
  }

  // Add email thread information
  prompt += "\n\nEmail Thread:\n";
  prompt += `Subject: ${emailThread.subject}\n\n`;

  // Add each message in the thread
  emailThread.thread.forEach((message) => {
    prompt += `From: ${message.from}\n`;
    prompt += `To: ${message.to}\n`;
    prompt += `Content: ${message.content}\n\n`;
  });

  return prompt;
}

// Function to handle API requests
async function callOpenAI(prompt, model = "gpt-3.5-turbo") {
  try {
    // Get API key from storage
    const data = await chrome.storage.sync.get(["apiKey"]);
    const apiKey = data.apiKey;

    if (!apiKey) {
      console.error("No API key found");
      return {
        error: "No API key found. Please add your API key in the options page.",
      };
    }

    // TODO: Implement actual API call to OpenAI
    console.log("Would call OpenAI with prompt:", prompt);

    // Mock response for now
    return {
      choices: [
        {
          message: {
            content:
              "This is a mock response from the OpenAI API. Replace this with actual API call implementation.",
          },
        },
      ],
    };
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    return { error: error.message };
  }
}
