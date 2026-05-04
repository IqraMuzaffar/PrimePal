#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PrimePal Audio Generation Script
Generates all game sound effects using NumPy and SciPy
No external audio files needed!

Usage:
    python generate_audio.py
"""

import sys
import numpy as np
from scipy.io import wavfile
import os
from pathlib import Path

# Fix Unicode encoding for Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

# Output directory
OUTPUT_DIR = Path(__file__).parent / "frontend" / "public" / "sounds"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Audio parameters
SAMPLE_RATE = 44100  # Hz


def sine_wave(frequency, duration, amplitude=0.3):
    """Generate a sine wave."""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), False)
    return amplitude * np.sin(2 * np.pi * frequency * t)


def envelope(signal, attack=0.01, decay=0.1, sustain=0.0, release=0.05):
    """Apply ADSR envelope to signal."""
    n = len(signal)
    attack_samples = int(attack * SAMPLE_RATE)
    decay_samples = int(decay * SAMPLE_RATE)
    release_samples = int(release * SAMPLE_RATE)
    sustain_samples = n - attack_samples - decay_samples - release_samples

    env = np.ones(n)

    # Attack
    if attack_samples > 0:
        env[:attack_samples] = np.linspace(0, 1, attack_samples)

    # Decay
    if decay_samples > 0:
        env[attack_samples : attack_samples + decay_samples] = np.linspace(
            1, sustain, decay_samples
        )

    # Sustain
    if sustain_samples > 0:
        env[attack_samples + decay_samples : attack_samples + decay_samples + sustain_samples] = sustain

    # Release
    if release_samples > 0:
        env[attack_samples + decay_samples + sustain_samples :] = np.linspace(sustain, 0, release_samples)

    return signal * env


def save_wav(filename, signal, sample_rate=SAMPLE_RATE):
    """Save signal as WAV file."""
    # Normalize to prevent clipping
    max_val = np.max(np.abs(signal))
    if max_val > 0:
        signal = signal / max_val * 0.95

    # Convert to 16-bit PCM
    signal_int = np.int16(signal * 32767)
    wavfile.write(str(OUTPUT_DIR / filename), sample_rate, signal_int)
    print(f"[OK] Generated: {filename}")


def generate_pop():
    """Pop sound - short, punchy click (150ms)"""
    print("[POP] Generating pop.wav...")
    duration = 0.15
    freq = 800  # Hz (high, punchy)
    signal = sine_wave(freq, duration, amplitude=0.4)
    signal = envelope(signal, attack=0.005, decay=0.1, sustain=0, release=0.05)
    save_wav("pop.wav", signal)


def generate_chime():
    """Chime sound - celebratory bell (400ms)"""
    print("[CHIME] Generating chime.wav...")
    duration = 0.4

    # Main bell tone (G5 = 784 Hz)
    signal1 = sine_wave(784, duration, amplitude=0.3)
    signal1 = envelope(signal1, attack=0.01, decay=0.3, sustain=0.1, release=0.15)

    # Harmonic (E6 = 1319 Hz)
    signal2 = sine_wave(1319, duration - 0.05, amplitude=0.2)
    signal2 = np.concatenate([np.zeros(int(0.05 * SAMPLE_RATE)), signal2])
    signal2 = envelope(signal2[:len(signal1)], attack=0.02, decay=0.25, sustain=0.05, release=0.2)

    signal = signal1 + signal2
    save_wav("chime.wav", signal)


def generate_error():
    """Error sound - soft buzzer (300ms)"""
    print("[ERROR] Generating error.wav...")

    # First note (B3 = 246 Hz)
    sig1 = sine_wave(246, 0.15, amplitude=0.3)
    sig1 = envelope(sig1, attack=0.01, decay=0.1, sustain=0, release=0.05)

    # Second note (A3 = 220 Hz)
    sig2 = sine_wave(220, 0.15, amplitude=0.3)
    sig2 = envelope(sig2, attack=0.01, decay=0.1, sustain=0, release=0.05)

    signal = np.concatenate([sig1, sig2])
    save_wav("error.wav", signal)


def generate_tick():
    """Tick sound - heartbeat for timer tension (150ms)"""
    print("[TICK] Generating tick.wav...")

    # First tap (C4 = 262 Hz)
    sig1 = sine_wave(262, 0.06, amplitude=0.35)
    sig1 = envelope(sig1, attack=0.002, decay=0.05, sustain=0, release=0.02)

    # Second tap (D4 = 294 Hz)
    sig2 = sine_wave(294, 0.06, amplitude=0.35)
    sig2 = envelope(sig2, attack=0.002, decay=0.05, sustain=0, release=0.02)

    # Gap between taps
    gap = np.zeros(int(0.07 * SAMPLE_RATE))

    signal = np.concatenate([sig1, gap, sig2])
    save_wav("tick.wav", signal)


def generate_whoosh():
    """Whoosh sound - page transition (300ms)"""
    print("[WHOOSH] Generating whoosh.wav...")
    duration = 0.3

    # Descending frequency sweep (sawtooth wave simulated)
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), False)
    # Frequency sweeps from 800 Hz to 200 Hz
    frequency = np.linspace(800, 200, len(t))
    phase = np.cumsum(frequency) * 2 * np.pi / SAMPLE_RATE

    # Sawtooth-like oscillation
    signal = 0.3 * (2 * (phase / (2 * np.pi) - np.floor(phase / (2 * np.pi) + 0.5)))
    signal = envelope(signal, attack=0.05, decay=0.25, sustain=0, release=0.05)

    save_wav("whoosh.wav", signal)


def generate_bgm():
    """Background Music - uplifting lofi beat (30 seconds)"""
    print("[BGM] Generating bgm.wav...")
    duration = 30

    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), False)
    signal = np.zeros_like(t)

    # Chord progression (lofi vibe)
    # C minor, Eb major, Bb major, Ab major
    chords = [
        [(130.81, 0.2), (164.81, 0.2), (196.0, 0.15)],   # C minor (C3, Eb3, G3)
        [(164.81, 0.2), (196.0, 0.2), (246.94, 0.15)],   # Eb major
        [(123.47, 0.2), (147.83, 0.2), (174.61, 0.15)],  # Bb major
        [(110.0, 0.2), (130.81, 0.2), (164.81, 0.15)],   # Ab major
    ]

    chord_duration = 2  # 2 seconds per chord
    chord_samples = int(chord_duration * SAMPLE_RATE)

    for chord_idx, chord in enumerate(chords * 4):  # 4 cycles = 32 seconds
        for freq, amp in chord:
            start = chord_idx * chord_samples
            end = start + chord_samples

            if end > len(signal):
                break

            chord_signal = sine_wave(freq, chord_duration, amplitude=amp)
            chord_signal = envelope(
                chord_signal, attack=0.1, decay=0.2, sustain=0.2, release=0.3
            )
            signal[start:end] += chord_signal[:end - start]

    # Normalize
    signal = signal / np.max(np.abs(signal)) * 0.3
    save_wav("bgm.wav", signal)


def main():
    """Generate all audio files."""
    print("\n" + "=" * 50)
    print("[AUDIO] PrimePal Audio Generation")
    print("=" * 50 + "\n")

    try:
        generate_pop()
        generate_chime()
        generate_error()
        generate_tick()
        generate_whoosh()
        generate_bgm()

        print("\n" + "=" * 50)
        print("[SUCCESS] All audio files generated successfully!")
        print(f"[PATH] Location: {OUTPUT_DIR.absolute()}")
        print("=" * 50 + "\n")

    except Exception as e:
        print(f"\n[ERROR] Error: {e}")
        import traceback
        traceback.print_exc()
        exit(1)


if __name__ == "__main__":
    main()
