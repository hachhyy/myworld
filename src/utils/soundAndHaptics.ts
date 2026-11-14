// Sintetizador Web Audio API Cozy + Voz "Animalese" (estilo Animal Crossing) + Vibración Háptica

class CozySoundEngine {
  private ctx: AudioContext | null = null;
  public isMuted: boolean = false;

  private getContext(): AudioContext | null {
    if (this.isMuted) return null;
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  // Sonido de burbuja / pop suave al tocar botones
  public playPop(pitchMultiplier = 1) {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const baseFreq = Math.max(120, Math.min(1600, 360 * pitchMultiplier));
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.65, now + 0.085);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.095);
    } catch {
      // Ignorar si el navegador bloquea audio sin gesto previo
    }
  }

  // Sonido de pasar página de papel acuarela
  public playPageTurn() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const duration = 0.2;
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const env = Math.sin((i / bufferSize) * Math.PI);
        data[i] = (Math.random() * 2 - 1) * env * 0.16;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1100, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(650, ctx.currentTime + duration);
      filter.Q.value = 1.4;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
    } catch {
      // Ignorar errores de audio
    }
  }

  // Campanita mágica para deseos cumplidos, revelación de notas o hucha
  public playChime() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const now = ctx.currentTime + idx * 0.075;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.44);
      });
    } catch {
      // Ignorar errores de audio
    }
  }

  // Sonido suave de trazo de lápiz / esponja
  public playBrushNoise() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const duration = 0.05;
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.05;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 900;

      noise.connect(filter);
      filter.connect(ctx.destination);
      noise.start();
    } catch {
      // Ignorar errores de audio
    }
  }

  // Sintetizador "Animalese" (Animal Crossing) que pronuncia sílabas agudas y adorables letra por letra
  public speakAnimalese(text: string, basePitch = 440) {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const clean = text.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ ]/g, '').slice(0, 36);
      const vowelPitchMap: Record<string, number> = {
        a: 1.0,
        á: 1.05,
        e: 1.12,
        é: 1.16,
        i: 1.25,
        í: 1.28,
        o: 0.92,
        ó: 0.95,
        u: 0.85,
        ú: 0.88,
      };

      let delay = 0;
      for (let i = 0; i < clean.length; i++) {
        const ch = clean[i].toLowerCase();
        if (ch === ' ') {
          delay += 0.035;
          continue;
        }
        if (i % 2 === 1 && !vowelPitchMap[ch]) continue;

        const now = ctx.currentTime + delay;
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        const charFactor = vowelPitchMap[ch] || 0.9 + (ch.charCodeAt(0) % 7) * 0.04;
        const jitter = 0.96 + Math.random() * 0.08;
        const freq = basePitch * charFactor * jitter;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq * 0.88, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.08, now + 0.045);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(freq * 2.1, now);
        filter.Q.value = 2.2;

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.06);

        delay += 0.055;
      }
    } catch {
      // Ignorar si Web Audio API no está activa aún
    }
  }

  // Melodía suave de cajita de música / vinilo lo-fi para el tocadiscos del salón
  public playCozyMelodyStep(stepIndex: number) {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const scale = [261.63, 329.63, 392.0, 493.88, 523.25, 659.25, 587.33, 392.0];
      const freq = scale[stepIndex % scale.length];
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.075, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.58);
    } catch {
      // Ignorar errores de audio
    }
  }
}

export const soundEngine = new CozySoundEngine();

// Patrón de vibración de latido de corazón ([80, 60, 120]) con fallback visual para iOS
export function triggerHeartbeatHaptic(reason?: string) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([80, 60, 120]);
    }
  } catch {
    // Ignorar si el navegador restringe la API
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('myworld-haptic-pulse', {
        detail: { reason: reason || 'latido', timestamp: Date.now() },
      })
    );
  }
}
