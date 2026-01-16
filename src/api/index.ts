import store from "../store/store";

// 封装原生fetch
const request = async (url: string, options: RequestInit = {}) => {
  const baseUrl = store.getState().settings.backend_url;
  const controller = new AbortController();
  const config = {
    ...options,
    signal: controller.signal,
    headers: { ...options.headers },
  };

  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(baseUrl + url, config);
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
