// cypress.config.ts
// Using CommonJS syntax (module.exports) despite package.json type:"module"
// as a workaround for potential Cypress loading issues.

// Import defineConfig type for type checking if needed, but use module.exports
// import { defineConfig } from "cypress";

module.exports = {
  env: {
    apiUrl: 'http://localhost:3000' // Add environment variable for API base URL
  },
  e2e: {
    baseUrl: 'http://localhost:8080',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    // baseUrl: 'http://localhost:5173' // Adjust port if needed
  },
};
