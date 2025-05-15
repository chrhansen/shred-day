/// <reference types="cypress" />

describe('Ski Days List Page', () => {
  const PASSWORD = 'password123';
  const DAYS_LIST_URL = '/';
  const RESORT_NAME = "DaysList Resort";
  const SKI_A_NAME = "Test Ski A";
  const SKI_B_NAME = "Test Ski B";
  const DAY1_DATE = '2025-04-15';
  const DAY1_ACTIVITY = 'Friends';
  const DAY2_DATE = '2025-04-10';
  const DAY2_ACTIVITY = 'Training';

  beforeEach(() => {
    // Create user
    const userEmail = `test-dayslist-${Date.now()}@example.com`;
    cy.createUser(userEmail, PASSWORD);

    // --- Intercept API calls ---
    cy.intercept('GET', '/api/v1/days*').as('getDaysList');
    cy.intercept('DELETE', '/api/v1/days/*').as('deleteDay');

    // --- Log in ---
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/v1/session`,
      body: { email: userEmail, password: PASSWORD }
    }).its('status').should('eq', 200); // Ensure login succeeded

    // --- Set up data sequentially AFTER login ---

    // 1. Find Resort
    const resortToFind = "Bergeralm";
    cy.request(`${Cypress.env('apiUrl')}/api/v1/resorts?query=${encodeURIComponent(resortToFind)}`)
      .then((response) => {
        expect(response.body.length, `Seeded resort \"${resortToFind}\" not found`).to.be.at.least(1);
        cy.wrap(response.body[0].id).as('resortId');
        cy.wrap(response.body[0].name).as('resortName');
      });

    // 2. Create Ski A
    cy.request('POST', `${Cypress.env('apiUrl')}/api/v1/skis`, { ski: { name: SKI_A_NAME } })
      .its('body.id').as('skiAId');

    // 3. Create Ski B
    cy.request('POST', `${Cypress.env('apiUrl')}/api/v1/skis`, { ski: { name: SKI_B_NAME } })
      .its('body.id').as('skiBId');

    // 4. Create Days (NOW aliases should be reliably set)
    cy.get('@resortId').then(resortId => {
      cy.get('@skiAId').then(skiAId => {
        cy.request('POST', `${Cypress.env('apiUrl')}/api/v1/days`, { day: { date: DAY1_DATE, resort_id: resortId, ski_ids: [skiAId], activity: DAY1_ACTIVITY } })
          .its('body.id').as('day1Id');
      });
      cy.get('@skiBId').then(skiBId => {
        cy.request('POST', `${Cypress.env('apiUrl')}/api/v1/days`, { day: { date: DAY2_DATE, resort_id: resortId, ski_ids: [skiBId], activity: DAY2_ACTIVITY } })
          .its('body.id').as('day2Id');
      });
    });
  });

  it('should display the list of logged ski days with correct content', function() {
    cy.visit(DAYS_LIST_URL);
    cy.wait('@getDaysList');

    // Check title - Title is now in the Navbar
    cy.get('.flex-1.text-center').contains('span', '2024/25 Season').should('be.visible');

    // Use the aliased resort name for checking content
    cy.get('@resortName').then(resortName => {
      // Check Day 1 content
      cy.get(`[data-testid="edit-day-${this.day1Id}"]`).closest('.flex.items-center')
        .should('contain.text', 'Apr 15, 2025')
        .and('contain.text', resortName) // Use aliased name
        .and('contain.text', SKI_A_NAME)
        .and('contain.text', DAY1_ACTIVITY);

      // Check Day 2 content
      cy.get(`[data-testid="edit-day-${this.day2Id}"]`).closest('.flex.items-center')
        .should('contain.text', 'Apr 10, 2025')
        .and('contain.text', resortName) // Use aliased name
        .and('contain.text', SKI_B_NAME)
        .and('contain.text', DAY2_ACTIVITY);
    });
  });

  it('should navigate to the edit page when edit is clicked', function() {
    cy.visit(DAYS_LIST_URL);
    cy.wait('@getDaysList');

    // Find dropdown trigger for day 1
    cy.get(`[data-testid="edit-day-${this.day1Id}"]`).closest('.flex.items-center').find('button[aria-haspopup="menu"]').click();

    // Click Edit item
    cy.contains('[role="menuitem"]', 'Edit').click();

    // Verify URL
    cy.location('pathname').should('eq', `/days/${this.day1Id}/edit`);
    cy.contains('h1', 'Edit Ski Day').should('be.visible');
  });

  it('should show confirmation and delete a day when delete is clicked', function() {
    cy.visit(DAYS_LIST_URL);
    cy.wait('@getDaysList');

    // Ensure both days are visible initially
    cy.get(`[data-testid="edit-day-${this.day1Id}"]`).should('be.visible');
    cy.get(`[data-testid="edit-day-${this.day2Id}"]`).should('be.visible');

    // Stub window.confirm
    cy.on('window:confirm', (str) => {
      expect(str).to.contain('Are you sure you want to delete');
      return true; // Simulate user clicking OK
    });

    // Find dropdown trigger for day 1
    cy.get(`[data-testid="edit-day-${this.day1Id}"]`).closest('.flex.items-center').find('button[aria-haspopup="menu"]').click();

    // Click Delete item
    cy.contains('[role="menuitem"]', 'Delete').click();

    // Wait for API call and check status
    cy.wait('@deleteDay').its('response.statusCode').should('eq', 204);

    // Check toast
    cy.contains('Ski day deleted successfully!').should('be.visible');

    // Check Day 1 is gone
    cy.get(`[data-testid="edit-day-${this.day1Id}"]`).should('not.exist');
    // Check Day 2 is still present
    cy.get(`[data-testid="edit-day-${this.day2Id}"]`).should('be.visible');
  });

  it('should display a settings icon that navigates to the settings page', () => {
    cy.visit(DAYS_LIST_URL);
    cy.wait('@getDaysList');

    // Click the hamburger menu icon to open the drawer
    cy.get('[aria-label="Open menu"]').should('be.visible').click();

    // Inside the drawer, find the button containing "Settings" text and click it
    cy.contains('button', 'Settings').should('be.visible').click();

    // Verify navigation to the settings page
    cy.url().should('include', '/settings');
    cy.contains('h1', 'Settings').should('be.visible'); // Check for settings page title
  });

  it('should display a New Day button that navigates to the log day page', () => {
    cy.visit(DAYS_LIST_URL);
    cy.wait('@getDaysList');

    // Find the "New Day" button and click it
    cy.contains('button', 'New Day')
      .should('be.visible')
      .click();

    // Verify navigation to the new day page
    cy.location('pathname').should('eq', '/new');
    cy.contains('h1', 'Log New Ski Day').should('be.visible');
  });

  it('should open the ski day detail popover when a day item is clicked', function() {
    cy.visit(DAYS_LIST_URL);
    cy.wait('@getDaysList');

    // Ensure there's at least one day item (using the ID of the first created day)
    cy.get(`[data-testid="ski-day-item-${this.day1Id}"]`).should('be.visible');

    // Click the first ski day item
    cy.get(`[data-testid="ski-day-item-${this.day1Id}"]`).first().click();

    // Check that the ski day detail modal is visible
    cy.get('[data-testid="ski-day-detail-modal"]').should('be.visible');

    // Optional: Check for some content within the modal to be more specific
    cy.get('[data-testid="ski-day-detail-modal"]').should('contain.text', 'April 15, 2025');
    cy.get('@resortName').then(resortName => {
      cy.get('[data-testid="ski-day-detail-modal"]').should('contain.text', resortName);
    });
  });

});
