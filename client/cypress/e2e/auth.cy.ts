/// <reference types="cypress" />

describe('Authentication Flows', () => {
  // Define base URL in cypress.config.ts or use full URLs here
  const AUTH_URL = '/auth';
  const PASSWORD = 'password123'; // Keep password consistent

  // --- Login Tests --- //
  describe('Login', () => {
    beforeEach(() => {
      // Generate a unique email for each test run
      const uniqueEmail = `test-login-${Date.now()}@example.com`;
      // Create user via API, store email in alias, and clear cookies
      cy.createUser(uniqueEmail, PASSWORD).then(() => {
        cy.wrap(uniqueEmail).as('userEmail');
        cy.clearCookies(); // Clear cookies set by API response
        // No need to visit here anymore, login command handles it
      });
    });

    it('should allow a user to log in with valid credentials', function() {
      // Use the login command directly here as well for consistency?
      // Or keep manual steps as they test the login UI explicitly.
      // Keeping manual steps for now.
      cy.visit('/auth'); // Need to visit page for manual login test
      cy.get('#login-email').type(this.userEmail);
      cy.get('#login-password').type(PASSWORD);
      cy.contains('button', /^Login$/i).click();
      cy.url().should('not.include', '/auth');
      cy.location('pathname').should('eq', '/');
    });

    it('should show an error message with invalid credentials', function() {
      cy.visit('/auth'); // Need to visit page for manual login test
      cy.get('#login-email').type(this.userEmail);
      cy.get('#login-password').type('wrongpassword');
      cy.contains('button', /^Login$/i).click();
      cy.url().should('include', '/auth');
      cy.contains(/User not authenticated/i).should('be.visible');
    });

    it('should allow a logged-in user to log out', function() {
      // Use the custom login command to log in first
      cy.login(this.userEmail, PASSWORD);

      // Now on dashboard, find and click the logout button
      cy.contains('button', /logout/i).click();

      // Assert redirection to the auth page
      cy.location('pathname').should('eq', '/auth');

      // Assert visiting a protected route redirects back to auth
      cy.visit('/');
      cy.location('pathname').should('eq', '/auth');
    });
  });

  // --- Sign Up Tests --- //
  describe('Sign Up', () => {
    beforeEach(() => {
      // Just visit the page, no user creation needed for signup test
      cy.clearCookies(); // Ensure no prior session
      cy.visit(AUTH_URL);
    });

    it('should allow a new user to sign up successfully', () => {
      const uniqueEmail = `test-signup-${Date.now()}@example.com`;

      // 1. Click signup tab
      cy.contains('button', /sign up/i).click();

      // 2. Fill signup form
      cy.get('#signup-email').type(uniqueEmail);
      cy.get('#signup-password').type(PASSWORD);
      // No confirmation field needed

      // 3. Click signup button
      // Need to be specific - find the Sign Up button within the signup form area if possible
      // If the tab and button text are identical, we might need a more specific selector
      // For now, assume clicking the button text after filling the form works
      cy.contains('button', /^Sign Up$/i).click();

      // 4. Assert redirection to dashboard
      cy.url().should('not.include', AUTH_URL);
      cy.location('pathname').should('eq', '/');

      // Optional: Assert that the user is actually logged in (e.g., check for welcome message or specific element)
      // cy.contains(`Welcome, ${uniqueEmail}`).should('be.visible');
    });

    it('should show error for password too short', () => {
      const uniqueEmail = `test-shortpass-${Date.now()}@example.com`;

      // 1. Click signup tab
      cy.contains('button', /sign up/i).click();

      // 2. Fill signup form with short password
      cy.get('#signup-email').type(uniqueEmail);
      cy.get('#signup-password').type('short');

      // 3. Click signup button
      cy.contains('button', /^Sign Up$/i).click();

      // 4. Assert validation error is shown and no redirection
      cy.url().should('include', AUTH_URL); // Remain on auth page
      // Check for backend validation error message (adjust if frontend shows something different)
      cy.contains(/Password is too short/i).should('be.visible');
    });

    it('should show error for email already taken', () => {
      const existingEmail = `test-taken-${Date.now()}@example.com`;
      // Create the user first via API so the email is definitely taken
      cy.createUser(existingEmail, PASSWORD);

      // 1. Click signup tab
      cy.contains('button', /sign up/i).click();

      // 2. Fill signup form with the existing email
      cy.get('#signup-email').type(existingEmail);
      cy.get('#signup-password').type(PASSWORD);

      // 3. Click signup button
      cy.contains('button', /^Sign Up$/i).click();

      // 4. Assert validation error is shown and no redirection
      cy.url().should('include', AUTH_URL); // Remain on auth page
      // Check for backend validation error message
      cy.contains(/Email has already been taken/i).should('be.visible');
    });

    // TODO: Add tests for invalid signup attempts (e.g., password mismatch, email taken)
  });

  // Add more tests: e.g., required fields, signup link, logout flow
});
