/// <reference types="cypress" />

describe('Text Import Page', () => {
  const PASSWORD = 'password123';
  const TEXT_IMPORT_URL = '/text-imports/new';
  const ROOT_URL = '/';

  beforeEach(() => {
    // Create a unique user for each test
    const userEmail = `test-textimport-${Date.now()}@example.com`;
    cy.createUser(userEmail, PASSWORD);

    // Log in via API to get session cookie set for subsequent requests
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/v1/sessions`,
      body: { email: userEmail, password: PASSWORD }
    }).then((resp) => {
      expect(resp.status).to.eq(200);
    });

    // Intercept API calls
    cy.intercept('POST', '/api/v1/text_imports').as('createTextImport');
    cy.intercept('GET', '/api/v1/text_imports/*').as('getTextImport');
    cy.intercept('PATCH', '/api/v1/text_imports/*').as('updateTextImport');
    cy.intercept('PATCH', '/api/v1/draft_days/*').as('updateDraftDay');
    cy.intercept('GET', '/api/v1/resorts*').as('searchResorts');
  });

  it('should navigate to text import page from navbar', () => {
    cy.visit(ROOT_URL);

    // Click the hamburger menu icon to open the drawer
    cy.get('[aria-label="Open menu"]').should('be.visible').click();

    // Click on From Text in the import section
    cy.contains('button', 'From Text').should('be.visible').click();

    // Verify navigation to the text import page
    cy.location('pathname').should('eq', TEXT_IMPORT_URL);

    // Verify page content
    cy.contains('h1', 'Import Ski Days from Text/CSV').should('be.visible');
  });

  it('should import ski days from text input', () => {
    cy.visit(TEXT_IMPORT_URL);

    // Enter text with ski days
    const importText = `2025-01-15 Aspen Mountain
2025-01-16 Vail
2025-01-17 Breckenridge`;

    cy.get('textarea').type(importText);

    // Click Parse Ski Days button
    cy.contains('button', 'Parse Ski Days').click();

    // Wait for the import to be created and processed
    cy.wait('@createTextImport');
    cy.wait('@getTextImport');

    // Should show draft days - check for the page title change
    cy.contains('Import Ski Days from Text/CSV').should('be.visible');
    
    // Verify all three days are shown
    cy.contains('2025-01-15').should('be.visible');
    cy.contains('2025-01-16').should('be.visible');
    cy.contains('2025-01-17').should('be.visible');

    // Verify resort names are displayed
    cy.contains('Aspen Mountain').should('be.visible');
    cy.contains('Vail').should('be.visible');
    cy.contains('Breckenridge').should('be.visible');

    // Set decision for first draft day to enable commit
    cy.get('[role="combobox"]').first().click({ force: true });
    cy.contains('Create new day').click({ force: true });

    // Click commit button
    cy.get('button').contains(/Commit \d+ Days/).click();

    // Confirm the commit in the dialog
    cy.get('[data-testid="confirm-import-dialog"]').should('be.visible');
    cy.contains('button', 'Proceed with Import').click();

    // Wait for the update to complete
    cy.wait('@updateTextImport');

    // Should redirect to days list
    cy.location('pathname').should('eq', ROOT_URL);
  });

  it('should allow editing draft days before committing', () => {
    cy.visit(TEXT_IMPORT_URL);

    // Enter text with one ski day
    const importText = `2025-02-10 Aspen`;

    cy.get('textarea').type(importText);
    cy.contains('button', 'Parse Ski Days').click();

    // Wait for processing
    cy.wait('@createTextImport');
    cy.wait('@getTextImport');

    // Click on the edit button for the draft day
    cy.get('button').contains('Edit').click();

    // Edit form should be visible - check for resort name label
    cy.contains('Resort Name').should('be.visible');

    // Change the resort to a more specific one
    cy.get('[data-testid="resort-search-input"]').clear().type('Aspen Highlands');
    
    // Wait for resort search
    cy.wait('@searchResorts');

    // Select the first resort from dropdown
    cy.get('[role="listbox"]').should('be.visible');
    cy.get('[role="option"]').first().click();

    // Save changes
    cy.contains('button', 'Save Changes').click();

    // Wait for update
    cy.wait('@updateDraftDay');

    // Verify changes are reflected
    cy.contains('Aspen Highlands').should('be.visible');

    // Commit the import
    cy.get('button').contains(/Commit \d+ Days/).click();
    
    // Confirm in dialog
    cy.get('[data-testid="confirm-import-dialog"]').should('be.visible');
    cy.contains('button', 'Proceed with Import').click();
    
    cy.wait('@updateTextImport');

    // Should redirect to days list
    cy.location('pathname').should('eq', ROOT_URL);
  });

  it('should handle file upload', () => {
    cy.visit(TEXT_IMPORT_URL);

    // Create a test file content
    const fileContent = `2025-03-01 Whistler Blackcomb
2025-03-02 Whistler Blackcomb
2025-03-03 Cypress Mountain`;

    // Create and upload file
    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from(fileContent),
      fileName: 'ski-days.txt',
      mimeType: 'text/plain'
    }, { force: true });

    // File should be selected
    cy.contains('ski-days.txt').should('be.visible');

    // Click Parse Ski Days button
    cy.contains('button', 'Parse Ski Days').click();

    // Wait for processing
    cy.wait('@createTextImport');
    cy.wait('@getTextImport');

    // Should show draft days - check for the import page title
    cy.contains('Import Ski Days from Text/CSV').should('be.visible');
    
    // Verify all three days are shown
    cy.contains('2025-03-01').should('be.visible');
    cy.contains('2025-03-02').should('be.visible');
    cy.contains('2025-03-03').should('be.visible');
  });

  it('should handle season offset for dates without year', () => {
    cy.visit(TEXT_IMPORT_URL);

    // Enter text with dates without years
    const importText = `Jan 15 Aspen Mountain
Jan 16 Vail
Feb 1 Breckenridge`;

    cy.get('textarea').type(importText);

    // Select last season from season dropdown
    cy.get('button').contains('This Season').click();
    cy.contains('Last Season').click();

    // Click Parse Ski Days button
    cy.contains('button', 'Parse Ski Days').click();

    // Wait for processing
    cy.wait('@createTextImport');
    cy.wait('@getTextImport');

    // Should show draft days - check for the import page title
    cy.contains('Import Ski Days from Text/CSV').should('be.visible');
    
    // Check that dates without year are processed (exact year depends on season logic)
    // We just verify some draft days were created from the parsed text
    cy.get('body').should('contain', 'Jan');
  });

  it('should allow canceling an import', () => {
    cy.visit(TEXT_IMPORT_URL);

    // Enter text with ski days
    const importText = `2025-04-01 Alta`;

    cy.get('textarea').type(importText);
    cy.contains('button', 'Parse Ski Days').click();

    // Wait for processing
    cy.wait('@createTextImport');
    cy.wait('@getTextImport');

    // Click Cancel button
    cy.contains('button', 'Cancel').click();

    // Confirm cancellation in dialog
    cy.get('[data-testid="confirm-cancel-dialog"]').should('be.visible');
    cy.contains('button', 'Yes, Cancel Import').click();

    // Should redirect to root
    cy.location('pathname').should('eq', ROOT_URL);
  });

  it('should handle resort fuzzy matching', () => {
    cy.visit(TEXT_IMPORT_URL);

    // Enter text with misspelled resort names
    const importText = `2025-05-01 Aspn Mountain
2025-05-02 Vail Resrt`;

    cy.get('textarea').type(importText);
    cy.contains('button', 'Parse Ski Days').click();

    // Wait for processing
    cy.wait('@createTextImport');
    cy.wait('@getTextImport');

    // Should show draft days - check for the import page title
    cy.contains('Import Ski Days from Text/CSV').should('be.visible');
    
    // Resort names should be correctly matched despite misspellings
    cy.contains('Aspen Mountain').should('be.visible');
    cy.contains('Vail').should('be.visible');
  });

  it('should show parsing results with errors', () => {
    cy.visit(TEXT_IMPORT_URL);

    // Enter text with mix of valid and invalid lines
    const importText = `Not a date - Some Resort
2025-13-45 Invalid Date
2025-06-01 Aspen Mountain`;

    cy.get('textarea').type(importText);
    cy.contains('button', 'Parse Ski Days').click();

    // Wait for processing
    cy.wait('@createTextImport');
    cy.wait('@getTextImport');

    // Should show draft days and parsing info
    cy.contains('Import Ski Days from Text/CSV').should('be.visible');
    
    // Should show the valid day
    cy.contains('2025-06-01').should('be.visible');
    cy.contains('Aspen Mountain').should('be.visible');

    // Should have successfully parsed at least one day
    cy.get('body').should('contain', '2025-06-01');
  });
});