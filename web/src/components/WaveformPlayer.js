'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { motion } from 'framer-motion';

export default function WaveformPlayer({ audioUrl, filename }) {
  const containerRef = useRef(null);
  const wavesurferRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    let wavesurfer = null;

    const initWavesurfer = async () => {
      if (!containerRef.current || !audioUrl) return;

      const WaveSurfer = (await import('wavesurfer.js')).default;

      wavesurfer = WaveSurfer.create({
        container: containerRef.current,
        waveColor: '#00F0FF',
        progressColor: '#BC13FE',
        cursorColor: '#FFFFFF',
        barWidth: 2,
        barGap: 1,
        barRadius: 0,
        height: 80,
        responsive: true,
        normalize: true,
        backend: 'WebAudio',
      });

      wavesurfer.on('ready', () => {
        setIsReady(true);
        setDuration(wavesurfer.getDuration());
        wavesurfer.setVolume(volume);
      });

      wavesurfer.on('audioprocess', () => {
        setCurrentTime(wavesurfer.getCurrentTime());
      });

      wavesurfer.on('play', () => setIsPlaying(true));
      wavesurfer.on('pause', () => setIsPlaying(false));
      wavesurfer.on('finish', () => setIsPlaying(false));

      wavesurfer.load(audioUrl);
      wavesurferRef.current = wavesurfer;
    };

    initWavesurfer();

    return () => {
      if (wavesurfer) {
        wavesurfer.destroy();
      }
    };
  }, [audioUrl]);

  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setVolume(isMuted ? 0 : volume);
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="cyber-card p-4" data-testid="waveform-player">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-mono text-sm text-primary truncate max-w-[200px]">
          {filename || 'Audio Preview'}
        </h4>
        <span className="font-mono text-xs text-gray-500">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* Waveform container */}
      <div className="waveform-container mb-4">
        <div ref={containerRef} className="w-full" />
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full"
            />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          disabled={!isReady}
          data-testid="waveform-play-btn"
          className={`
            p-3 transition-all duration-200
            ${isReady 
              ? 'bg-primary/20 hover:bg-primary/30 text-primary hover:shadow-glow-primary' 
              : 'bg-white/5 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5" />
          )}
        </button>

        {/* Volume control */}
        <div className="flex items-center gap-2 flex-1">
          <button
            onClick={toggleMute}
            data-testid="waveform-mute-btn"
            className="p-2 text-gray-400 hover:text-primary transition-colors"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            data-testid="waveform-volume-slider"
            className="w-24 accent-primary cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
