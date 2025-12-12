// Sound effect utility for button clicks
// Uses Web Audio API for lightweight, instant playback

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContext;
}

// Click sound - soft pop
export function playClickSound() {
    try {
        const ctx = getAudioContext();

        // Resume if suspended (iOS requirement)
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Soft pop sound
        oscillator.frequency.setValueAtTime(600, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.08);

        gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

        oscillator.type = 'sine';
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.1);
    } catch (e) {
        // Silently fail - sound is non-critical
        console.log('Audio not available');
    }
}

// Success sound - ascending chime
export function playSuccessSound() {
    try {
        const ctx = getAudioContext();

        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.setValueAtTime(523, ctx.currentTime); // C5
        oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1); // E5
        oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2); // G5

        gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

        oscillator.type = 'sine';
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.35);
    } catch (e) {
        console.log('Audio not available');
    }
}
