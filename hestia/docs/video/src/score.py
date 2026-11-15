"""HESTIA 30 s film — original procedural score + sound effects (no samples, no third-party audio).

Every event time below is taken from film/film.html (same clock keyframes, clicks, transitions).
Output: sound/score.wav (48 kHz, stereo, float -> 24-bit PCM), pre-loudness-normalisation.
"""
import os
import wave
import numpy as np

SR = 48000
DUR = 29.8
N = int(DUR * SR)
rng = np.random.default_rng(7)
L = np.zeros(N)
R = np.zeros(N)
SEND_L = np.zeros(N)  # reverb send
SEND_R = np.zeros(N)


def t_axis(d):
    return np.arange(int(d * SR)) / SR


def place(sig, t0, gain=1.0, pan=0.0, send=0.0):
    i0 = int(round(t0 * SR))
    if i0 >= N:
        return
    s = sig[: max(0, N - i0)] * gain
    gl, gr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    L[i0:i0 + len(s)] += s * gl
    R[i0:i0 + len(s)] += s * gr
    if send:
        SEND_L[i0:i0 + len(s)] += s * gl * send
        SEND_R[i0:i0 + len(s)] += s * gr * send


def lp(x, fc):
    """one-pole low-pass, fc can be scalar or array (time-varying)."""
    fc = np.broadcast_to(np.asarray(fc, dtype=float), x.shape)
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x)
    z = 0.0
    for i in range(len(x)):
        z = (1 - a[i]) * x[i] + a[i] * z
        y[i] = z
    return y


def hp(x, fc):
    return x - lp(x, fc)


def note(f):
    return 440.0 * 2 ** ((f - 69) / 12)


# ---------------------------------------------------------------- clock (same keyframes as the film)
K = [(0, 2400, 'h'), (7.6, 2400, 'l'), (8.4, 2399.2, 'e'), (9.0, 2220, 'l'), (13.0, 2216, 'e'), (13.6, 1800, 'l'),
     (17.8, 1795.8, 'e'), (18.4, 1440, 'l'), (22.6, 1435.8, 'e'), (23.2, 1187.4, 'l'), (26.6, 1184.0, 'e'), (27.2, 0, 'h')]


def eio(x):
    return 4 * x ** 3 if x < .5 else 1 - (-2 * x + 2) ** 3 / 2


def S(t):
    for i in range(len(K) - 1, -1, -1):
        t0, s0, m = K[i]
        if t >= t0:
            if i == len(K) - 1 or m == 'h':
                return s0
            t1, s1, _ = K[i + 1]
            x = (t - t0) / (t1 - t0)
            return s0 + (s1 - s0) * (eio(x) if m == 'e' else x)
    return K[0][1]


LAPSES = [(8.4, 9.0), (13.0, 13.6), (17.8, 18.4), (22.6, 23.2), (26.6, 27.2)]
LANDS = [9.0, 13.6, 18.4, 23.2]
CLICKS = [8.85, 13.55, 18.4, 23.2]

# ---------------------------------------------------------------- sound designs


def tick(bright=1.0):
    d = t_axis(0.05)
    n = rng.standard_normal(len(d)) * np.exp(-d * 260)
    s = hp(n, 1800) * 0.6 + np.sin(2 * np.pi * 2600 * d) * np.exp(-d * 180) * 0.5 * bright
    return s


def click_ui():
    d = t_axis(0.06)
    s = np.sin(2 * np.pi * 1500 * d) * np.exp(-d * 120) * 0.6 + hp(rng.standard_normal(len(d)), 3000) * np.exp(-d * 400) * 0.5
    return s


def tap_soft():
    d = t_axis(0.09)
    return np.sin(2 * np.pi * (420 + 300 * np.exp(-d * 60)) * d) * np.exp(-d * 55)


def ping(f, dur=1.2, glide=0.0):
    d = t_axis(dur)
    fr = f * (1 + glide * (1 - np.exp(-d * 25)))
    ph = 2 * np.pi * np.cumsum(fr) / SR
    s = (np.sin(ph) + 0.25 * np.sin(2 * ph) + 0.08 * np.sin(3.01 * ph)) * np.exp(-d * 4.2)
    s *= np.minimum(1, d / 0.004)
    return s


def chime(f, dur=0.35):
    d = t_axis(dur)
    s = (np.sin(2 * np.pi * f * d) + 0.3 * np.sin(2 * np.pi * 2 * f * d)) * np.exp(-d * 9) * np.minimum(1, d / 0.005)
    return s


def thump(f0=70, dur=0.5):
    d = t_axis(dur)
    fr = f0 * (1 + 1.6 * np.exp(-d * 30))
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-d * 9) * np.minimum(1, d / 0.003)


