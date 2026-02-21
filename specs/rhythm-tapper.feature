Feature: Rhythm Tapper
  As a guitar student
  I want to practice tapping rhythms in time with the metronome
  So that I can internalize the Fmaj7 silence discipline

  Scenario: Tap on the beat scores as perfect
    Given the rhythm drill is active at 120 BPM
    When I tap within 50ms of a beat
    Then the tap should be judged as "perfect"

  Scenario: Tap near the beat scores as good
    Given the rhythm drill is active at 120 BPM
    When I tap within 120ms of a beat
    Then the tap should be judged as "good"

  Scenario: Tap far from any beat scores as miss
    Given the rhythm drill is active at 120 BPM
    When I tap more than 120ms from any beat
    Then the tap should be judged as "miss"

  Scenario: Tap on beat 3 during Fmaj7 silence is a violation
    Given the rhythm drill is on the Fmaj7 bar
    When I tap on beat 3
    Then the tap should be judged as "silence_violation"
    And the silence violation count should increment

  Scenario: Not tapping on beat 3 during Fmaj7 silence is correct
    Given the rhythm drill is on the Fmaj7 bar
    When beat 3 passes without a tap
    Then no silence violation should be recorded

  Scenario: Drill accuracy calculation
    Given a rhythm drill with 8 taps
    When 6 taps are perfect and 2 are good
    Then the accuracy should be 100%
    When 1 tap is a silence violation
    Then the accuracy should decrease
