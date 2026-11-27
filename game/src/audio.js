// audio.js — DEAD STICK procedural sound.
// One job: wind, stall alarm, touchdown thump and crash — all
// synthesised with WebAudio, no audio files. Safe to call before any
// user gesture: it stays silent until the context is unlocked.
"use strict";

const dsAudio = (function () {
  let ctx = null;
  let windGain = null;
  let windSrc = null;
  let alarmTimer = null;
  let unlocked = false;

  function unlock() {
    if (unlocked) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      // Looping filtered noise = wind.
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      windSrc = ctx.createBufferSource();
      windSrc.buffer = buf;
      windSrc.loop = true;
      const filt = ctx.createBiquadFilter();
      filt.type = "bandpass";
      filt.frequency.value = 420;
      filt.Q.value = 0.6;
      windGain = ctx.createGain();
      windGain.gain.value = 0;
      windSrc.connect(filt);
      filt.connect(windGain);
      windGain.connect(ctx.destination);
      windSrc.start();
      unlocked = true;
    } catch (e) {
      unlocked = false;
    }
  }

  function setWind(speed01) {
    if (!unlocked || !windGain) return;
    try {
      windGain.gain.setTargetAtTime(0.02 + speed01 * 0.16, ctx.currentTime, 0.2);
    } catch (e) {}
  }

  function beep(freq, dur, type, vol) {
    if (!unlocked) return;
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type || "square";
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol || 0.08, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + dur);
    } catch (e) {}
  }

  function thump() {
    if (!unlocked) return;
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(120, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(38, ctx.currentTime + 0.18);
      g.gain.setValueAtTime(0.5, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.3);
      beep(880, 0.12, "sine", 0.06);
    } catch (e) {}
  }

  function crash() {
    if (!unlocked) return;
    try {
      const len = ctx.sampleRate * 0.5;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const s = ctx.createBufferSource();
      s.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 900;
      const g = ctx.createGain();
      g.gain.value = 0.5;
      s.connect(f);
      f.connect(g);
      g.connect(ctx.destination);
      s.start();
    } catch (e) {}
  }

  function stallAlarm(on) {
    if (!unlocked) return;
    if (on && !alarmTimer) {
      alarmTimer = setInterval(function () {
        beep(1240, 0.09, "square", 0.05);
      }, 260);
    } else if (!on && alarmTimer) {
      clearInterval(alarmTimer);
      alarmTimer = null;
    }
  }

  return { unlock, setWind, beep, thump, crash, stallAlarm };
})();
