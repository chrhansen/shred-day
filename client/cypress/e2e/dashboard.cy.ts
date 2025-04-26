/// <reference types="cypress" />

describe('Dashboard / Stats', () => {
  const PASSWORD = 'password123';

  beforeEach(() => {
    // Create a unique user for each test
    const userEmail = `test-dash-${Date.now()}@example.com`;
    cy.createUser(userEmail, PASSWORD).as('userData');

    // Log in via API to get session cookie set for subsequent requests
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/v1/session`,
      body: { email: userEmail, password: PASSWORD }
    }).then((resp) => {
      expect(resp.status).to.eq(200);
      cy.wrap(userEmail).as('userEmail');

      // Data setup: Find specific seeded resorts via search API and create skis

      // Find "Le Massif" ID
      cy.request(`${Cypress.env('apiUrl')}/api/v1/resorts?query=Le%20Massif`).then((response) => {
        expect(response.body.length, 'Expected to find "Le Massif" via search').to.be.at.least(1);
        cy.wrap(response.body[0].id).as('resortLeMassifId');
      });

      // Find "Maiko Snow Resort" ID
      cy.request(`${Cypress.env('apiUrl')}/api/v1/resorts?query=Maiko%20Snow%20Resort`).then((response) => {
        expect(response.body.length, 'Expected to find "Maiko Snow Resort" via search').to.be.at.least(1);
        cy.wrap(response.body[0].id).as('resortMaikoId');
      });

      // Create skis for the user (these POST requests should still work)
      cy.request('POST', `${Cypress.env('apiUrl')}/api/v1/skis`, { ski: { name: 'Test Ski 1' } }).its('body.id').as('ski1Id');
      cy.request('POST', `${Cypress.env('apiUrl')}/api/v1/skis`, { ski: { name: 'Test Ski 2' } }).its('body.id').as('ski2Id');
    });
  });

  it('should display correct stats based on logged days', function() {
    // Log some days using the aliases for IDs
    cy.logDay({ date: '2024-01-10', resort_id: this.resortLeMassifId, ski_id: this.ski1Id });
    cy.logDay({ date: '2024-01-11', resort_id: this.resortLeMassifId, ski_id: this.ski1Id }); // Same resort & ski
    cy.logDay({ date: '2024-01-12', resort_id: this.resortMaikoId, ski_id: this.ski2Id }); // Different resort & ski

    // Visit the dashboard page
    cy.visit('/');

    // Assertions for Stats using data-testid

    // Total Days (Label: "Days Skied" -> testid: days-skied-value)
    cy.get('[data-testid="days-skied-value"]').should('contain.text', '3');

    // Unique Resorts (Assuming Label: "Unique Resorts" -> testid: unique-resorts-value)
    cy.get('[data-testid="resorts-visited-value"]').should('contain.text', '2');

    // Most Used Ski (Assuming Label: "Most Used Ski" -> testid: most-used-ski-value)
    cy.get('[data-testid="most-used-ski-value"]').should('contain.text', 'Test Ski 1');
  });

  it('should display zero stats for a new user with no days', function() {
    // Test setup happens in beforeEach, but we don't log days here.
    cy.visit('/');

    cy.get('[data-testid="days-skied-value"]').should('contain.text', '0');
    cy.get('[data-testid="resorts-visited-value"]').should('contain.text', '0');
    cy.get('[data-testid="most-used-ski-value"]').should('contain.text', 'N/A');
  });

});
