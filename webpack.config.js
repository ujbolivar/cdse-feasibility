const path = require("path");
const Dotenv = require("dotenv-webpack");

module.exports = {
  mode: "development", // Change to 'production' for production builds
  entry: "./src/index.js", // Entry point for your application
  output: {
    filename: "bundle.js", // Output bundle file
    path: path.resolve(__dirname, "dist"), // Output path
  },
  module: {
    rules: [
      {
        test: /\.js$/, // Use babel-loader for JS files
        exclude: /node_modules/, // Exclude dependencies
        use: {
          loader: "babel-loader", // Use Babel for ES6+
          options: {
            presets: ["@babel/preset-env"],
            plugins: [
              "@babel/plugin-proposal-optional-chaining", // Add optional chaining plugin
            ],
          },
        },
      },
    ],
  },
  plugins: [
    new Dotenv(), // Load .env variables into process.env
  ],
  resolve: {
    fallback: {
      path: require.resolve("path-browserify"),
      fs: false, // You can't use 'fs' in a browser context, so set it to false
    },
  },
};
