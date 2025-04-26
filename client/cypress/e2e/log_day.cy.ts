/// <reference types="cypress" />

describe('Log a Ski Day', () => {
  const PASSWORD = 'password123';
  const DASHBOARD_URL = '/dashboard';
  const LOG_DAY_URL = '/log';
  // Use known resort names from seeds
  const RESORT_A_NAME = "Le Massif";
  const SKI_NAME = "Test LogDay Ski";

  beforeEach(() => {
    // Create a unique user for each test
    const userEmail = `test-logday-${Date.now()}@example.com`;
    cy.createUser(userEmail, PASSWORD);

    // Log in via API to get session cookie set for subsequent requests
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/v1/session`,
      body: { email: userEmail, password: PASSWORD }
    }).then((resp) => {
      expect(resp.status).to.eq(200);
      cy.wrap(userEmail).as('userEmail');

      // Data setup: Find seeded resort and create a ski for this user

      // Find Resort A ID
      cy.request(`${Cypress.env('apiUrl')}/api/v1/resorts?query=${encodeURIComponent(RESORT_A_NAME)}`).then((response) => {
        expect(response.body.length, `Seeded resort \"${RESORT_A_NAME}\" not found`).to.be.at.least(1);
        cy.wrap(response.body[0].id).as('resortAId');
      });

      // Create a ski for the user
      cy.request('POST', `${Cypress.env('apiUrl')}/api/v1/skis`, { ski: { name: SKI_NAME } }).its('body.id').as('skiId');
    });

    // Start on the dashboard page
    cy.visit(DASHBOARD_URL);
  });

  it('should navigate to log day form, fill it, and submit successfully', function() {
    // 1. Click Log a day button
    cy.contains('button', /Log a day/i).click();

    // 2. Verify navigation
    cy.location('pathname').should('eq', LOG_DAY_URL);

    // --- Form Interaction using data-testid ---

    // 3. Select Date (e.g., 15th of the current month shown)
    cy.contains('button[role="gridcell"]', /^15$/).click();

    // 4. Select Resort
    cy.get('[data-testid="find-resort-button"]').click();
    cy.get('[data-testid="resort-search-input"]').type(RESORT_A_NAME); // RESORT_A_NAME is "Le Massif"
    // Use the testId generated from the name
    cy.get(`[data-testid="resort-option-${RESORT_A_NAME.toLowerCase().replace(/\s+/g, '-')}"]`).click();

    // 5. Select Ski
    // Wait for loading to finish
    cy.contains('[data-testid="loading-skis"]', /Loading skis.../i).should('not.exist');
    // Select the ski by its text content
    cy.contains('button', SKI_NAME).click();

    // 6. Select Activity
    cy.contains('button', /Friends/i).click(); // Click "Friends"

    // 7. Submit Form
    cy.get('[data-testid="save-button"]').click();

    // --- Assertions ---
    // Verify success: redirect back to dashboard and maybe check stats/toast
    cy.location('pathname').should('eq', DASHBOARD_URL);
    // Optional: Check for success toast (requires knowing its selector/text)
    cy.contains('Ski day logged successfully!').should('be.visible');

    // Optional: Verify stats updated on dashboard (might need to wait/reload)
    cy.get('[data-testid="days-skied-value"]').should('contain.text', '1');
  });

});
