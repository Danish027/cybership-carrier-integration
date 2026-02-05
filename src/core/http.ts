export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface HttpRequest {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export interface HttpClient {
  request(request: HttpRequest): Promise<HttpResponse>;
}

export type HttpTimeoutError = Error & { kind: "HTTP_TIMEOUT" };
export type HttpNetworkError = Error & { kind: "HTTP_NETWORK" };

export const createHttpTimeoutError = (message: string): HttpTimeoutError => {
  const error = new Error(message) as HttpTimeoutError;
  error.name = "HttpTimeoutError";
  error.kind = "HTTP_TIMEOUT";
  return error;
};

export const createHttpNetworkError = (message: string): HttpNetworkError => {
  const error = new Error(message) as HttpNetworkError;
  error.name = "HttpNetworkError";
  error.kind = "HTTP_NETWORK";
  return error;
};

export const isHttpTimeoutError = (error: unknown): error is HttpTimeoutError => {
  return typeof error === "object" && error !== null && "kind" in error && (error as { kind: string }).kind === "HTTP_TIMEOUT";
};

export const isHttpNetworkError = (error: unknown): error is HttpNetworkError => {
  return typeof error === "object" && error !== null && "kind" in error && (error as { kind: string }).kind === "HTTP_NETWORK";
};
