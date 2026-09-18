/** 已确认的模型行为预设，用于按模型 ID 应用差异化请求格式。 */
export enum BEHAVIOR {
  /** chat-completion 音频输入需携带 data URI 前缀（data:audio/wav;base64,）。 */
  BASE64_WITH_AUDIO_TYPE_CHAT_COMPLETION_OMNI = "BASE64_WITH_AUDIO_TYPE_CHAT_COMPLETION_OMNI",
  /** 通过reasoning_effort:'none'关闭思考的模型 */
  REASONING_EFFORT_NONE_TURN_OFF_THINKING = "REASONING_EFFORT_NONE_TURN_OFF_THINKING",
}

/** 每个行为对应的模型 ID 匹配正则列表；匹配时不区分大小写。 */
const behaviorDatabase: Record<BEHAVIOR, RegExp[]> = {
  [BEHAVIOR.BASE64_WITH_AUDIO_TYPE_CHAT_COMPLETION_OMNI]: [/qwen/i],
  [BEHAVIOR.REASONING_EFFORT_NONE_TURN_OFF_THINKING]: [/qwen3\.8/i],
};

/**
 * 判断给定模型 ID 是否命中指定行为的匹配规则。
 * 使用 String.prototype.match 而非共享正则的 test，
 * 以避免带 /g 标志的全局正则在多次调用间残留 lastIndex 状态。
 */
export const isBehaviorActive = (modelId: string, target: BEHAVIOR): boolean =>
  (behaviorDatabase[target] ?? []).some((pattern) => modelId.match(pattern));
