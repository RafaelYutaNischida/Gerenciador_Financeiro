export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

async function responseError(response: Response): Promise<ApiClientError> {
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null && "error" in body) {
      const error = body.error;
      if (typeof error === "object" && error !== null && "message" in error) {
        const message =
          typeof error.message === "string" ? error.message : "A solicitação falhou.";
        const details =
          "details" in error &&
          typeof error.details === "object" &&
          error.details !== null
            ? (error.details as Record<string, string>)
            : undefined;
        return new ApiClientError(message, response.status, details);
      }
    }
  } catch {
    return new ApiClientError("Não foi possível interpretar a resposta do servidor.", response.status);
  }

  return new ApiClientError("A solicitação falhou.", response.status);
}

async function sendRequest(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: "same-origin",
  });
}

export async function apiRequest<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const response = await sendRequest(input, init);
  if (!response.ok) {
    throw await responseError(response);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiClientError("Não foi possível interpretar a resposta do servidor.", response.status);
  }
}

export async function apiRequestNoContent(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<void> {
  const response = await sendRequest(input, init);
  if (!response.ok) {
    throw await responseError(response);
  }
}
