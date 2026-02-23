interface AmbientTheme {
  name: string;
  baseFreqs: number[];
  filterCutoff: number;
  lfoRate: number;
  lfoDepth: number;
  detuneCents: number;
  waveform: OscillatorType;
}

const AMBIENT_THEMES: AmbientTheme[] = [
  {
    name: "Golden Dawn",
    baseFreqs: [130.81, 196.0, 261.63, 329.63],
    filterCutoff: 600,
    lfoRate: 0.08,
    lfoDepth: 15,
    detuneCents: 6,
    waveform: "sine",
  },
  {
    name: "Still Waters",
    baseFreqs: [146.83, 220.0, 293.66, 369.99],
    filterCutoff: 500,
    lfoRate: 0.06,
    lfoDepth: 12,
    detuneCents: 8,
    waveform: "sine",
  },
  {
    name: "Heavenly Rest",
    baseFreqs: [164.81, 246.94, 329.63, 392.0],
    filterCutoff: 700,
    lfoRate: 0.04,
    lfoDepth: 10,
    detuneCents: 5,
    waveform: "triangle",
  },
  {
    name: "Sacred Ground",
    baseFreqs: [110.0, 164.81, 220.0, 277.18],
    filterCutoff: 450,
    lfoRate: 0.05,
    lfoDepth: 18,
    detuneCents: 7,
    waveform: "sine",
  },
  {
    name: "Morning Light",
    baseFreqs: [174.61, 261.63, 349.23, 440.0],
    filterCutoff: 800,
    lfoRate: 0.07,
    lfoDepth: 8,
    detuneCents: 4,
    waveform: "triangle",
  },
];

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let activeNodes: { oscs: OscillatorNode[]; lfos: OscillatorNode[]; filter: BiquadFilterNode } | null = null;
let currentThemeIndex = -1;

function getContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
  }
  return ctx;
}

function stopCurrent() {
  if (!activeNodes) return;
  try {
    activeNodes.oscs.forEach((o) => {
      try { o.stop(); } catch {}
    });
    activeNodes.lfos.forEach((l) => {
      try { l.stop(); } catch {}
    });
    activeNodes.filter.disconnect();
  } catch {}
  activeNodes = null;
}

function playTheme(theme: AmbientTheme, volume: number) {
  const ac = getContext();
  if (ac.state === "suspended") ac.resume();

  if (!masterGain) {
    masterGain = ac.createGain();
    masterGain.connect(ac.destination);
  }
  masterGain.gain.setValueAtTime(0, ac.currentTime);
  masterGain.gain.linearRampToValueAtTime(volume, ac.currentTime + 2);

  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = theme.filterCutoff;
  filter.Q.value = 0.7;
  filter.connect(masterGain);

  const oscs: OscillatorNode[] = [];
  const lfos: OscillatorNode[] = [];
  const perOscGain = volume / theme.baseFreqs.length;

  theme.baseFreqs.forEach((freq, i) => {
    const oscGain = ac.createGain();
    oscGain.gain.value = perOscGain;
    oscGain.connect(filter);

    const osc = ac.createOscillator();
    osc.type = theme.waveform;
    osc.frequency.value = freq;
    osc.detune.value = (i % 2 === 0 ? 1 : -1) * theme.detuneCents;
    osc.connect(oscGain);

    const lfo = ac.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = theme.lfoRate + i * 0.01;
    const lfoGain = ac.createGain();
    lfoGain.gain.value = theme.lfoDepth;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    osc.start();
    lfo.start();
    oscs.push(osc);
    lfos.push(lfo);
  });

  activeNodes = { oscs, lfos, filter };
}

export function startNextTheme(volume = 0.3) {
  stopCurrent();
  currentThemeIndex = (currentThemeIndex + 1) % AMBIENT_THEMES.length;
  playTheme(AMBIENT_THEMES[currentThemeIndex], volume);
}

export function stopAmbient() {
  if (masterGain && ctx) {
    masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
    setTimeout(() => {
      stopCurrent();
    }, 600);
  } else {
    stopCurrent();
  }
}

export function getThemeCount() {
  return AMBIENT_THEMES.length;
}

export function getCurrentThemeName() {
  if (currentThemeIndex < 0) return "";
  return AMBIENT_THEMES[currentThemeIndex].name;
}
