describe('Account Page', () => {
  const PASSWORD = 'password123';
  let userEmail: string;

  beforeEach(() => {
    userEmail = `test-account-${Date.now()}@example.com`;
    cy.createUser(userEmail, PASSWORD);

    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/v1/sessions`,
      body: { email: userEmail, password: PASSWORD },
    }).then((resp) => {
      expect(resp.status).to.eq(200);
    });

    cy.visit('/settings/account');
    // Wait for page elements to be ready, e.g., the email display which indicates data has loaded
    cy.contains('label', 'Email').should('be.visible');
    cy.contains('div', userEmail).should('be.visible');
  });

  it('should display initial account information correctly', () => {
    cy.contains('[data-testid="navbar"]', 'Account Settings').should('be.visible');

    cy.contains('label', 'Email').should('be.visible');
    cy.contains('div', userEmail).should('be.visible');

    cy.contains('label', 'Sign Up Date').should('be.visible');
    // Check for a non-empty sign-up date value, as exact date is dynamic
    cy.contains('label', 'Sign Up Date').next('div').invoke('text').should('not.be.empty');

    cy.contains('label', 'Season Start Date').should('be.visible');
    // Check if dropdowns have some initial value or placeholder
    // This depends on backend default for new users, if any. Let's assume a default or it populates.
    cy.get('#seasonStartMonth > span').invoke('text').should('not.be.empty'); // Check if month has a value
    cy.get('#seasonStartDay > span').invoke('text').should('not.be.empty');   // Check if day has a value

    cy.contains('h3', 'Season Ranges').should('be.visible');
    cy.contains('[class*="text-sm"]', 'This season:').should('be.visible');
    cy.contains('[class*="text-sm"]', 'Last season:').should('be.visible');
  });

  it('should allow updating the season start date', () => {
    const targetMonth = 'June';
    const targetDay = '15';
    const expectedApiFormat = '06-15'; // June is 6th month

    // Select new month
    cy.get('#seasonStartMonth').click();
    cy.get('div[role="listbox"]:visible').contains('[role="option"]', targetMonth).click({ force: true });

    // Select new day
    cy.get('#seasonStartDay').click();
    cy.get('div[role="listbox"]:visible').contains('[role="option"]', targetDay).click({ force: true });

    // Intercept the PATCH request to verify its payload before clicking save
    cy.intercept('PATCH', '/api/v1/account').as('updateAccountDetails');

    cy.contains('button', 'Save Changes').click();

    cy.wait('@updateAccountDetails').then((interception) => {
      expect(interception.request.body.user.season_start_day).to.eq(expectedApiFormat);
      expect(interception.response?.statusCode).to.eq(200);
    });

    cy.contains('Account updated').should('be.visible');

    // After successful update, the dropdowns should reflect the new values
    cy.get('#seasonStartMonth').should('contain.text', targetMonth);
    cy.get('#seasonStartDay').should('contain.text', targetDay);
  });

  it('should allow updating username and avatar photo', () => {
    const newUsername = `powder_hound_${Date.now()}`;
    const expectedUsername = newUsername.slice(0, 20);

    cy.intercept('PATCH', '/api/v1/account').as('updateAccountDetails');

    cy.get('#username').clear().type(newUsername);
    cy.get('#avatarUpload').selectFile('cypress/fixtures/test_image.jpg', { force: true });
    cy.get('#avatarUpload').then((input) => {
      const files = (input[0] as HTMLInputElement).files;
      expect(files).to.have.length(1);
    });

    cy.contains('button', 'Save Changes').click();

    cy.wait('@updateAccountDetails').then((interception) => {
      const contentType = interception.request.headers['content-type'];
      expect(contentType).to.include('multipart/form-data');
      expect(interception.response?.statusCode).to.eq(200);
      expect(interception.response?.body.avatar_url).to.be.a('string');
    });

    cy.contains('Account updated').should('be.visible');
    cy.get('#username').should('have.value', expectedUsername);
    cy.get('#username').should('have.value', expectedUsername);
  });
});
