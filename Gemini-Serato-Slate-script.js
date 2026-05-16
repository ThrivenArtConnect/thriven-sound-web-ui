// Gemini Slate 4 / Gemini Serato Slate 4 controller script for Mixxx 2.4+.
// eslint-disable-next-line no-var
var GeminiSlate = {};

GeminiSlate.rateRange = 0.08;
GeminiSlate.alpha = 1.0 / 8;
GeminiSlate.beta = GeminiSlate.alpha / 32;
GeminiSlate.rpm = 33 + (1 / 3);
GeminiSlate.jogIntervalsPerRev = 128;

GeminiSlate.padModeNames = ["hotcue", "loop", "sampler"];
GeminiSlate.padModes = {
    hotcue: 0,
    loop: 1,
    sampler: 2,
};

GeminiSlate.activeDeckBySide = {
    1: 1,
    2: 2,
};

GeminiSlate.shiftByDeck = {
    1: false,
    2: false,
    3: false,
    4: false,
};

GeminiSlate.padModeByDeck = {
    1: GeminiSlate.padModes.hotcue,
    2: GeminiSlate.padModes.hotcue,
    3: GeminiSlate.padModes.hotcue,
    4: GeminiSlate.padModes.hotcue,
};

GeminiSlate.loopSizes = [0.125, 0.25, 0.5, 1, 2, 4, 8, 16];

GeminiSlate.groupFromDeck = function(deck) {
    return "[Channel" + deck + "]";
};

GeminiSlate.sideFromDeck = function(deck) {
    return (deck === 2 || deck === 4) ? 2 : 1;
};

GeminiSlate.deckFromGroup = function(group) {
    return script.deckFromGroup(group);
};

GeminiSlate.targetDeckFromGroup = function(group) {
    var deck = GeminiSlate.deckFromGroup(group);
    if (deck === 1 || deck === 2) {
        return GeminiSlate.activeDeckBySide[deck];
    }
    return deck;
};

GeminiSlate.targetGroupFromGroup = function(group) {
    return GeminiSlate.groupFromDeck(GeminiSlate.targetDeckFromGroup(group));
};

GeminiSlate.isPressed = function(value, status) {
    return value > 0 && ((status & 0xF0) === 0x90 || (status & 0xF0) === 0xB0);
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
    engine.softTakeover("[Master]", "headMix", true);
};

GeminiSlate.shutdown = function() {
    for (var deck = 1; deck <= 4; deck++) {
        if (engine.isScratching(deck)) {
            engine.scratchDisable(deck, true);
        }
    }
};

GeminiSlate.wheelTouch = function(_channel, _control, value, status, group) {
    var deck = GeminiSlate.targetDeckFromGroup(group);
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
    var deck = GeminiSlate.targetDeckFromGroup(group);
    var targetGroup = GeminiSlate.groupFromDeck(deck);
    var delta = GeminiSlate.relativeValue(value);

    if (engine.isScratching(deck)) {
        engine.scratchTick(deck, delta);
    } else {
        engine.setValue(targetGroup, "jog", delta);
    }
};

GeminiSlate.shift = function(_channel, _control, value, status, group) {
    var deck = GeminiSlate.targetDeckFromGroup(group);
    GeminiSlate.shiftByDeck[deck] = GeminiSlate.isPressed(value, status);
};

GeminiSlate.deckSwitch = function(_channel, _control, value, status, _group) {
    if (!GeminiSlate.isPressed(value, status)) {
        return;
    }

    var leftWasDeck1 = GeminiSlate.activeDeckBySide[1] === 1;
    GeminiSlate.activeDeckBySide[1] = leftWasDeck1 ? 3 : 1;
    GeminiSlate.activeDeckBySide[2] = leftWasDeck1 ? 4 : 2;
};

GeminiSlate.padMode = function(_channel, control, value, status, group) {
    if (!GeminiSlate.isPressed(value, status)) {
        return;
    }

    var deck = GeminiSlate.targetDeckFromGroup(group);
    if (control === 0x55) {
        GeminiSlate.padModeByDeck[deck] = GeminiSlate.padModes.hotcue;
    } else if (control === 0x56) {
        GeminiSlate.padModeByDeck[deck] = GeminiSlate.padModes.loop;
    } else if (control === 0x57) {
        GeminiSlate.padModeByDeck[deck] = GeminiSlate.padModes.sampler;
    } else {
        GeminiSlate.padModeByDeck[deck] =
            (GeminiSlate.padModeByDeck[deck] + 1) % GeminiSlate.padModeNames.length;
    }
};

GeminiSlate.pad = function(_channel, control, value, status, group) {
    var deck = GeminiSlate.targetDeckFromGroup(group);
    var targetGroup = GeminiSlate.groupFromDeck(deck);
    var pad = GeminiSlate.padIndex(control);
    if (pad < 1 || pad > 8) {
        return;
    }

    var pressed = GeminiSlate.isPressed(value, status);
    var shifted = GeminiSlate.shiftByDeck[deck];
    var mode = GeminiSlate.padModeByDeck[deck];

    if (mode === GeminiSlate.padModes.hotcue) {
        var cueKey = "hotcue_" + pad + (shifted ? "_clear" : "_activate");
        engine.setValue(targetGroup, cueKey, pressed ? 1 : 0);
        return;
    }

    if (!pressed) {
        return;
    }

    if (mode === GeminiSlate.padModes.loop) {
        var size = GeminiSlate.loopSizes[pad - 1];
        if (shifted) {
            engine.setValue(targetGroup, "beatjump_" + size + "_backward", 1);
        } else {
            engine.setValue(targetGroup, "beatloop_" + size + "_toggle", 1);
        }
        return;
    }

    var samplerGroup = "[Sampler" + pad + "]";
    engine.setValue(samplerGroup, shifted ? "stop" : "cue_gotoandplay", 1);
};

