const safeStorage = require("../../utils/safeStorage");

describe("safeStorage utility", () => {
  let storage;
  let originalConsoleWarn;

  beforeEach(() => {
    // Save original console.warn
    originalConsoleWarn = console.warn;
    console.warn = jest.fn();

    // Reset chrome mock between tests
    chrome.storage.local.get.mockClear();
    chrome.storage.local.set.mockClear();

    // Create new instance for each test
    storage = safeStorage();
  });

  afterEach(() => {
    // Restore console.warn
    console.warn = originalConsoleWarn;
  });

  describe("get method", () => {
    it("should call chrome.storage.local.get when available", () => {
      const callback = jest.fn();
      const testKeys = ["test_key"];

      storage.get(testKeys, callback);

      expect(chrome.storage.local.get).toHaveBeenCalledWith(testKeys, callback);
    });

    it("should handle errors and call callback with empty object when an error occurs", () => {
      const callback = jest.fn();
      const testKeys = ["test_key"];

      chrome.storage.local.get.mockImplementationOnce(() => {
        throw new Error("Test error");
      });

      storage.get(testKeys, callback);

      expect(callback).toHaveBeenCalledWith({});
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe("set method", () => {
    it("should call chrome.storage.local.set when available", () => {
      const callback = jest.fn();
      const testItems = { test_key: "test_value" };

      storage.set(testItems, callback);

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        testItems,
        callback
      );
    });

    it("should handle errors and still call callback when an error occurs", () => {
      const callback = jest.fn();
      const testItems = { test_key: "test_value" };

      chrome.storage.local.set.mockImplementationOnce(() => {
        throw new Error("Test error");
      });

      storage.set(testItems, callback);

      expect(callback).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe("Promise-based methods", () => {
    it("getAsync should return a Promise that resolves with the result", async () => {
      const testKeys = ["test_key"];
      const mockResult = { test_key: "test_value" };

      chrome.storage.local.get.mockImplementationOnce((keys, callback) => {
        callback(mockResult);
      });

      const result = await storage.getAsync(testKeys);

      expect(result).toEqual(mockResult);
      expect(chrome.storage.local.get).toHaveBeenCalledWith(
        testKeys,
        expect.any(Function)
      );
    });

    it("setAsync should return a Promise that resolves after setting", async () => {
      const testItems = { test_key: "test_value" };
      let callbackCalled = false;

      chrome.storage.local.set.mockImplementationOnce((items, callback) => {
        callbackCalled = true;
        callback();
      });

      await storage.setAsync(testItems);

      expect(callbackCalled).toBe(true);
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        testItems,
        expect.any(Function)
      );
    });
  });
});
