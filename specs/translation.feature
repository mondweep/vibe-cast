Feature: Real-Time Translation

  Scenario: Song with YouTube captions available
    Given I play a Sanskrit song that has captions on YouTube
    Then the app fetches the caption track
    And displays Devanagari text synced to playback
    And shows English translation for each line within 2 seconds

  Scenario: Song without captions uses audio transcription
    Given I play a Sanskrit song with no captions
    Then the app captures audio and sends to Whisper
    And displays transcribed Sanskrit text
    And shows English translation for each line

  Scenario: User toggles translation mode
    Given a song is playing with translations visible
    When I toggle from "Poetic" to "Literal" mode
    Then the English text switches to word-for-word translation

  Scenario: User taps a Sanskrit word
    Given lyrics are displayed for the current line
    When I tap the word "dharma"
    Then a popup shows root, meaning, grammar, and other songs

  Scenario: Repeat play loads from cache
    Given I previously played and translated a song
    When I play the same song again
    Then translations appear instantly without API calls
