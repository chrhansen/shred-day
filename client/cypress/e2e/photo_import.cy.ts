/// <reference types="cypress" />
/// <reference types="cypress-file-upload" />

describe('Photo Import', () => {
  const PASSWORD = 'password123';
  const PHOTO_IMPORT_URL = '/photo-imports/new';
  const DAYS_LIST_URL = '/';
  const RESORT_NAME = "Le Massif";

  function goToPhotoImportPage() {
    // Open hamburger menu (assume button is first in header or has aria-label)
    cy.get('[data-testid="navbar-hamburger"]').click();
    // Click the drawer link
    cy.contains('From Photos').click();
    // Should now be on the import page
    cy.location('pathname').should('match', /\/photo-imports\//);
  }

  beforeEach(() => {
    // Create a unique user for each test
    const userEmail = `test-photoimport-${Date.now()}@example.com`;
    cy.createUser(userEmail, PASSWORD);

    // Intercept initial data fetches
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
    });

    // Visit page AFTER login to establish browser session
    cy.visit(DAYS_LIST_URL);
    cy.wait('@getStats');

    // Find Resort ID
    cy.request(`${Cypress.env('apiUrl')}/api/v1/resorts?query=${encodeURIComponent(RESORT_NAME)}`).then((response) => {
      expect(response.body.length, `Seeded resort "${RESORT_NAME}" not found`).to.be.at.least(1);
      cy.wrap(response.body[0].id).as('resortId');
    });
  });

  it('should create a new photo import and upload photos', function() {
    goToPhotoImportPage();
    // cy.wait('@getRecentResorts');
    cy.get('[data-testid="photo-dropzone-label"]').selectFile('cypress/fixtures/test_image_with_full_exif.jpg', { action: 'drag-drop' });
    cy.get('[data-testid="photo-preview"] svg.animate-spin').should('be.visible');
    cy.get('[data-testid="photo-preview"] svg.animate-spin').should('not.exist');
    cy.get('[data-testid="photo-preview"] img').should('be.visible');

    // Wait for draft day to be created
    cy.get('[data-testid^="draft-day-"]').should('exist');
  });

  it('should allow making decisions on draft days', function() {
    goToPhotoImportPage();
    cy.get('[data-testid="photo-dropzone-label"]').selectFile('cypress/fixtures/test_image_with_full_exif.jpg', { action: 'drag-drop' });
    cy.get('[data-testid^="draft-day-"]').should('exist');
    cy.get('[data-testid="ski-day-action-toggle"]').click();
    cy.get('[data-testid="action-duplicate"]').click();

    // Wait for the UI to update and show 'Duplicate'
    cy.get('[data-testid^="draft-day-"]').should('contain', 'Duplicate');

    // Re-select the action toggle after UI update, ensure it exists and force click
    cy.get('[data-testid="ski-day-action-toggle"]').should('exist').click({ force: true });
    cy.get('[data-testid="action-skip"]').should('exist').click({ force: true });

    // Verify the decision was made
    cy.get('[data-testid^="draft-day-"]').should('contain', 'Skip');
  });

  it('should allow committing the photo import', function() {
    goToPhotoImportPage();
    cy.get('[data-testid="photo-dropzone-label"]').selectFile('cypress/fixtures/test_image_with_full_exif.jpg', { action: 'drag-drop' });
    cy.get('[data-testid^="draft-day-"]').should('exist');
    cy.get('[data-testid="ski-day-action-toggle"]').click();
    cy.get('[data-testid="action-duplicate"]').click();

    cy.get('button').contains('Save Import').click();
    cy.get('[data-testid="confirm-import-dialog"]').should('exist');
    cy.get('[data-testid="confirm-import-dialog"] button').contains('Proceed with Import').click();

    cy.location('pathname').should('eq', DAYS_LIST_URL);
    cy.contains('Import committed successfully!').should('be.visible');
  });

  it('should allow canceling the photo import', function() {
    goToPhotoImportPage();
    cy.get('[data-testid="photo-dropzone-label"]').selectFile('cypress/fixtures/test_image_with_full_exif.jpg', { action: 'drag-drop' });
    cy.get('[data-testid^="draft-day-"]').should('exist');
    cy.get('button').contains('Cancel').click();

    // Confirm in the dialog
    cy.get('[data-testid="confirm-cancel-dialog"]').should('exist');
    cy.get('[data-testid="confirm-cancel-dialog"] button').contains('Yes, Cancel Import').click();

    // Verify we're redirected to home
    cy.location('pathname').should('eq', DAYS_LIST_URL);
  });

  it('should handle multiple photo uploads', function() {
    goToPhotoImportPage();
    cy.get('[data-testid="photo-dropzone-label"]').selectFile([
      'cypress/fixtures/test_image.jpg',
      'cypress/fixtures/test_image_with_full_exif.jpg'
    ], { action: 'drag-drop' });
    cy.get('[data-testid="photo-preview"] svg.animate-spin').should('have.length', 2);

    // Wait for uploads to complete
    cy.get('[data-testid="photo-preview"] svg.animate-spin').should('not.exist');

    // Verify previews
    cy.get('[data-testid="photo-preview"]').should('have.length', 2);
    cy.get('[data-testid="photo-preview"] img').should('have.length.at.least', 1);

    // Wait for draft days to be created
    cy.get('[data-testid^="draft-day-"]').should('exist');
  });

  it('should allow removing an uploaded photo from the preview', function() {
    goToPhotoImportPage();
    cy.get('[data-testid="photo-dropzone-label"]').selectFile('cypress/fixtures/test_image.jpg', { action: 'drag-drop' });
    cy.get('[data-testid="photo-preview"] img').should('be.visible');
    cy.get('[data-testid="photo-preview"]').find('button[aria-label="Remove photo"]').click();

    // Verify the preview is removed
    cy.get('[data-testid="photo-preview"]').should('not.exist');
  });

  it('should allow removing an processed photo from a draft day', function() {
    goToPhotoImportPage();
    cy.get('[data-testid="photo-dropzone-label"]').selectFile('cypress/fixtures/test_image.jpg', { action: 'drag-drop' });

    // Verify the photo is visible
    cy.get('[data-testid^="photo-processed-"]').should('be.visible');
    cy.get('[data-testid^="photo-delete-button-"]').should('exist').first().click({ force: true });
    cy.get('[data-testid^="photo-processed-"]').should('not.exist');
  });

  it('should allow editing date and resort on a photo', function() {
    goToPhotoImportPage();
    cy.get('[data-testid="photo-dropzone-label"]').selectFile('cypress/fixtures/test_image.jpg', { action: 'drag-drop' });
    cy.get('[data-testid^="photo-processed-"]').should('be.visible');

    // Click the edit button
    cy.get('[data-testid^="photo-edit-button-"]').first().click();

    // Change resort name (simulate typing and selecting from dropdown if available)
    cy.get('input[id^="resort-"]').clear().type('Le Massif');
    cy.contains('Le Massif').click();

    // Change date (open date picker and select a new date)
    cy.get('button').contains('Pick a date').click();
    cy.get('button.rdp-button_reset:not([aria-selected="true"])').first().click();

    // Save changes
    cy.get('button').contains('Save Changes').click();

    // Assert new resort and date are displayed
    cy.get('[data-testid^="photo-processed-"]').should('contain', 'Le Massif');
    cy.get('[data-testid^="photo-processed-"]').should('not.contain', 'Pick a date');
  });
});
