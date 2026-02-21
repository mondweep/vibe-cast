/**
 * Metronome audio using Web Audio API.
 * Produces short oscillator clicks — higher pitch on beat 1, standard on other downbeats,
 * and a softer tick on upbeats ("&").
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
    return audioCtx;
}

export type ClickType = 'accent' | 'beat' | 'upbeat';

export function playClick(type: ClickType = 'beat'): void {
    const ctx = getAudioContext();

    // Resume if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
        ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Different frequencies and volumes for each click type
    switch (type) {
        case 'accent':
            oscillator.frequency.value = 1000;
            gainNode.gain.value = 0.6;
            break;
        case 'beat':
            oscillator.frequency.value = 800;
            gainNode.gain.value = 0.4;
            break;
        case 'upbeat':
            oscillator.frequency.value = 600;
            gainNode.gain.value = 0.15;
            break;
    }

    oscillator.type = 'square';

    const now = ctx.currentTime;
    const clickDuration = 0.03; // 30ms click

    // Quick fade-out to prevent pop
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + clickDuration);

    oscillator.start(now);
    oscillator.stop(now + clickDuration);
}
