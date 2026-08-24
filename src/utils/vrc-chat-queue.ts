import invoke, { NATIVE_COMMAND } from "@/electron/ipc";

/**
 * VRChat 发送队列
 *
 * 出于 VRChat 聊天框的速率限制，直接连续调用 send_to_vrc_chat 会被丢弃。
 * 这里将发送任务先压入队列，再按"距上次发送 >= INTERVAL_MS 才能再发"
 * 的规则取出并真正调用 invoke，避免消息丢失。
 *
 * 通过记录最后一次发送的时间戳：
 *   - 入队后若距上次发送已满 INTERVAL_MS，立即发出（首条消息因
 *     lastSendTime 初值为 0 而必定立即发出）；
 *   - 否则按"还需等待多久"调度一个 setTimeout，到点后再尝试出队。
 */

// 发送间隔：两条消息之间至少间隔 1 秒
const INTERVAL_MS = 1000;

// 发送任务队列，先进先出
const queue: string[] = [];

// 等待中的定时器句柄；无等待任务时为 null
let timerId: ReturnType<typeof setTimeout> | null = null;

// 最后一次真正发出 invoke 的时间戳；0 表示从未发送过
let lastSendTime = 0;

/**
 * 实际执行一条发送，并更新时间戳。
 */
const dispatch = (text: string) => {
  lastSendTime = Date.now();
  invoke(NATIVE_COMMAND.SEND_TO_VRC_CHAT, { text }).catch((err) => {
    console.error("[vrc-chat-queue] 发送到 VRChat 失败:", err);
  });
};

/**
 * 尝试清空队列。
 *
 * 只要距上次发送已满 INTERVAL_MS 就立即出队发送；发不动的剩余任务
 * 按还需等待的时间调度一个 setTimeout，到点后再次调用本函数。
 */
const drain = () => {
  // 把当前速率允许发掉的任务全部发出
  while (queue.length > 0 && Date.now() - lastSendTime >= INTERVAL_MS) {
    dispatch(queue.shift() as string);
  }

  if (queue.length > 0) {
    // 仍有任务等待：计算到下一条可发还需等待多久，精确调度一次
    const wait = INTERVAL_MS - (Date.now() - lastSendTime);
    timerId = setTimeout(drain, Math.max(0, wait));
  } else {
    // 队列已空，停止调度，等待下一次入队
    timerId = null;
  }
};

/**
 * 将一条文本压入发送队列。
 *
 *   - 若距上次发送已满 INTERVAL_MS（或从未发送过），本条立即发出；
 *   - 否则进入队列，按顺序在速率允许时发出。
 *
 * @param text 要发送到 VRChat 聊天框的文本
 */
export const sendToVrcChat = (text: string) => {
  queue.push(text);
  // 仅在没有挂起定时器时尝试立即清空；有挂起定时器时，到点会自动处理本条
  if (timerId === null) {
    drain();
  }
};
