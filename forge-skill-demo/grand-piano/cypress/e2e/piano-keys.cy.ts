// =============================================================================
// Piano Keys Context — E2E Test Suite
// =============================================================================
// Tests run against the REAL DOM and touch events — NO mocking/stubbing.
// Each test traces to a Gherkin scenario in specs/piano-keys.feature
// =============================================================================

describe('Piano Keys — Touch Interaction, Visual Feedback & Navigation', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  // =========================================================================
  // Key Rendering — Traces to piano-keys.feature Key Rendering Scenarios
  // =========================================================================

  describe('Key Rendering', () => {
    it('should display 3 octaves of white and black keys', () => {
      // Gherkin: Scenario: Piano displays 3 octaves of keys
      // 3 octaves = 21 white keys (7 per octave)
      cy.get('.white-key').should('have.length', 21);

      // 3 octaves = 15 black keys (5 per octave)
      cy.get('.black-key').should('have.length', 15);
    });

    it('should show key labels by default', () => {
      // Gherkin: Scenario: Key labels are visible by default
      cy.get('.white-key .key-label').first().should('not.be.empty');
      cy.get('.black-key .key-label').first().should('not.be.empty');
      cy.get('#toggle-labels').should('have.class', 'active');
    });

    it('should toggle key labels on/off', () => {
      // Gherkin: Scenario: Key labels can be hidden
      cy.get('#toggle-labels').click();
      cy.get('.white-key .key-label').first().should('have.text', '');
      cy.get('#toggle-labels').should('not.have.class', 'active');

      cy.get('#toggle-labels').click();
      cy.get('.white-key .key-label').first().should('not.have.text', '');
      cy.get('#toggle-labels').should('have.class', 'active');
    });
  });

  // =========================================================================
  // Touch Interaction — Traces to piano-keys.feature Touch Scenarios
  // =========================================================================

  describe('Touch Interaction', () => {
    it('should highlight and play a white key on tap', () => {
      // Gherkin: Scenario: Tapping a white key plays the note
      cy.get('.white-key[data-note="D4"]').trigger('mousedown');
      cy.get('.white-key[data-note="D4"]').should('have.class', 'active');
      cy.get('#note-display').should('contain', 'D4');

      cy.get('.white-key[data-note="D4"]').trigger('mouseup');
      cy.get('.white-key[data-note="D4"]').should('not.have.class', 'active');
    });

    it('should highlight and play a black key on tap', () => {
      // Gherkin: Scenario: Tapping a black key plays the note
      // F#4 is MIDI 66
      cy.get('.black-key').filter('[data-note="F#4"]').trigger('mousedown', { force: true });
      cy.get('.black-key').filter('[data-note="F#4"]').should('have.class', 'active');
      cy.get('#note-display').should('not.be.empty');
    });

    it('should deactivate key when finger is lifted', () => {
      // Gherkin: Scenario: Lifting finger stops the note
      cy.get('.white-key[data-note="E4"]').trigger('mousedown');
      cy.get('.white-key[data-note="E4"]').should('have.class', 'active');

      // Simulate mouseup on document (finger lift)
      cy.document().trigger('mouseup');
      cy.get('.white-key[data-note="E4"]').should('not.have.class', 'active');
    });

    it('should support glissando (sliding across keys)', () => {
      // Gherkin: Scenario: Glissando by sliding finger across keys
      cy.get('.white-key[data-note="C4"]').trigger('mousedown');
      cy.get('.white-key[data-note="C4"]').should('have.class', 'active');

      // Slide to D4
      cy.get('.white-key[data-note="D4"]').trigger('mouseover');
      cy.get('.white-key[data-note="D4"]').should('have.class', 'active');
      cy.get('.white-key[data-note="C4"]').should('not.have.class', 'active');

      // Slide to E4
      cy.get('.white-key[data-note="E4"]').trigger('mouseover');
      cy.get('.white-key[data-note="E4"]').should('have.class', 'active');
      cy.get('.white-key[data-note="D4"]').should('not.have.class', 'active');

      cy.document().trigger('mouseup');
    });
  });

  // =========================================================================
  // Visual Feedback — Traces to piano-keys.feature Visual Feedback Scenarios
  // =========================================================================

  describe('Visual Feedback', () => {
    it('should apply active styling to white key on press', () => {
      // Gherkin: Scenario: Active white key shows visual feedback
      cy.get('.white-key[data-note="C4"]').trigger('mousedown');
      cy.get('.white-key[data-note="C4"]').should('have.class', 'active');
      cy.get('.white-key[data-note="C4"] .key-label')
        .should('have.css', 'font-weight')
        .and('match', /700|bold/);
    });

    it('should apply active styling to black key on press', () => {
      // Gherkin: Scenario: Active black key shows visual feedback
      cy.get('.black-key').first().trigger('mousedown', { force: true });
      cy.get('.black-key').first().should('have.class', 'active');
    });

    it('should update note display in real time', () => {
      // Gherkin: Scenario: Note display updates in real time
      cy.get('#note-display').should('contain.html', '&nbsp;');

      cy.get('.white-key[data-note="C4"]').trigger('mousedown');
      cy.get('#note-display').should('contain', 'C4');

      cy.document().trigger('mouseup');
      // After release, display may clear or show last note
    });
  });

  // =========================================================================
  // Octave Navigation — Traces to piano-keys.feature Octave Scenarios
  // =========================================================================

  describe('Octave Navigation', () => {
    it('should shift octave up when up button is tapped', () => {
      // Gherkin: Scenario: Octave up shifts the keyboard range
      cy.get('#oct-display').should('have.text', '4');
      cy.get('#oct-up').click();
      cy.get('#oct-display').should('have.text', '5');

      // Keys should re-render with new octave labels
      cy.get('.white-key').first().invoke('attr', 'data-note').should('contain', '4');
    });

    it('should shift octave down when down button is tapped', () => {
      // Gherkin: Scenario: Octave down shifts the keyboard range
      cy.get('#oct-display').should('have.text', '4');
      cy.get('#oct-down').click();
      cy.get('#oct-display').should('have.text', '3');
    });

    it('should not exceed octave bounds', () => {
      // Gherkin: Scenario: Octave range is bounded
      // Tap up many times — should cap at 7
      for (let i = 0; i < 10; i++) {
        cy.get('#oct-up').click();
      }
      cy.get('#oct-display').invoke('text').then((text) => {
        expect(parseInt(text)).to.be.at.most(7);
      });

      // Tap down many times — should floor at 2
      for (let i = 0; i < 15; i++) {
        cy.get('#oct-down').click();
      }
      cy.get('#oct-display').invoke('text').then((text) => {
        expect(parseInt(text)).to.be.at.least(2);
      });
    });

    it('should be horizontally scrollable', () => {
      // Gherkin: Scenario: Piano is horizontally scrollable
      cy.get('#piano-container').should('exist');
      cy.get('#piano').invoke('outerWidth').then((pianoWidth) => {
        cy.get('#piano-container').invoke('outerWidth').then((containerWidth) => {
          // Piano should be wider than its container (scrollable)
          expect(pianoWidth).to.be.greaterThan(containerWidth);
        });
      });
    });
  });
});
