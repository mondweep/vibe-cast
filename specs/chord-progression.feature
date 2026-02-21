Feature: Chord Progression
  As a guitar student
  I want to see chord changes synchronized with the beat
  So that I can internalize when chords transition

  Scenario: RSD lesson progression structure
    Given the RSD lesson progression is loaded
    Then Bar 1 should have Am from beat 1 to 2 and Am9 from beat 3 to 4
    And Bar 2 should have C from beat 1 to 2 and D from beat 3 to 4
    And Bar 3 should have Fmaj7 for the entire bar with silence on beat 3
    And Bar 4 should be the G to Am transition

  Scenario: Resolve current chord from beat position
    Given the RSD lesson progression is loaded
    When the beat position is bar 1 beat 1
    Then the current chord should be "Am"
    When the beat position is bar 1 beat 3
    Then the current chord should be "Am9"
    When the beat position is bar 2 beat 1
    Then the current chord should be "C"
    When the beat position is bar 3 beat 1
    Then the current chord should be "Fmaj7"

  Scenario: Chord voicings contain correct fret positions
    Given the chord library is loaded
    Then "Am" should have positions on strings and frets matching standard voicing
    And "Am9" should have positions matching the RSD lesson voicing
    And "Fmaj7" should have positions matching standard voicing

  Scenario: Silence flag on Fmaj7 bar
    Given the RSD lesson progression is loaded
    When the beat position is bar 3 beat 3
    Then the current segment should have a silence flag on beat 3
