const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

module.exports = {
  mode: "production", // or 'development' for non-minified output
  entry: {
    content: "./content.js",
    background: "./background.js",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CopyPlugin({
      patterns: [
        // Copy manifest and static files
        { from: "manifest.json", to: "." },
        { from: "styles.css", to: "." },
        { from: "UI.html", to: "." },
        // Copy utils - these contain actual code needed by the extension
        { from: "utils/**/*", to: "." },
        // Copy directories needed by the extension
        { from: "images", to: "images" },
        { from: "popup", to: "popup" },
        { from: "options", to: "options" },
        // Explicitly exclude test-related files and directories
        {
          from: ".",
          globOptions: {
            ignore: [
              // Test and development files
              "**/__tests__/**",
              "**/__mocks__/**",
              "**/test-mocks/**",
              "**/node_modules/**",
              "**/jest.setup.js",
              "**/webpack.config.js",

              // Package management files
              "**/package*.json",
              "**/yarn.lock",

              // Documentation files except README.md
              "**/TESTING.md",
              "**/BUILD.md",
              "**/LICENSE*",

              // Source control and CI files
              "**/.git/**",
              "**/.github/**",
              "**/.gitlab/**",
              "**/.gitignore",
              "**/.npmignore",

              // Editor config files
              "**/.vscode/**",
              "**/.idea/**",
              "**/.editorconfig",

              // Build artifacts
              "**/coverage/**",
              "**/dist/**",
              "**/build/**",

              // Dot files in general
              "**/.*",
            ],
          },
        },
      ],
    }),
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
    ],
  },
  resolve: {
    extensions: [".js"],
  },
};
