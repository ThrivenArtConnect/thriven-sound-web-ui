// Gemini Slate 4 / Gemini Serato Slate 4 controller script for Mixxx 2.4+.
// Direct XML bindings handle most controls. This script handles:
//   - User options (pitch range, jog sensitivity, etc.)
//   - Pitch range setup on init
//   - Shift / Pad-mode state
//   - Jog wheel scratching
//   - Bipolar pitch fader scaling
//   - Bipolar crossfader scaling
//   - Toggle buttons (play, keylock, pfl, FX enable) via script.toggleControl
//   - Cue button with optional reverse roll on shift
//   - Smooth pitch-back-to-zero on shift + KEY LOCK
//   - Browse encoder push as track preview

// eslint-disable-next-line no-var
var GeminiSlate = {};

// ============================================================
//                    USER OPTIONS
// ============================================================

// Pitch fader range, e.g. 0.08 == +/- 8 %
GeminiSlate.rateRange = 0.08;

// Jog wheel sensitivity multiplier. 1 = default, 2 = twice as sensitive.
GeminiSlate.jogwheelSensitivity = 1.0;

// If true, Shift + Cue plays the track in reverse with slip enabled
// (censor effect). If false, Shift + Cue jumps to track start and stops.
GeminiSlate.reverseRollOnShiftCue = false;

// If true, releasing the browse-encoder push (after turning it) jumps the
// preview deck to jumpPreviewPosition (0 = start, 1 = end).
GeminiSlate.jumpPreviewEnabled = true;
GeminiSlate.jumpPreviewPosition = 0.5;

// Time per step in ms for pitch fade back to 0 (Shift + KEY LOCK).
GeminiSlate.speedRateToNormalTime = 200;

// ============================================================
//                INTERNAL STATE
// ============================================================

GeminiSlate.alpha = 1.0 / 8;
GeminiSlate.beta = GeminiSlate.alpha / 32;
GeminiSlate.rpm = 33 + (1 / 3);
GeminiSlate.jogIntervalsPerRev = 128;

GeminiSlate.shiftByDeck = { 1: false, 2: false, 3: false, 4: false };
GeminiSlate.padModeShift = false;

GeminiSlate.speedRateToNormalTimer = { 1: 0, 2: 0, 3: 0, 4: 0 };

GeminiSlate.browsePushChanged = false;

// ============================================================
//                HELPERS
// ============================================================

GeminiSlate.deckFromGroup = function(group) {
    return script.deckFromGroup(group);
};

GeminiSlate.isPressed = function(value, status) {
    return value > 0 && (status & 0xF0) === 0x90;
};

GeminiSlate.normalized = function(value) {
    return Math.max(0, Math.min(1, value / 127));
};

GeminiSlate.relativeValue = function(value) {
    return value - 0x40;
};

// ============================================================
//                INIT / SHUTDOWN
// ============================================================

GeminiSlate.init = function(_id, _debugging) {
    for (var deck = 1; deck <= 4; deck++) {
        var group = "[Channel" + deck + "]";
        engine.setValue(group, "rateRange", GeminiSlate.rateRange);
        engine.softTakeover(group, "rate", true);
        engine.softTakeover(group, "volume", true);
        engine.softTakeover(group, "pregain", true);
        engine.softTakeover("[EqualizerRack1_" + group + "_Effect1]", "parameter1", true);
        engine.softTakeover("[EqualizerRack1_" + group + "_Effect1]", "parameter2", true);
        engine.softTakeover("[EqualizerRack1_" + group + "_Effect1]", "parameter3", true);
        engine.softTakeover("[QuickEffectRack1_" + group + "]", "super1", true);
    }
    engine.softTakeover("[Master]", "crossfader", true);
};

GeminiSlate.shutdown = function() {
    for (var deck = 1; deck <= 4; deck++) {
        if (engine.isScratching(deck)) {
            engine.scratchDisable(deck, true);
        }
        if (GeminiSlate.speedRateToNormalTimer[deck]) {
            engine.stopTimer(GeminiSlate.speedRateToNormalTimer[deck]);
        }
    }
};