def swish(dur=0.5, f0=400, f1=3000, up=True):
    d = t_axis(dur)
    x = d / dur
    env = np.sin(np.pi * x) ** 2
    fc = f0 + (f1 - f0) * (x if up else 1 - x)
    n = rng.standard_normal(len(d))
    return lp(hp(n, 200), fc) * env


def bloop(f0=480, f1=980, dur=0.16):
    d = t_axis(dur)
    fr = f0 + (f1 - f0) * (d / dur) ** 0.6
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.sin(np.pi * d / dur) ** 1.5


def heartbeat():
    return thump(55, 0.35) * 0.9


def pluck(f, dur=0.5):
    d = t_axis(dur)
    s = np.sin(2 * np.pi * f * d) + 0.35 * np.sin(2 * np.pi * 2 * f * d) * np.exp(-d * 10) + 0.12 * np.sin(2 * np.pi * 3 * f * d) * np.exp(-d * 16)
    return s * np.exp(-d * 7) * np.minimum(1, d / 0.003)


# ---------------------------------------------------------------- music bed: chord pad per scene, resolves to A major
CHORDS = [  # (start, midi notes)
    (0.0, [45, 52, 57, 60, 64]),     # A minor
    (4.2, [41, 48, 53, 57, 64]),     # F maj7
    (9.0, [36, 48, 52, 55, 62]),     # C add9
    (13.6, [43, 50, 55, 59, 62]),    # G
    (18.4, [45, 52, 57, 60, 67]),    # A minor 7
    (23.2, [41, 48, 53, 57, 65]),    # F
    (27.2, [45, 52, 57, 61, 64, 71]),  # A major add9 — the reply arrives
]
t = np.arange(N) / SR
pad = np.zeros(N)
XF = 0.6
for ci, (c0, notes) in enumerate(CHORDS):
    c1 = CHORDS[ci + 1][0] if ci + 1 < len(CHORDS) else DUR + 1
    env = np.clip((t - (c0 - XF / 2)) / XF, 0, 1) * np.clip(((c1 + XF / 2) - t) / XF, 0, 1)
    if ci == 0:
        env = np.clip(t / 0.9, 0, 1) * np.clip(((c1 + XF / 2) - t) / XF, 0, 1)
    sl = env > 0
    tt = t[sl]
    bright = 0.35 + 0.65 * np.clip(tt / DUR, 0, 1)  # the pad opens over the film
    acc = np.zeros(sl.sum())
    for k, m in enumerate(notes):
        f = note(m)
        for det in (-0.12, 0.12):
            ff = f * 2 ** (det / 12)
            ph = 2 * np.pi * ff * tt + k * 1.7 + det * 10
            for h in range(1, 6):
                acc += np.sin(h * ph) * (1 / h) * (bright ** (h - 1)) * (0.6 if m < 48 else 0.35)
    pad[sl] += acc * env[sl]
pad *= 0.045
# slow tremolo-free swell, duck slightly during time-lapses so risers read
duck = np.ones(N)
for a, b in LAPSES:
    duck -= 0.35 * np.clip(1 - np.abs((t - (a + b) / 2) / ((b - a) / 2 + 0.15)), 0, 1)
pad *= duck
pad[t > 29.1] *= np.clip((29.8 - t[t > 29.1]) / 0.7, 0, 1)
L += pad * 0.95
R += pad * 1.05
SEND_L += pad * 0.25
SEND_R += pad * 0.25

# arpeggio pulse inside each scene (anchored to the scene start, silent during time-lapses)
SCENES = [(4.2, 8.35), (9.0, 12.95), (13.6, 17.75), (18.4, 22.55), (23.2, 26.55)]
STEP = 0.3  # ~100 BPM eighths
for si, (a, b) in enumerate(SCENES):
    notes = [n for (c0, ns) in CHORDS if c0 <= a + 0.01 for n in [ns]][-1]
    seq = [notes[2] + 12, notes[3] + 12, notes[4] + 12, notes[3] + 12]
    k = 0
    tt = a
    while tt < b - 0.05:
        vel = 0.55 if k % 4 == 0 else 0.35
        fade_in = min(1, (tt - a) / 0.6 + 0.3)
        place(pluck(note(seq[k % 4])), tt, 0.10 * vel * fade_in, pan=(-0.35 if k % 2 else 0.35), send=0.5)
        k += 1
        tt += STEP

