Feature: Metronome
  As a guitar student
  I want a metronome with eighth-note subdivisions
  So that I can internalize the "1 & 2 & 3 & 4 &" counting

  Scenario: Default metronome configuration
    Given the metronome is initialized
    Then the BPM should be 80
    And the time signature should be 4/4
    And the metronome should not be playing

  Scenario: Start and stop metronome
    Given the metronome is initialized
    When I start the metronome
    Then the metronome should be playing
    When I stop the metronome
    Then the metronome should not be playing

  Scenario: Adjust BPM
    Given the metronome is initialized
    When I set the BPM to 120
    Then the BPM should be 120

  Scenario: BPM clamped to valid range
    Given the metronome is initialized
    When I set the BPM to 300
    Then the BPM should be 240
    When I set the BPM to 10
    Then the BPM should be 40

  Scenario: Beat position advances through subdivisions
    Given the metronome is at BPM 120
    When a beat tick occurs
    Then the beat position should advance through "1 & 2 & 3 & 4 &"
    And the bar should increment after beat 4 upbeat

  Scenario: Bar loops after reaching loop length
    Given the metronome has a loop length of 4 bars
    When bar 4 beat 4 upbeat completes
    Then the position should reset to bar 1 beat 1 downbeat
