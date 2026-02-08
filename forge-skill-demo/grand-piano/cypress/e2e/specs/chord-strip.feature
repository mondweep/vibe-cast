Feature: Chord Strip — One-Tap Chord Playing

  Background:
    Given I have opened the Grand Piano app in a mobile browser
    And the chord strip is visible above the piano keys

  # ===========================================================================
  # Chord Playback
  # ===========================================================================

  Scenario: Tapping a chord button plays the chord
    When I tap the "C maj" chord button
    Then the notes C4, E4, and G4 should play simultaneously
    And the chord button should highlight with an accent color
    And the note display should show the chord notes

  Scenario: Releasing a chord button stops the chord
    Given I am holding the "C maj" chord button
    When I release my finger from the chord button
    Then all chord notes should stop (or fade out)
    And the chord button highlight should be removed
    And the piano keys should deactivate

  Scenario: Playing a minor chord
    When I tap the "A min" chord button
    Then the notes A4, C5, and E5 should play simultaneously
    And the chord button should be highlighted

  Scenario: Playing a seventh chord
    When I tap the "G 7" chord button
    Then four notes (G4, B4, D5, F5) should play simultaneously
    And the note display should show all four notes

  Scenario: Playing a major seventh chord
    When I tap the "C M7" chord button
    Then four notes (C4, E4, G4, B4) should play simultaneously

  Scenario: Playing a minor seventh chord
    When I tap the "D m7" chord button
    Then four notes (D4, F4, A4, C5) should play simultaneously

  # ===========================================================================
  # Chord-Key Highlighting
  # ===========================================================================

  Scenario: Chord button highlights corresponding piano keys
    When I tap the "C maj" chord button
    Then the C4, E4, and G4 keys on the piano should highlight
    And no other keys should be highlighted

  Scenario: Releasing chord deactivates all highlighted keys
    Given I am holding the "C maj" chord button
    When I release the chord button
    Then no piano keys should be highlighted

  # ===========================================================================
  # Chord Strip Navigation
  # ===========================================================================

  Scenario: Chord strip is horizontally scrollable
    Given there are more chord buttons than fit on screen
    When I swipe horizontally on the chord strip
    Then additional chord buttons should scroll into view
    And the scrolling should be smooth

  Scenario: All root notes have chord variants
    Then the chord strip should contain chords for C, D, E, F, G, A, B
    And each root note should have at least major and minor variants

  Scenario: Chords update when octave changes
    Given I tap the "C maj" chord button and hear notes in octave 4
    When I release the chord
    And I tap the octave up button
    And I tap the "C maj" chord button again
    Then the chord should play in octave 5 (one octave higher)