// ============================================================
//                SHIFT / PAD MODE
// ============================================================

GeminiSlate.shift = function(_channel, _control, value, status, group) {
    var deck = GeminiSlate.deckFromGroup(group);
    GeminiSlate.shiftByDeck[deck] = GeminiSlate.isPressed(value, status);
};

GeminiSlate.padModeButton = function(_channel, _control, value, status, _group) {
    GeminiSlate.padModeShift = GeminiSlate.isPressed(value, status);
};

// ============================================================
//                JOG WHEEL
// ============================================================

GeminiSlate.wheelTouch = function(_channel, _control, value, status, group) {
    var deck = GeminiSlate.deckFromGroup(group);
    if (GeminiSlate.isPressed(value, status)) {
        engine.scratchEnable(
            deck,
            GeminiSlate.jogIntervalsPerRev,
            GeminiSlate.rpm,
            GeminiSlate.alpha,
            GeminiSlate.beta,
            true
        );
    } else {
        engine.scratchDisable(deck, true);
    }
};

GeminiSlate.wheelTurn = function(_channel, _control, value, _status, group) {
    var deck = GeminiSlate.deckFromGroup(group);
    var delta = GeminiSlate.relativeValue(value) * GeminiSlate.jogwheelSensitivity;
    if (engine.isScratching(deck)) {
        engine.scratchTick(deck, delta);
    } else {
        engine.setValue(group, "jog", delta);
    }
};

// ============================================================
//                FADERS / KNOBS  (bipolar)
// ============================================================

GeminiSlate.rate = function(_channel, _control, value, _status, group) {
    var centered = (0.5 - GeminiSlate.normalized(value)) * 2;
    engine.setValue(group, "rate", centered * GeminiSlate.rateRange);
};

GeminiSlate.crossfader = function(_channel, _control, value, _status, _group) {
    engine.setValue("[Master]", "crossfader", (GeminiSlate.normalized(value) * 2) - 1);
};

// ============================================================
//                TOGGLE BUTTONS
// ============================================================

GeminiSlate.playToggle = function(_channel, _control, value, status, group) {
    if (!GeminiSlate.isPressed(value, status)) { return; }
    script.toggleControl(group, "play");
};

GeminiSlate.keylockToggle = function(_channel, _control, value, status, group) {
    if (!GeminiSlate.isPressed(value, status)) { return; }
    var deck = GeminiSlate.deckFromGroup(group);
    if (GeminiSlate.shiftByDeck[deck]) {
        if (GeminiSlate.speedRateToNormalTimer[deck]) {
            engine.stopTimer(GeminiSlate.speedRateToNormalTimer[deck]);
        }
        GeminiSlate.speedRateToNormalTimer[deck] = engine.beginTimer(
            GeminiSlate.speedRateToNormalTime,
            function() { GeminiSlate.speedRateToNormal(deck); }
        );
    } else {
        script.toggleControl(group, "keylock");
    }
};

GeminiSlate.pflToggle = function(_channel, _control, value, status, group) {
    if (!GeminiSlate.isPressed(value, status)) { return; }
    script.toggleControl(group, "pfl");
};

GeminiSlate.fxToggleFor = function(unit, deck, value, status) {
    if (!GeminiSlate.isPressed(value, status)) { return; }
    script.toggleControl(
        "[EffectRack1_EffectUnit" + unit + "]",
        "group_[Channel" + deck + "]_enable"
    );
};

