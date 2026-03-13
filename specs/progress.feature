Feature: Progress Dashboard

  Scenario: User views learning progress
    Given I have listened to 5 songs over 3 days
    When I open the Progress tab
    Then I see my total unique words count
    And a familiarity distribution chart
    And my current learning streak

  Scenario: Data persists across sessions
    Given I listened to a song yesterday and learned 10 words
    When I sign in today on a different device
    Then my vocabulary shows all 10 words with correct encounter counts
    And my learning streak shows 2 days

  Scenario: User exports vocabulary
    Given I have 50 words in my vocabulary
    When I click Export as CSV
    Then a CSV file downloads containing all my words with meanings and familiarity scores
