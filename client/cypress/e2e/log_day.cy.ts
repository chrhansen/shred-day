/// <reference types="cypress" />

describe('Log and Edit Ski Day', () => {
  const PASSWORD = 'password123';
  const DASHBOARD_URL = '/';
  const LOG_DAY_URL = '/new';
  const DAYS_LIST_URL = '/days';
  // Use known resort names from seeds
  const RESORT_A_NAME = "Le Massif";
  const SKI_A_NAME = "Test Ski Alpha";
  const SKI_B_NAME = "Test Ski Bravo";
  const INITIAL_ACTIVITY = "Friends";
  const EDITED_ACTIVITY = "Training";

  beforeEach(() => {
    // Create a unique user for each test
    const userEmail = `test-editday-${Date.now()}@example.com`;
    cy.createUser(userEmail, PASSWORD);

    // --- Intercept initial data fetches ---
    cy.intercept('GET', '/api/v1/skis*').as('getSkis');
    cy.intercept('GET', '/api/v1/recent_resorts*').as('getRecentResorts');
    cy.intercept('GET', '/api/v1/stats*').as('getStats');
    cy.intercept('GET', '/api/v1/days*').as('getDaysList');

    // Log in via API
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/v1/session`,
      body: { email: userEmail, password: PASSWORD }
    }).then((resp) => {
      expect(resp.status).to.eq(200);
      cy.wrap(userEmail).as('userEmail');
      // NOTE: Cookies might be set here, but cy.request doesn't use browser jar directly
    });

    // --- Visit page AFTER login to establish browser session ---
    cy.visit(DASHBOARD_URL);
    cy.wait('@getStats');

    // --- Perform COMMON data setup AFTER visiting ---
    // Find Resort A ID
    cy.request(`${Cypress.env('apiUrl')}/api/v1/resorts?query=${encodeURIComponent(RESORT_A_NAME)}`).then((response) => {
      expect(response.body.length, `Seeded resort \"${RESORT_A_NAME}\" not found`).to.be.at.least(1);
      cy.wrap(response.body[0].id).as('resortAId');
    });

    // Create two skis for the user (needed by both tests)
    cy.request('POST', `${Cypress.env('apiUrl')}/api/v1/skis`, { ski: { name: SKI_A_NAME } }).its('body.id').as('skiAId');
    cy.request('POST', `${Cypress.env('apiUrl')}/api/v1/skis`, { ski: { name: SKI_B_NAME } }).its('body.id').as('skiBId');
  });

  it('should navigate to log day form, fill it, and submit successfully', function() {
    // Already on dashboard, stats likely loaded during beforeEach

    // 1. Click Log a day button
    cy.contains('button', /Log a day/i).click();
    cy.location('pathname').should('eq', LOG_DAY_URL);

    // Wait for LogDay page data to load
    cy.wait('@getSkis');
    cy.wait('@getRecentResorts');

    // Select Date
    cy.contains('button[role="gridcell"]', /^15$/).click();

    // Select Resort
    cy.get('[data-testid="find-resort-button"]').should('not.be.disabled').click();
    cy.get('[data-testid="resort-search-input"]').should('not.be.disabled').type(RESORT_A_NAME);
    cy.intercept('GET', `/api/v1/resorts?query=*`).as('searchResorts');
    cy.wait('@searchResorts');
    cy.get(`[data-testid="resort-option-${RESORT_A_NAME.toLowerCase().replace(/\s+/g, '-')}"]`).click();
    // --- End Restore ---

    // Select Ski
    cy.contains('button', SKI_A_NAME).should('not.be.disabled').click();
    // Select Activity
    cy.contains('button', /Friends/i).should('not.be.disabled').click();

    // Submit Form
    cy.intercept('POST', '/api/v1/days').as('logDay');
    cy.get('[data-testid="save-day-button"]').click();
    cy.wait('@logDay').its('response.statusCode').should('eq', 201);
    cy.location('pathname').should('eq', DASHBOARD_URL);
    cy.contains('Ski day logged successfully!').should('be.visible');

    // Verify stats updated on dashboard
    cy.get('[data-testid="days-skied-value"]').should('contain.text', '1');
  });

  it('should allow editing an existing ski day', function() {
    // --- Test-specific setup: Create the day to edit ---
    // We need to access aliases set in beforeEach (resortAId, skiAId)
    cy.get('@resortAId').then(resortAId => {
      cy.get('@skiAId').then(skiAId => {
          const initialDayPayload = {
              day: {
                  date: '2025-03-10',
                  resort_id: resortAId,
                  ski_id: skiAId,
                  activity: INITIAL_ACTIVITY
              }
          };
          cy.request('POST', `${Cypress.env('apiUrl')}/api/v1/days`, initialDayPayload)
            .its('body.id').as('dayId'); // Save the ID of the created day
      });
    });

    // --- Set up intercepts for this test's actions ---
    // Need to wait for dayId alias to be set before using it here
    cy.get('@dayId').then(dayId => {
      cy.intercept('GET', `/api/v1/days/${dayId}`).as('getDay');
      cy.intercept('PATCH', `/api/v1/days/${dayId}`).as('updateDay');
    });

    // --- Test execution ---
    // 1. Navigate to Days List page
    cy.visit(DAYS_LIST_URL);
    cy.wait('@getDaysList');

    // 2. Find the created day and click Edit (wait for dayId alias again)
    cy.get('@dayId').then(dayId => {
      cy.get(`[data-testid="edit-day-${dayId}"]`).should('be.visible').click();
    });

    // 3. Verify navigation (wait for dayId alias again)
    cy.get('@dayId').then(dayId => {
      cy.location('pathname').should('eq', `/days/${dayId}/edit`);
    });

    // 4. Wait for form data to load
    cy.wait('@getDay');
    cy.wait('@getSkis');
    cy.wait('@getRecentResorts');

    // 5. Verify initial form state
    // Verify the calendar is showing the correct month (March 2025) first
    cy.get('#react-day-picker-1').should('contain.text', 'March 2025');
    // Now verify the 10th is the active tile using the aria-selected attribute
    cy.get('button[aria-selected="true"]').should('contain.text', '10');
    // Target the testid for the RECENT resort pill
    cy.get('[data-testid="recent-resort-le-massif"]').should('contain.text', RESORT_A_NAME);
    // Target the specific testid for the selected ski pill and check for selection class
    cy.get('[data-testid="ski-option-test-ski-alpha"].bg-gradient-to-r').should('exist');
    // Target the specific testid for the selected activity pill and check for selection class
    cy.get('[data-testid="activity-friends"].bg-gradient-to-r').should('exist');

    // 6. Modify the form
    cy.contains('button.rdp-button_reset.rdp-button', /^20$/).click();
    cy.contains('button', SKI_B_NAME).should('not.be.disabled').click();
    cy.contains('button', EDITED_ACTIVITY).should('not.be.disabled').click();

    // 7. Submit the update
    cy.get('[data-testid="save-day-button"]').click();

    // 8. Wait for update request and verify success
    cy.wait('@updateDay').its('response.statusCode').should('eq', 200);
    cy.location('pathname').should('eq', DAYS_LIST_URL);
    cy.contains('Ski day updated successfully!').should('be.visible');

    // 9. Verify changes are reflected in the list (wait for dayId alias)
    cy.wait('@getDaysList');
    cy.get('@dayId').then(dayId => {
      cy.get(`[data-testid="edit-day-${dayId}"]`).closest('.flex.items-center.gap-4.p-4')
        .should('contain.text', 'Mar 20, 2025')
        .and('contain.text', SKI_B_NAME)
        .and('contain.text', EDITED_ACTIVITY);
    });
  });
});
