# ADR-004: Audio Transcription Strategy

## Status
Accepted

## Context
SanskritSync must transcribe Sanskrit audio from YouTube songs in real time. YouTube may or may not have caption tracks available.

## Decision
Dual-path approach: YouTube Captions API (primary) + Whisper ASR (fallback).

## Rationale
- YouTube Captions API is fast, free, and pre-aligned with timestamps
- Whisper provides broad multilingual ASR when captions are unavailable
- Dual path maximizes coverage without depending on a single source
- Whisper can be fine-tuned on Sanskrit devotional music later

## Alternatives Rejected
- **Google Speech-to-Text**: Poor Sanskrit support
- **Deepgram**: No Sanskrit language model
- **Caption-only approach**: Too many songs lack captions
