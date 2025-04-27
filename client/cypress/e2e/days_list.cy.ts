/// <reference types="cypress" />

describe('Ski Days List Page', () => {
  const PASSWORD = 'password123';
  const DAYS_LIST_URL = '/days';
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
        cy.request('POST', `${Cypress.env('apiUrl')}/api/v1/days`, { day: { date: DAY1_DATE, resort_id: resortId, ski_id: skiAId, activity: DAY1_ACTIVITY } })
          .its('body.id').as('day1Id');
      });
      cy.get('@skiBId').then(skiBId => {
        cy.request('POST', `${Cypress.env('apiUrl')}/api/v1/days`, { day: { date: DAY2_DATE, resort_id: resortId, ski_id: skiBId, activity: DAY2_ACTIVITY } })
          .its('body.id').as('day2Id');
      });
    });
  });

  it('should display the list of logged ski days with correct content', function() {
    cy.visit(DAYS_LIST_URL);
    cy.wait('@getDaysList');

    // Check title
    cy.contains('h1', 'Ski Days').should('be.visible');

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

});
