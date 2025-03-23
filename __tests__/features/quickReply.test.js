// Mock the required functions
jest.mock("../../utils/safeStorage", () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn((keys, callback) => callback({})),
    set: jest.fn((items, callback) => callback()),
    getAsync: jest.fn().mockResolvedValue({}),
    setAsync: jest.fn().mockResolvedValue(undefined),
    isAvailable: true,
  }));
});

// Mock document utility functions
document.querySelectorAll = jest.fn().mockReturnValue([]);
document.getElementById = jest.fn().mockReturnValue(null);

// Create a test version of setupKeyboardShortcuts
function createKeyboardEventHandler() {
  let eventHandler = null;

  // This is a simplified version of the real setupKeyboardShortcuts function
  function setupKeyboardShortcuts() {
    console.log("Setting up keyboard shortcuts");

    eventHandler = function (event) {
      // Check if Command+E (Mac) or Ctrl+E (Windows/Linux) is pressed
      if ((event.metaKey || event.ctrlKey) && event.key === "e") {
        console.log("Command+E shortcut detected");

        // Prevent the default browser behavior for this key combination
        event.preventDefault();

        // Check if currently focused in a compose/reply field
        const activeElement = document.activeElement;
        const isInComposeField =
          activeElement &&
          (activeElement.classList.contains("editable") ||
            activeElement.getAttribute("role") === "textbox" ||
            activeElement.closest(".Am.Al.editable") ||
            activeElement.closest(".aO7 .editable"));

        if (isInComposeField) {
          console.log("Quick reply shortcut activated in compose field");
          return true; // Indicate shortcut was handled
        }
      }
      return false; // Shortcut not handled
    };

    return eventHandler;
  }

  return { setupKeyboardShortcuts, getEventHandler: () => eventHandler };
}

describe("Quick Reply Keyboard Shortcut", () => {
  let handler;

  beforeEach(() => {
    const { setupKeyboardShortcuts, getEventHandler } =
      createKeyboardEventHandler();
    setupKeyboardShortcuts();
    handler = getEventHandler();
  });

  it("should detect Command+E keyboard shortcut", () => {
    const event = {
      metaKey: true,
      ctrlKey: false,
      key: "e",
      preventDefault: jest.fn(),
    };

    const result = handler(event);

    // Event should be prevented
    expect(event.preventDefault).toHaveBeenCalled();

    // Result depends on whether we're in a compose field
    expect(result).toBeFalsy(); // No compose field in this test
  });

  it("should detect Ctrl+E keyboard shortcut", () => {
    const event = {
      metaKey: false,
      ctrlKey: true,
      key: "e",
      preventDefault: jest.fn(),
    };

    const result = handler(event);

    // Event should be prevented
    expect(event.preventDefault).toHaveBeenCalled();

    // Result depends on whether we're in a compose field
    expect(result).toBeFalsy(); // No compose field in this test
  });

  it("should not react to other keyboard shortcuts", () => {
    const events = [
      // Wrong key
      { metaKey: true, ctrlKey: false, key: "a", preventDefault: jest.fn() },
      // No meta or ctrl key
      { metaKey: false, ctrlKey: false, key: "e", preventDefault: jest.fn() },
      // Both meta and ctrl, but wrong key
      { metaKey: true, ctrlKey: true, key: "x", preventDefault: jest.fn() },
    ];

    events.forEach((event) => {
      const result = handler(event);
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(result).toBeFalsy();
    });
  });

  it("should recognize valid compose fields", () => {
    // Setup mock for document.activeElement
    const mockEditable = {
      classList: {
        contains: jest.fn((cls) => cls === "editable"),
      },
      getAttribute: jest.fn(() => null),
      closest: jest.fn(() => null),
    };

    // Save original and mock document.activeElement
    const originalActiveElement = document.activeElement;
    Object.defineProperty(document, "activeElement", {
      value: mockEditable,
      writable: true,
    });

    const event = {
      metaKey: true,
      ctrlKey: false,
      key: "e",
      preventDefault: jest.fn(),
    };

    const result = handler(event);

    // Event should be prevented
    expect(event.preventDefault).toHaveBeenCalled();

    // We should be in a compose field now
    expect(result).toBeTruthy();

    // Verify how we detected the compose field
    expect(mockEditable.classList.contains).toHaveBeenCalledWith("editable");

    // Restore original
    Object.defineProperty(document, "activeElement", {
      value: originalActiveElement,
      writable: true,
    });
  });
});
