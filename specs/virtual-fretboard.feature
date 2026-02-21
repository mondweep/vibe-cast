Feature: Virtual Fretboard
  As a guitar student
  I want to practice placing fingers on a virtual fretboard
  So that I can recall chord shapes without my guitar

  Scenario: Display fretboard with correct dimensions
    Given the fretboard is displayed
    Then it should show 6 strings and 12 frets
    And it should be vertical on mobile and horizontal on desktop

  Scenario: Visual recall drill - correct placement
    Given a drill for the "Am" chord is active
    When I place fingers on string 2 fret 1, string 3 fret 2, string 4 fret 2
    And I submit my answer
    Then all positions should be marked as correct
    And the score should be 100

  Scenario: Visual recall drill - partial placement
    Given a drill for the "Am" chord is active
    When I place fingers on string 2 fret 1 and string 3 fret 2
    And I submit my answer
    Then 2 positions should be marked as correct
    And 1 position should be marked as missed
    And the score should reflect partial accuracy

  Scenario: Visual recall drill - incorrect placement
    Given a drill for the "Am" chord is active
    When I place a finger on string 1 fret 3
    And I submit my answer
    Then that position should be marked as incorrect

  Scenario: Toggle finger placement
    Given the fretboard is displayed
    When I tap on string 3 fret 2
    Then a finger dot should appear at that position
    When I tap on string 3 fret 2 again
    Then the finger dot should be removed
