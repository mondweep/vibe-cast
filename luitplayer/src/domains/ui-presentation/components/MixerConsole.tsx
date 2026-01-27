/**
 * Mixer Console Component
 * Per-instrument volume, mute, and solo controls
 */

import { useState, useCallback } from 'react';

export interface ChannelState {
  id: string;
  name: string;
  instrument: string;
  volume: number; // 0-1
  muted: boolean;
  solo: boolean;
  color: string;
}

interface MixerConsoleProps {
  channels?: ChannelState[];
  onVolumeChange?: (channelId: string, volume: number) => void;
  onMuteToggle?: (channelId: string, muted: boolean) => void;
  onSoloToggle?: (channelId: string, solo: boolean) => void;
  masterVolume?: number;
  onMasterVolumeChange?: (volume: number) => void;
}

const DEFAULT_CHANNELS: ChannelState[] = [
  { id: 'soprano', name: 'Soprano', instrument: 'soprano', volume: 0.8, muted: false, solo: false, color: '#e94560' },
  { id: 'lead-vocal', name: 'Lead Vocal', instrument: 'lead-vocal', volume: 0.9, muted: false, solo: false, color: '#f39c12' },
  { id: 'space-synth', name: 'Space Synth', instrument: 'space-synth', volume: 0.7, muted: false, solo: false, color: '#9b59b6' },
  { id: 'piano', name: 'Piano', instrument: 'piano', volume: 0.75, muted: false, solo: false, color: '#3498db' },
  { id: 'acoustic-strum', name: 'Acoustic (Strum)', instrument: 'acoustic-guitar-strum', volume: 0.6, muted: false, solo: false, color: '#2ecc71' },
  { id: 'acoustic-lead', name: 'Acoustic (Lead)', instrument: 'acoustic-guitar-lead', volume: 0.65, muted: false, solo: false, color: '#1abc9c' },
  { id: 'bass', name: 'Bass Gtr', instrument: 'bass-guitar', volume: 0.8, muted: false, solo: false, color: '#e74c3c' },
  { id: 'drums', name: 'Drums', instrument: 'drums', volume: 0.7, muted: false, solo: false, color: '#95a5a6' },
];

interface ChannelStripProps {
  channel: ChannelState;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onSoloToggle: () => void;
  isEffectiveMuted: boolean;
}

