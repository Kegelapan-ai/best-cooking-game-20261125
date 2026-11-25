// All sound is synthesised with WebAudio: short oscillator blips and a
// filtered noise burst for the wok sizzle. No audio files, no network, and
// nothing plays until the player first interacts (browsers require that).

export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context === null) {
      try {
        const AudioContext = window.AudioContext ?? window.webkitAudioContext;
        context = new AudioContext();
      } catch {
        context = undefined;
      }
    }
    if (context && context.state === 'suspended') void context.resume();
    return context || null;
  }

  function tone(frequency, seconds, type, gainValue, when = 0) {
    const audio = ensure();
    if (!audio || muted) return;
    const start = audio.currentTime + when;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + seconds + 0.05);
  }

  function sizzle(seconds) {
    const audio = ensure();
    if (!audio || muted) return;
    const length = Math.floor(audio.sampleRate * seconds);
    const buffer = audio.createBuffer(1, length, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = audio.createBufferSource();
    source.buffer = buffer;
    const filter = audio.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 4200;
    const gain = audio.createGain();
    gain.gain.value = 0.12;
    source.connect(filter).connect(gain).connect(audio.destination);
    source.start();
  }

  return {
    unlock() { ensure(); },
    toggleMute() { muted = !muted; return muted; },
    isMuted() { return muted; },
    add() { tone(520, 0.09, 'triangle', 0.16); },
    chop() { tone(300, 0.06, 'square', 0.08); tone(180, 0.05, 'square', 0.06, 0.04); },
    cook() { sizzle(0.7); tone(220, 0.25, 'sine', 0.1); },
    ready() { tone(660, 0.12, 'sine', 0.18); tone(880, 0.18, 'sine', 0.18, 0.1); },
    serve() { tone(523, 0.12, 'triangle', 0.2); tone(659, 0.12, 'triangle', 0.2, 0.09); tone(784, 0.22, 'triangle', 0.22, 0.18); },
    error() { tone(140, 0.22, 'sawtooth', 0.14); },
    order() { tone(440, 0.1, 'sine', 0.14); tone(587, 0.14, 'sine', 0.14, 0.08); },
    over() { tone(392, 0.2, 'triangle', 0.18); tone(311, 0.2, 'triangle', 0.18, 0.16); tone(262, 0.4, 'triangle', 0.18, 0.32); },
  };
}
