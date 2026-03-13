Feature: YouTube Playback

  Scenario: User pastes a YouTube URL
    Given I am on the Play tab
    When I paste a valid YouTube URL
    Then the video loads in the embedded player
    And playback controls are visible

  Scenario: Playback position syncs to lyrics
    Given a song is playing with known lyrics
    When the playback reaches timestamp 00:30
    Then the lyrics panel highlights the line at 00:30
    And the translation panel shows the corresponding English text

  Scenario: User adjusts playback speed
    Given a song is playing
    When I set playback speed to 0.75x
    Then the audio plays at 0.75x speed
    And lyrics sync remains accurate

  Scenario: User connects YouTube account
    Given I am signed in
    When I click "Connect YouTube"
    Then I am prompted to authorize via Google OAuth
    And after authorization my playlists are visible

  Scenario: User picks a song from their library
    Given my YouTube account is connected
    When I browse my "Sanskrit Songs" playlist
    And I tap a song
    Then it loads in the player and begins translation
