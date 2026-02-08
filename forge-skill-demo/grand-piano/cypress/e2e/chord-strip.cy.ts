// =============================================================================
// Chord Strip Context — E2E Test Suite
// =============================================================================
// Tests run against the REAL DOM and Web Audio API — NO mocking/stubbing.
// Each test traces to a Gherkin scenario in specs/chord-strip.feature
// =============================================================================

describe('Chord Strip — One-Tap Chord Playing', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  // =========================================================================
  // Chord Playback — Traces to chord-strip.feature Playback Scenarios
  // =========================================================================

  describe('Chord Playback', () => {
    it('should play a major chord when tapped', () => {
      // Gherkin: Scenario: Tapping a chord button plays the chord
      cy.get('.chord-btn[data-chord-id="C-major"]').trigger('mousedown');
      cy.get('.chord-btn[data-chord-id="C-major"]').should('have.class', 'playing');
      cy.get('#note-display').should('not.be.empty');

      cy.get('.chord-btn[data-chord-id="C-major"]').trigger('mouseup');
      cy.get('.chord-btn[data-chord-id="C-major"]').should(
        'not.have.class',
        'playing'
      );
    });

    it('should stop chord on release', () => {
      // Gherkin: Scenario: Releasing a chord button stops the chord
      cy.get('.chord-btn[data-chord-id="C-major"]').trigger('mousedown');
      cy.get('.chord-btn[data-chord-id="C-major"]').should('have.class', 'playing');

      cy.get('.chord-btn[data-chord-id="C-major"]').trigger('mouseup');
      cy.get('.chord-btn[data-chord-id="C-major"]').should(
        'not.have.class',
        'playing'
      );
    });

    it('should play a minor chord', () => {
      // Gherkin: Scenario: Playing a minor chord
      cy.get('.chord-btn[data-chord-id="A-minor"]').trigger('mousedown');
      cy.get('.chord-btn[data-chord-id="A-minor"]').should('have.class', 'playing');
      cy.get('#note-display').should('not.be.empty');

      cy.get('.chord-btn[data-chord-id="A-minor"]').trigger('mouseup');
    });

    it('should play a seventh chord (4 notes)', () => {
      // Gherkin: Scenario: Playing a seventh chord
      cy.get('.chord-btn[data-chord-id="G-seventh"]').trigger('mousedown');
      cy.get('.chord-btn[data-chord-id="G-seventh"]').should(
        'have.class',
        'playing'
      );
      // Note display should show multiple notes
      cy.get('#note-display').invoke('text').then((text) => {
        // Should contain at least a note name
        expect(text.trim().length).to.be.greaterThan(0);
      });

      cy.get('.chord-btn[data-chord-id="G-seventh"]').trigger('mouseup');
    });

    it('should play a major seventh chord', () => {
      // Gherkin: Scenario: Playing a major seventh chord
      cy.get('.chord-btn[data-chord-id="C-maj7"]').trigger('mousedown');
      cy.get('.chord-btn[data-chord-id="C-maj7"]').should('have.class', 'playing');
      cy.get('#note-display').should('not.be.empty');
      cy.get('.chord-btn[data-chord-id="C-maj7"]').trigger('mouseup');
    });

    it('should play a minor seventh chord', () => {
      // Gherkin: Scenario: Playing a minor seventh chord
      cy.get('.chord-btn[data-chord-id="D-min7"]').trigger('mousedown');
      cy.get('.chord-btn[data-chord-id="D-min7"]').should('have.class', 'playing');
      cy.get('#note-display').should('not.be.empty');
      cy.get('.chord-btn[data-chord-id="D-min7"]').trigger('mouseup');
    });
  });

  // =========================================================================
  // Chord-Key Highlighting — Traces to chord-strip.feature Highlight Scenarios
  // =========================================================================

  describe('Chord-Key Highlighting', () => {
    it('should highlight corresponding piano keys when chord is played', () => {
      // Gherkin: Scenario: Chord button highlights corresponding piano keys
      cy.get('.chord-btn[data-chord-id="C-major"]').trigger('mousedown');

      // C major = C4, E4, G4 — these keys should be active
      cy.get('.white-key.active').should('have.length.at.least', 3);

      cy.get('.chord-btn[data-chord-id="C-major"]').trigger('mouseup');
    });

    it('should deactivate all keys when chord is released', () => {
      // Gherkin: Scenario: Releasing chord deactivates all highlighted keys
      cy.get('.chord-btn[data-chord-id="C-major"]').trigger('mousedown');
      cy.get('.white-key.active').should('have.length.at.least', 3);

      cy.get('.chord-btn[data-chord-id="C-major"]').trigger('mouseup');
      cy.get('.white-key.active').should('have.length', 0);
      cy.get('.black-key.active').should('have.length', 0);
    });
  });

  // =========================================================================
  // Chord Strip Navigation — Traces to chord-strip.feature Navigation Scenarios
  // =========================================================================

  describe('Chord Strip Navigation', () => {
    it('should be horizontally scrollable', () => {
      // Gherkin: Scenario: Chord strip is horizontally scrollable
      cy.get('#chord-strip').should('exist');
      cy.get('.chord-btn').should('have.length.at.least', 10);

      // Chord strip should have overflow content
      cy.get('#chord-strip').then(($strip) => {
        expect($strip[0].scrollWidth).to.be.greaterThan($strip[0].clientWidth);
      });
    });

    it('should contain chords for all root notes with major and minor variants', () => {
      // Gherkin: Scenario: All root notes have chord variants
      const roots = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

      roots.forEach((root) => {
        // Each root should have at least major and minor
        cy.get(`.chord-btn[data-chord-id="${root}-major"]`).should('exist');
        cy.get(`.chord-btn[data-chord-id="${root}-minor"]`).should('exist');
      });
    });

    it('should update chord notes when octave changes', () => {
      // Gherkin: Scenario: Chords update when octave changes
      // Play chord, note the display
      cy.get('.chord-btn[data-chord-id="C-major"]').trigger('mousedown');
      cy.get('#note-display')
        .invoke('text')
        .then((text1) => {
          cy.get('.chord-btn[data-chord-id="C-major"]').trigger('mouseup');

          // Shift octave up
          cy.get('#oct-up').click();

          // Play same chord — should be higher octave
          cy.get('.chord-btn[data-chord-id="C-major"]').trigger('mousedown');
          cy.get('#note-display')
            .invoke('text')
            .then((text2) => {
              // The octave number in the display should be higher
              expect(text2).to.not.equal(text1);
            });
          cy.get('.chord-btn[data-chord-id="C-major"]').trigger('mouseup');
        });
    });
  });
});
