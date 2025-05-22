/// <reference types="cypress" />

describe('Skis Page', () => {
  const ROOT_URL = '/';
  const PASSWORD = 'password123';
  const SKIS_URL = '/settings/skis';

  beforeEach(() => {
    // Create a unique user for each test
    const userEmail = `test-settings-${Date.now()}@example.com`;
    cy.createUser(userEmail, PASSWORD);

    // Log in via API to get session cookie set for subsequent requests
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/v1/session`,
      body: { email: userEmail, password: PASSWORD }
    }).then((resp) => {
      expect(resp.status).to.eq(200);
    });

    // No need to visit here, each test will navigate as needed
  });

  it('should navigate to the skis page when clicking Manage Skis in the navbar', () => {
    cy.visit(ROOT_URL);

    // Click the hamburger menu icon to open the drawer
    cy.get('[aria-label="Open menu"]').should('be.visible').click();

    // Inside the drawer, find the button containing "Settings" text and click it
    // We ensure it's visible in case the drawer is still animating
    cy.contains('button', 'Manage Skis').should('be.visible').click();

    // Verify navigation to the settings page
    cy.location('pathname').should('eq', SKIS_URL);

    // Optional: Verify some content on the settings page to be sure
    cy.contains(/Your Skis/i).should('be.visible');
  });

  // New test case for adding a ski
  it('should allow adding a new ski', () => {
    cy.visit(SKIS_URL);

    const newSkiName = `My Test Ski ${Date.now()}`;

    // Find the input field, type the name, and submit the form
    cy.get('#new-ski-name').type(newSkiName);
    cy.get('form').contains('button', /Add/i).click();

    // Verify success toast (optional but good)
    cy.contains('Ski added successfully!').should('be.visible');

    // Verify the new ski appears in the list
    cy.contains('li', newSkiName).should('be.visible');
  });
});
