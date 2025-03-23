// Mock Chrome Extension API
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },
};

// Mock window objects that might not be available in JSDOM
Object.defineProperty(window, "getSelection", {
  value: () => ({
    rangeCount: 0,
    getRangeAt: jest.fn().mockReturnValue({
      deleteContents: jest.fn(),
      insertNode: jest.fn(),
      setStartAfter: jest.fn(),
      collapse: jest.fn(),
    }),
    removeAllRanges: jest.fn(),
    addRange: jest.fn(),
  }),
  writable: true,
});

// Mock the Range prototype to provide methods that might be missing in JSDOM
document.createRange = () => ({
  setStart: jest.fn(),
  setEnd: jest.fn(),
  commonAncestorContainer: {
    nodeName: "BODY",
    ownerDocument: document,
  },
  selectNode: jest.fn(),
  selectNodeContents: jest.fn(),
  deleteContents: jest.fn(),
  insertNode: jest.fn(),
  setStartAfter: jest.fn(),
  collapse: jest.fn(),
});

// Mock MutationObserver
global.MutationObserver = class {
  constructor(callback) {
    this.callback = callback;
    this.observe = jest.fn();
    this.disconnect = jest.fn();
    this.takeRecords = jest.fn();
  }

  // Helper method to simulate mutations
  simulateMutation(mutations) {
    this.callback(mutations, this);
  }
};

// Mock fetch for testing API calls
global.fetch = jest.fn();

// Default console methods to avoid polluting test output
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};

// Set up the document body with a typical Gmail structure for testing
document.body.innerHTML = `
<div class="compose-form" id="test-compose-form">
  <div class="btC">
    <div class="a8X"></div>
  </div>
  <div class="editable" contenteditable="true" id="test-compose-field"></div>
</div>
`;
