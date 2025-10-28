/// <reference types="cypress" />
/// <reference types="cypress-file-upload" />

describe('Create and Edit a Ski Day', () => {
  const PASSWORD = 'password123';
  const LOG_DAY_URL = '/new';
  const DAYS_LIST_URL = '/';
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
    cy.intercept('GET', '/api/v1/account*').as('getAccount');
    cy.intercept('GET', '/api/v1/days*').as('getDaysList');

    // Log in via API
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/v1/sessions`,
      body: { email: userEmail, password: PASSWORD }
    }).then((resp) => {
      expect(resp.status).to.eq(200);
      cy.wrap(userEmail).as('userEmail');
      // NOTE: Cookies might be set here, but cy.request doesn't use browser jar directly
    });

    // --- Visit page AFTER login to establish browser session ---
    cy.visit(DAYS_LIST_URL);
    cy.wait('@getAccount');

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
    // Already on days list page
    // 1. Click New Day button
    cy.contains('button', /New Day/i).click();
    cy.location('pathname').should('eq', LOG_DAY_URL);

    // Wait for LogDay page data to load
    cy.wait('@getSkis');
    cy.wait('@getRecentResorts');

    // Select Date - 15th of current month
    cy.contains('button[role="gridcell"]', /^15$/).click();

    // Select Resort
    cy.get('[data-testid="find-resort-button"]').should('not.be.disabled').click();

    // Set up intercept with wildcard to catch any resort search
    cy.intercept('GET', '/api/v1/resorts*').as('searchSpecificResort');

    cy.get('[data-testid="resort-search-input"]').should('not.be.disabled').type(RESORT_A_NAME);

    cy.wait('@searchSpecificResort').then((interception) => {
      cy.log("Specific Search Resorts API Response Status:", interception.response?.statusCode?.toString());
      cy.log("Specific Search Resorts API Response Headers:", JSON.stringify(interception.response?.headers));
      // Log the raw body as Cypress sees it initially
      cy.log("Raw interception.response.body type:", typeof interception.response?.body);
      cy.log("Raw interception.response.body value:", JSON.stringify(interception.response?.body));
    });

    cy.get('[data-testid="resort-search-results"]').should('be.visible');
    const resortOptionTestId = `resort-option-${RESORT_A_NAME.toLowerCase().replace(/\s+/g, '-')}`;
    cy.get(`[data-testid="${resortOptionTestId}"]`).should('be.visible').click();

    // Select Ski
    cy.contains('button', SKI_A_NAME).should('not.be.disabled').click();
    // Select Activity
    cy.contains('button', /Friends/i).should('not.be.disabled').click();

    // Submit Form
    cy.intercept('POST', '/api/v1/days').as('logDay');
    cy.get('[data-testid="save-day-button"]').click();

    // Wait for the request and get the new day's ID from the response body
    let newDayId: string;
    cy.wait('@logDay').then((interception) => {
      expect(interception.response.statusCode).to.eq(201);
      // Assuming your API returns the created day object with an 'id' field
      expect(interception.response?.body?.id).to.exist;
      newDayId = interception.response?.body?.id;

      // Log the date from the response to debug timezone issues
      const responseDate = interception.response?.body?.date;
      cy.log('Created day date from API:', responseDate);
    });

    // Verify redirection and toast
    cy.location('pathname').should('eq', DAYS_LIST_URL);
    cy.contains('Ski day logged successfully!').should('be.visible');

    // Wait for the list to potentially refresh
    cy.wait('@getDaysList');

    // Get the selected date (15th of current month) and format it
    const selectedDate = new Date();
    selectedDate.setDate(15);
    selectedDate.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
    // Updated formatting: For current year, only month and day
    const formattedDate = selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // Check that the specific item with the new ID contains the correct resort
    // Use cy.then to ensure newDayId is available after the wait
    cy.then(() => {
        cy.get(`[data-testid="ski-day-item-${newDayId}"]`)
          .should('contain.text', RESORT_A_NAME)
          .and(($el) => {
            const text = $el.text();

            // Build a month-agnostic regex that tolerates a one-day timezone shift
            const monthShort = selectedDate.toLocaleDateString('en-US', { month: 'short' });
            const day = selectedDate.getDate();
            const dayVariants = [day - 1, day];
            const dateRegex = new RegExp(`${monthShort} (${dayVariants[0]}|${dayVariants[1]})`);

            expect(text).to.match(dateRegex);
          });
    })
  });

  it('should allow editing an existing ski day', function() {

    // --- Test-specific setup: Create the day to edit ---
    // Calculate a date in the current season (after Sept 1)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const inCurrentSeasonYear = currentMonth >= 9;
    const currentSeasonYear = inCurrentSeasonYear ? currentYear : currentYear - 1;
    const testDate = `${currentSeasonYear}-10-10`; // Oct 10 in current season

    // We need to access aliases set in beforeEach (resortAId, skiAId)
    cy.get('@resortAId').then(resortAId => {
      cy.get('@skiAId').then(skiAId => {
          const initialDayPayload = {
              day: {
                  date: testDate,
                  resort_id: resortAId,
                  ski_ids: [skiAId],
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

    // 2. Find the created day, open dropdown, and click Edit
    cy.get('@dayId').then(dayId => {
      // Find the trigger button using data-testid and click it to open the menu
      cy.get(`[data-testid="edit-day-${dayId}"]`).should('be.visible').click();
      // Find the 'Edit' menu item and click it
      cy.contains('[role="menuitem"]', 'Edit').click();
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
    // Verify the calendar is showing the correct month (October currentSeasonYear) first
    cy.get('#react-day-picker-1').should('contain.text', `October ${currentSeasonYear}`);
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
      // Dynamically determine the expected date format
      // Date was edited to the 20th (line 211), so we expect Oct 20
      const testMonth = 9; // 0-indexed for October
      const testDay = 20;
      const dateForDisplay = new Date(currentSeasonYear, testMonth, testDay);
      const currentRunYear = new Date().getFullYear();
      const expectedDisplayDate = dateForDisplay.getFullYear() === currentRunYear
        ? dateForDisplay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) // e.g., "Oct 20"
        : dateForDisplay.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); // e.g., "Oct 20, 2025"

      // Use the new data-testid selector
      cy.get(`[data-testid="ski-day-item-${dayId}"]`)
        .should('contain.text', SKI_B_NAME)
        .and('contain.text', EDITED_ACTIVITY)
        .and(($el) => {
          // Check for Oct 19, 20, or 21 due to potential timezone and date calculation differences
          const text = $el.text();
          expect(text).to.match(/Oct (19|20|21)/);
        });
    });
  });

  it('should allow navigating between months in the calendar', function() {

    // 1. Navigate to Log Day page
    cy.visit(LOG_DAY_URL);
    cy.wait('@getSkis');
    cy.wait('@getRecentResorts');

    const getCurrentMonthYear = () => {
      // Get current date, set day to 1 to avoid month rollover issues
      const date = new Date();
      date.setDate(1);
      return date;
    };

    const formatDateForCaption = (date: Date) => {
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    let currentDate = getCurrentMonthYear();
    const initialMonthYear = formatDateForCaption(currentDate);

    // 2. Check initial month display
    cy.get('#react-day-picker-1').should('contain.text', initialMonthYear);

    // 3. Click next month
    cy.get('.absolute.right-1').click();

    // 4. Verify next month is displayed
    currentDate.setMonth(currentDate.getMonth() + 1);
    const nextMonthYear = formatDateForCaption(currentDate);
    cy.get('#react-day-picker-1').should('contain.text', nextMonthYear);

    // 5. Click previous month (back to initial)
    cy.get('.absolute.left-1').click();

    // 6. Verify initial month is displayed again
    currentDate.setMonth(currentDate.getMonth() - 1);
    cy.get('#react-day-picker-1').should('contain.text', initialMonthYear);

    // 7. Click previous month again
    cy.get('.absolute.left-1').click();

    // 8. Verify previous month is displayed
    currentDate.setMonth(currentDate.getMonth() - 1);
    const previousMonthYear = formatDateForCaption(currentDate);
    cy.get('#react-day-picker-1').should('contain.text', previousMonthYear);
  });

  it('should handle JPEG photo upload successfully', function() {

    // Navigate to Log Day page
    cy.visit(LOG_DAY_URL);
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

    // Select Ski
    cy.contains('button', SKI_A_NAME).should('not.be.disabled').click();

    // Select Activity
    cy.contains('button', /Friends/i).should('not.be.disabled').click();

    // Intercept the photo upload request
    cy.intercept('POST', '/api/v1/photos').as('uploadPhoto');

    // Upload JPEG image
    cy.get('#photo-upload-interactive').selectFile('cypress/fixtures/test_image.jpg', { force: true });

    // Verify loading state (spinner)
    cy.get('[data-testid="photo-preview"] svg.animate-spin').should('be.visible');

    // Wait for the upload to complete and verify spinner disappears
    cy.wait('@uploadPhoto');
    cy.get('[data-testid="photo-preview"] svg.animate-spin').should('not.exist');

    // Verify image preview is shown (check for img tag)
    cy.get('[data-testid="photo-preview"] img')
      .should('be.visible')
      .and('have.attr', 'src') // Check src attribute exists
      .and('not.be.empty'); // Check src is not empty

    // Submit form
    cy.intercept('POST', '/api/v1/days').as('logDay');
    cy.get('[data-testid="save-day-button"]').click();

    // Wait for the request and verify response includes photo data
    // cy.wait('@logDay').its('response.statusCode').should('eq', 201);
    cy.wait('@logDay').then((interception) => {
      expect(interception.response?.statusCode).to.eq(201);
      expect(interception.response?.body?.photos).to.be.an('array').that.has.length(1);
      expect(interception.response?.body?.photos[0]?.filename).to.eq('test_image.jpg');
      // Store the created photo ID if needed for cleanup or further tests
      // cy.wrap(interception.response?.body?.photos[0]?.id).as('createdPhotoId');
    });

    cy.location('pathname').should('eq', DAYS_LIST_URL);
    cy.contains('Ski day logged successfully!').should('be.visible');
  });

  it('should handle HEIC photo upload successfully', function() {
    this.skip();
    // Navigate to Log Day page
    cy.visit(LOG_DAY_URL);
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

    // Select Ski
    cy.contains('button', SKI_A_NAME).should('not.be.disabled').click();

    // Select Activity
    cy.contains('button', /Friends/i).should('not.be.disabled').click();

    // Intercept photo upload
    cy.intercept('POST', '/api/v1/photos').as('uploadPhoto');

    // Upload HEIC image
    cy.get('#photo-upload-interactive').selectFile('cypress/fixtures/test_image.heic', { force: true });

    // Verify loading state
    cy.get('[data-testid="photo-preview"] svg.animate-spin').should('be.visible');

    // Wait for upload and verify final state
    cy.wait('@uploadPhoto');
    cy.get('[data-testid="photo-preview"] svg.animate-spin').should('not.exist');

    // Verify image preview or fallback is shown.
    // HEIC might not render via temp_preview_url, so check for either img or fallback text.
    cy.get('[data-testid="photo-preview"]').within(() => {
      // Check if either the image OR the fallback text exists
      cy.root().should(($el) => {
        const hasImage = $el.find('img[src]').length > 0;
        const hasFallback = $el.text().includes('Preview N/A');
        expect(hasImage || hasFallback).to.be.true;
      });
    });

    // Submit form
    cy.intercept('POST', '/api/v1/days').as('logDay');
    cy.get('[data-testid="save-day-button"]').click();

    // Verify day is created with the photo associated
    // cy.wait('@logDay').its('response.statusCode').should('eq', 201);
    cy.wait('@logDay').then((interception) => {
        expect(interception.response?.statusCode).to.eq(201);
        expect(interception.response?.body?.photos).to.be.an('array').that.has.length(1);
        expect(interception.response?.body?.photos[0]?.filename).to.eq('test_image.heic');
    });

    cy.location('pathname').should('eq', DAYS_LIST_URL);
    cy.contains('Ski day logged successfully!').should('be.visible');
  });

  it('should handle multiple photo uploads', function() {
    this.skip();
    // Navigate to Log Day page
    cy.visit(LOG_DAY_URL);
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

    // Select Ski
    cy.contains('button', SKI_A_NAME).should('not.be.disabled').click();

    // Select Activity
    cy.contains('button', /Friends/i).should('not.be.disabled').click();

    // Intercept photo uploads (allow multiple calls)
    cy.intercept('POST', '/api/v1/photos').as('uploadPhoto');

    // Upload both JPEG and HEIC images
    cy.get('#photo-upload-interactive').selectFile([
      'cypress/fixtures/test_image.jpg',
      'cypress/fixtures/test_image.heic'
    ], { force: true });

    // Verify two loading spinners are shown initially
    cy.get('[data-testid="photo-preview"] svg.animate-spin').should('have.length', 2);

    // Wait for both uploads to complete
    cy.wait('@uploadPhoto');
    cy.wait('@uploadPhoto');

    // Verify spinners disappear
    cy.get('[data-testid="photo-preview"] svg.animate-spin').should('not.exist');

    // Verify two previews are shown (check count, specific checks are harder)
    cy.get('[data-testid="photo-preview"]').should('have.length', 2);
    // Check that at least one img tag is present (for the JPEG)
    cy.get('[data-testid="photo-preview"] img[src]').should('have.length.at.least', 1);

    // Submit form
    cy.intercept('POST', '/api/v1/days').as('logDay');
    cy.get('[data-testid="save-day-button"]').click();

    // Verify day is created with both photos
    // cy.wait('@logDay').its('response.statusCode').should('eq', 201);
    cy.wait('@logDay').then((interception) => {
        expect(interception.response?.statusCode).to.eq(201);
        expect(interception.response?.body?.photos).to.be.an('array').that.has.length(2);
        // Optional: Check filenames if order is predictable
        const filenames = interception.response?.body?.photos.map((p: any) => p.filename).sort();
        expect(filenames).to.deep.equal(['test_image.heic', 'test_image.jpg']);
    });

    cy.location('pathname').should('eq', DAYS_LIST_URL);
    cy.contains('Ski day logged successfully!').should('be.visible');
  });

  it('should handle sequential photo uploads', function() {
    // Navigate to Log Day page
    cy.visit(LOG_DAY_URL);
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

    // Select Ski
    cy.contains('button', SKI_A_NAME).should('not.be.disabled').click();

    // Select Activity
    cy.contains('button', /Friends/i).should('not.be.disabled').click();

    // Intercept photo uploads
    cy.intercept('POST', '/api/v1/photos').as('uploadPhoto');

    // Upload first photo (JPEG)
    cy.get('#photo-upload-interactive').selectFile('cypress/fixtures/test_image.jpg', { force: true });

    // Verify one spinner, wait, check it's gone, check preview
    cy.get('[data-testid="photo-preview"] svg.animate-spin').should('have.length', 1);
    cy.wait('@uploadPhoto');
    cy.get('[data-testid="photo-preview"]').first().find('svg.animate-spin').should('not.exist');
    cy.get('[data-testid="photo-preview"] img[src]').should('have.length', 1);

    // Upload second photo (PNG)
    cy.get('#photo-upload-interactive').selectFile('cypress/fixtures/test_image.png', { force: true });

    // Verify two previews exist now, one still loading (spinner)
    cy.get('[data-testid="photo-preview"]').should('have.length', 2);
    cy.get('[data-testid="photo-preview"] svg.animate-spin').should('have.length', 1);

    // Wait for second upload
    cy.wait('@uploadPhoto');

    // Verify both previews are settled (no spinners)
    cy.get('[data-testid="photo-preview"] svg.animate-spin').should('not.exist');
    cy.get('[data-testid="photo-preview"]').should('have.length', 2);
    // Check first is still img, second is img OR fallback
    cy.get('[data-testid="photo-preview"] img[src]').should('have.length.at.least', 1);
    cy.get('[data-testid="photo-preview"]').eq(1).within(() => {
       cy.root().should(($el) => {
         const hasImage = $el.find('img[src]').length > 0;
         const hasFallback = $el.text().includes('Preview N/A');
         expect(hasImage || hasFallback).to.be.true;
       });
    });

    // Submit form
    cy.intercept('POST', '/api/v1/days').as('logDayWithSeqPhotos');
    cy.get('[data-testid="save-day-button"]').click();

    // Wait for the request and verify response has 2 photos
    cy.wait('@logDayWithSeqPhotos').then((interception) => {
      expect(interception.response?.statusCode).to.eq(201);
      expect(interception.response?.body?.photos).to.be.an('array').that.has.length(2);
      // Optional: check filenames
      const filenames = interception.response?.body?.photos.map((p: any) => p.filename).sort();
      expect(filenames).to.deep.equal(['test_image.jpg', 'test_image.png']);
    });

    // Verify redirection and toast
    cy.location('pathname').should('eq', DAYS_LIST_URL);
    cy.contains('Ski day logged successfully!').should('be.visible');
  });

  it('should handle drag-and-drop photo upload', function() {
    // Navigate to Log Day page
    cy.visit(LOG_DAY_URL);
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

    // Select Ski
    cy.contains('button', SKI_A_NAME).should('not.be.disabled').click();

    // Select Activity
    cy.contains('button', /Friends/i).should('not.be.disabled').click();

    // Intercept photo upload
    cy.intercept('POST', '/api/v1/photos').as('uploadPhoto');

    // Simulate drag-and-drop upload
    cy.get('[data-testid="photo-dropzone-label"]').selectFile('cypress/fixtures/test_image.jpg', {
      action: 'drag-drop'
    });

    // Verify loading state
    cy.get('[data-testid="photo-preview"] svg.animate-spin').should('be.visible');

    // Wait for upload and check final state
    cy.wait('@uploadPhoto');
    cy.get('[data-testid="photo-preview"] svg.animate-spin').should('not.exist');
    cy.get('[data-testid="photo-preview"] img').should('be.visible');

    // Submit form
    cy.intercept('POST', '/api/v1/days').as('logDayWithDrop');
    cy.get('[data-testid="save-day-button"]').click();

    // Wait for the request and verify response includes photo
    cy.wait('@logDayWithDrop').then((interception) => {
      expect(interception.response?.statusCode).to.eq(201);
      expect(interception.response?.body?.photos).to.be.an('array').that.has.length(1);
      expect(interception.response?.body?.photos[0]?.filename).to.eq('test_image.jpg');
    });

    // Verify redirection and toast
    cy.location('pathname').should('eq', DAYS_LIST_URL);
    cy.contains('Ski day logged successfully!').should('be.visible');
  });

  it('should allow removing an uploaded photo', function() {
    // Navigate to Log Day page
    cy.visit(LOG_DAY_URL);
    cy.wait('@getSkis');
    cy.wait('@getRecentResorts');

    // Select Date, Resort, Ski, Activity
    cy.contains('button[role="gridcell"]', /^15$/).click();
    cy.get('[data-testid="find-resort-button"]').click();
    cy.get('[data-testid="resort-search-input"]').type(RESORT_A_NAME);
    cy.intercept('GET', `/api/v1/resorts?query=*`).as('searchResorts');
    cy.wait('@searchResorts');
    cy.get(`[data-testid="resort-option-${RESORT_A_NAME.toLowerCase().replace(/\s+/g, '-')}"]`).click();
    cy.contains('button', SKI_A_NAME).click();
    cy.contains('button', /Friends/i).click();

    // Intercept photo upload and store the server ID
    let uploadedPhotoServerId: string | null = null;
    cy.intercept('POST', '/api/v1/photos').as('uploadPhoto');

    // Upload a photo
    cy.get('#photo-upload-interactive').selectFile('cypress/fixtures/test_image.jpg', { force: true });

    // Wait for upload and capture server ID
    cy.wait('@uploadPhoto').then((interception) => {
      expect(interception.response?.statusCode).to.eq(201);
      uploadedPhotoServerId = interception.response?.body?.id;
      expect(uploadedPhotoServerId).to.be.a('string');
    });

    // Verify preview is shown
    cy.get('[data-testid="photo-preview"] img').should('be.visible');

    // Find the remove button within the preview and click it
    cy.get('[data-testid="photo-preview"]').find('button[aria-label="Remove photo"]').click();

    // Verify the preview element is removed
    cy.get('[data-testid="photo-preview"]').should('not.exist');

    // Submit the day form
    cy.intercept('POST', '/api/v1/days').as('logDay');
    cy.get('[data-testid="save-day-button"]').click();

    // Verify the day is created successfully without the removed photo
    cy.wait('@logDay').then((interception) => {
      expect(interception.response?.statusCode).to.eq(201);
      expect(interception.response?.body?.photos).to.be.an('array').that.is.empty;
    });

    // Verify redirection
    cy.location('pathname').should('eq', DAYS_LIST_URL);
    cy.contains('Ski day logged successfully!').should('be.visible');
  });

  it('should highlight dates with existing ski days on calendar', function() {
    // Create a ski day for a specific date first
    const existingDate = new Date();
    existingDate.setDate(10); // Set to 10th of current month
    const formattedDate = existingDate.toISOString().split('T')[0];
    
    cy.intercept('POST', '/api/v1/days*').as('createDay');
    
    // Create a ski day via API
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/v1/days`,
      body: {
        day: {
          date: formattedDate,
          resort_id: this.resortAId,
          ski_ids: [this.skiAId],
          activity: INITIAL_ACTIVITY,
          photo_ids: []
        }
      }
    }).then((response) => {
      expect(response.status).to.eq(201);
    });

    // Visit the log day page
    cy.visit(LOG_DAY_URL);
    cy.wait(['@getSkis', '@getRecentResorts', '@getDaysList']);

    // Wait for the calendar to be visible
    cy.contains('Date').should('be.visible');
    
    // Check that the calendar is visible (using the actual class from react-day-picker)
    cy.get('[class*="rdp"]').should('be.visible');
    
    // Find the button for the 10th day and check it has the hasSkiDay modifier class
    cy.get('[class*="rdp"] button').each(($btn) => {
      const dayText = $btn.text().trim();
      if (dayText === '10') {
        // Check that this day has the special styling for existing ski days
        cy.wrap($btn).should('have.class', 'bg-blue-100');
        cy.wrap($btn).should('have.class', 'font-bold');
        cy.wrap($btn).should('have.class', 'text-blue-900');
      }
    });
  });
});
