import type {AlarmLevel} from "./sim";

class AlertSound {
    private context: AudioContext | null = null;
    private enabled = true;
    private loopingTimer: number | null = null;

    setEnabled(on: boolean) {
        this.enabled = on;
        if (on) this.ensureContext();
        if (!on) this.stopLooping();
    }

    // Call this on a user gesture to satisfy autoplay policies
    async kickstart() {
        const context = this.ensureContext();
        if (context.state === "suspended") await context.resume();
    }

    // Play a single notification sequence
    playAlert(level: AlarmLevel) {
        if (!this.enabled) return;
        const pattern = this.getBeepPattern(level);
        this.playBeepSequence(pattern);
    }

    // Play a heartbeat beep based on hr
    playHeartbeat() {
        if (!this.enabled) return;
        this.playTone(0.1, 0.020, 460);
    }

    // Play a sequence of beeps (for notifications)
    private playBeepSequence(pattern: Array<{ durMs: number; gapMs?: number; vol: number, frequency?: number }>) {
        let t = 0;
        pattern.forEach((beep) => {
            window.setTimeout(() => {
                if (this.enabled) {
                    this.playTone(beep.durMs / 1000, beep.vol, beep.frequency);
                }
            }, t);
            t += beep.durMs + (beep.gapMs ?? 0);
        });
    }

    // Start continuous looping alarm
    startLooping(level: AlarmLevel) {
        if (!this.enabled) return;
        this.stopLooping();

        const pattern = this.getLoopPattern(level);
        if (pattern.length === 0) return;

        let i = 0;
        const tick = () => {
            if (!this.enabled) return;
            const idx = i % pattern.length;
            const p = pattern[idx];
            if (!p) return;
            this.playTone(p.durMs / 1000, p.vol);
            i = (i + 1) % pattern.length;
            this.loopingTimer = window.setTimeout(tick, p.durMs + (p.gapMs ?? 0)); // default gap 0
        };

        tick();
    }

    // Stop looping alarm
    stopLooping() {
        if (this.loopingTimer != null) {
            window.clearTimeout(this.loopingTimer);
            this.loopingTimer = null;
        }
    }

    private ensureContext(): AudioContext {
        if (!this.context) {
            // Support Safari prefix without using any casts
            type AudioContextCtor = { new(): AudioContext };
            const AnyWindow = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
            const Ctor = AnyWindow.AudioContext ?? AnyWindow.webkitAudioContext;
            // @ts-ignore
            this.context = new Ctor();
        }
        return this.context;
    }

    private playTone(duration: number, volume: number, frequency: number = 954) {
        const ctx = this.ensureContext();
        const start = ctx.currentTime;
        const gain = ctx.createGain();
        gain.connect(ctx.destination);

        const makeOsc = (freq: number, level: number, type: OscillatorType) => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            osc.connect(g);
            g.gain.value = level;
            g.connect(gain);
            osc.start(start);
            osc.stop(start + duration);
        };

        // Fundamental (~950 Hz) as triangle
        makeOsc(frequency, 1.0, "triangle");
        // 3x fundamental
        makeOsc(frequency * 3, 0.6, "sine");
        // 4x fundamental
        makeOsc(frequency * 4, 0.025, "sine");

        // Envelope: very fast attack, slightly longer hold, stronger presence
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(volume, start + 0.005); // attack
        gain.gain.setValueAtTime(volume, start + 0.07); // hold
        gain.gain.exponentialRampToValueAtTime(0.002, start + duration); // decay
    }

    private getVolume(level: AlarmLevel): number {
        switch (level) {
            case "advisory":
                return 0.075;
            case "warning":
                return 0.100;
            case "critical":
                return 0.125;
            default:
                return 0.075;
        }
    }

    // Beep patterns for notifications (play once)
    private getBeepPattern(level: AlarmLevel): Array<{ durMs: number; gapMs?: number; vol: number, frequency?: number }> {
        const vol = this.getVolume(level);
        switch (level) {
            case "advisory":
                return [
                    {durMs: 1000, gapMs: 0, vol, frequency: 954 / 2}
                ];
            case "warning":
                return [
                    {durMs: 1000, gapMs: 0, vol, frequency: 954 / 2},
                    {durMs: 1000, gapMs: 0, vol, frequency: 954 / 2},
                ];
            case "critical":
                // For critical, we rely on startLooping, keep empty to avoid double beeps
                return [];
            default:
                return [{durMs: 1000, vol}];
        }
    }

    // Looping patterns for continuous alarms
    private getLoopPattern(level: AlarmLevel): Array<{ durMs: number; gapMs?: number; vol: number }> {
        const vol = this.getVolume(level);
        return [{durMs: 1000, gapMs: 0, vol}];
    }
}

export const alertSound = new AlertSound();
