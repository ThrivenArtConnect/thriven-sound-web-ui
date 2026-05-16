// Gemini Slate 4 / Gemini Serato Slate 4 controller script for Mixxx 2.4+.
// Generated from MIDI-OX log of physical left deck on MIDI channel 1.
// Decks 2/3/4 mirror the same notes/CCs on MIDI channels 2/3/4.
// Mixer (volume, EQ, filter) sits on global MIDI channel 4 with per-deck CC numbers.

// eslint-disable-next-line no-var
var GeminiSlate = {};

GeminiSlate.rateRange = 0.08;
GeminiSlate.alpha = 1.0 / 8;
GeminiSlate.beta = GeminiSlate.alpha / 32;
GeminiSlate.rpm = 33 + (1 / 3);
GeminiSlate.jogIntervalsPerRev = 128;

GeminiSlate.shiftByDeck = { 1: false, 2: false, 3: false, 4: false };
GeminiSlate.padModeShift = false;

GeminiSlate.padNotes = [0x06, 0x09, 0x0C, 0x0F, 0x12, 0x15, 0x18, 0x1B];
GeminiSlate.padShiftedNotes = [0x55, 0x56, 0x57, 0x58, 0x59, 0x5A, 0x5B, 0x5C];

GeminiSlate.groupFromDeck = function(deck) {
    return "[Channel" + deck + "]";
};

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

GeminiSlate.toggleControl = function(group, key) {
    engine.setValue(group, key, engine.getValue(group, key) > 0 ? 0 : 1);
};

GeminiSlate.padIndex = function(control) {
    var i;
    for (i = 0; i < GeminiSlate.padNotes.length; i++) {
        if (control === GeminiSlate.padNotes[i]) { return i + 1; }
    }
    for (i = 0; i < GeminiSlate.padShiftedNotes.length; i++) {
        if (control === GeminiSlate.padShiftedNotes[i]) { return i + 1; }
    }
    return -1;
};

