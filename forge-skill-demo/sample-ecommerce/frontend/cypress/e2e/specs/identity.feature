Feature: Identity — User Authentication & Profile Management

  Background:
    Given the identity service is running and healthy
    And test user data has been seeded via API

  # ===========================================================================
  # Authentication Scenarios
  # ===========================================================================

  Scenario: Successful login with valid credentials
    Given I am on the login page
    When I enter valid email "testuser@example.com"
    And I enter valid password "SecurePass123!"
    And I click the "Sign In" button
    Then I should be redirected to the dashboard
    And I should see the welcome message "Welcome back, Test User"
    And the auth token should be stored in secure storage

  Scenario: Login fails with invalid credentials
    Given I am on the login page
    When I enter email "testuser@example.com"
    And I enter incorrect password "WrongPassword"
    And I click the "Sign In" button
    Then I should see an error message "Invalid email or password"
    And I should remain on the login page
    And no auth token should be stored

  Scenario: Login fails after 5 consecutive attempts (rate limiting)
    Given I am on the login page
    When I attempt to login 5 times with wrong credentials
    Then I should see "Account temporarily locked. Try again in 15 minutes."
    And subsequent login attempts should return HTTP 429

  Scenario: Session expires after inactivity
    Given I am logged in as "testuser@example.com"
    When my session token expires after 30 minutes of inactivity
    And I attempt to navigate to a protected page
    Then I should be redirected to the login page
    And I should see "Your session has expired. Please sign in again."

  # ===========================================================================
  # Registration Scenarios
  # ===========================================================================

  Scenario: Successful new user registration
    Given I am on the registration page
    When I fill in "Full Name" with "Jane Doe"
    And I fill in "Email" with "jane.doe@example.com"
    And I fill in "Password" with "StrongPass456!"
    And I fill in "Confirm Password" with "StrongPass456!"
    And I accept the terms and conditions
    And I click "Create Account"
    Then I should see "Please check your email to verify your account"
    And a verification email should be sent to "jane.doe@example.com"

  Scenario: Registration fails with existing email
    Given I am on the registration page
    And user "testuser@example.com" already exists
    When I fill in "Email" with "testuser@example.com"
    And I complete the remaining registration fields
    And I click "Create Account"
    Then I should see "An account with this email already exists"

  Scenario: Registration enforces password strength
    Given I am on the registration page
    When I fill in "Password" with "weak"
    Then I should see password strength indicator showing "Weak"
    And the "Create Account" button should be disabled
    When I update "Password" to "StrongPass456!"
    Then I should see password strength indicator showing "Strong"
    And the "Create Account" button should be enabled

  # ===========================================================================
  # Password Management Scenarios
  # ===========================================================================

  Scenario: Successful password reset flow
    Given I am on the login page
    When I click "Forgot Password?"
    And I enter "testuser@example.com" in the reset email field
    And I click "Send Reset Link"
    Then I should see "If an account exists, a reset link has been sent"
    When I follow the password reset link from email
    And I enter new password "NewSecurePass789!"
    And I confirm new password "NewSecurePass789!"
    And I click "Reset Password"
    Then I should see "Password successfully reset"
    And I should be able to login with the new password

  # ===========================================================================
  # Profile Management Scenarios
  # ===========================================================================

  Scenario: User updates profile information
    Given I am logged in as "testuser@example.com"
    And I navigate to "My Profile"
    When I update "Display Name" to "Updated Test User"
    And I update "Phone" to "+1-555-0199"
    And I click "Save Changes"
    Then I should see "Profile updated successfully"
    And the profile should display "Updated Test User"

  Scenario: User uploads profile avatar
    Given I am logged in as "testuser@example.com"
    And I navigate to "My Profile"
    When I click on the avatar upload area
    And I select a valid image file "avatar.jpg" (under 5MB)
    Then the avatar preview should update immediately
    And I click "Save Changes"
    Then the avatar should persist across page refreshes
