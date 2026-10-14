const { defineConfig } = require("cypress");
const { createConfirmedUser } = require("./cypress/tasks/confirmed-user.cjs");

module.exports = defineConfig({
  env: {
    apiUrl: "http://localhost:3000",
  },
  e2e: {
    baseUrl: "http://localhost:8080",
    setupNodeEvents(on, config) {
      on('task', { createConfirmedUser: input => createConfirmedUser(config, input) });
      return config;
    },
  },
});
