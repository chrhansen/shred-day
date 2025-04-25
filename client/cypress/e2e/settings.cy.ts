/// <reference types="cypress" />

describe('Settings Page', () => {
  const PASSWORD = 'password123';
  const DASHBOARD_URL = '/dashboard';
  const SETTINGS_URL = '/settings';

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

  it('should navigate to the settings page when clicking the settings icon on the dashboard', () => {
    cy.visit(DASHBOARD_URL);
    // Find the settings button using its aria-label and click it
    cy.get('[aria-label="Settings"]').click();

    // Verify navigation to the settings page
    cy.location('pathname').should('eq', SETTINGS_URL);

    // Optional: Verify some content on the settings page to be sure
    cy.contains('h1', /Settings/i).should('be.visible');
  });

  // New test case for adding a ski
  it('should allow adding a new ski', () => {
    cy.visit(SETTINGS_URL);

    const newSkiName = `My Test Ski ${Date.now()}`;

    // Find the input field, type the name, and submit the form
    cy.get('#new-ski-name').type(newSkiName);
    cy.get('form').contains('button', /Add/i).click();

    // Verify success toast (optional but good)
    cy.contains('Ski added successfully!').should('be.visible');

    // Verify the new ski appears in the list
    // Find the card content containing the list and check for the ski name
    cy.contains('h3', 'My Skis').parent().within(() => {
        cy.contains('li', newSkiName).should('be.visible');
    });
  });
});