GeminiSlate.init = function(_id, _debugging) {
    for (var deck = 1; deck <= 4; deck++) {
        var group = GeminiSlate.groupFromDeck(deck);
        engine.setValue(group, "rateRange", GeminiSlate.rateRange);
        engine.softTakeover(group, "volume", true);
        engine.softTakeover(group, "pregain", true);
        engine.softTakeover(group, "rate", true);
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

// ----- Shift handlers ---------------------------------------------------

GeminiSlate.shift = function(_channel, _control, value, status, group) {
    var deck = GeminiSlate.deckFromGroup(group);
    GeminiSlate.shiftByDeck[deck] = GeminiSlate.isPressed(value, status);
};

GeminiSlate.padModeButton = function(_channel, _control, value, status, _group) {
    GeminiSlate.padModeShift = GeminiSlate.isPressed(value, status);
};

// ----- Jog wheel --------------------------------------------------------

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

// ----- Pads -------------------------------------------------------------

GeminiSlate.padHotcue = function(_channel, control, value, status, group) {
    var deck = GeminiSlate.deckFromGroup(group);
    var pad = GeminiSlate.padIndex(control);
    if (pad < 1) { return; }
    var pressed = GeminiSlate.isPressed(value, status);
    var shifted = GeminiSlate.shiftByDeck[deck] || GeminiSlate.padModeShift;
    var key = "hotcue_" + pad + (shifted ? "_clear" : "_activate");
    engine.setValue(group, key, pressed ? 1 : 0);
};

GeminiSlate.padSampler = function(_channel, control, value, status, group) {
    var pad = GeminiSlate.padIndex(control);
    if (pad < 1) { return; }
    if (!GeminiSlate.isPressed(value, status)) { return; }
    var deck = GeminiSlate.deckFromGroup(group);
    var samplerGroup = "[Sampler" + pad + "]";
    if (GeminiSlate.shiftByDeck[deck] || GeminiSlate.padModeShift) {
        engine.setValue(samplerGroup, "stop", 1);
    } else {
        engine.setValue(samplerGroup, "cue_gotoandplay", 1);
    }
};

// ----- Transport --------------------------------------------------------

GeminiSlate.playButton = function(_channel, _control, value, status, group) {
    if (!GeminiSlate.isPressed(value, status)) { return; }
    GeminiSlate.toggleControl(group, "play");
};

GeminiSlate.cueButton = function(_channel, _control, value, status, group) {
    var deck = GeminiSlate.deckFromGroup(group);
    if (GeminiSlate.shiftByDeck[deck] && GeminiSlate.isPressed(value, status)) {
        engine.setValue(group, "cue_clear", 1);
        return;
    }
    engine.setValue(group, "cue_default", GeminiSlate.isPressed(value, status) ? 1 : 0);
};

GeminiSlate.syncButton = function(_channel, _control, value, status, group) {
    if (!GeminiSlate.isPressed(value, status)) { return; }
    var deck = GeminiSlate.deckFromGroup(group);
    if (GeminiSlate.shiftByDeck[deck]) {
        GeminiSlate.toggleControl(group, "sync_enabled");
    } else {
        engine.setValue(group, "beatsync", 1);
    }
};

GeminiSlate.loadButton = function(_channel, _control, value, status, group) {
    if (!GeminiSlate.isPressed(value, status)) { return; }
    engine.setValue(group, "LoadSelectedTrack", 1);
};

GeminiSlate.pflButton = function(_channel, _control, value, status, group) {
    if (!GeminiSlate.isPressed(value, status)) { return; }
    GeminiSlate.toggleControl(group, "pfl");
};

GeminiSlate.keyLock = function(_channel, _control, value, status, group) {
    if (!GeminiSlate.isPressed(value, status)) { return; }
    GeminiSlate.toggleControl(group, "keylock");
};

// ----- FX (per deck on Effect Unit 1..4 channel slot) -------------------

GeminiSlate.fxToggle = function(deck, fxSlot, value, status) {
    if (!GeminiSlate.isPressed(value, status)) { return; }
    var unit = "[EffectRack1_EffectUnit" + fxSlot + "]";
    var assign = "group_[Channel" + deck + "]_enable";
    GeminiSlate.toggleControl(unit, assign);
};

GeminiSlate.fx1 = function(_channel, _control, value, status, group) {
    GeminiSlate.fxToggle(GeminiSlate.deckFromGroup(group), 1, value, status);
};

GeminiSlate.fx2 = function(_channel, _control, value, status, group) {
    GeminiSlate.fxToggle(GeminiSlate.deckFromGroup(group), 2, value, status);
};

GeminiSlate.fx3 = function(_channel, _control, value, status, group) {
    GeminiSlate.fxToggle(GeminiSlate.deckFromGroup(group), 3, value, status);
};

// ----- Loops ------------------------------------------------------------

GeminiSlate.loopIn = function(_channel, _control, value, status, group) {
    if (!GeminiSlate.isPressed(value, status)) { return; }
    engine.setValue(group, "loop_in", 1);
};

GeminiSlate.loopOut = function(_channel, _control, value, status, group) {
    if (!GeminiSlate.isPressed(value, status)) { return; }
    engine.setValue(group, "loop_out", 1);
};

GeminiSlate.loopExit = function(_channel, _control, value, status, group) {
    if (!GeminiSlate.isPressed(value, status)) { return; }
    GeminiSlate.toggleControl(group, "reloop_toggle");
};

GeminiSlate.loopHalve = function(_channel, _control, value, status, group) {
    if (!GeminiSlate.isPressed(value, status)) { return; }
    engine.setValue(group, "loop_halve", 1);
};

// ----- Faders / knobs ---------------------------------------------------

GeminiSlate.volume = function(_channel, _control, value, _status, group) {
    engine.setParameter(group, "volume", GeminiSlate.normalized(value));
};

GeminiSlate.pregain = function(_channel, _control, value, _status, group) {
    engine.setParameter(group, "pregain", GeminiSlate.normalized(value));
};

GeminiSlate.rate = function(_channel, _control, value, _status, group) {
    var centered = (0.5 - GeminiSlate.normalized(value)) * 2;
    engine.setValue(group, "rate", centered * GeminiSlate.rateRange);
};

GeminiSlate.filter = function(_channel, _control, value, _status, group) {
    engine.setParameter("[QuickEffectRack1_" + group + "]", "super1", GeminiSlate.normalized(value));
};

GeminiSlate.eqHigh = function(_channel, _control, value, _status, group) {
    engine.setParameter("[EqualizerRack1_" + group + "_Effect1]", "parameter3", GeminiSlate.normalized(value));
};

GeminiSlate.eqMid = function(_channel, _control, value, _status, group) {
    engine.setParameter("[EqualizerRack1_" + group + "_Effect1]", "parameter2", GeminiSlate.normalized(value));
};

GeminiSlate.eqLow = function(_channel, _control, value, _status, group) {
    engine.setParameter("[EqualizerRack1_" + group + "_Effect1]", "parameter1", GeminiSlate.normalized(value));
};

// ----- Master / library -------------------------------------------------

GeminiSlate.crossfader = function(_channel, _control, value, _status, _group) {
    engine.setValue("[Master]", "crossfader", (GeminiSlate.normalized(value) * 2) - 1);
};

GeminiSlate.browseTurn = function(_channel, _control, value, _status, _group) {
    var delta = GeminiSlate.relativeValue(value);
    if (delta !== 0) {
        engine.setValue("[Library]", "MoveVertical", delta);
    }
};

GeminiSlate.browseBack = function(_channel, _control, value, status, _group) {
    if (!GeminiSlate.isPressed(value, status)) { return; }
    engine.setValue("[Library]", "MoveFocusBackward", 1);
};
