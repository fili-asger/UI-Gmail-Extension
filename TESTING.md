# Testing Guide for Gmail Assistant Extension

This document provides guidance on how to run tests and write new ones for the Gmail Assistant Extension.

## Setup

The testing infrastructure uses:

- **Jest**: JavaScript testing framework
- **JSDOM**: DOM environment for Node.js
- **GitHub Actions**: For continuous integration

## Running Tests

### Basic Test Run

```bash
npm test
```

### Watch Mode (Development)

```bash
npm run test:watch
```

### Coverage Report

```bash
npm run test:coverage
```

## Test Structure

Tests are organized by feature and utility:

```
__tests__/
├── features/         # Feature-specific tests
│   └── quickReply.test.js
└── utils/            # Utility function tests
    ├── emailFormatting.test.js
    └── safeStorage.test.js
```

## Writing New Tests

### Utilities

For new utility functions:

1. Extract the function to a dedicated file in the `utils/` directory
2. Create a corresponding test file in `__tests__/utils/`
3. Write tests that verify:
   - Happy path (expected inputs)
   - Edge cases (empty inputs, null values)
   - Error handling

### Features

For new features:

1. Create a test file in `__tests__/features/`
2. Use mocks for Chrome APIs and DOM interactions
3. Test the feature's key functionalities

## Mocking

### Chrome API

The Chrome API is mocked in `jest.setup.js`:

```javascript
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
  // Other APIs as needed
};
```

### DOM Elements

DOM elements can be mocked using JSDOM:

```javascript
document.body.innerHTML = `
  <div class="compose-form">
    <div class="editable" contenteditable="true"></div>
  </div>
`;
```

## Continuous Integration

Tests run automatically in GitHub Actions:

- When code is pushed to the `main` or `test-implementation` branch
- When a pull request is opened against the `main` branch

## Best Practices

1. **Test in isolation**: Ensure tests don't depend on each other
2. **Mock external dependencies**: Including Chrome API, fetch requests, etc.
3. **Focus on behavior**: Test what the function does, not how it does it
4. **Keep tests simple**: Each test should verify one specific behavior
5. **Use descriptive test names**: Name tests to describe what they're testing

## Example Test

```javascript
describe("formatEmailContent", () => {
  it("should convert line breaks to HTML breaks", () => {
    const input = "Line one\nLine two";
    const expected = "Line one<br>Line two";
    expect(formatEmailContent(input)).toBe(expected);
  });
});
```
