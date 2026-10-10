import type { SubtitleResult } from "@/electron/ipc";
import { calculateAsrSimilarity } from "./asr-similarity";

interface SubtitleTextState {
  confirmOriginText: string;
  confirmTranslationText: string;
  current: SubtitleResult | null;
}

export const initialSubtitleTextState: SubtitleTextState = {
  confirmOriginText: "",
  confirmTranslationText: "",
  current: null,
};

function appendConfirmedText(confirmed: string, text: string): string {
  const history = confirmed.length > 10000 ? confirmed.slice(3000) : confirmed;
  return `${history}\n${text}`;
}

/** 三个字段一起更新，确保原文和译文始终来自同一条消息。 */
export function receiveSubtitleResult(
  state: SubtitleTextState,
  result: SubtitleResult,
): SubtitleTextState {
  const { current } = state;
  if (
    !current ||
    calculateAsrSimilarity(current.origin, result.origin) > 0.6
  ) {
    return { ...state, current: result };
  }

  return {
    confirmOriginText: appendConfirmedText(state.confirmOriginText, current.origin),
    confirmTranslationText: appendConfirmedText(
      state.confirmTranslationText,
      current.translation,
    ),
    current: result,
  };
}