# ---------------------------------------------------------------- events
# intro: round-trip ping Mars -> Earth -> Mars
place(ping(note(81), 1.4), 1.0, 0.22, pan=-0.6, send=0.8)
place(ping(note(88), 1.2), 1.9, 0.16, pan=0.6, send=0.8)
place(ping(note(81), 1.4), 2.8, 0.18, pan=-0.6, send=0.8)
# devices and the Mars disc
place(swish(0.55, 300, 1800, up=False), 3.55, 0.18, pan=0.2)          # Mars disc drops
place(swish(0.6, 500, 3500), 3.75, 0.20, pan=0.5)                     # laptop slides in
place(swish(0.5, 700, 4000), 3.85, 0.12, pan=0.7)                     # phone slides in
place(swish(0.45, 400, 2500, up=False), 9.6, 0.12, pan=0.7)           # phone leaves
place(swish(0.5, 400, 2500, up=False), 26.6, 0.18, pan=0.3)           # laptop leaves
place(swish(0.7, 300, 1600), 26.9, 0.14, pan=0.2)                     # Mars disc rises
# Sofia: heartbeat speeding up, then the tap and the alert
hb = 4.4
period = 0.95
while hb < 7.1:
    place(heartbeat(), hb, 0.30, send=0.1)
    place(heartbeat(), hb + 0.22, 0.20, send=0.1)
    hb += period
    period *= 0.86
place(tap_soft(), 6.55, 0.35, pan=0.5)
place(chime(note(83), 0.3), 7.32, 0.20, pan=0.4, send=0.5)            # alert: two tones
place(chime(note(79), 0.4), 7.50, 0.20, pan=0.4, send=0.5)
place(ping(note(76), 1.0, glide=0.6), 7.62, 0.16, pan=-0.6, send=0.9)  # report leaves Mars
# cursor clicks
for c in CLICKS:
    place(click_ui(), c, 0.30, pan=0.15)
# mascot pops
place(bloop(), 9.38, 0.22, pan=-0.6, send=0.4)
place(bloop(520, 1100), 27.58, 0.22, pan=0.4, send=0.4)
# clock: ticks during holds when the seconds digit lands
prev = S(0)
for i in range(1, int(DUR * 200)):
    tt = i / 200
    s = S(tt)
    if any(a - 0.02 <= tt <= b + 0.02 for a, b in LAPSES):
        prev = s
        continue
    if np.floor(s) < np.floor(prev) and tt > 7.5:
        place(tick(), tt, 0.16, pan=0.55)
    prev = s
# time-lapse: riser + accelerating tick roll + landing hit
for a, b in LAPSES:
    d = b - a
    place(swish(d + 0.15, 500, 6000), a - 0.05, 0.26, pan=0.3, send=0.3)
    tt = a
    while tt < b:
        sp = abs(S(tt + 0.005) - S(tt - 0.005)) / 0.01
        rate = min(42, 6 + sp / 40)
        place(tick(0.7), tt, 0.09, pan=0.55 + rng.uniform(-0.1, 0.1))
        tt += 1 / rate
for x in LANDS:
    place(thump(62, 0.6), x, 0.30, send=0.2)
    place(chime(note(76), 0.5), x + 0.01, 0.07, pan=-0.3, send=0.6)
# Earth receives the report, then the reply lands at Mars
place(ping(note(88), 1.6), 23.2, 0.18, pan=0.7, send=0.9)
place(thump(55, 1.0), 27.2, 0.38, send=0.3)
place(ping(note(81), 2.2), 27.2, 0.20, pan=-0.6, send=1.0)
place(ping(note(88), 2.2), 27.32, 0.12, pan=0.2, send=1.0)

# end card: 'ALSO IN HESTIA' chips appear one by one
for i in range(6):
    place(tick(0.8), 27.75 + i * 0.09, 0.07, pan=-0.4 + i * 0.16, send=0.3)

# ---------------------------------------------------------------- reverb (synthetic IR, FFT convolution) and output
ir_len = int(2.0 * SR)
d = np.arange(ir_len) / SR
irL = rng.standard_normal(ir_len) * np.exp(-d * 3.2)
irR = rng.standard_normal(ir_len) * np.exp(-d * 3.2)
irL[: int(0.012 * SR)] = 0
irR[: int(0.017 * SR)] = 0
irL /= np.sqrt((irL ** 2).sum())
irR /= np.sqrt((irR ** 2).sum())


def conv(x, h):
    n = 1 << int(np.ceil(np.log2(len(x) + len(h))))
    return np.fft.irfft(np.fft.rfft(x, n) * np.fft.rfft(h, n), n)[: len(x)]


L += conv(SEND_L, irL) * 0.35
R += conv(SEND_R, irR) * 0.35
fade = np.clip((DUR - t) / 0.5, 0, 1)
L *= fade
R *= fade
peak = max(np.abs(L).max(), np.abs(R).max())
L /= peak / 0.7
R /= peak / 0.7
pcm = (np.stack([L, R], 1) * (2 ** 23 - 1)).astype('<i4')
raw = pcm.reshape(-1).view(np.uint8).reshape(-1, 4)[:, :3].tobytes()
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'build')
os.makedirs(OUT, exist_ok=True)
with wave.open(os.path.join(OUT, 'score.wav'), 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(3)
    w.setframerate(SR)
    w.writeframes(raw)
print('written', N / SR, 's')
