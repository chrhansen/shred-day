describe('CSV Export Page', () => {
  const PASSWORD = 'password123';
  const CSV_EXPORT_URL = '/csv-export';
  const ROOT_URL = '/';
  const RESORT_TO_FIND = "Le Massif"; // Using a known seeded resort

  beforeEach(() => {
    const userEmail = `test-csvexport-${Date.now()}@example.com`;
    cy.createUser(userEmail, PASSWORD); // Custom command from your setup

    // Intercept API calls
    cy.intercept('GET', '/api/v1/account*').as('getAccount');
    cy.intercept('GET', '/api/v1/csv_export').as('getCsvExportData');
    cy.intercept('POST', '/api/v1/csv_export').as('downloadCsv');

    // Log in via API to establish session
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/v1/sessions`,
      body: { email: userEmail, password: PASSWORD },
    }).its('status').should('eq', 200);

    // 1. Find Resort ID and Name
    cy.request(`${Cypress.env('apiUrl')}/api/v1/resorts?query=${encodeURIComponent(RESORT_TO_FIND)}`)
      .then((response) => {
        expect(response.body.length, `Seeded resort "${RESORT_TO_FIND}" not found`).to.be.at.least(1);
        cy.wrap(response.body[0].id).as('resortId');
        cy.wrap(response.body[0].name).as('resortName');
      });

    // Create Days relative to actual current date (Rails backend will use its Date.current)
    // User's season_start_day is assumed to be default '09-01' from createUser/backend
    cy.get('@resortId').then(resortId => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      // Determine which year's season we're in based on Sept 1 start
      // If before Sept 1, we're still in last year's season
      const inCurrentSeasonYear = currentMonth >= 9;
      const currentSeasonYear = inCurrentSeasonYear ? currentYear : currentYear - 1;
      const lastSeasonYear = currentSeasonYear - 1;

      // Create dates that clearly fall within each season (Nov 15 is always after Sept 1)
      const currentSeasonDayDate = `${currentSeasonYear}-11-15`;
      const lastSeasonDayDate = `${lastSeasonYear}-11-15`;

      cy.log(`Creating day for current season: ${currentSeasonDayDate}`);
      cy.request('POST', `${Cypress.env('apiUrl')}/api/v1/days`, { day: { date: currentSeasonDayDate, resort_id: resortId } });
      cy.log(`Creating day for last season: ${lastSeasonDayDate}`);
      cy.request('POST', `${Cypress.env('apiUrl')}/api/v1/days`, { day: { date: lastSeasonDayDate, resort_id: resortId } });
    });

    // Visit root page to ensure session cookies are set in the browser for subsequent cy.visit()
    cy.visit(ROOT_URL);
    cy.wait('@getAccount'); // Wait for initial page load dependencies
  });

  it('should navigate to the CSV Export page and display initial elements', () => {
    cy.get('[data-testid="navbar-hamburger"]').click();
    cy.contains('ul li button', 'To CSV').click(); // More specific selector for the button in the list

    cy.location('pathname').should('eq', CSV_EXPORT_URL);
    cy.wait('@getCsvExportData');

    cy.contains('h1', 'Export Days to CSV').should('be.visible');
    cy.contains('p', 'Select the seasons you want to include in your CSV export:').should('be.visible');
    cy.contains('button', /Customize Columns \(\d+ selected\)/).should('be.visible');
    cy.contains('button', 'Download CSV').should('be.visible');
    // Check if our created seasons are listed using data-testid
    // Backend IDs for these seasons will be "0" (This Season) and "-1" (Last Season)
    cy.get('[data-testid="season-label-0"]').should('contain', 'This Season');
    cy.get('[data-testid="season-day-count-0"]').should('contain', '1 ski day');

    cy.get('[data-testid="season-label--1"]').should('contain', 'Last Season'); // Note: data-testid attribute values are strings
    cy.get('[data-testid="season-day-count--1"]').should('contain', '1 ski day');
  });

  it('should allow selecting seasons, customizing columns, and initiating download', () => {
    cy.visit(CSV_EXPORT_URL);
    cy.wait('@getCsvExportData').its('response.statusCode').should('oneOf', [200, 304]);

    // Ensure season items are rendered before trying to interact with checkboxes
    cy.get('[data-testid="season-item-0"]').should('be.visible');
    cy.get('[data-testid="season-item--1"]').should('be.visible'); // Assuming two seasons from beforeEach

    // Updated selectors to target button with role="checkbox"
    const currentSeasonCheckboxSelector = 'button[role="checkbox"][id="0"]';
    const lastSeasonCheckboxSelector = 'button[role="checkbox"][id="-1"]';

    // 1. Select seasons
    cy.get(currentSeasonCheckboxSelector).click({ force: true }); // Using .click() for buttons with role="checkbox"
    cy.get(lastSeasonCheckboxSelector).click({ force: true });   // Using .click()
    cy.contains('div', /Selected: 2 seasons, 2 total days/).should('be.visible');

    // 2. Expand and customize columns
    cy.contains('button', /Customize Columns/).click();
    cy.get('#column-selector-content').should('be.visible');

    // Uncheck 'Activity' (ID 'activity') - These are standard input checkboxes
    cy.get('#column-selector-content input[type="checkbox"][id="activity"]').uncheck({ force: true });
    // Check 'Season' (ID 'season') - These are standard input checkboxes
    cy.get('#column-selector-content input[type="checkbox"][id="season"]').check({ force: true });

    // 3. Click download
    cy.contains('button', 'Download CSV').click();

    // 4. Verify download request payload
    cy.wait('@downloadCsv').then((interception) => {
      expect(interception.response?.statusCode).to.eq(200);
      const requestPayload = interception.request.body;

      cy.log('Request Payload Columns:', JSON.stringify(requestPayload.columns));

      expect(requestPayload.season_ids).to.have.members(["0", "-1"]);

      const activityColumn = requestPayload.columns.find((col: {id: string}) => col.id === 'activity');
      expect(activityColumn, 'Activity column should not be found in payload').to.be.undefined;

      const seasonColumn = requestPayload.columns.find((col: {id: string}) => col.id === 'season');
      expect(seasonColumn, 'Season column should be found in payload').to.exist;
      expect(seasonColumn.enabled).to.be.true;

      // Order check (example)
      const dateIndex = requestPayload.columns.findIndex((col: {id: string}) => col.id === 'date');
      const resortIndex = requestPayload.columns.findIndex((col: {id: string}) => col.id === 'resort_name');
      if (dateIndex !== -1 && resortIndex !== -1) {
          expect(dateIndex).to.be.lessThan(resortIndex);
      }
    });
    cy.contains('Export successful').should('be.visible'); // Toast message
  });

  it('should navigate back to root when Cancel button is clicked', () => {
    cy.visit(CSV_EXPORT_URL);
    cy.wait('@getCsvExportData');

    // The cancel button is just text "Cancel" not ChevronLeft
    cy.contains('button', 'Cancel').click();
    cy.location('pathname').should('eq', ROOT_URL);
  });
});
