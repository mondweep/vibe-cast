// =============================================================================
// Identity Context — E2E Test Suite
// =============================================================================
// Tests run against the REAL backend — NO mocking/stubbing.
// Each test traces to a Gherkin scenario in specs/identity.feature
// =============================================================================

describe('Identity — Authentication & Profile Management', () => {
  const API_BASE = Cypress.env('IDENTITY_API') || 'http://localhost:8081';

  before(() => {
    // Seed test data via real API call (Forge Phase 0 requirement)
    cy.request('POST', `${API_BASE}/api/v1/test/seed`, {
      users: [
        {
          email: 'testuser@example.com',
          password: 'SecurePass123!',
          name: 'Test User',
        },
      ],
    });
  });

  // =========================================================================
  // Authentication Tests — Traces to identity.feature Authentication Scenarios
  // =========================================================================

  describe('Authentication', () => {
    beforeEach(() => {
      cy.visit('/login');
    });

    it('should login successfully with valid credentials', () => {
      // Gherkin: Scenario: Successful login with valid credentials
      cy.get('[data-testid="email-input"]').type('testuser@example.com');
      cy.get('[data-testid="password-input"]').type('SecurePass123!');
      cy.get('[data-testid="signin-button"]').click();

      cy.url().should('include', '/dashboard');
      cy.get('[data-testid="welcome-message"]').should(
        'contain',
        'Welcome back, Test User'
      );
      cy.window().then((win) => {
        expect(win.localStorage.getItem('auth_token')).to.not.be.null;
      });
    });

    it('should reject invalid credentials', () => {
      // Gherkin: Scenario: Login fails with invalid credentials
      cy.get('[data-testid="email-input"]').type('testuser@example.com');
      cy.get('[data-testid="password-input"]').type('WrongPassword');
      cy.get('[data-testid="signin-button"]').click();

      cy.get('[data-testid="error-message"]').should(
        'contain',
        'Invalid email or password'
      );
      cy.url().should('include', '/login');
      cy.window().then((win) => {
        expect(win.localStorage.getItem('auth_token')).to.be.null;
      });
    });

    it('should rate-limit after 5 failed attempts', () => {
      // Gherkin: Scenario: Login fails after 5 consecutive attempts
      for (let i = 0; i < 5; i++) {
        cy.get('[data-testid="email-input"]').clear().type('testuser@example.com');
        cy.get('[data-testid="password-input"]').clear().type('WrongPassword');
        cy.get('[data-testid="signin-button"]').click();
        cy.wait(500);
      }

      cy.get('[data-testid="error-message"]').should(
        'contain',
        'Account temporarily locked'
      );

      // Verify API returns 429
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/auth/login`,
        body: { email: 'testuser@example.com', password: 'attempt' },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(429);
      });
    });

    it('should redirect to login on session expiry', () => {
      // Gherkin: Scenario: Session expires after inactivity
      // Login first
      cy.get('[data-testid="email-input"]').type('testuser@example.com');
      cy.get('[data-testid="password-input"]').type('SecurePass123!');
      cy.get('[data-testid="signin-button"]').click();
      cy.url().should('include', '/dashboard');

      // Expire the session token manually
      cy.window().then((win) => {
        win.localStorage.setItem('auth_token', 'expired-token');
      });

      // Navigate to protected page
      cy.visit('/profile');
      cy.url().should('include', '/login');
      cy.get('[data-testid="session-expired-message"]').should(
        'contain',
        'Your session has expired'
      );
    });
  });

  // =========================================================================
  // Registration Tests — Traces to identity.feature Registration Scenarios
  // =========================================================================

  describe('Registration', () => {
    beforeEach(() => {
      cy.visit('/register');
    });

    it('should register a new user successfully', () => {
      // Gherkin: Scenario: Successful new user registration
      const uniqueEmail = `jane.doe+${Date.now()}@example.com`;

      cy.get('[data-testid="name-input"]').type('Jane Doe');
      cy.get('[data-testid="email-input"]').type(uniqueEmail);
      cy.get('[data-testid="password-input"]').type('StrongPass456!');
      cy.get('[data-testid="confirm-password-input"]').type('StrongPass456!');
      cy.get('[data-testid="terms-checkbox"]').check();
      cy.get('[data-testid="create-account-button"]').click();

      cy.get('[data-testid="success-message"]').should(
        'contain',
        'Please check your email to verify your account'
      );
    });

    it('should reject duplicate email registration', () => {
      // Gherkin: Scenario: Registration fails with existing email
      cy.get('[data-testid="name-input"]').type('Duplicate User');
      cy.get('[data-testid="email-input"]').type('testuser@example.com');
      cy.get('[data-testid="password-input"]').type('StrongPass456!');
      cy.get('[data-testid="confirm-password-input"]').type('StrongPass456!');
      cy.get('[data-testid="terms-checkbox"]').check();
      cy.get('[data-testid="create-account-button"]').click();

      cy.get('[data-testid="error-message"]').should(
        'contain',
        'An account with this email already exists'
      );
    });

    it('should enforce password strength requirements', () => {
      // Gherkin: Scenario: Registration enforces password strength
      cy.get('[data-testid="password-input"]').type('weak');
      cy.get('[data-testid="password-strength"]').should('contain', 'Weak');
      cy.get('[data-testid="create-account-button"]').should('be.disabled');

      cy.get('[data-testid="password-input"]').clear().type('StrongPass456!');
      cy.get('[data-testid="password-strength"]').should('contain', 'Strong');
      cy.get('[data-testid="create-account-button"]').should('not.be.disabled');
    });
  });

  // =========================================================================
  // Profile Tests — Traces to identity.feature Profile Scenarios
  // =========================================================================

  describe('Profile Management', () => {
    beforeEach(() => {
      cy.login('testuser@example.com', 'SecurePass123!'); // Custom command
      cy.visit('/profile');
    });

    it('should update profile information', () => {
      // Gherkin: Scenario: User updates profile information
      cy.get('[data-testid="display-name-input"]')
        .clear()
        .type('Updated Test User');
      cy.get('[data-testid="phone-input"]').clear().type('+1-555-0199');
      cy.get('[data-testid="save-profile-button"]').click();

      cy.get('[data-testid="success-toast"]').should(
        'contain',
        'Profile updated successfully'
      );
      cy.get('[data-testid="display-name-input"]').should(
        'have.value',
        'Updated Test User'
      );
    });

    it('should upload and persist profile avatar', () => {
      // Gherkin: Scenario: User uploads profile avatar
      cy.get('[data-testid="avatar-upload"]').selectFile(
        'cypress/fixtures/avatar.jpg',
        { force: true }
      );
      cy.get('[data-testid="avatar-preview"]')
        .should('have.attr', 'src')
        .and('not.be.empty');

      cy.get('[data-testid="save-profile-button"]').click();

      // Verify persistence
      cy.reload();
      cy.get('[data-testid="avatar-preview"]')
        .should('have.attr', 'src')
        .and('not.be.empty');
    });
  });
});
