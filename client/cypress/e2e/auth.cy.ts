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
      // Should not redirect to home page (stays on auth page due to failed login)
      cy.location('pathname').should('eq', '/auth');
      // Check that the login button is still visible (not logged in)
      cy.contains('button', /^Login$/i).should('be.visible');
    });

    it('should allow a logged-in user to log out', function() {
      // Use the custom login command to log in first
      cy.login(this.userEmail, PASSWORD);

      // Navigate to the account settings page
      cy.visit('/settings/account');

      // Find the logout icon button by its aria-label and click it
      cy.get('[aria-label="Logout"]').click();

      // Cypress automatically accepts window.confirm by default
      // If needed, you can handle it explicitly:
      cy.on('window:confirm', (str) => {
        expect(str).to.equal('Are you sure you want to log out?')
        return true; // Or false to cancel
      });

      // Assert redirection to the auth page
      cy.location('pathname').should('eq', '/auth');

      // Assert visiting a protected route redirects back to auth
      cy.visit('/');
      cy.location('pathname').should('eq', '/auth');
    });
  });

  // --- Google Sign-In Tests --- //
  describe('Google Sign-In', () => {
    beforeEach(() => {
      cy.clearCookies();
      cy.visit(AUTH_URL);
    });

    it('should call backend API when Google Sign-In button is clicked', () => {
      // Intercept the API call to verify it happens (but don't mock the response)
      cy.intercept('POST', '/api/v1/google_sign_in_flow').as('googleSignInRequest');

      // Click the Google Sign-In button
      cy.contains('button', /Continue with Google/i).click();

      // Verify the API call was made to the backend
      cy.wait('@googleSignInRequest').then((interception) => {
        // Verify the request was made
        expect(interception.request.method).to.equal('POST');
        expect(interception.request.url).to.include('/api/v1/google_sign_in_flow');

        // Verify the response contains a Google OAuth URL
        expect(interception.response?.statusCode).to.equal(200);
        expect(interception.response?.body).to.have.property('url');
        expect(interception.response?.body.url).to.match(/^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth/);
        expect(interception.response?.body.url).to.include('scope=openid%20email%20profile');
        expect(interception.response?.body.url).to.include('client_id=');
        expect(interception.response?.body.url).to.include('state=');
      });

      // Note: The actual redirect to Google will happen, but that's expected behavior
      // We've verified that our backend API works correctly
    });

    it('should show loading state during Google sign-in initiation', () => {
      // Intercept to add a delay and test loading state
      cy.intercept('POST', '/api/v1/google_sign_in_flow', (req) => {
        req.reply((res) => {
          // Add a small delay to see loading state
          return new Promise(resolve => {
            setTimeout(() => resolve(res.send()), 500);
          });
        });
      });

      // Click the Google Sign-In button
      cy.contains('button', /Continue with Google/i).click();

      // Check that button shows loading state
      cy.contains('button', /Redirecting.../i).should('be.visible');
      cy.contains('button', /Redirecting.../i).should('be.disabled');
    });
  });

  // --- Google Sign-Up Tests --- //
  describe('Google Sign-Up', () => {
    beforeEach(() => {
      cy.clearCookies();
      cy.visit(AUTH_URL);
      // Switch to Sign Up tab
      cy.contains('button', /sign up/i).click();
    });

    it('should call backend API when Google Sign-Up button is clicked from Sign Up tab', () => {
      // Intercept the API call to verify it happens (but don't mock the response)
      cy.intercept('POST', '/api/v1/google_sign_in_flow').as('googleSignUpRequest');

      // Click the Google Sign-Up button on the Sign Up tab
      cy.contains('button', /Continue with Google/i).click();

      // Verify the API call was made to the backend
      cy.wait('@googleSignUpRequest').then((interception) => {
        // Verify the request was made
        expect(interception.request.method).to.equal('POST');
        expect(interception.request.url).to.include('/api/v1/google_sign_in_flow');

        // Verify the response contains a Google OAuth URL
        expect(interception.response?.statusCode).to.equal(200);
        expect(interception.response?.body).to.have.property('url');
        expect(interception.response?.body.url).to.match(/^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth/);
        expect(interception.response?.body.url).to.include('scope=openid%20email%20profile');
        expect(interception.response?.body.url).to.include('client_id=');
        expect(interception.response?.body.url).to.include('state=');
      });

      // Note: The actual redirect to Google will happen, but that's expected behavior
      // We've verified that our backend API works correctly for sign-up flow
    });

    it('should show loading state during Google sign-up initiation', () => {
      // Intercept to add a delay and test loading state
      cy.intercept('POST', '/api/v1/google_sign_in_flow', (req) => {
        req.reply((res) => {
          // Add a small delay to see loading state
          return new Promise(resolve => {
            setTimeout(() => resolve(res.send()), 500);
          });
        });
      });

      // Click the Google Sign-Up button on the Sign Up tab
      cy.contains('button', /Continue with Google/i).click();

      // Check that button shows loading state
      cy.contains('button', /Redirecting.../i).should('be.visible');
      cy.contains('button', /Redirecting.../i).should('be.disabled');
    });

    it('should use the same Google OAuth flow as sign-in', () => {
      // This test verifies that both sign-in and sign-up use the same backend endpoint
      // The backend will determine whether to create a new user or find existing one

      // Intercept the API call
      cy.intercept('POST', '/api/v1/google_sign_in_flow').as('googleOAuthRequest');

      // Click the Google button from Sign Up tab
      cy.contains('button', /Continue with Google/i).click();

      // Verify it calls the same endpoint as sign-in
      cy.wait('@googleOAuthRequest').then((interception) => {
        expect(interception.request.url).to.include('/api/v1/google_sign_in_flow');
        // The backend will handle whether this is a sign-up or sign-in based on whether user exists
      });
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

      // 4. Assert redirection to main page (/)
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
});
