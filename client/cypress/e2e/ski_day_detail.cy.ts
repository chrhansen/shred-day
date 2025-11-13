/// <reference types="cypress" />

describe('Ski Day Detail Popover', () => {
  const PASSWORD = 'password123';
  const DAYS_LIST_URL = '/';
  let userEmail: string;
  let resortId: string;
  let resortName: string;
  let skiId: string;
  let dayWithPhotosId: string;

  // Calculate dates in current season (after Sept 1)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const inCurrentSeasonYear = currentMonth >= 9;
  const currentSeasonYear = inCurrentSeasonYear ? currentYear : currentYear - 1;

  const dayDataWithPhotos = {
    date: `${currentSeasonYear}-11-20`,
    labels: [{ id: 'label-photo', name: 'Photo Session' }],
    photos: [
      { id: 'photo1', preview_url: 'https://via.placeholder.com/400x300.png?text=Photo+1', full_url: 'https://via.placeholder.com/800x600.png?text=Photo+1' },
      { id: 'photo2', preview_url: 'https://via.placeholder.com/400x300.png?text=Photo+2', full_url: 'https://via.placeholder.com/800x600.png?text=Photo+2' },
    ],
    notes: 'Had a great time taking photos.',
  };

  beforeEach(function() {
    userEmail = `test-skidetail-${Date.now()}@example.com`;
    cy.createUser(userEmail, PASSWORD);

    cy.intercept('GET', '/api/v1/days*').as('getDaysList');

    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/v1/sessions`,
      body: { email: userEmail, password: PASSWORD }
    }).its('status').should('eq', 200);

    // 1. Find Resort, store its name in JS variable, and alias its ID
    const resortToFind = "Mayrhofen";
    cy.request(`${Cypress.env('apiUrl')}/api/v1/resorts?query=${encodeURIComponent(resortToFind)}`)
      .then((response) => {
        expect(response.body.length, `Seeded resort \"${resortToFind}\" not found`).to.be.at.least(1);
        resortName = response.body[0].name; // Keep for assertions
        cy.wrap(response.body[0].id).as('resortIdForDetailTest');
      });

    // 2. Create Ski and alias its ID
    cy.request('POST', `${Cypress.env('apiUrl')}/api/v1/skis`, { ski: { name: "PhotoSkis" } })
      .its('body.id')
      .as('skiIdForDetailTest');

    // 3. Create Day with Photos and Notes, using aliased resort and ski IDs, then alias the new day's ID
    cy.get('@resortIdForDetailTest').then(rId => {
      cy.get('@skiIdForDetailTest').then(sId => {
        // Update module-scoped variables if they are used by dayDataWithPhotos or other non-cy logic directly
        // For this setup, rId and sId are passed directly to the request.
        // resortId = rId; // Not strictly needed if dayDataWithPhotos doesn't use module-scoped resortId
        // skiId = sId;   // Not strictly needed if dayDataWithPhotos doesn't use module-scoped skiId

        cy.request('POST', `${Cypress.env('apiUrl')}/api/v1/days`, {
          day: {
            date: dayDataWithPhotos.date,
            resort_id: rId, // Use resolved alias value
            ski_id: sId,    // Use resolved alias value
            photos: dayDataWithPhotos.photos,
            notes: dayDataWithPhotos.notes
          }
        })
        .its('body.id')
        .as('finalDayWithPhotosId'); // Alias for the created day's ID
      });
    });

    // 4. Now that all data setup commands are enqueued and aliases will be set,
    //    enqueue the UI interaction commands. These will run after the aliases are available.
    cy.get('@finalDayWithPhotosId').then(createdDayIdValue => {
      if (typeof createdDayIdValue !== 'string' && typeof createdDayIdValue !== 'number') {
        const idType = typeof createdDayIdValue;
        cy.log(`Error: Expected createdDayIdValue to be a string or number, but got ${idType}. Value: ${JSON.stringify(createdDayIdValue)}`);
        throw new Error(`Test setup failed: createdDayIdValue is not a string or number (type: ${idType}).`);
      }
      dayWithPhotosId = String(createdDayIdValue);
      // @ts-ignore
      // dayDataWithPhotos.id = dayWithPhotosId; // Not needed if detailedFixture constructs its own ID

      const detailedFixture = {
        id: dayWithPhotosId,
        date: dayDataWithPhotos.date,
        labels: dayDataWithPhotos.labels,
        notes: dayDataWithPhotos.notes,
        photos: dayDataWithPhotos.photos,
        resort: { id: "mockResortId", name: resortName },
        skis: [{ id: "mockSkiId1", name: "PhotoSkis" }], // Changed to skis: array with one ski object
        // If your day setup creates more skis, list them here or adjust ski name
      };

      cy.intercept('GET', `/api/v1/days/${dayWithPhotosId}`, {
        statusCode: 200,
        body: detailedFixture
      }).as('getDayDetails');

      cy.visit(DAYS_LIST_URL);
      cy.wait('@getDaysList'); // Wait for the initial list to load

      cy.get(`[data-testid="ski-day-item-${dayWithPhotosId}"]`).should('be.visible').first().click();

      // Wait for the detail fetch to complete before asserting modal content
      cy.wait('@getDayDetails');

      cy.get('[data-testid="ski-day-detail-modal"]').should('be.visible');
    });
  });

  it('should display correct ski day details', function() {
    // Calculate expected date string for Nov 20 in current season
    const testDate = new Date(currentSeasonYear, 10, 20); // month is 0-indexed
    const expectedDateString = testDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    cy.get('[data-testid="ski-day-detail-modal"]').within(() => {
      cy.contains('h2', resortName).should('be.visible');
      cy.contains('p', expectedDateString).should('be.visible'); // Dynamic date format
      cy.contains('h3', 'Skis Used').next('ul').find('li').should('have.length', 1).first().should('contain.text', "PhotoSkis");
      cy.contains('h3', 'Labels').parent().within(() => {
        cy.contains(dayDataWithPhotos.labels[0].name).should('be.visible');
      });
      cy.contains('h3', 'Notes').next('p').should('contain.text', dayDataWithPhotos.notes);
    });
  });

  it('should display photos in the carousel and allow navigation', () => {
    cy.get('[data-testid="ski-day-detail-carousel"]').should('be.visible');

    // Check first image (placeholder text)
    cy.get('[data-testid="ski-day-detail-carousel"] img[alt="Ski day photo 1"]')
      .should('be.visible')
      .and('have.attr', 'src', dayDataWithPhotos.photos[0].full_url);

    // Navigate to next image
    cy.get('[data-testid="ski-day-detail-carousel-next"]').should('be.visible').click();
    cy.get('[data-testid="ski-day-detail-carousel"] img[alt="Ski day photo 2"]')
      .should('be.visible')
      .and('have.attr', 'src', dayDataWithPhotos.photos[1].full_url);

    // Navigate back to previous image
    cy.get('[data-testid="ski-day-detail-carousel-prev"]').should('be.visible').click();
    cy.get('[data-testid="ski-day-detail-carousel"] img[alt="Ski day photo 1"]')
      .should('be.visible');
  });

  it('should display "No photos available" if there are no photos', function() {
    // Close the modal opened by beforeEach first
    cy.get('[data-testid="ski-day-detail-close-button"]').click({ force: true });
    cy.get('[data-testid="ski-day-detail-modal"]').should('not.exist');

    // Prepare a fixture for a day with no photos
    const dayWithoutPhotosFixture = {
      id: dayWithPhotosId, // Use the same ID, we're just changing its content for this fetch
      date: dayDataWithPhotos.date,
      labels: dayDataWithPhotos.labels,
      notes: dayDataWithPhotos.notes,
      photos: [],
      resort: { id: "mockResortId", name: resortName },
      skis: [{ id: "mockSkiId1", name: "PhotoSkis" }], // Keep skis consistent or test no skis
    };

    // Intercept the specific day detail fetch for THIS test
    cy.intercept('GET', `/api/v1/days/${dayWithPhotosId}`, {
      statusCode: 200,
      body: dayWithoutPhotosFixture
    }).as('getDayDetailsNoPhotos');

    // Click the item again to trigger the fetch with the new intercept
    cy.get(`[data-testid="ski-day-item-${dayWithPhotosId}"]`).should('be.visible').first().click();

    // Wait for the detail fetch to complete
    cy.wait('@getDayDetailsNoPhotos');

    cy.get('[data-testid="ski-day-detail-modal"]').should('be.visible');
    cy.get('[data-testid="ski-day-detail-carousel"]').should('be.visible');
    cy.get('[data-testid="ski-day-detail-carousel"]').contains('No photos available').should('be.visible');
    cy.get('[data-testid="ski-day-detail-carousel"] img').should('not.exist');
  });

  it('should display "No notes available" if there are no notes', function() {
    // Close the currently open modal first
    cy.get('[data-testid="ski-day-detail-close-button"]').click({ force: true });
    cy.get('[data-testid="ski-day-detail-modal"]').should('not.exist');

    cy.get('@resortIdForDetailTest').then(rIdFromAlias => {
      cy.get('@skiIdForDetailTest').then(sIdFromAlias => {
        const resortIdString = String(rIdFromAlias); // Ensure string type
        const skiIdString = String(sIdFromAlias);   // Ensure string type
        let dayWithNoNotesId: string;

        const noNotesDate = `${currentSeasonYear}-11-21`; // Nov 21 in current season
        cy.request({
          method: 'POST',
          url: `${Cypress.env('apiUrl')}/api/v1/days`,
          body: {
            day: {
              date: noNotesDate,
              resort_id: resortIdString,
              ski_ids: [skiIdString],
              notes: null
            }
          },
          failOnStatusCode: false
        }).then(dayResponse => {
          if (dayResponse.status !== 201 && dayResponse.status !== 200) {
            cy.log('Day creation for "no notes" test failed. Status: ' + dayResponse.status + ' Body: ' + JSON.stringify(dayResponse.body));
            throw new Error('Failed to create day for "no notes" test. API returned: ' + dayResponse.status);
          }
          expect(dayResponse.body, 'Day creation response body').to.exist.and.to.have.property('id');
          dayWithNoNotesId = dayResponse.body.id;

          const dayWithoutNotesFixture = {
            id: dayWithNoNotesId,
            date: noNotesDate,
            labels: [{ id: 'label-quick-run', name: 'Quick Run' }],
            notes: null,
            photos: [],
            resort: { id: resortIdString, name: resortName },
            skis: [{ id: skiIdString, name: "PhotoSkis" }],
          };
          cy.intercept('GET', `/api/v1/days/${dayWithNoNotesId}`, {
            statusCode: 200,
            body: dayWithoutNotesFixture
          }).as('getDayDetailsNoNotes');

          cy.visit(DAYS_LIST_URL);
          cy.wait('@getDaysList');
          cy.get(`[data-testid="ski-day-item-${dayWithNoNotesId}"]`).should('be.visible').first().click();
          cy.wait('@getDayDetailsNoNotes');
          cy.get('[data-testid="ski-day-detail-modal"]').should('be.visible');

          cy.get('[data-testid="ski-day-detail-modal"]').within(() => {
            cy.contains('h3', 'Notes').next('p').should('contain.text', 'No notes available');
            cy.contains('h3', 'Notes').next('p').find('span.italic.text-slate-500').should('exist');
          });
        });
      });
    });
  });

  it('should dismiss the modal when the X button is clicked', function() {
    // The modal is already open from beforeEach
    cy.get('[data-testid="ski-day-detail-close-button"]').click({ force: true });
    cy.get('[data-testid="ski-day-detail-modal"]').should('not.exist');
  });

  it('should dismiss the modal when the background overlay is clicked', function() {
    // The modal is already open from beforeEach
    // We target the overlay by its specific class, escaping the "/"
    // force: true is used because overlays can sometimes be tricky for Cypress actionability
    cy.get('.bg-black\\/20').click({ force: true }); // Correctly escaped selector
    cy.get('[data-testid="ski-day-detail-modal"]').should('not.exist');
  });
});
