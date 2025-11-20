import {
  GaugeIcon,
  PauseIcon,
  PlayIcon,
  SquareIcon,
  Volume1Icon,
  Volume2Icon,
  VolumeXIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

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

import { cn } from "@/lib/utils";

const audioFiles = import.meta.glob("/src/assets/**/narration/audio.mp3", {
  eager: true,
  query: "?url",
  import: "default",
});

const narrationFiles = import.meta.glob("/src/assets/**/narration/source.txt", {
  eager: true,
  query: "?raw",
  import: "default",
});

const subtitleFiles = import.meta.glob(
  "/src/assets/**/narration/subtitles.srt",
  {
    eager: true,
    query: "?raw",
    import: "default",
  },
);

interface AudioPlayerProps {
  type: string;
  id: string;
}

function formatTime(seconds: number) {
  if (!seconds || Number.isNaN(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function parseSrtTime(timeString: string) {
  const [h, m, s] = timeString.split(":");
  const [seconds, ms] = s.split(",");
  return (
    Number(h) * 3600 + Number(m) * 60 + Number(seconds) + Number(ms) / 1000
  );
}

interface SrtSegment {
  start: number;
  end: number;
  text: string;
}

function parseSrt(srtContent: string): SrtSegment[] {
  const segments: SrtSegment[] = [];
  const regex =
    /(\d+)\s+(\d{2}:\d{2}:\d{2},\d{3})\s-->\s(\d{2}:\d{2}:\d{2},\d{3})\s+([\s\S]*?)(?=\n\s*\d+\s+|$)/g;

  let match: RegExpExecArray | null;
  while (true) {
    match = regex.exec(srtContent);
    if (!match) {
      break;
    }
    segments.push({
      start: parseSrtTime(match[2]),
      end: parseSrtTime(match[3]),
      text: match[4].replace(/\n/g, " ").trim(),
    });
  }
  return segments;
}

interface AlignedSegment {
  text: string;
  start: number;
  end: number;
  isActive: boolean;
}

function alignTextToSrt(
  sourceText: string,
  srtSegments: SrtSegment[],
): AlignedSegment[] {
  if (!sourceText || srtSegments.length === 0) return [];

  const sourceWords: { text: string; start: number; end: number }[] = [];
  const wordRegex = /\S+/g;
  let match: RegExpExecArray | null;

  while (true) {
    match = wordRegex.exec(sourceText);
    if (!match) {
      break;
    }
    sourceWords.push({
      text: match[0],
      start: match.index,
      end: wordRegex.lastIndex,
    });
  }

  const alignedResults: AlignedSegment[] = [];
  let currentSourceWordIndex = 0;
  let lastCharIndex = 0;

  const clean = (str: string) =>
    str.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

  srtSegments.forEach((segment, i) => {
    const srtWords = segment.text.split(/\s+/);
    let searchIndex = currentSourceWordIndex;
    let matchesFound = 0;

    for (const sWord of srtWords) {
      const cleanSrtWord = clean(sWord);
      if (!cleanSrtWord) continue;

      for (let lookAhead = 0; lookAhead < 5; lookAhead++) {
        const sourceWordObj = sourceWords[searchIndex + lookAhead];
        if (!sourceWordObj) break;

        if (clean(sourceWordObj.text) === cleanSrtWord) {
          searchIndex = searchIndex + lookAhead + 1;
          matchesFound++;
          break;
        }
      }
    }

    let endCharIndex: number;

    if (i === srtSegments.length - 1) {
      endCharIndex = sourceText.length;
    } else if (matchesFound > 0 && searchIndex > currentSourceWordIndex) {
      endCharIndex = sourceWords[searchIndex - 1].end;
      currentSourceWordIndex = searchIndex;
    } else {
      endCharIndex = lastCharIndex;
    }

    const textSlice = sourceText.slice(lastCharIndex, endCharIndex);

    alignedResults.push({
      text: textSlice,
      start: segment.start,
      end: segment.end,
      isActive: false,
    });

    lastCharIndex = endCharIndex;
  });

  if (lastCharIndex < sourceText.length) {
    const trailing = sourceText.slice(lastCharIndex);
    if (alignedResults.length > 0) {
      alignedResults[alignedResults.length - 1].text += trailing;
    } else {
      alignedResults.push({
        text: trailing,
        start: 0,
        end: 0,
        isActive: false,
      });
    }
  }

  return alignedResults;
}

export function TextToSpeech({ type, id }: AudioPlayerProps) {
  const assetPath = `/src/assets/${type}/${id}/narration/audio.mp3`;
  const resolvedAudioSrc = audioFiles[assetPath] as string | undefined;

  const textPath = `/src/assets/${type}/${id}/narration/source.txt`;
  const resolvedNarration = narrationFiles[textPath] as string | undefined;

  const srtPath = `/src/assets/${type}/${id}/narration/subtitles.srt`;
  const resolvedSrt = subtitleFiles[srtPath] as string | undefined;

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const alignedSegments = useMemo(() => {
    if (!resolvedNarration || !resolvedSrt) return null;
    const parsedSrt = parseSrt(resolvedSrt);
    return alignTextToSrt(resolvedNarration, parsedSrt);
  }, [resolvedNarration, resolvedSrt]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const audio = audioRef.current;

      if (!audio) return;

      switch (event.code) {
        case "Space": {
          event.preventDefault();

          if (audio.paused) {
            audio.play().catch(console.error);
          } else {
            audio.pause();
          }

          break;
        }
        case "ArrowLeft": {
          event.preventDefault();

          const prevTime = Math.max(0, audio.currentTime - 5);
          audio.currentTime = prevTime;

          setCurrentTime(prevTime);

          if (audio.duration) setProgress((prevTime / audio.duration) * 100);

          break;
        }
        case "ArrowRight": {
          event.preventDefault();
          const nextTime = Math.min(audio.duration, audio.currentTime + 5);
          audio.currentTime = nextTime;

          setCurrentTime(nextTime);

          if (audio.duration) setProgress((nextTime / audio.duration) * 100);

          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!resolvedAudioSrc) return;

    const audio = new Audio(resolvedAudioSrc);
    audio.volume = volume;
    audioRef.current = audio;

    const onLoadedMetadata = () => setDuration(audio.duration);

    const onTimeUpdate = () => {
      if (audio.duration) {
        const curr = audio.currentTime;
        setCurrentTime(curr);
        setProgress((curr / audio.duration) * 100);
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

    return () => {
      audio.pause();
      audio.src = "";
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [resolvedAudioSrc]);

  function handlePlay() {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.volume = volume;
      audioRef.current
        .play()
        .catch((e) => console.error("Audio play failed", e));
    }
  }

  function handlePause() {
    audioRef.current?.pause();
  }

  function handleStop() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setProgress(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setIsPaused(false);
  }

  function handleSeek(value: number[]) {
    const newPercent = value[0];
    setProgress(newPercent);
    if (audioRef.current?.duration) {
      const newTime = (newPercent / 100) * audioRef.current.duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }

  function handleRateChange(value: string) {
    const newRate = Number.parseFloat(value);
    setPlaybackRate(newRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
  }

  function handleVolumeChange(value: number[]) {
    const newVol = value[0];
    setVolume(newVol);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
    }
  }

  function handleSegmentClick(startTime: number) {
    if (audioRef.current) {
      // const seekTime = Math.max(0, startTime - 1);
      const seekTime = startTime;

      audioRef.current.currentTime = seekTime;

      setCurrentTime(seekTime);

      if (audioRef.current.paused) {
        audioRef.current.play().catch(console.error);
        setIsPlaying(true);
        setIsPaused(false);
      }
    }
  }

  if (!resolvedAudioSrc) {
    return (
      <div className="text-muted-foreground text-sm">
        Nincs narrációja ennek a tételnek.
      </div>
    );
  }

  const VolumeIcon =
    volume === 0 ? VolumeXIcon : volume < 0.5 ? Volume1Icon : Volume2Icon;

  return (
    <>
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
              <div className="flex items-center gap-2">
                <Select
                  value={playbackRate.toString()}
                  onValueChange={handleRateChange}
                >
                  <SelectTrigger className="h-9 w-fit min-w-[90px]">
                    <GaugeIcon className="mr-2 h-4 w-4" />
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
                  <Button variant="outline" size="icon" className="h-9 w-9">
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
              step={0.1}
              onValueChange={handleSeek}
              className="cursor-pointer"
              aria-label="Audio position"
            />
            <div className="flex justify-between font-medium text-[10px] text-muted-foreground uppercase tabular-nums tracking-wider">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      {alignedSegments ? (
        <div className="mt-6 whitespace-pre-line text-foreground/80 leading-relaxed">
          {alignedSegments.map((segment, index) => {
            const isActive =
              currentTime >= segment.start && currentTime < segment.end;

            return (
              <span
                className={cn(
                  "rounded px-0.5 py-0.5 transition-colors duration-300",
                  "cursor-pointer hover:bg-primary/10",
                  isActive && "bg-primary/20 text-foreground",
                )}
                key={`${index}-${segment.start}`}
                onClick={() => handleSegmentClick(segment.start)}
              >
                {segment.text}
              </span>
            );
          })}
        </div>
      ) : (
        resolvedNarration && (
          <p className="mt-6 whitespace-pre-line text-foreground/80 leading-relaxed">
            {resolvedNarration}
          </p>
        )
      )}
    </>
  );
}
