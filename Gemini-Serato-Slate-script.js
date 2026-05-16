// Gemini Slate 4 / Gemini Serato Slate 4 controller script for Mixxx 2.4+.
// Direct XML bindings handle most controls. This script only manages:
//   - Pitch range setup on init
//   - Shift / Pad-mode state
//   - Jog wheel scratching
//   - Bipolar pitch fader scaling
//   - Bipolar crossfader scaling

// eslint-disable-next-line no-var
var GeminiSlate = {};

GeminiSlate.rateRange = 0.08;

GeminiSlate.alpha = 1.0 / 8;
GeminiSlate.beta = GeminiSlate.alpha / 32;
GeminiSlate.rpm = 33 + (1 / 3);
GeminiSlate.jogIntervalsPerRev = 128;

GeminiSlate.shiftByDeck = { 1: false, 2: false, 3: false, 4: false };
GeminiSlate.padModeShift = false;

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
    }
};

GeminiSlate.shift = function(_channel, _control, value, status, group) {
    var deck = GeminiSlate.deckFromGroup(group);
    GeminiSlate.shiftByDeck[deck] = GeminiSlate.isPressed(value, status);
};

GeminiSlate.padModeButton = function(_channel, _control, value, status, _group) {
    GeminiSlate.padModeShift = GeminiSlate.isPressed(value, status);
};

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
    var delta = GeminiSlate.relativeValue(value);
    if (engine.isScratching(deck)) {
        engine.scratchTick(deck, delta);
    } else {
        engine.setValue(group, "jog", delta);
    }
};

GeminiSlate.rate = function(_channel, _control, value, _status, group) {
    var centered = (0.5 - GeminiSlate.normalized(value)) * 2;
    engine.setValue(group, "rate", centered * GeminiSlate.rateRange);
};

GeminiSlate.crossfader = function(_channel, _control, value, _status, _group) {
    engine.setValue("[Master]", "crossfader", (GeminiSlate.normalized(value) * 2) - 1);
};
