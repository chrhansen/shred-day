/// <reference types="cypress" />

// Helper to convert season number to display string using user's season_start_day
// Copied from DaysListPage.tsx for test use
const getSeasonDisplayName = (seasonNumber: number): string => {
  if (seasonNumber === 0) return "This Season";
  if (seasonNumber === -1) return "Last Season";
  return `${Math.abs(seasonNumber)} Seasons Ago`;
};

describe('Ski Days List Page', () => {
  const PASSWORD = 'password123';
  const DAYS_LIST_URL = '/';
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
    cy.get('[data-testid="navbar"]').contains('This Season').should('be.visible');

    // Use the aliased resort name for checking content
    cy.get('@resortName').then(resortName => {
      // Check Day 1 content
      const day1TestDate = new Date(DAY1_DATE.replace(/-/g, '/'));
      const currentRunYear = new Date().getFullYear();
      const expectedDay1DisplayDate = day1TestDate.getFullYear() === currentRunYear
        ? day1TestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : day1TestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      cy.get(`[data-testid="ski-day-item-${this.day1Id}"]`)
        .should('contain.text', expectedDay1DisplayDate)
        .and('contain.text', resortName) // Use aliased name
        .and('contain.text', SKI_A_NAME)
        .and('contain.text', DAY1_ACTIVITY);

      // Check Day 2 content
      const day2TestDate = new Date(DAY2_DATE.replace(/-/g, '/'));
      const expectedDay2DisplayDate = day2TestDate.getFullYear() === currentRunYear
        ? day2TestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : day2TestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      cy.get(`[data-testid="ski-day-item-${this.day2Id}"]`)
        .should('contain.text', expectedDay2DisplayDate)
        .and('contain.text', resortName) // Use aliased name
        .and('contain.text', SKI_B_NAME)
        .and('contain.text', DAY2_ACTIVITY);
    });
  });

  it('should navigate to the edit page when edit is clicked', function() {
    cy.visit(DAYS_LIST_URL);
    cy.wait('@getDaysList');

    // Click the edit button directly by its data-testid
    cy.get(`[data-testid="edit-day-${this.day1Id}"]`).click();

    // Click Edit item in the dropdown
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
    cy.get(`[data-testid="edit-day-${this.day1Id}"]`).click();

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

  it('should show a navbar, allow open drawer, and navigate account settings page', () => {
    cy.visit(DAYS_LIST_URL);
    cy.wait('@getDaysList');

    // Click the hamburger menu icon to open the drawer
    cy.get('[aria-label="Open menu"]').should('be.visible').click();

    // Inside the drawer, find the button containing "Settings" text and click it
    cy.contains('button', 'Account').should('be.visible').click();

    // Verify navigation to the settings page
    cy.url().should('include', '/settings/account');
    cy.contains('Sign Up Date').should('be.visible'); // Check for settings page title
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

describe('Season Dropdown Functionality', () => {
  const PASSWORD = 'password123';
  const CUSTOM_SEASON_START_DAY = '10-15'; // October 15th
  const DAYS_LIST_URL = '/'; // Define DAYS_LIST_URL here

  // Define dates relative to a consistent "today" for testing display logic
  // Let's assume "today" is Dec 1, 2024 for season name calculations.
  // Current Season (0) for season_start_day 10-15 and "today" Dec 1, 2024 is: Oct 15, 2024 - Oct 14, 2025
  const DAY_CURRENT_SEASON_DATE = '2024-11-20';
  const DAY_CURRENT_SEASON_ACTIVITY = 'Day in Current Season (2024/25)';

  // Previous Season (-1) is: Oct 15, 2023 - Oct 14, 2024
  const DAY_PREVIOUS_SEASON_DATE = '2023-12-20';
  const DAY_PREVIOUS_SEASON_ACTIVITY = 'Day in Previous Season (2023/24)';

  // Two Seasons Ago (-2) is: Oct 15, 2022 - Oct 14, 2023
  const DAY_TWO_SEASONS_AGO_DATE = '2022-11-20';
  const DAY_TWO_SEASONS_AGO_ACTIVITY = 'Day in Two Seasons Ago (2022/23)';

  let testUserEmail: string;
  let resortId: string;
  let skiId: string;

  beforeEach(() => {
    testUserEmail = `test-season-dropdown-${Date.now()}@example.com`;
    cy.createUser(testUserEmail, PASSWORD); // User created with default '09-01' season_start_day

    // Log in
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/v1/session`,
      body: { email: testUserEmail, password: PASSWORD },
    }).its('status').should('eq', 200);

    // Update user's season_start_day to custom one
    cy.request({
      method: 'PATCH',
      url: `${Cypress.env('apiUrl')}/api/v1/account`,
      body: { user: { season_start_day: CUSTOM_SEASON_START_DAY } },
    }).its('status').should('eq', 200);

    // Intercept account details to provide consistent season_start_day and available_seasons
    // This is what AuthContext will use to populate `user`
    cy.intercept('GET', '/api/v1/account', {
      statusCode: 200,
      body: {
        id: 'mock-user-id',
        email: testUserEmail,
        created_at: new Date().toISOString(),
        season_start_day: CUSTOM_SEASON_START_DAY,
        available_seasons: [0, -1, -2], // Mocked based on days we will create
      },
    }).as('getAccountDetails');

    // Intercept days API calls
    cy.intercept('GET', '/api/v1/days*').as('getDaysApi');

    // Setup common data (resort, ski)
    // Query for an existing resort instead of trying to create one
    const resortToFind = "Axamer Lizum";
    cy.request(`${Cypress.env('apiUrl')}/api/v1/resorts?query=${encodeURIComponent(resortToFind)}`)
      .then((response) => {
        expect(response.body.length, `Seeded resort "${resortToFind}" not found`).to.be.at.least(1);
        resortId = response.body[0].id;
      });
    cy.request('POST', `${Cypress.env('apiUrl')}/api/v1/skis`, { ski: { name: "SeasonTestSki" } }).then(res => skiId = res.body.id);

    // Create days in different seasons AFTER all IDs are resolved
    cy.then(() => {
      cy.logDay({ date: DAY_CURRENT_SEASON_DATE, resort_id: resortId, ski_ids: [skiId], activity: DAY_CURRENT_SEASON_ACTIVITY });
      cy.logDay({ date: DAY_PREVIOUS_SEASON_DATE, resort_id: resortId, ski_ids: [skiId], activity: DAY_PREVIOUS_SEASON_ACTIVITY });
      cy.logDay({ date: DAY_TWO_SEASONS_AGO_DATE, resort_id: resortId, ski_ids: [skiId], activity: DAY_TWO_SEASONS_AGO_ACTIVITY });
    });
  });

  it('should load with the correct season when a season URL parameter is present', function() {
    // cy.clock(new Date(2024, 11, 1).getTime()); // Month is 0-indexed, so 11 is December

    cy.visit(`${DAYS_LIST_URL}?season=-1`);
    cy.wait('@getAccountDetails'); // Ensure user context is loaded
    cy.wait('@getDaysApi').its('request.url').should('include', 'season=-1');

    // Wait for the days to load by checking for the presence of the first ski day item
    // This assumes ski day items have a data-testid like "ski-day-item-xxxx"
    // and DAY_PREVIOUS_SEASON_ACTIVITY is unique enough to identify the correct day
    cy.contains(DAY_PREVIOUS_SEASON_ACTIVITY).should('be.visible');

    // Now that content is loaded, check navbar and other content
    cy.get('[data-testid="navbar"]').contains('Last Season').should('be.visible');
    cy.get('body').should('not.contain', DAY_CURRENT_SEASON_ACTIVITY);
    cy.get('body').should('not.contain', DAY_TWO_SEASONS_AGO_ACTIVITY);
  });

  it('should change season, update URL, and filter days when a new season is selected from dropdown', function() {
    // cy.clock(new Date(2024, 11, 1).getTime()); // Clock might not be needed if we rely on activity name
    cy.visit(DAYS_LIST_URL);
    cy.wait('@getAccountDetails');
    cy.wait('@getDaysApi').its('request.url').should('not.include', 'season='); // Default to current (season 0)

    // Ensure initial content (current season day) is loaded before interacting
    cy.contains(DAY_CURRENT_SEASON_ACTIVITY).should('be.visible');

    cy.get('[data-testid="navbar"]').contains('This Season').should('be.visible');
    cy.contains(DAY_PREVIOUS_SEASON_ACTIVITY).should('not.exist');

    // Open dropdown and select previous season
    cy.get('[data-testid="navbar"]').find('button').contains('This Season').click();
    cy.contains('[role="menuitem"]', 'Last Season').click();

    cy.wait('@getDaysApi').its('request.url').should('include', 'season=-1');
    cy.url().should('include', '?season=-1');

    // Ensure new content is loaded before checking navbar
    cy.contains(DAY_PREVIOUS_SEASON_ACTIVITY).should('be.visible');
    cy.get('[data-testid="navbar"]').contains('Last Season').should('be.visible');
    cy.contains(DAY_CURRENT_SEASON_ACTIVITY).should('not.exist');
  });

  it('should display the correct season options in the dropdown', function() {
    // cy.clock(new Date(2024, 11, 1).getTime()); // Re-add clock for deterministic display names
    cy.visit(DAYS_LIST_URL);
    cy.wait('@getAccountDetails');
    cy.wait('@getDaysApi'); // Initial load for current season

    // Ensure initial content (current season day) is loaded before interacting
    cy.contains(DAY_CURRENT_SEASON_ACTIVITY).should('be.visible');

    // Get the button that displays the current season and click it to open the dropdown
    cy.get('[data-testid="navbar"]').find('button').contains(getSeasonDisplayName(0)).click();

    // Based on mocked available_seasons: [0, -1, -2]
    // The display names will be calculated dynamically. We verify the presence of each expected offset.
    cy.contains('[role="menuitem"]', getSeasonDisplayName(0)).should('be.visible');
    cy.contains('[role="menuitem"]', getSeasonDisplayName(-1)).should('be.visible');
    cy.contains('[role="menuitem"]', getSeasonDisplayName(-2)).should('be.visible');
    cy.get('[role="menuitem"]').should('have.length', 3);
  });

  it('should default to current season (0) and filter correctly if no URL parameter is present', function() {
    // cy.clock(new Date(2024, 11, 1).getTime()); // Re-add clock for deterministic display names
    cy.visit(DAYS_LIST_URL);
    cy.wait('@getAccountDetails');
    cy.wait('@getDaysApi').its('request.url').should('not.include', 'season=');

    // Ensure initial content (current season day) is loaded before checking navbar
    cy.contains(DAY_CURRENT_SEASON_ACTIVITY).should('be.visible');

    cy.get('[data-testid="navbar"]').contains('This Season').should('be.visible');
    cy.contains(DAY_PREVIOUS_SEASON_ACTIVITY).should('not.exist');
    cy.contains(DAY_TWO_SEASONS_AGO_ACTIVITY).should('not.exist');
  });

});
