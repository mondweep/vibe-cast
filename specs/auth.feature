Feature: User Authentication

  Scenario: New user signs up with email
    Given I am on the sign-up page
    When I enter a valid email and password
    Then my account is created
    And a profile record exists in Supabase
    And I am redirected to the Play tab

  Scenario: Returning user signs in
    Given I have an existing account
    When I sign in with my credentials
    Then I see my Play tab with my history preserved

  Scenario: Unauthenticated user is redirected
    Given I am not signed in
    When I navigate to /revise
    Then I am redirected to the sign-in page
