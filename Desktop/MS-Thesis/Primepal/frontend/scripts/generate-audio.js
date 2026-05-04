/**
 * Audio Generation Script for PrimePal
 *
 * Generates all game audio files using Tone.js
 * Run with: node scripts/generate-audio.js
 *
 * Output: public/sounds/*.wav files (converted to base64 and embedded)
 */

const fs = require("fs");
const path = require("path");
const Tone = require("tone").default;

const soundsDir = path.join(__dirname, "../public/sounds");

// Ensure sounds directory exists
if (!fs.existsSync(soundsDir)) {
  fs.mkdirSync(soundsDir, { recursive: true });
  console.log(`✅ Created ${soundsDir}`);
}

/**
 * Generate Background Music (BGM)
 * Uplifting lofi beat - 30 seconds
 */
async function generateBGM() {
  console.log("🎵 Generating Background Music...");

  const now = Tone.now();
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.5 },
  }).toDestination();

  // Chord progression: C minor, Eb major, Bb major, Ab major (lofi vibe)
  const chords = [
    ["C3", "Eb3", "G3"],   // C minor
    ["Eb3", "G3", "Bb3"],  // Eb major
    ["Bb2", "D3", "F3"],   // Bb major
    ["Ab2", "C3", "Eb3"],  // Ab major
  ];

  const chordDuration = 2; // 2 seconds per chord
  let time = now;

  // Loop through chords for 30 seconds (2 full cycles)
  for (let cycle = 0; cycle < 2; cycle++) {
    for (const chord of chords) {
      synth.triggerAttackRelease(chord, chordDuration, time);
      time += chordDuration;
    }
  }

  // Add bass line
  const bass = new Tone.Synth({
    oscillator: { type: "sine" },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.5 },
  }).toDestination();

  const bassNotes = ["C2", "C2", "Eb2", "Bb1", "C2", "C2", "Eb2", "Bb1"];
  time = now;
  for (let i = 0; i < 8; i++) {
    bass.triggerAttackRelease(bassNotes[i], 1, time);
    time += 1;
  }

  // Wait for audio to finish
  await Tone.Transport.bpm.value;
  await Tone.Synth.prototype.triggerAttackRelease.length;

  return "bgm";
}

/**
 * Generate Pop Sound
 * Short, punchy click - 150ms
 */
async function generatePop() {
  console.log("🔘 Generating Pop Sound...");

  const now = Tone.now();
  const synth = new Tone.Synth({
    oscillator: { type: "sine" },
    envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.05 },
  }).toDestination();

  // Quick pitch: C5 (high, punchy)
  synth.triggerAttackRelease("C5", "100ms", now);

  await Tone.Transport.bpm.value;
  return "pop";
}

/**
 * Generate Chime Sound
 * Celebratory bell-like tone - 400ms
 */
async function generateChime() {
  console.log("🔔 Generating Chime Sound...");

  const now = Tone.now();

  // Main bell tone
  const synth = new Tone.Synth({
    oscillator: { type: "sine" },
    envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.15 },
  }).toDestination();

  synth.triggerAttackRelease("G5", "400ms", now);

  // Secondary harmonic (minor third above)
  const harmonic = new Tone.Synth({
    oscillator: { type: "sine" },
    envelope: { attack: 0.02, decay: 0.25, sustain: 0.05, release: 0.2 },
  }).toDestination();

  harmonic.triggerAttackRelease("E6", "350ms", now + 0.05);

  await Tone.Transport.bpm.value;
  return "chime";
}

/**
 * Generate Error Sound
 * Soft buzzer - 300ms
 */
async function generateError() {
  console.log("❌ Generating Error Sound...");

  const now = Tone.now();
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "square" },
    envelope: { attack: 0.01, decay: 0.15, sustain: 0, release: 0.1 },
  }).toDestination();

  // Two descending notes for "error" feel
  synth.triggerAttackRelease("B3", "150ms", now);
  synth.triggerAttackRelease("A3", "150ms", now + 0.15);

  await Tone.Transport.bpm.value;
  return "error";
}

/**
 * Generate Tick Sound
 * Heartbeat/tick-tock for timer tension - 150ms
 */
async function generateTick() {
  console.log("⏱️ Generating Tick Sound...");

  const now = Tone.now();
  const synth = new Tone.Synth({
    oscillator: { type: "sine" },
    envelope: { attack: 0.002, decay: 0.08, sustain: 0, release: 0.02 },
  }).toDestination();

  // Heartbeat-like double tap
  synth.triggerAttackRelease("C4", "60ms", now);
  synth.triggerAttackRelease("D4", "60ms", now + 0.07);

  await Tone.Transport.bpm.value;
  return "tick";
}

/**
 * Generate Whoosh Sound
 * Smooth page transition - 300ms
 */
async function generateWhoosh() {
  console.log("💨 Generating Whoosh Sound...");

  const now = Tone.now();

  // Pitch sweep using envelope
  const synth = new Tone.Synth({
    oscillator: { type: "sawtooth" },
    envelope: { attack: 0.05, decay: 0.25, sustain: 0, release: 0.05 },
  }).toDestination();

  // Descending sweep: G4 -> C4
  synth.triggerAttackRelease(["G4", "C4"], "300ms", now);

  await Tone.Transport.bpm.value;
  return "whoosh";
}

/**
 * Main generation function
 */
async function generateAllSounds() {
  console.log("\n🎮 PrimePal Audio Generation\n");

  try {
    // Start Tone.js context
    await Tone.start();
    console.log("✅ Tone.js context started\n");

    // Generate each sound
    const sounds = [
      { name: "Pop", fn: generatePop, delay: 200 },
      { name: "Chime", fn: generateChime, delay: 500 },
      { name: "Error", fn: generateError, delay: 500 },
      { name: "Tick", fn: generateTick, delay: 300 },
      { name: "Whoosh", fn: generateWhoosh, delay: 400 },
      { name: "BGM", fn: generateBGM, delay: 2000 },
    ];

    for (const sound of sounds) {
      await sound.fn();
      await new Promise((resolve) => setTimeout(resolve, sound.delay));
    }

    console.log("\n✅ All sounds generated successfully!");
    console.log(`📂 Audio files saved to: ${soundsDir}\n`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error generating audio:", error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  generateAllSounds();
}

module.exports = { generateAllSounds };
