/// <reference types="cypress" />

describe('Day notes UI', () => {
  const PASSWORD = 'password123';
  const RESORT_NAME = 'Le Massif';

  const currentSeasonDate = () => {
    const date = new Date();
    return date.toISOString().slice(0, 10);
  };

  const createAuthenticatedUserWithSetup = () => {
    const userEmail = `test-day-notes-${Date.now()}@example.com`;
    const skiName = `Notes Ski ${Date.now()}`;

    cy.createUser(userEmail, PASSWORD);

    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/v1/sessions`,
      body: { email: userEmail, password: PASSWORD },
    }).its('status').should('eq', 200);

    cy.request(`${Cypress.env('apiUrl')}/api/v1/resorts?query=${encodeURIComponent(RESORT_NAME)}`).then((response) => {
      expect(response.body.length).to.be.greaterThan(0);
      cy.wrap(response.body[0].id).as('resortId');
    });

    cy.request('POST', `${Cypress.env('apiUrl')}/api/v1/skis`, { ski: { name: skiName } }).then((response) => {
      cy.wrap(response.body.id).as('skiId');
      cy.wrap(response.body.name).as('skiName');
    });
  };

  it('shows notes textarea and submits notes from log day form', function() {
    createAuthenticatedUserWithSetup();

    cy.intercept('GET', '/api/v1/skis*').as('getSkis');
    cy.intercept('GET', '/api/v1/recent_resorts*').as('getRecentResorts');
    cy.intercept('GET', '/api/v1/tags*').as('getTags');
    cy.intercept('POST', '/api/v1/days').as('createDay');

    const note = 'Pow day. Boot-deep snow and stable trees.';

    cy.visit('/new');
    cy.wait('@getSkis');
    cy.wait('@getRecentResorts');
    cy.wait('@getTags');

    cy.get('[data-testid="day-notes-input"]')
      .should('be.visible')
      .and('have.attr', 'placeholder', 'Add a note about this ski day (max. 500 characters)...')
      .type(note);
    cy.contains('button[role="gridcell"]', /^15$/).click();

    cy.get('[data-testid="find-resort-button"]').click();
    cy.get('[data-testid="resort-search-input"]').type(RESORT_NAME);
    cy.get('[data-testid="resort-search-results"]').should('be.visible');
    cy.get(`[data-testid="resort-option-${RESORT_NAME.toLowerCase().replace(/\s+/g, '-')}"]`).click();

    cy.get('@skiName').then((skiName) => {
      cy.contains('button', String(skiName)).click();
    });

    cy.get('[data-testid="save-day-button"]').click();

    cy.wait('@createDay').then((interception) => {
      expect(interception.response?.statusCode).to.eq(201);
      expect(interception.request.body.day.notes).to.eq(note);
    });
  });

  it('renders truncated notes in days list and full notes on hover + detail modal', function() {
    createAuthenticatedUserWithSetup();

    const longNote =
      'Perfect powder day! Fresh 30cm overnight made for incredible skiing in the alpine. Legs are done.';

    cy.get('@resortId').then((resortId) => {
      cy.get('@skiId').then((skiId) => {
        cy.request('POST', `${Cypress.env('apiUrl')}/api/v1/days`, {
          day: {
            date: currentSeasonDate(),
            resort_id: String(resortId),
            ski_ids: [String(skiId)],
            notes: longNote,
          },
        }).its('body.id').as('dayId');
      });
    });

    cy.intercept('GET', '/api/v1/days*').as('getDaysList');

    cy.visit('/');
    cy.wait('@getDaysList');

    cy.get('@dayId').then((dayId) => {
      const dayIdValue = String(dayId);
      cy.get(`[data-testid="day-notes-preview-${dayIdValue}"]`)
        .should('be.visible')
        .and('contain.text', '...');

      cy.get(`[data-testid="day-notes-preview-${dayIdValue}"]`)
        .should('have.attr', 'title', longNote);

      cy.get(`[data-testid="ski-day-item-${dayIdValue}"]`).click();
      cy.get('[data-testid="ski-day-detail-modal"]').should('be.visible').and('contain.text', longNote);
    });
  });
});

describe('Shared day notes', () => {
  it('shows full notes on the shared day page', () => {
    const sharedDayId = 'day_mock_shared_1';
    const sharedNote = 'Epic powder day! Fresh 18 inches overnight. Hit the backcountry gates early.';

    cy.intercept('GET', `/api/v1/shared_days/${sharedDayId}`, {
      statusCode: 200,
      body: {
        id: sharedDayId,
        date: '2025-02-15',
        notes: sharedNote,
        shared_at: '2025-02-15T10:00:00Z',
        day_number: 24,
        created_at: '2025-02-15T10:00:00Z',
        updated_at: '2025-02-15T10:00:00Z',
        user: {
          id: 'usr_shared_1',
          username: 'powder_hound',
          avatar_url: null,
        },
        resort: {
          id: 'res_shared_1',
          name: 'Jackson Hole',
          region: null,
        },
        skis: [{ id: 'ski_shared_1', name: 'Nordica Enforcer 100' }],
        tags: [
          { id: 'tag_1', name: 'Powder' },
          { id: 'tag_2', name: 'Training' },
          { id: 'tag_3', name: 'With Friends' },
        ],
        photos: [],
      },
    }).as('getSharedDay');

    cy.visit(`/d/${sharedDayId}`);
    cy.wait('@getSharedDay');
    cy.contains(sharedNote).should('be.visible');
  });
});
