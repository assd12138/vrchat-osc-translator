import fetch from '../cross-platform/fetch'

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

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    if (!(error instanceof Error)) return;
    if (error.name === "AbortError") console.error("Request timed out");
    throw error;
  }
};

export { request };
