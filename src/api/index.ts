import fetch from "../cross-platform/fetch";

// 封装原生fetch
const request = async (url: string, options: RequestInit = {}) => {
  const applyOptions = { ...options };
  const controller = new AbortController();
  const config = {
    ...applyOptions,
    signal: controller.signal,
    headers: { ...applyOptions.headers },
  };

  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(url, config);
    clearTimeout(timeoutId);

    if (!response.ok) {
      // 尝试解析错误信息（支持 JSON 或文本）
      const errorData = await response.text(); // 或 response.json()
      throw new Error(`HTTP ${response.status}: ${errorData}`);
    }
    return await response.json();
  } catch (error) {
    if (!(error instanceof Error)) return;
    if (error.name === "AbortError") console.error("Request timed out");
    throw error;
  }
};

export { request };
