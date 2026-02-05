import {
  HttpClient,
  HttpRequest,
  HttpResponse,
  createHttpNetworkError,
  createHttpTimeoutError
} from "./http";

export const createFetchHttpClient = (): HttpClient => {
  const request = async (input: HttpRequest): Promise<HttpResponse> => {
    const controller = input.timeoutMs ? new AbortController() : undefined;
    const timeout = input.timeoutMs ? setTimeout(() => controller?.abort(), input.timeoutMs) : undefined;

    try {
      const response = await fetch(input.url, {
        method: input.method,
        headers: input.headers,
        body: input.body,
        signal: controller?.signal
      });

      const body = await response.text();
      return {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body
      };
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        throw createHttpTimeoutError("Request timed out");
      }
      throw createHttpNetworkError("Network request failed");
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  };

  return { request };
};
