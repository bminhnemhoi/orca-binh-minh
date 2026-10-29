#!/usr/bin/env bash
# Builds the pet voice clips for Góc Bình Minh from CC0 / public-domain recordings.
# Usage: binhminh/tools/build-pet-sounds.sh <source-dir> <out-dir>
#   <source-dir> holds the downloaded originals (see binhminh/docs/pet-assets.md for URLs).
# Each clip is trimmed, peak-normalized to -2 dBFS with a short fade-out, and encoded as
# mono 48 kHz Opus (a few KB each).
set -euo pipefail
SRC="$1"
OUT="$2"
mkdir -p "$OUT"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# encode <in> <out> <start> <duration> [extra filter]
encode() {
  local in="$1" out="$2" start="$3" dur="$4" extra="${5:-}"
  local fade_at
  fade_at=$(awk "BEGIN { d = $dur - 0.08; print (d > 0 ? d : 0) }")
  ffmpeg -v error -y -ss "$start" -t "$dur" -i "$in" -ac 1 -ar 48000 \
    -af "highpass=f=80${extra:+,$extra},afade=t=in:d=0.01,afade=t=out:st=${fade_at}:d=0.08" \
    "$tmp/raw.wav"
  # Peak-normalize: short clips are too brief for loudnorm's 3 s window.
  local peak gain
  peak=$(ffmpeg -v info -i "$tmp/raw.wav" -af volumedetect -f null - 2>&1 |
    sed -n 's/.*max_volume: \(-\?[0-9.]*\) dB.*/\1/p')
  gain=$(awk "BEGIN { print -2 - ($peak) }")
  ffmpeg -v error -y -i "$tmp/raw.wav" -af "volume=${gain}dB" -c:a libopus -b:a 40k "$OUT/$out"
}

encode "$SRC/bsb/audio/bsb_1472.ogg" cat-1.ogg 0 0.98
encode "$SRC/bsb/audio/bsb_0494.ogg" cat-2.ogg 0 0.55
# "Gâu gâu": the small bark twice with a short gap.
ffmpeg -v error -y -i "$SRC/freesound/dog_small_bark_SecureSubset_800278_preview.mp3" \
  -filter_complex "[0:a]aresample=48000,asplit[a][b];anullsrc=r=48000:cl=mono,atrim=0:0.12[g];[a][g][b]concat=n=3:v=0:a=1" \
  -ac 1 "$tmp/dog.wav"
encode "$tmp/dog.wav" dog-1.ogg 0 0.87
encode "$SRC/freesound/fox_foxBark2_Setzilla_173208_preview.mp3" fox-1.ogg 0 1.3
encode "$SRC/freesound/rabbit_thump_kessir_386007_preview.mp3" rabbit-1.ogg 0 0.9
encode "$SRC/commons/panda_Giant_panda_twittering.ogg" panda-1.ogg 0 1.6
encode "$SRC/freesound/chirp_lovebird_bowlingballout_577768_preview.mp3" penguin-1.ogg 0 0.56
# Hamster: the two squeaks of the recording, joined.
ffmpeg -v error -y -i "$SRC/freesound/hamster_squeak_lusania_815243_preview.mp3" \
  -filter_complex "[0:a]atrim=2.29:2.56,asetpts=N/SR/TB[a];[0:a]atrim=4.37:4.67,asetpts=N/SR/TB[b];anullsrc=r=44100:cl=mono,atrim=0:0.1[g];[a][g][b]concat=n=3:v=0:a=1" \
  -ac 1 "$tmp/hamster.wav"
encode "$tmp/hamster.wav" hamster-1.ogg 0 0.67

ls -la "$OUT"