function ChannelStrip({
  channel,
  onVolumeChange,
  onMuteToggle,
  onSoloToggle,
  isEffectiveMuted,
}: ChannelStripProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 8px',
        backgroundColor: '#2a2a3e',
        borderRadius: '8px',
        minWidth: '80px',
        gap: '8px',
        opacity: isEffectiveMuted ? 0.5 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      {/* Channel name */}
      <span
        style={{
          fontSize: '11px',
          color: channel.color,
          fontWeight: 'bold',
          textAlign: 'center',
          height: '28px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {channel.name}
      </span>

      {/* Volume fader */}
      <div
        style={{
          position: 'relative',
          height: '120px',
          width: '8px',
          backgroundColor: '#1a1a2e',
          borderRadius: '4px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: `${channel.volume * 100}%`,
            backgroundColor: channel.color,
            borderRadius: '4px',
            transition: 'height 0.1s',
          }}
        />
        <input
          type="range"
          min="0"
          max="100"
          value={channel.volume * 100}
          onChange={(e) => onVolumeChange(parseInt(e.target.value) / 100)}
          style={{
            position: 'absolute',
            width: '120px',
            height: '8px',
            transform: 'rotate(-90deg) translateX(-56px)',
            transformOrigin: 'left',
            opacity: 0,
            cursor: 'pointer',
          }}
        />
      </div>

      {/* Volume value */}
      <span style={{ fontSize: '10px', color: '#888' }}>
        {Math.round(channel.volume * 100)}%
      </span>

      {/* Mute/Solo buttons */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <button
          onClick={onMuteToggle}
          style={{
            width: '28px',
            height: '24px',
            fontSize: '10px',
            fontWeight: 'bold',
            backgroundColor: channel.muted ? '#e74c3c' : '#3a3a5e',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          M
        </button>
        <button
          onClick={onSoloToggle}
          style={{
            width: '28px',
            height: '24px',
            fontSize: '10px',
            fontWeight: 'bold',
            backgroundColor: channel.solo ? '#f39c12' : '#3a3a5e',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          S
        </button>
      </div>
    </div>
  );
}

export function MixerConsole({
  channels = DEFAULT_CHANNELS,
  onVolumeChange,
  onMuteToggle,
  onSoloToggle,
  masterVolume = 0.7,
  onMasterVolumeChange,
}: MixerConsoleProps) {
  const [localChannels, setLocalChannels] = useState<ChannelState[]>(channels);
  const [localMasterVolume, setLocalMasterVolume] = useState(masterVolume);

  // Check if any channel is soloed
  const hasSolo = localChannels.some((ch) => ch.solo);

  const handleVolumeChange = useCallback(
    (channelId: string, volume: number) => {
      setLocalChannels((prev) =>
        prev.map((ch) => (ch.id === channelId ? { ...ch, volume } : ch))
      );
      onVolumeChange?.(channelId, volume);
    },
    [onVolumeChange]
  );

  const handleMuteToggle = useCallback(
    (channelId: string) => {
      setLocalChannels((prev) =>
        prev.map((ch) =>
          ch.id === channelId ? { ...ch, muted: !ch.muted } : ch
        )
      );
      const channel = localChannels.find((ch) => ch.id === channelId);
      if (channel) {
        onMuteToggle?.(channelId, !channel.muted);
      }
    },
    [localChannels, onMuteToggle]
  );

  const handleSoloToggle = useCallback(
    (channelId: string) => {
      setLocalChannels((prev) =>
        prev.map((ch) =>
          ch.id === channelId ? { ...ch, solo: !ch.solo } : ch
        )
      );
      const channel = localChannels.find((ch) => ch.id === channelId);
      if (channel) {
        onSoloToggle?.(channelId, !channel.solo);
      }
    },
    [localChannels, onSoloToggle]
  );

  const handleMasterVolumeChange = useCallback(
    (volume: number) => {
      setLocalMasterVolume(volume);
      onMasterVolumeChange?.(volume);
    },
    [onMasterVolumeChange]
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#1a1a2e',
        borderRadius: '8px',
        padding: '16px',
        gap: '16px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h3 style={{ margin: 0, color: '#e94560', fontSize: '16px' }}>
          Mixer Console
        </h3>
        <span style={{ color: '#666', fontSize: '12px' }}>
          {localChannels.length} channels
        </span>
      </div>

      {/* Channel strips */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '8px',
        }}
      >
        {localChannels.map((channel) => (
          <ChannelStrip
            key={channel.id}
            channel={channel}
            onVolumeChange={(vol) => handleVolumeChange(channel.id, vol)}
            onMuteToggle={() => handleMuteToggle(channel.id)}
            onSoloToggle={() => handleSoloToggle(channel.id)}
            isEffectiveMuted={
              channel.muted || (hasSolo && !channel.solo)
            }
          />
        ))}

        {/* Master fader */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '12px 8px',
            backgroundColor: '#3a3a5e',
            borderRadius: '8px',
            minWidth: '80px',
            gap: '8px',
            marginLeft: '8px',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              color: '#e94560',
              fontWeight: 'bold',
              textAlign: 'center',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            MASTER
          </span>

          <div
            style={{
              position: 'relative',
              height: '120px',
              width: '12px',
              backgroundColor: '#1a1a2e',
              borderRadius: '4px',
            }}
          >
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: `${localMasterVolume * 100}%`,
                backgroundColor: '#e94560',
                borderRadius: '4px',
                transition: 'height 0.1s',
              }}
            />
            <input
              type="range"
              min="0"
              max="100"
              value={localMasterVolume * 100}
              onChange={(e) =>
                handleMasterVolumeChange(parseInt(e.target.value) / 100)
              }
              style={{
                position: 'absolute',
                width: '120px',
                height: '12px',
                transform: 'rotate(-90deg) translateX(-54px)',
                transformOrigin: 'left',
                opacity: 0,
                cursor: 'pointer',
              }}
            />
          </div>

          <span style={{ fontSize: '10px', color: '#888' }}>
            {Math.round(localMasterVolume * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
