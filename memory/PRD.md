# Thriven Sound Analyzer - PRD

## Overview
Full-stack web application that wraps CLI audio processing tools into a modern drag-and-drop interface for analyzing Suno AI stems and preparing 8-stem packs for BR-864 hardware.

## Original Problem Statement
Build a web app called "Thriven Sound Analyzer" that wraps CLI tools from a connected GitHub repo into a modern, drag-and-drop audio processing interface with:
- Upload Zone for Suno exports
- Pipeline Control (Scan → Analyze → Export)
- Dashboard with analysis results (LUFS, Peak, RMS, Silence %)
- 8-Stem Mapping visual editor
- Export Manager for ZIP downloads

## Architecture

### Tech Stack
- **Frontend:** Next.js 14 + React + Tailwind CSS
- **Backend:** Next.js API Routes (wrapping CLI tools)
- **Database:** MongoDB (migrated from SQLite for deployment compatibility)
- **CLI Tools:** Existing Node.js CLI in `/app/bin/thriven`
- **Audio Processing:** ffmpeg/ffprobe

### Project Structure
```
/app/
├── bin/thriven          # CLI entry point
├── src/                 # CLI core modules
├── web/                 # Next.js web application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── lib/         # CLI wrapper & DB
│   │   ├── pages/       # Next.js pages & API
│   │   └── styles/      # Global CSS
│   └── package.json
```

## User Personas
1. **Music Producers** - Upload Suno stems, analyze quality, export best loops
2. **Sound Designers** - Organize stems into 8-slot BR-864 format
3. **Audio Engineers** - Quality analysis (LUFS, Peak, RMS, Silence %)

## Core Requirements (Static)
- [x] Drag-and-drop file upload (WAV, MP3, M4A, FLAC)
- [x] Pipeline control: Scan → Analyze → Export
- [x] Analysis dashboard with sortable tables
- [x] SHA-256 duplicate detection
- [x] 8-stem mapping editor with BPM (90-190) and Key inputs
- [x] ZIP export for stems_8/ and br864_ready/
- [x] Waveform preview with wavesurfer.js
- [x] Cyberpunk dark theme with neon teal/purple

## What's Been Implemented (Jan 2026)

### Frontend Components
- UploadZone - Drag-drop with progress bar
- PipelineControl - Scan/Analyze/Export steps
- AnalysisDashboard - Sortable table with LUFS/Peak/RMS/Silence%
- StemmapEditor - 8-slot visual editor
- ExportManager - ZIP download manager
- WaveformPlayer - wavesurfer.js integration

### API Routes
- `/api/upload` - File upload handler
- `/api/pipeline` - Scan & Analyze execution
- `/api/stemmap` - Generate/Save/Apply stemmap
- `/api/export` - Export & ZIP creation
- `/api/download` - ZIP file downloads
- `/api/audio` - Audio file streaming

### Database (MongoDB)
- uploads - Upload metadata
- analysis_results - Analysis JSON storage
- stemmaps - Stemmap YAML storage
- exports - Export history

## Prioritized Backlog

### P0 (Critical)
- All core features implemented ✅

### P1 (High Priority)
- [ ] Cloud storage integration (S3) for persistent file storage
- [ ] Real-time ffmpeg progress streaming via WebSocket
- [ ] Batch processing for multiple packs

### P2 (Medium Priority)
- [ ] User authentication for saved history
- [ ] Export templates/presets
- [ ] Audio preview in stemmap editor

## Next Tasks
1. Deploy to production
2. Test with real Suno stem files
3. Add cloud storage for file persistence
4. Implement real-time progress streaming

## Deployment Notes
- Uses MongoDB (not SQLite) for Kubernetes compatibility
- File uploads stored in temp directory
- Requires ffmpeg/ffprobe in PATH
- Port 3000 for Next.js
