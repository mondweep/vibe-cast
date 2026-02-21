Feature: Gamification
  As a guitar student
  I want to track my practice streaks
  So that I stay motivated with daily internalization drills

  Scenario: Start a new streak
    Given no previous practice sessions exist
    When I complete a drill today
    Then my current streak should be 1

  Scenario: Continue a streak
    Given I practiced yesterday with a streak of 5
    When I complete a drill today
    Then my current streak should be 6

  Scenario: Break a streak
    Given I last practiced 2 days ago with a streak of 5
    When I complete a drill today
    Then my current streak should be 1

  Scenario: Track longest streak
    Given my longest streak is 10
    When my current streak reaches 11
    Then my longest streak should update to 11

  Scenario: Daily practice summary
    Given I have completed 3 fretboard drills and 2 rhythm drills today
    Then my daily summary should show 3 fretboard and 2 rhythm drills
