import {
  GaugeIcon,
  AudioLinesIcon,
  PauseIcon,
  PlayIcon,
  SquareIcon,
  Volume1Icon,
  Volume2Icon,
  VolumeXIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

const audioFiles = import.meta.glob("/src/assets/**/*.mp3", {
  eager: true,
  query: "?url",
  import: "default",
});

interface TextToSpeechProps {
  contentSelector?: string;
  type: string;
  id: string;
  audioAvailable: boolean;
}

type SourceMode = "tts" | "audio";

function formatTime(seconds: number) {
  if (!seconds || Number.isNaN(seconds)) return "00:00";

  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);

  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function TextToSpeech({
  contentSelector = "#thesis",
  type,
  id,
  audioAvailable,
}: TextToSpeechProps) {
  const [isTtsSupported, setIsTtsSupported] = useState(false);
  const [mode, setMode] = useState<SourceMode>(
    audioAvailable ? "audio" : "tts",
  );
  const [ttsVoice, setTtsVoice] = useState<SpeechSynthesisVoice | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const textRef = useRef<string>("");
  const cursorPositionRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(
    function mount() {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        const loadVoices = () => {
          const voices = window.speechSynthesis.getVoices();
          const selected =
            voices.find(
              (v) => v.lang === "hu-HU" && v.name.includes("Google"),
            ) ||
            voices.find(
              (v) => v.lang === "hu-HU" && v.name.includes("Microsoft"),
            ) ||
            voices.find((v) => v.lang === "hu-HU") ||
            voices.find((v) => v.lang.startsWith("hu"));

          if (selected) {
            setTtsVoice(selected);
            setIsTtsSupported(true);
            if (!audioAvailable) setMode("tts");
          }
        };
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }

      const audio = new Audio();
      const assetPath = `/src/assets/${type}/${id}/audio.mp3`;
      const resolvedSrc = audioFiles[assetPath] as string;

      if (resolvedSrc && audioAvailable) {
        audio.src = resolvedSrc;
      } else if (audioAvailable) {
        console.warn(`TTS Component: Audio file not found at: ${assetPath}`);
      }

      audioRef.current = audio;
      audio.volume = volume;

      const onLoadedMetadata = () => {
        setDuration(audio.duration);
      };

      const onTimeUpdate = () => {
        if (audio.duration) {
          setProgress((audio.currentTime / audio.duration) * 100);
        }
      };

      const onEnded = () => {
        setIsPlaying(false);
        setIsPaused(false);
        setProgress(100);
      };

      const onPlay = () => {
        setIsPlaying(true);
        setIsPaused(false);
      };

      const onPause = () => {
        setIsPaused(true);
        setIsPlaying(false);
      };

      audio.addEventListener("loadedmetadata", onLoadedMetadata);
      audio.addEventListener("timeupdate", onTimeUpdate);
      audio.addEventListener("ended", onEnded);
      audio.addEventListener("play", onPlay);
      audio.addEventListener("pause", onPause);

      return function unmount() {
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
          window.speechSynthesis.onvoiceschanged = null;
        }

        audio.pause();

        audio.src = "";

        audio.removeEventListener("loadedmetadata", onLoadedMetadata);
        audio.removeEventListener("timeupdate", onTimeUpdate);
        audio.removeEventListener("ended", onEnded);
        audio.removeEventListener("play", onPlay);
        audio.removeEventListener("pause", onPause);
      };
    },
    [type, id, audioAvailable],
  );

  function handleModeChange(value: string) {
    handleStop();

    setMode(value as SourceMode);

    if (value === "tts") setDuration(0);

    if (value === "audio" && audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  }

  const speakTts = useCallback(
    function speak(startOffset = 0, rate = 1.0, vol = 1.0) {
      if (!ttsVoice || !textRef.current) return;

      window.speechSynthesis.cancel();

      const textToSpeak = textRef.current.substring(startOffset);
      if (!textToSpeak.trim()) {
        setIsPlaying(false);
        setProgress(100);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.voice = ttsVoice;
      utterance.lang = "hu-HU";
      utterance.rate = rate;
      utterance.volume = vol;

      utterance.onboundary = (event) => {
        if (event.name === "word" || event.name === "sentence") {
          const globalIndex = startOffset + event.charIndex;
          cursorPositionRef.current = globalIndex;
          const percent = (globalIndex / textRef.current.length) * 100;
          setProgress(percent);
        }
      };

      utterance.onstart = () => {
        setIsPlaying(true);
        setIsPaused(false);
      };

      utterance.onend = () => {
        setIsPlaying(false);
        setIsPaused(false);
        setProgress(100);
        cursorPositionRef.current = 0;
      };

      utterance.onerror = (e) => {
        if (e.error !== "interrupted") {
          console.error("TTS Error", e);
          setIsPlaying(false);
        }
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [ttsVoice],
  );

  function handlePlay() {
    if (mode === "audio") {
      if (audioRef.current?.src) {
        audioRef.current.playbackRate = playbackRate;
        audioRef.current.volume = volume;
        audioRef.current
          .play()
          .catch((e) => console.error("Audio play failed", e));
      }
    } else {
      const element = document.querySelector(contentSelector) as HTMLElement;

      if (!element) return;

      if (isPaused && !audioRef.current?.paused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
        setIsPlaying(true);
        return;
      }

      if (!textRef.current) textRef.current = element.innerText;
      if (progress >= 100) {
        cursorPositionRef.current = 0;
        setProgress(0);
      }

      speakTts(cursorPositionRef.current, playbackRate, volume);
    }
  }

  function handlePause() {
    if (mode === "audio") {
      audioRef.current?.pause();
    } else {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  }

  function handleStop() {
    if (mode === "audio") {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setProgress(0);
        setIsPlaying(false);
        setIsPaused(false);
      }
    } else {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
      setProgress(0);
      cursorPositionRef.current = 0;
    }
  }

  function handleSeek(value: number[]) {
    const newPercent = value[0];
    setProgress(newPercent);

    if (mode === "audio") {
      if (audioRef.current?.duration) {
        const newTime = (newPercent / 100) * audioRef.current.duration;
        audioRef.current.currentTime = newTime;
      }
    } else {
      if (!textRef.current) {
        const element = document.querySelector(contentSelector) as HTMLElement;
        if (element) textRef.current = element.innerText;
      }
      const newIndex = Math.floor((newPercent / 100) * textRef.current.length);
      cursorPositionRef.current = newIndex;

      if (isPlaying || isPaused) {
        speakTts(newIndex, playbackRate, volume);
      }
    }
  }

  function handleRateChange(value: string) {
    const newRate = Number.parseFloat(value);
    setPlaybackRate(newRate);

    if (mode === "audio") {
      if (audioRef.current) {
        audioRef.current.playbackRate = newRate;
      }
    } else {
      if (isPlaying) {
        speakTts(cursorPositionRef.current, newRate, volume);
      }
    }
  }

  function handleVolumeChange(value: number[]) {
    const newVol = value[0];
    setVolume(newVol);

    if (mode === "audio" && audioRef.current) {
      audioRef.current.volume = newVol;
    }

    // TTS volume changes typically require restarting the utterance
    // to take effect, so we don't force a restart here to avoid "stuttering".
    // It will apply on the next play/seek.
  }

  if (!isTtsSupported && !audioAvailable) return null;

  const getCurrentTimeLabel = () => {
    if (mode === "audio" && duration > 0) {
      return formatTime((progress / 100) * duration);
    }

    return progress > 0 ? `${Math.round(progress)}%` : "Start";
  };

  const getEndTimeLabel = () => {
    if (mode === "audio" && duration > 0) {
      return formatTime(duration);
    }
    return "Vége";
  };

  const VolumeIcon =
    volume === 0 ? VolumeXIcon : volume < 0.5 ? Volume1Icon : Volume2Icon;

  return (
    <Card className="w-full">
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {!isPlaying && !isPaused ? (
              <Button size="icon" onClick={handlePlay}>
                <PlayIcon />
                <span className="sr-only">Play</span>
              </Button>
            ) : isPaused ? (
              <Button size="icon" onClick={handlePlay}>
                <PlayIcon />
                <span className="sr-only">Resume</span>
              </Button>
            ) : (
              <Button size="icon" variant="secondary" onClick={handlePause}>
                <PauseIcon />
                <span className="sr-only">Pause</span>
              </Button>
            )}

            {(isPlaying || isPaused) && (
              <Button size="icon" variant="ghost" onClick={handleStop}>
                <SquareIcon />
                <span className="sr-only">Stop</span>
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {audioAvailable && (
              <Select value={mode} onValueChange={handleModeChange}>
                <SelectTrigger className="h-9">
                  <AudioLinesIcon />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="audio">Audio</SelectItem>
                  {isTtsSupported && (
                    <SelectItem value="tts">Text-to-Speech</SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
            <div className="flex items-center gap-2">
              <Select
                value={playbackRate.toString()}
                onValueChange={handleRateChange}
              >
                <SelectTrigger>
                  <GaugeIcon />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <SelectItem key={rate} value={rate.toString()}>
                      {rate}x
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <HoverCard>
              <HoverCardTrigger asChild>
                <Button variant="outline" size="icon">
                  <VolumeIcon className="h-4 w-4" />
                  <span className="sr-only">Volume</span>
                </Button>
              </HoverCardTrigger>
              <HoverCardContent side="top" className="w-32 p-4">
                <Slider
                  value={[volume]}
                  max={1}
                  step={0.1}
                  onValueChange={handleVolumeChange}
                  aria-label="Volume"
                />
              </HoverCardContent>
            </HoverCard>
          </div>
        </div>
        <div className="space-y-2">
          <Slider
            value={[progress]}
            max={100}
            step={1}
            onValueChange={handleSeek}
            className="cursor-pointer"
            aria-label="Reading position"
          />
          <div className="flex justify-between font-medium text-[10px] text-muted-foreground uppercase tabular-nums">
            <span>{getCurrentTimeLabel()}</span>
            <span>{getEndTimeLabel()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
