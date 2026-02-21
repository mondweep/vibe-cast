Feature: Technique Flashcards
  As a guitar student
  I want spaced repetition flashcards for techniques
  So that I can memorize slide and finger substitution rules

  Scenario: Initial deck contains lesson techniques
    Given the flashcard deck is loaded
    Then it should contain a card for the "Slide" technique
    And it should contain a card for "Finger Substitution"
    And it should contain a card for "Fingerstyle Arpeggio"

  Scenario: Card flip reveals answer
    Given I am viewing a flashcard question
    When I flip the card
    Then the answer should be displayed

  Scenario: Confidence rating updates review schedule
    Given I have answered a flashcard
    When I rate it as "easy"
    Then the next review interval should increase
    When I rate it as "again"
    Then the next review interval should reset to 1 day

  Scenario: Spaced repetition algorithm (SM-2)
    Given a card with 0 repetitions and ease factor 2.5
    When I rate it as "good"
    Then the interval should be 1 day and repetitions should be 1
    When I rate it as "good" again
    Then the interval should be 6 days and repetitions should be 2

  Scenario: Cards due for review are prioritized
    Given cards with various next review dates
    When I start a review session
    Then cards past their next review date should appear first
