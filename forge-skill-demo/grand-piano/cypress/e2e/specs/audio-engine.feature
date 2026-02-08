Feature: Audio Engine — Web Audio Synthesis, Voices & Sustain

  Background:
    Given I have opened the Grand Piano app in a mobile browser
    And the AudioContext has been initialized by a user gesture

  # ===========================================================================
  # Note Playback
  # ===========================================================================

  Scenario: Single note plays correct frequency
    When I tap the C4 white key
    Then an audio oscillator should start playing at 261.63 Hz
    And the note display should show "C4"
    When I release the C4 key
    Then the oscillator should fade out within the release envelope
    And the note display should clear

  Scenario: Multiple notes play simultaneously (polyphony)
    When I tap C4, E4, and G4 keys simultaneously
    Then three separate oscillators should be active
    And the note display should show "C4  E4  G4"
    When I release all keys
    Then all oscillators should fade out

  Scenario: Note frequency matches equal temperament tuning
    When I tap the A4 key
    Then the fundamental frequency should be exactly 440 Hz
    When I tap the A5 key
    Then the fundamental frequency should be exactly 880 Hz

  Scenario: Rapid repeated taps on same note
    When I rapidly tap C4 five times in quick succession
    Then each tap should produce a clean note onset
    And there should be no audio glitches or clicks

  # ===========================================================================
  # Voice Selection
  # ===========================================================================

  Scenario: Switching voice changes timbre
    Given the current voice is "Grand"
    When I select "Bright" from the voice dropdown
    And I tap the C4 key
    Then the tone should have brighter harmonic content than "Grand"
    And the voice dropdown should display "Bright"

  Scenario: Voice change applies to subsequent notes only
    Given I am holding down C4 with "Grand" voice
    When I switch to "Electric" voice
    Then the currently playing C4 should continue with "Grand" timbre
    When I release and re-tap C4
    Then the new note should play with "Electric" timbre

  Scenario: All five voices produce distinct sounds
    When I play C4 with each voice in sequence: Grand, Bright, Warm, Electric, Organ
    Then each voice should produce audibly distinct timbre
    And no voice should produce silence or errors

  # ===========================================================================
  # Sustain Pedal
  # ===========================================================================

  Scenario: Sustain pedal holds notes after key release
    Given I press and hold the sustain pedal
    When I tap and release C4
    Then C4 should continue sounding after key release
    And the C4 key should remain visually deactivated
    When I release the sustain pedal
    Then C4 should fade out according to the release envelope

  Scenario: Sustain pedal holds multiple notes
    Given I press and hold the sustain pedal
    When I tap and release C4, then E4, then G4 in sequence
    Then all three notes C4, E4, G4 should be sounding simultaneously
    When I release the sustain pedal
    Then all three notes should fade out

  Scenario: Sustain pedal visual state
    When I press the sustain pedal
    Then the pedal button should show "SUSTAIN ON"
    And the pedal button should be highlighted
    When I release the sustain pedal
    Then the pedal button should show "SUSTAIN"
    And the pedal button highlight should be removed
