Feature: Piano Keys — Touch Interaction, Visual Feedback & Navigation

  Background:
    Given I have opened the Grand Piano app in a mobile browser
    And the piano keyboard is visible

  # ===========================================================================
  # Key Rendering
  # ===========================================================================

  Scenario: Piano displays 3 octaves of keys
    Then I should see white keys spanning 3 octaves
    And black keys should be positioned between the correct white keys
    And the key layout should follow the standard piano pattern (WBWBWWBWBWBW)

  Scenario: Key labels are visible by default
    Then each white key should display its note name (e.g., "C4", "D4")
    And each black key should display its note name (e.g., "C#", "D#")
    And the "ABC" toggle button should be in active state

  Scenario: Key labels can be hidden
    When I tap the "ABC" toggle button
    Then all key labels should be hidden
    And the "ABC" toggle button should be in inactive state
    When I tap the "ABC" toggle button again
    Then all key labels should be visible again

  # ===========================================================================
  # Touch Interaction
  # ===========================================================================

  Scenario: Tapping a white key plays the note
    When I tap the D4 white key
    Then the D4 key should highlight with a pink/red glow
    And the note "D4" should play through the audio engine
    And the note display should show "D4"

  Scenario: Tapping a black key plays the note
    When I tap the F#4 black key
    Then the F#4 key should highlight with a red glow
    And the note "F#4" should play
    And the note display should show "F#4 / Gb4"

  Scenario: Multi-touch plays a chord on the keyboard
    When I simultaneously touch C4, E4, and G4 keys
    Then all three keys should highlight
    And all three notes should sound together as a C major chord
    And the note display should show all three notes

  Scenario: Glissando by sliding finger across keys
    Given I touch and hold the C4 key
    When I slide my finger across to G4
    Then each key my finger passes over should play in sequence
    And only the key currently under my finger should be highlighted

  Scenario: Lifting finger stops the note
    Given I am holding down the E4 key
    When I lift my finger from E4
    Then the E4 note should stop (or fade out)
    And the E4 key highlight should be removed

  # ===========================================================================
  # Visual Feedback
  # ===========================================================================

  Scenario: Active white key shows visual feedback
    When I touch a white key
    Then the key background should change to a pink gradient
    And the key should show a subtle glow effect
    And the key label should turn red and become bold

  Scenario: Active black key shows visual feedback
    When I touch a black key
    Then the key background should change to a dark red gradient
    And the key should show a glow effect
    And the key label should turn pink and become bold

  Scenario: Note display updates in real time
    When I press C4
    Then the note display should immediately show "C4"
    When I also press E4 (second finger)
    Then the note display should show "C4  E4"
    When I release C4
    Then the note display should show "E4" only

  # ===========================================================================
  # Octave Navigation
  # ===========================================================================

  Scenario: Octave up shifts the keyboard range
    Given the keyboard starts at octave 3
    When I tap the octave up button
    Then the keyboard should shift to start at octave 4
    And the octave display should show "5" (middle octave)
    And the key labels should update to reflect the new octave

  Scenario: Octave down shifts the keyboard range
    Given the keyboard starts at octave 3
    When I tap the octave down button
    Then the keyboard should shift to start at octave 2
    And the octave display should show "3" (middle octave)

  Scenario: Octave range is bounded
    When I tap the octave up button repeatedly
    Then the octave should not exceed 7
    When I tap the octave down button repeatedly
    Then the octave should not go below 1

  Scenario: Piano is horizontally scrollable
    Given the piano keys extend beyond the screen width
    When I swipe horizontally on the piano area
    Then the piano should scroll to reveal more keys
    And the scrolling should feel smooth and natural
