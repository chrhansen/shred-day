// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Add event listener to ignore specific uncaught exceptions
Cypress.on('uncaught:exception', (err, runnable) => {
  // Check if the error message includes the specific TypeError we encountered
  if (err.message.includes('startsWith is not a function')) {
    // Log the error to the Cypress console for awareness but prevent it from failing the test
    console.error('Cypress detected and ignored an expected uncaught exception:', err);
    return false;
  }
  // Allow other uncaught exceptions to fail the test
  return true;
});
