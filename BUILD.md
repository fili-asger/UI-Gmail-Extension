# Build Process for Gmail Assistant Extension

This document explains how to build the Gmail Assistant Extension for distribution and testing.

## Prerequisites

- Node.js (14.x or higher)
- npm (6.x or higher)

## Setup

Install all dependencies:

```bash
npm install
```

## Build Commands

### Production Build

To build the extension for production:

```bash
npm run build
```

This creates a minified, optimized build in the `dist` directory.

### Development Build

For development with source maps and without minification:

```bash
npm run build:dev
```

### Watch Mode

To automatically rebuild when files change:

```bash
npm run build:watch
```

This is useful during development when making frequent changes.

### Clean Build

To clean the `dist` directory:

```bash
npm run clean
```

### Create Distribution ZIP

To build and create a ZIP file for submission to the Chrome Web Store:

```bash
npm run zip
```

This will create `gmail-assistant-extension.zip` in the project root.

## Loading the Extension in Chrome

1. Build the extension using one of the commands above
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" (toggle in the upper right)
4. Click "Load unpacked" and select the `dist` directory
5. The extension should now be loaded and ready for testing

## What Gets Included/Excluded

The build process:

- **Includes**:

  - All JavaScript files (content.js, background.js, utils, etc.)
  - The manifest.json file
  - HTML, CSS, and asset files
  - Images and other resources

- **Excludes**:
  - Test files and directories (**tests**, test-mocks, etc.)
  - Development configuration files
  - Package management files (package.json, package-lock.json)
  - Git-related files
  - Documentation files (except for README.md)

## Troubleshooting

- If you encounter errors during build, try running `npm run clean` and then building again
- For Chrome loading issues, check the console in the extension's developer tools
- Ensure all paths in the `manifest.json` file correctly reference files in the build
