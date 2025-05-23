/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//
// declare global {
//   namespace Cypress {
//     interface Chainable {
//       login(email: string, password: string): Chainable<void>
//       drag(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       dismiss(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       visit(originalFn: CommandOriginalFn, url: string, options: Partial<VisitOptions>): Chainable<Element>
//     }
//   }
// }

// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Type definition for the new custom command
declare global {
  namespace Cypress {
    interface Chainable {
      createUser(email: string, password?: string): Chainable<Response<any>>
      login(email: string, password?: string): Chainable<void>
      logDay(dayData: { date: string; resort_id: any; ski_ids: any; activity?: string; }): Chainable<Response<any>>
    }
  }
}

// Add command to create user via API
Cypress.Commands.add('createUser', (email, password = 'password123') => {
  // Default password if not provided
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/api/v1/users`, // Use env var
    body: {
      user: { // Ensure body matches your UsersController expected params
        email: email,
        password: password
      }
    },
    failOnStatusCode: false // Don't fail test if user already exists (e.g., 422)
  });
});

// Add command to log in via UI
Cypress.Commands.add('login', (email, password = 'password123') => {
  // Assumes starting on or navigating to AUTH_URL
  cy.visit('/auth'); // Use path directly
  cy.get('#login-email').type(email);
  cy.get('#login-password').type(password);
  cy.contains('button', /^Login$/i).click();
  // Add assertion to make sure login succeeded and redirected
  cy.location('pathname').should('eq', '/');
});

// Add command to log a day via API
Cypress.Commands.add('logDay', (dayData) => {
  // Note: This assumes the user is already logged in via API context (cookie is set)
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/api/v1/days`, // Use env var
    body: {
      day: dayData // Pass the provided data nested under 'day' key
    },
    failOnStatusCode: false // Allow checking status manually
  });
});

// Add event listener to ignore specific uncaught exceptions
Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from
  // failing the test
  return false;
});