GeminiSlate.fx1Deck1 = function(_c, _ctrl, v, s, _g) { GeminiSlate.fxToggleFor(1, 1, v, s); };
GeminiSlate.fx2Deck1 = function(_c, _ctrl, v, s, _g) { GeminiSlate.fxToggleFor(2, 1, v, s); };
GeminiSlate.fx3Deck1 = function(_c, _ctrl, v, s, _g) { GeminiSlate.fxToggleFor(3, 1, v, s); };
GeminiSlate.fx1Deck2 = function(_c, _ctrl, v, s, _g) { GeminiSlate.fxToggleFor(1, 2, v, s); };
GeminiSlate.fx2Deck2 = function(_c, _ctrl, v, s, _g) { GeminiSlate.fxToggleFor(2, 2, v, s); };
GeminiSlate.fx3Deck2 = function(_c, _ctrl, v, s, _g) { GeminiSlate.fxToggleFor(3, 2, v, s); };
GeminiSlate.fx1Deck3 = function(_c, _ctrl, v, s, _g) { GeminiSlate.fxToggleFor(1, 3, v, s); };
GeminiSlate.fx2Deck3 = function(_c, _ctrl, v, s, _g) { GeminiSlate.fxToggleFor(2, 3, v, s); };
GeminiSlate.fx3Deck3 = function(_c, _ctrl, v, s, _g) { GeminiSlate.fxToggleFor(3, 3, v, s); };
GeminiSlate.fx2Deck4 = function(_c, _ctrl, v, s, _g) { GeminiSlate.fxToggleFor(2, 4, v, s); };

// ============================================================
//                CUE  (with shift options)
// ============================================================

GeminiSlate.cueButton = function(_channel, _control, value, status, group) {
    var deck = GeminiSlate.deckFromGroup(group);
    var pressed = GeminiSlate.isPressed(value, status);
    if (GeminiSlate.shiftByDeck[deck]) {
        if (GeminiSlate.reverseRollOnShiftCue) {
            engine.setValue(group, "reverseroll", pressed ? 1 : 0);
        } else if (pressed) {
            engine.setValue(group, "start_stop", 1);
        }
    } else {
        engine.setValue(group, "cue_default", pressed ? 1 : 0);
    }
};

// ============================================================
//                SPEED RATE TO NORMAL  (shift + KEY LOCK)
// ============================================================

GeminiSlate.speedRateToNormal = function(deck) {
    var group = "[Channel" + deck + "]";
    var speed = engine.getValue(group, "rate");
    if (speed > 0) {
        engine.setValue(group, "rate_perm_up_small", true);
        if (engine.getValue(group, "rate") <= 0) {
            engine.stopTimer(GeminiSlate.speedRateToNormalTimer[deck]);
            GeminiSlate.speedRateToNormalTimer[deck] = 0;
            engine.setValue(group, "rate", 0);
        }
    } else if (speed < 0) {
        engine.setValue(group, "rate_perm_down_small", true);
        if (engine.getValue(group, "rate") >= 0) {
            engine.stopTimer(GeminiSlate.speedRateToNormalTimer[deck]);
            GeminiSlate.speedRateToNormalTimer[deck] = 0;
            engine.setValue(group, "rate", 0);
        }
    } else {
        engine.stopTimer(GeminiSlate.speedRateToNormalTimer[deck]);
        GeminiSlate.speedRateToNormalTimer[deck] = 0;
    }
};

// ============================================================
//                LIBRARY BROWSE
// ============================================================

GeminiSlate.browseTurn = function(_channel, _control, value, _status, _group) {
    var delta = GeminiSlate.relativeValue(value);
    if (delta !== 0) {
        engine.setValue("[Library]", "MoveVertical", delta);
        GeminiSlate.browsePushChanged = true;
    }
};

GeminiSlate.browsePush = function(_channel, _control, value, status, _group) {
    var pressed = GeminiSlate.isPressed(value, status);
    if (GeminiSlate.browsePushChanged) {
        if (pressed) {
            engine.setValue("[PreviewDeck1]", "LoadSelectedTrackAndPlay", 1);
        } else {
            if (GeminiSlate.jumpPreviewEnabled) {
                engine.setValue("[PreviewDeck1]", "playposition", GeminiSlate.jumpPreviewPosition);
            }
            GeminiSlate.browsePushChanged = false;
        }
    } else {
        if (pressed) {
            engine.setValue("[PreviewDeck1]", "stop", 1);
        } else {
            GeminiSlate.browsePushChanged = true;
        }
    }
};

GeminiSlate.browseBack = function(_channel, _control, value, status, _group) {
    if (!GeminiSlate.isPressed(value, status)) { return; }
    engine.setValue("[Library]", "MoveFocusBackward", 1);
};