GeminiSlate.padIndex = function(control) {
    var leftPads = [0x06, 0x09, 0x0C, 0x0F, 0x12, 0x15, 0x18, 0x1B];
    var rightPads = [0x08, 0x0B, 0x0E, 0x11, 0x14, 0x17, 0x1A, 0x1D];
    var i;

    for (i = 0; i < leftPads.length; i++) {
        if (control === leftPads[i]) {
            return i + 1;
        }
    }
    for (i = 0; i < rightPads.length; i++) {
        if (control === rightPads[i]) {
            return i + 1;
        }
    }
    return -1;
};

GeminiSlate.playButton = function(_channel, _control, value, status, group) {
    if (!GeminiSlate.isPressed(value, status)) {
        return;
    }
    GeminiSlate.toggleControl(GeminiSlate.targetGroupFromGroup(group), "play");
};

GeminiSlate.cueButton = function(_channel, _control, value, status, group) {
    var targetGroup = GeminiSlate.targetGroupFromGroup(group);
    var deck = GeminiSlate.deckFromGroup(targetGroup);

    if (GeminiSlate.shiftByDeck[deck] && GeminiSlate.isPressed(value, status)) {
        engine.setValue(targetGroup, "cue_clear", 1);
        return;
    }
    engine.setValue(targetGroup, "cue_default", GeminiSlate.isPressed(value, status) ? 1 : 0);
};

GeminiSlate.syncButton = function(_channel, _control, value, status, group) {
    if (!GeminiSlate.isPressed(value, status)) {
        return;
    }
    var targetGroup = GeminiSlate.targetGroupFromGroup(group);
    var deck = GeminiSlate.deckFromGroup(targetGroup);
    if (GeminiSlate.shiftByDeck[deck]) {
        GeminiSlate.toggleControl(targetGroup, "sync_enabled");
    } else {
        engine.setValue(targetGroup, "beatsync", 1);
    }
};

GeminiSlate.loadButton = function(_channel, _control, value, status, group) {
    if (!GeminiSlate.isPressed(value, status)) {
        return;
    }
    var targetGroup = GeminiSlate.targetGroupFromGroup(group);
    var deck = GeminiSlate.deckFromGroup(targetGroup);
    engine.setValue(targetGroup, GeminiSlate.shiftByDeck[deck] ? "eject" : "LoadSelectedTrack", 1);
};

GeminiSlate.pflButton = function(_channel, _control, value, status, group) {
    if (!GeminiSlate.isPressed(value, status)) {
        return;
    }
    GeminiSlate.toggleControl(GeminiSlate.targetGroupFromGroup(group), "pfl");
};

GeminiSlate.reverseButton = function(_channel, _control, value, status, group) {
    engine.setValue(GeminiSlate.targetGroupFromGroup(group), "reverseroll", GeminiSlate.isPressed(value, status) ? 1 : 0);
};

GeminiSlate.volume = function(_channel, _control, value, _status, group) {
    engine.setParameter(GeminiSlate.targetGroupFromGroup(group), "volume", GeminiSlate.normalized(value));
};

GeminiSlate.pregain = function(_channel, _control, value, _status, group) {
    engine.setParameter(GeminiSlate.targetGroupFromGroup(group), "pregain", GeminiSlate.normalized(value));
};

GeminiSlate.rate = function(_channel, _control, value, _status, group) {
    var centered = (0.5 - GeminiSlate.normalized(value)) * 2;
    engine.setValue(GeminiSlate.targetGroupFromGroup(group), "rate", centered * GeminiSlate.rateRange);
};

GeminiSlate.filter = function(_channel, _control, value, _status, group) {
    var targetGroup = GeminiSlate.targetGroupFromGroup(group);
    engine.setParameter("[QuickEffectRack1_" + targetGroup + "]", "super1", GeminiSlate.normalized(value));
};

GeminiSlate.eqHigh = function(_channel, _control, value, _status, group) {
    var targetGroup = GeminiSlate.targetGroupFromGroup(group);
    engine.setParameter("[EqualizerRack1_" + targetGroup + "_Effect1]", "parameter3", GeminiSlate.normalized(value));
};

GeminiSlate.eqMid = function(_channel, _control, value, _status, group) {
    var targetGroup = GeminiSlate.targetGroupFromGroup(group);
    engine.setParameter("[EqualizerRack1_" + targetGroup + "_Effect1]", "parameter2", GeminiSlate.normalized(value));
};

GeminiSlate.eqLow = function(_channel, _control, value, _status, group) {
    var targetGroup = GeminiSlate.targetGroupFromGroup(group);
    engine.setParameter("[EqualizerRack1_" + targetGroup + "_Effect1]", "parameter1", GeminiSlate.normalized(value));
};

GeminiSlate.crossfader = function(_channel, _control, value, _status, _group) {
    engine.setValue("[Master]", "crossfader", (GeminiSlate.normalized(value) * 2) - 1);
};

GeminiSlate.headMix = function(_channel, _control, value, _status, _group) {
    engine.setParameter("[Master]", "headMix", GeminiSlate.normalized(value));
};

GeminiSlate.browseTurn = function(_channel, _control, value, _status, _group) {
    var delta = GeminiSlate.relativeValue(value);
    if (delta !== 0) {
        engine.setValue("[Library]", "MoveVertical", delta);
    }
};

GeminiSlate.browsePush = function(_channel, _control, value, status, _group) {
    if (!GeminiSlate.isPressed(value, status)) {
        return;
    }
    var leftDeck = GeminiSlate.activeDeckBySide[1];
    engine.setValue(GeminiSlate.groupFromDeck(leftDeck), "LoadSelectedTrack", 1);
};
