Feature: Controls — Voice Selection, Octave & Label Settings

  Background:
    Given I have opened the Grand Piano app in a mobile browser
    And the controls bar is visible at the top

  # ===========================================================================
  # Voice Selector
  # ===========================================================================

  Scenario: Voice dropdown shows all available voices
    When I tap the voice selector dropdown
    Then I should see options: Grand, Bright, Warm, Electric, Organ

  Scenario: Selecting a voice updates the dropdown display
    When I select "Warm" from the voice dropdown
    Then the dropdown should display "Warm"
    And subsequent note plays should use the Warm voice

  Scenario: Default voice is Grand
    Then the voice dropdown should display "Grand"

  # ===========================================================================
  # Octave Controls
  # ===========================================================================

  Scenario: Octave display shows current middle octave
    Then the octave display should show "4" by default

  Scenario: Octave up button increments the display
    When I tap the octave up button
    Then the octave display should change from "4" to "5"

  Scenario: Octave down button decrements the display
    When I tap the octave down button
    Then the octave display should change from "4" to "3"

  Scenario: Octave buttons are tappable and responsive
    When I tap the octave up button
    Then the button should respond within 100ms
    And the piano keys should re-render with new note labels

  # ===========================================================================
  # Label Toggle
  # ===========================================================================

  Scenario: Label toggle shows/hides note names
    Given key labels are visible
    When I tap the "ABC" button
    Then all key labels should disappear
    And the "ABC" button should lose its active styling

  Scenario: Label toggle is a binary switch
    When I tap "ABC" once (labels hidden)
    And I tap "ABC" again (labels shown)
    Then the labels should be visible again

  # ===========================================================================
  # Accessibility
  # ===========================================================================

  Scenario: All controls have accessible labels
    Then the octave up button should have aria-label "Raise octave"
    And the octave down button should have aria-label "Lower octave"
    And the voice selector should have aria-label "Select piano voice"
    And the sustain pedal should have aria-label "Sustain pedal"
    And every piano key should have an aria-label with its note name

  Scenario: Note display is announced to screen readers
    Then the note display region should have aria-live="polite"
    When a note is played
    Then the note name should be announced to assistive technology
