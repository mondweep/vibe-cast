// =============================================================================
// Controls Context — E2E Test Suite
// =============================================================================
// Tests run against the REAL DOM — NO mocking/stubbing.
// Each test traces to a Gherkin scenario in specs/controls.feature
// =============================================================================

describe('Controls — Voice Selection, Octave & Label Settings', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  // =========================================================================
  // Voice Selector — Traces to controls.feature Voice Selector Scenarios
  // =========================================================================

  describe('Voice Selector', () => {
    it('should show all five voice options', () => {
      // Gherkin: Scenario: Voice dropdown shows all available voices
      cy.get('#voice-select option').should('have.length', 5);
      cy.get('#voice-select option').eq(0).should('have.value', 'grand');
      cy.get('#voice-select option').eq(1).should('have.value', 'bright');
      cy.get('#voice-select option').eq(2).should('have.value', 'warm');
      cy.get('#voice-select option').eq(3).should('have.value', 'electric');
      cy.get('#voice-select option').eq(4).should('have.value', 'organ');
    });

    it('should update display when voice is selected', () => {
      // Gherkin: Scenario: Selecting a voice updates the dropdown display
      cy.get('#voice-select').select('warm');
      cy.get('#voice-select').should('have.value', 'warm');
    });

    it('should default to Grand voice', () => {
      // Gherkin: Scenario: Default voice is Grand
      cy.get('#voice-select').should('have.value', 'grand');
    });
  });

  // =========================================================================
  // Octave Controls — Traces to controls.feature Octave Scenarios
  // =========================================================================

  describe('Octave Controls', () => {
    it('should display octave 4 by default', () => {
      // Gherkin: Scenario: Octave display shows current middle octave
      cy.get('#oct-display').should('have.text', '4');
    });

    it('should increment octave display on up tap', () => {
      // Gherkin: Scenario: Octave up button increments the display
      cy.get('#oct-up').click();
      cy.get('#oct-display').should('have.text', '5');
    });

    it('should decrement octave display on down tap', () => {
      // Gherkin: Scenario: Octave down button decrements the display
      cy.get('#oct-down').click();
      cy.get('#oct-display').should('have.text', '3');
    });

    it('should re-render piano keys when octave changes', () => {
      // Gherkin: Scenario: Octave buttons are tappable and responsive
      cy.get('.white-key')
        .first()
        .invoke('attr', 'data-note')
        .then((noteBefore) => {
          cy.get('#oct-up').click();
          cy.get('.white-key')
            .first()
            .invoke('attr', 'data-note')
            .should('not.equal', noteBefore);
        });
    });
  });

  // =========================================================================
  // Label Toggle — Traces to controls.feature Label Toggle Scenarios
  // =========================================================================

  describe('Label Toggle', () => {
    it('should hide labels when toggled off', () => {
      // Gherkin: Scenario: Label toggle shows/hides note names
      cy.get('#toggle-labels').should('have.class', 'active');
      cy.get('.white-key .key-label').first().should('not.have.text', '');

      cy.get('#toggle-labels').click();
      cy.get('#toggle-labels').should('not.have.class', 'active');
      cy.get('.white-key .key-label').first().should('have.text', '');
    });

    it('should restore labels when toggled back on', () => {
      // Gherkin: Scenario: Label toggle is a binary switch
      cy.get('#toggle-labels').click(); // Off
      cy.get('.white-key .key-label').first().should('have.text', '');

      cy.get('#toggle-labels').click(); // On
      cy.get('.white-key .key-label').first().should('not.have.text', '');
    });
  });

  // =========================================================================
  // Accessibility — Traces to controls.feature Accessibility Scenarios
  // =========================================================================

  describe('Accessibility', () => {
    it('should have aria-labels on all interactive controls', () => {
      // Gherkin: Scenario: All controls have accessible labels
      cy.get('#oct-up').should('have.attr', 'aria-label', 'Raise octave');
      cy.get('#oct-down').should('have.attr', 'aria-label', 'Lower octave');
      cy.get('#voice-select').should(
        'have.attr',
        'aria-label',
        'Select piano voice'
      );
      cy.get('#sustain-pedal').should(
        'have.attr',
        'aria-label',
        'Sustain pedal'
      );
    });

    it('should have aria-labels on all piano keys', () => {
      // Gherkin: Scenario: All controls have accessible labels (piano keys)
      cy.get('.white-key').each(($key) => {
        cy.wrap($key).should('have.attr', 'aria-label');
        cy.wrap($key)
          .invoke('attr', 'aria-label')
          .should('match', /Piano key [A-G]#?\d/);
      });

      cy.get('.black-key').each(($key) => {
        cy.wrap($key).should('have.attr', 'aria-label');
        cy.wrap($key)
          .invoke('attr', 'aria-label')
          .should('match', /Piano key [A-G]#?\d/);
      });
    });

    it('should have aria-live on note display for screen readers', () => {
      // Gherkin: Scenario: Note display is announced to screen readers
      cy.get('#note-display').should('have.attr', 'aria-live', 'polite');
    });

    it('should have role attributes on piano and chord strip', () => {
      cy.get('#piano').should('have.attr', 'role', 'group');
      cy.get('#piano').should('have.attr', 'aria-label', 'Piano keys');
      cy.get('#chord-strip').should('have.attr', 'role', 'group');
      cy.get('#chord-strip').should('have.attr', 'aria-label', 'Chord buttons');
    });

    it('should have role=button on every key and chord button', () => {
      cy.get('.white-key').each(($key) => {
        cy.wrap($key).should('have.attr', 'role', 'button');
      });
      cy.get('.black-key').each(($key) => {
        cy.wrap($key).should('have.attr', 'role', 'button');
      });
      cy.get('.chord-btn').each(($btn) => {
        cy.wrap($btn).should('have.attr', 'role', 'button');
      });
    });
  });
});
