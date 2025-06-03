/// <reference types="cypress" />

describe('Google OAuth Callback', () => {
  const CALLBACK_URL = '/auth/callback';
  const PASSWORD = 'password123';

  beforeEach(() => {
    // Create a user that exists in the system for Google sign-in to work
    const uniqueEmail = `test-google-${Date.now()}@example.com`;
    cy.createUser(uniqueEmail, PASSWORD).then(() => {
      cy.wrap(uniqueEmail).as('userEmail');
      cy.clearCookies();
    });
  });

  describe('Google OAuth Error Handling', () => {
    it('should handle Google access_denied error', () => {
      // Visit callback page with Google error parameters (simulating what Google would send)
      cy.visit(`${CALLBACK_URL}?error=access_denied&error_description=The user denied the request`);

      // Should show error UI
      cy.contains('Sign-in Failed').should('be.visible');
      cy.contains('The user denied the request').should('be.visible');

      // Should provide retry options
      cy.contains('button', 'Try Again').should('be.visible');
      cy.contains('button', 'Go to Homepage').should('be.visible');
    });

    it('should handle generic Google OAuth error', () => {
      // Visit callback page with generic error (simulating what Google would send)
      cy.visit(`${CALLBACK_URL}?error=server_error`);

      // Should show error UI with fallback message
      cy.contains('Sign-in Failed').should('be.visible');
      cy.contains('OAuth error: server_error').should('be.visible');
    });
  });

  describe('Missing Parameters', () => {
    it('should handle missing authorization code', () => {
      // Visit callback page without code parameter
      cy.visit(`${CALLBACK_URL}?state=test_state`);

      // Should show error after timeout (the component waits 300ms then checks again)
      cy.contains('Sign-in Failed').should('be.visible');
      cy.contains('Authorization code or state not received from Google').should('be.visible');
    });

    it('should handle missing state parameter', () => {
      // Visit callback page without state parameter
      cy.visit(`${CALLBACK_URL}?code=test_auth_code`);

      // Should show error after timeout
      cy.contains('Sign-in Failed').should('be.visible');
      cy.contains('Authorization code or state not received from Google').should('be.visible');
    });

    it('should handle completely missing parameters', () => {
      // Visit callback page without any parameters
      cy.visit(CALLBACK_URL);

      // Should show error after timeout
      cy.contains('Sign-in Failed').should('be.visible');
      cy.contains('Authorization code or state not received from Google').should('be.visible');
    });
  });

  describe('Backend Integration', () => {
    it('should show error when trying to complete sign-in with invalid codes', function() {
      // Visit callback page with fake but valid-looking parameters
      // This will make real API calls to the backend, which should reject the fake codes
      cy.visit(`${CALLBACK_URL}?code=fake_auth_code&state=fake_state`);

      // Should show loading state initially
      cy.contains('Signing you in...').should('be.visible');

      // Should eventually show error after backend rejects the fake codes
      cy.contains('Sign-in Failed', { timeout: 10000 }).should('be.visible');

      // The error message will depend on what the backend returns for invalid codes
      // Could be "Invalid state", "Invalid token", or similar
    });
  });

  describe('Error Recovery', () => {
    it('should allow user to try again from error page', () => {
      // Visit callback page with error
      cy.visit(`${CALLBACK_URL}?error=access_denied&error_description=The user denied the request`);

      // Should show error UI
      cy.contains('Sign-in Failed').should('be.visible');

      // Click "Try Again" button
      cy.contains('button', 'Try Again').click();

      // Should redirect to auth page
      cy.location('pathname').should('eq', '/auth');
    });

    it('should allow user to go to homepage from error page', () => {
      // Visit callback page with error
      cy.visit(`${CALLBACK_URL}?error=access_denied&error_description=The user denied the request`);

      // Should show error UI
      cy.contains('Sign-in Failed').should('be.visible');

      // Click "Go to Homepage" button
      cy.contains('button', 'Go to Homepage').click();

      // Should redirect to home page (which will redirect to auth if not logged in)
      cy.location('pathname').should('eq', '/auth');
    });
  });

  describe('Loading States', () => {
    it('should show loading state when processing callback', function() {
      // Visit callback page with fake parameters that will trigger API calls
      cy.visit(`${CALLBACK_URL}?code=fake_auth_code&state=fake_state`);

      // Should immediately show loading state
      cy.contains('Signing you in...').should('be.visible');
      cy.contains('Please wait while we complete your Google sign-in').should('be.visible');
      cy.get('.animate-spin').should('be.visible');

      // Will eventually fail due to fake codes, but we're testing the loading state
    });
  });
});
