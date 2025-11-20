import type { ThesisType } from "@/lib/types";

import { TextToSpeech } from "../tts";

export function ThesisNarration({
  data,
}: {
  data: { id: string; type: ThesisType };
}) {
  return <TextToSpeech {...data} />;
}
