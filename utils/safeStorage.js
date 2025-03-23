/**
 * Safe storage utility function to handle Chrome storage API safely
 * Provides fallbacks and error handling for Chrome's storage API
 * @returns {Object} Storage interface with get, set, getAsync, setAsync methods
 */
function safeStorage() {
  const isAvailable =
    typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;

  return {
    get: function (keys, callback) {
      if (isAvailable) {
        try {
          chrome.storage.local.get(keys, callback);
        } catch (error) {
          console.warn("Chrome storage error:", error);
          // Handle context invalidation error
          if (
            error.message &&
            error.message.includes("Extension context invalidated")
          ) {
            console.warn(
              "Extension context has been invalidated. The page needs refreshing."
            );
            if (typeof showExtensionContextInvalidatedMessage === "function") {
              showExtensionContextInvalidatedMessage();
            }
          }
          // Provide empty result as fallback
          callback({});
        }
      } else {
        console.warn("Chrome storage API not available for get operation");
        callback({});
      }
    },
    set: function (items, callback) {
      if (isAvailable) {
        try {
          chrome.storage.local.set(items, callback);
        } catch (error) {
          console.warn("Chrome storage error:", error);
          // Handle context invalidation error
          if (
            error.message &&
            error.message.includes("Extension context invalidated")
          ) {
            console.warn(
              "Extension context has been invalidated. The page needs refreshing."
            );
            if (typeof showExtensionContextInvalidatedMessage === "function") {
              showExtensionContextInvalidatedMessage();
            }
          }
          // Execute callback even on error
          if (callback) callback();
        }
      } else {
        console.warn("Chrome storage API not available for set operation");
        if (callback) callback();
      }
    },
    // Promise-based versions for use with async/await
    getAsync: function (keys) {
      return new Promise((resolve) => {
        this.get(keys, (result) => resolve(result));
      });
    },
    setAsync: function (items) {
      return new Promise((resolve) => {
        this.set(items, resolve);
      });
    },
    isAvailable: isAvailable,
  };
}

// Export for both browser and Node.js environments
if (typeof module !== "undefined" && module.exports) {
  module.exports = safeStorage;
}
