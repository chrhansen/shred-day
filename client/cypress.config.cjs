const { defineConfig } = require("cypress");

module.exports = defineConfig({
  env: {
    apiUrl: "http://localhost:3000",
  },
  e2e: {
    baseUrl: "http://localhost:8080",
    setupNodeEvents(on, config) {
      return config;
    },
  },
});
