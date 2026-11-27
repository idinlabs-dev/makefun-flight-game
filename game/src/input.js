// input.js — DEAD STICK keyboard + mouse input.
// One job: turn key/mouse events into a plain input state object.
"use strict";

const dsInput = {
  pitchUp: false,
  pitchDown: false,
  flaps: false,
  pressed: {}, // keys pressed since last poll (edge-triggered)
  mouse: { x: 0, y: 0, clicked: false },

  init: function (onFirstGesture) {
    const self = this;
    let gestured = false;
    function gesture() {
      if (!gestured) {
        gestured = true;
        if (onFirstGesture) onFirstGesture();
      }
    }
    window.addEventListener("keydown", function (e) {
      gesture();
      if (e.code === "ArrowUp" || e.code === "KeyW") self.pitchUp = true;
      if (e.code === "ArrowDown" || e.code === "KeyS") self.pitchDown = true;
      if (e.code === "Space") {
        self.flaps = true;
        e.preventDefault();
      }
      if (!e.repeat) self.pressed[e.code] = true;
      if (e.code === "ArrowUp" || e.code === "ArrowDown" || e.code === "Space") {
        e.preventDefault();
      }
    });
    window.addEventListener("keyup", function (e) {
      if (e.code === "ArrowUp" || e.code === "KeyW") self.pitchUp = false;
      if (e.code === "ArrowDown" || e.code === "KeyS") self.pitchDown = false;
      if (e.code === "Space") self.flaps = false;
    });
    window.addEventListener("blur", function () {
      self.pitchUp = false;
      self.pitchDown = false;
      self.flaps = false;
    });
    const canvas = document.getElementById("game");
    if (canvas) {
      canvas.addEventListener("pointerdown", function (e) {
        gesture();
        const r = canvas.getBoundingClientRect();
        self.mouse.x = ((e.clientX - r.left) / r.width) * DS_CONFIG.W;
        self.mouse.y = ((e.clientY - r.top) / r.height) * DS_CONFIG.H;
        self.mouse.clicked = true;
      });
    }
  },

  // Edge-triggered keys: call once per frame, then clear.
  consumePressed: function () {
    const p = this.pressed;
    this.pressed = {};
    return p;
  },

  consumeClick: function () {
    const c = this.mouse.clicked;
    this.mouse.clicked = false;
    return c ? { x: this.mouse.x, y: this.mouse.y } : null;
  },
};
