/// <reference types="cypress" />

describe('Password recovery', () => {
  const token = 'r'.repeat(43);
  const password = 'replacement-password';

  beforeEach(() => cy.clearCookies());

  it('offers recovery from sign-in and returns a generic response from the real API', () => {
    cy.intercept('POST', '/api/v1/password_reset_requests').as('requestReset');
    cy.visit('/auth');
    cy.contains('a', 'Forgot password?').click();
    cy.get('#reset-email').type('missing-recovery@example.test');
    cy.contains('button', 'Send reset link').click();
    cy.wait('@requestReset').then(({ request, response }) => {
      expect(request.body).to.deep.equal({ email: 'missing-recovery@example.test' });
      expect(response?.statusCode).to.equal(202);
      expect(response?.body).not.to.have.property('token');
    });
    cy.get('[role=status]').should('contain', 'If an account exists');
    cy.contains('a', 'Back to sign in').click();
    cy.location('pathname').should('eq', '/auth');
  });

  it('scrubs the fragment, validates matching passwords and requires a fresh sign-in', () => {
    cy.intercept('POST', '/api/v1/password_resets', { statusCode: 200, body: { message: 'Password reset.' } }).as('reset');
    cy.intercept('DELETE', '/api/v1/sessions', { statusCode: 200, body: { message: 'Signed out.' } });
    cy.visit(`/reset-password#token=${token}`);
    cy.location('hash').should('eq', '');
    cy.get('@reset.all').should('have.length', 0);
    cy.get('#new-password').type(password, { log: false });
    cy.get('#confirm-password').type('different-password', { log: false });
    cy.contains('button', 'Reset password').click();
    cy.contains('Your passwords do not match').should('be.visible');
    cy.get('@reset.all').should('have.length', 0);
    cy.get('#confirm-password').clear().type(password, { log: false });
    cy.contains('button', 'Reset password').click();
    cy.wait('@reset').then(({ request }) => {
      expect(request.url).not.to.include(token);
      expect(request.body).to.deep.equal({ token, password, password_confirmation: password });
    });
    cy.contains('h1', 'Password reset').should('be.visible');
    cy.get('#new-password').should('not.exist');
    cy.contains('a', 'Go to sign in').click();
    cy.location('pathname').should('eq', '/auth');
  });

  it('offers another link after an expired proof', () => {
    cy.intercept('POST', '/api/v1/password_resets', { statusCode: 422,
      body: { error: 'This password reset link is invalid or has expired. Request a new one.' } }).as('expired');
    cy.visit(`/reset-password#token=${token}`);
    cy.get('#new-password').type(password, { log: false });
    cy.get('#confirm-password').type(password, { log: false });
    cy.contains('button', 'Reset password').click();
    cy.wait('@expired');
    cy.get('[role=alert]').should('contain', 'invalid or has expired');
    cy.get('#new-password').should('not.exist');
    cy.get('#reset-email').should('be.visible');
    cy.location('hash').should('eq', '');
  });
});
