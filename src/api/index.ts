// 封装渲染进程的原生 fetch
const request = async (url: string, options: RequestInit = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);
  const externalSignal = options.signal;
  const handleAbort = () => controller.abort();
  if (externalSignal?.aborted) controller.abort();
  else externalSignal?.addEventListener("abort", handleAbort, { once: true });

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { ...options.headers },
    });
    // Preserve the existing deadline: wait for headers, not the response body.
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorData}`);
    }
    return await response.json();
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError" &&
      !externalSignal?.aborted
    ) {
      console.error("Request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", handleAbort);
  }
};

export { request };
