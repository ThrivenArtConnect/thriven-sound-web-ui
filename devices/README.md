# Device Source Folders

Dieser Ordner enthält Sample-Projekte von Hardware-Recordern als Quellmaterial für die LoopMeLiveUp-Pipeline.

## Struktur

```
devices/
├── zoom-mr8/
│   └── sample-project/      ← Zoom MR-8 Beispielprojekt (WAVs hier ablegen)
└── roland-br864/
    └── sample-project/      ← Boss BR-864 Beispielprojekt (WAVs hier ablegen)
```

## zoom-mr8/

- **Gerät:** Zoom MR-8 MultiTrack Recorder
- **Namensschema:** `mr8XXXX.wav` (z.B. `mr80001.wav` – `mr80015.wav`)
- **Aufnahmeformat:** WAV, 44.1 kHz, 16-bit (Stereo/Mono)
- **Zugriff:** USB-Kabel oder SD-Card-Reader → als Mass-Storage mounten
- **Ordnerpfad am Gerät:** `/ZOOM MR8/PROJECT/PROJECT001/AUDIO/`

## roland-br864/

- **Gerät:** Boss BR-864 Digital Recording Studio
- **Namensschema:** Roland/Boss Projektdateien (WAV + `.BNK`)
- **Aufnahmeformat:** WAV, 44.1 kHz, 16-bit
- **Zugriff:** CompactFlash-Card-Reader → als Mass-Storage mounten
- **Ordnerpfad am Gerät:** `/ROLAND/BR864/PRJXXXXX/`

## Pipeline-Mapping

Nach dem Mounten per USB/Card-Reader → WAVs in den jeweiligen `sample-project/`-Ordner kopieren,
dann via CLI oder MCP-Tool verarbeiten:

```bash
# Zoom MR-8
node bin/thriven scan --input devices/zoom-mr8/sample-project --pack-dir packs/mr8-session-01

# Roland BR-864
node bin/thriven scan --input devices/roland-br864/sample-project --pack-dir packs/br864-session-01
```

Oder via MCP-Tool (Plan, `03_build_plan.md`):

```
thriven_scan("devices/zoom-mr8/sample-project") → packs/mr8-session-01/raw_index.json
thriven_scan("devices/roland-br864/sample-project") → packs/br864-session-01/raw_index.json
```

## Hinweis zu WAV-Dateien

Die tatsächlichen WAV-Dateien werden **nicht** ins Repo committed (`.gitignore` greift).
Nur `project.json`-Manifeste und `.gitkeep`-Platzhalter werden getrackt.
WAVs lokal in den jeweiligen `sample-project/`-Ordner legen und per CLI/App verarbeiten.
