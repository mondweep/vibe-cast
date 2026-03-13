Feature: Vocabulary Tracking

  Scenario: New word encountered for the first time
    Given I am listening to a song
    When a line containing the word "ahimsa" plays
    And I have never encountered "ahimsa" before
    Then "ahimsa" is added to my vocabulary with encounter_count of 1
    And it appears with a bold highlight in the lyrics

  Scenario: Known word encountered again
    Given "shanti" is in my vocabulary with encounter_count of 15
    When a line containing "shanti" plays
    Then encounter_count increments to 16
    And "shanti" appears without special highlight

  Scenario: User marks word for revision
    Given I tap the word "moksha" in the lyrics
    When I click "Mark for revision"
    Then "moksha" appears in my revision deck
    And marked_revision is true in Supabase

  Scenario: Session summary after song
    Given I just finished listening to a song
    Then a summary modal appears showing total words heard
    And new words count
    And words ready for revision
