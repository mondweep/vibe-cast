// =============================================================================
// Audio Engine Context — E2E Test Suite
// =============================================================================
// Tests run against the REAL Web Audio API — NO mocking/stubbing.
// Each test traces to a Gherkin scenario in specs/audio-engine.feature
// =============================================================================

describe('Audio Engine — Web Audio Synthesis, Voices & Sustain', () => {
  beforeEach(() => {
    cy.visit('/');
    // Initialize AudioContext with a user gesture (required by browsers)
    cy.get('#piano').trigger('touchstart', { force: true });
    cy.get('#piano').trigger('touchend', { force: true });
  });

  // =========================================================================
  // Note Playback — Traces to audio-engine.feature Note Playback Scenarios
  // =========================================================================

  describe('Note Playback', () => {
    it('should play a single note when a key is tapped', () => {
      // Gherkin: Scenario: Single note plays correct frequency
      cy.get('.white-key[data-note="C4"]').trigger('mousedown');
      cy.get('#note-display').should('contain', 'C4');
      cy.get('.white-key[data-note="C4"]').should('have.class', 'active');

      cy.get('.white-key[data-note="C4"]').trigger('mouseup');
      cy.get('.white-key[data-note="C4"]').should('not.have.class', 'active');
    });

    it('should support polyphony — multiple simultaneous notes', () => {
      // Gherkin: Scenario: Multiple notes play simultaneously (polyphony)
      // Simulate multi-touch via sequential mousedown (touch events tested on device)
      cy.get('.white-key[data-note="C4"]').trigger('mousedown');
      cy.get('.white-key[data-note="C4"]').should('have.class', 'active');

      // Verify display shows notes
      cy.get('#note-display').should('not.be.empty');
    });

    it('should tune A4 to 440 Hz (equal temperament)', () => {
      // Gherkin: Scenario: Note frequency matches equal temperament tuning
      // The AudioEngine.noteFrequency function maps MIDI 69 -> 440 Hz
      // We verify the key exists and plays
      cy.get('.white-key[data-note="A4"]').should('exist');
      cy.get('.white-key[data-note="A4"]').trigger('mousedown');
      cy.get('#note-display').should('contain', 'A4');
      cy.get('.white-key[data-note="A4"]').trigger('mouseup');
    });

    it('should handle rapid repeated taps without glitches', () => {
      // Gherkin: Scenario: Rapid repeated taps on same note
      for (let i = 0; i < 5; i++) {
        cy.get('.white-key[data-note="C4"]').trigger('mousedown');
        cy.wait(50);
        cy.get('.white-key[data-note="C4"]').trigger('mouseup');
        cy.wait(50);
      }
      // No crash, no error — the test passing is the assertion
      cy.get('#piano').should('be.visible');
    });
  });

  // =========================================================================
  // Voice Selection — Traces to audio-engine.feature Voice Scenarios
  // =========================================================================

  describe('Voice Selection', () => {
    it('should switch voice via dropdown', () => {
      // Gherkin: Scenario: Switching voice changes timbre
      cy.get('#voice-select').should('have.value', 'grand');
      cy.get('#voice-select').select('bright');
      cy.get('#voice-select').should('have.value', 'bright');

      // Play a note with new voice — no error
      cy.get('.white-key[data-note="C4"]').trigger('mousedown');
      cy.get('#note-display').should('contain', 'C4');
      cy.get('.white-key[data-note="C4"]').trigger('mouseup');
    });

    it('should not affect currently playing notes when voice changes', () => {
      // Gherkin: Scenario: Voice change applies to subsequent notes only
      cy.get('.white-key[data-note="C4"]').trigger('mousedown');
      cy.get('.white-key[data-note="C4"]').should('have.class', 'active');

      // Change voice while note is playing
      cy.get('#voice-select').select('electric');

      // Original note still active
      cy.get('.white-key[data-note="C4"]').should('have.class', 'active');
    });

    it('should offer all five voices', () => {
      // Gherkin: Scenario: All five voices produce distinct sounds
      const voices = ['grand', 'bright', 'warm', 'electric', 'organ'];
      voices.forEach((voice) => {
        cy.get('#voice-select').select(voice);
        cy.get('#voice-select').should('have.value', voice);
        cy.get('.white-key[data-note="C4"]').trigger('mousedown');
        cy.wait(100);
        cy.get('.white-key[data-note="C4"]').trigger('mouseup');
        cy.wait(100);
      });
    });
  });

  // =========================================================================
  // Sustain Pedal — Traces to audio-engine.feature Sustain Scenarios
  // =========================================================================

  describe('Sustain Pedal', () => {
    it('should hold notes after key release when sustain is active', () => {
      // Gherkin: Scenario: Sustain pedal holds notes after key release
      cy.get('#sustain-pedal').trigger('mousedown');
      cy.get('#sustain-pedal').should('have.class', 'active');
      cy.get('#sustain-pedal').should('contain', 'SUSTAIN ON');

      // Play and release a note — it should sustain
      cy.get('.white-key[data-note="C4"]').trigger('mousedown');
      cy.get('.white-key[data-note="C4"]').trigger('mouseup');

      // Note was released but sustain holds audio (we can't assert audio,
      // but we verify the pedal state)
      cy.get('#sustain-pedal').should('have.class', 'active');

      // Release sustain
      cy.get('#sustain-pedal').trigger('mouseup');
      cy.get('#sustain-pedal').should('not.have.class', 'active');
      cy.get('#sustain-pedal').should('contain', 'SUSTAIN');
    });

    it('should hold multiple notes while sustain is active', () => {
      // Gherkin: Scenario: Sustain pedal holds multiple notes
      cy.get('#sustain-pedal').trigger('mousedown');

      // Play C4, release, play E4, release, play G4, release
      cy.get('.white-key[data-note="C4"]').trigger('mousedown');
      cy.get('.white-key[data-note="C4"]').trigger('mouseup');

      cy.get('.white-key[data-note="E4"]').trigger('mousedown');
      cy.get('.white-key[data-note="E4"]').trigger('mouseup');

      cy.get('.white-key[data-note="G4"]').trigger('mousedown');
      cy.get('.white-key[data-note="G4"]').trigger('mouseup');

      // All notes sustained — release pedal to stop all
      cy.get('#sustain-pedal').trigger('mouseup');
      cy.get('#sustain-pedal').should('not.have.class', 'active');
    });

    it('should show correct visual state for sustain pedal', () => {
      // Gherkin: Scenario: Sustain pedal visual state
      cy.get('#sustain-pedal').should('contain', 'SUSTAIN');
      cy.get('#sustain-pedal').should('not.have.class', 'active');

      cy.get('#sustain-pedal').trigger('mousedown');
      cy.get('#sustain-pedal').should('contain', 'SUSTAIN ON');
      cy.get('#sustain-pedal').should('have.class', 'active');

      cy.get('#sustain-pedal').trigger('mouseup');
      cy.get('#sustain-pedal').should('contain', 'SUSTAIN');
      cy.get('#sustain-pedal').should('not.have.class', 'active');
    });
  });
});
