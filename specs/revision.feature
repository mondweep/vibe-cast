Feature: Revision Dashboard

  Scenario: User opens flashcard revision
    Given I have 20 words in my vocabulary
    When I open the Revise tab and select Flashcard mode
    Then I see a Sanskrit word in Devanagari
    And I can flip to see the English meaning
    And after rating difficulty the next card appears

  Scenario: Spaced repetition scheduling
    Given I reviewed "karma" and rated it as easy
    Then srs_interval increases
    And srs_next_review is set to a future date
    And "karma" will not appear in revision until that date

  Scenario: Matching mode drill
    Given I have at least 4 words in my vocabulary
    When I select Matching mode in the Revise tab
    Then I see 4 Sanskrit words and 4 English meanings
    And I can drag to match them correctly

  Scenario: Revision deck filters
    Given I have words from multiple songs
    When I filter revision deck by a specific song
    Then only words from that song appear in the deck
