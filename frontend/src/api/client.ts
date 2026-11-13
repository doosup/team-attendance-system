// 백엔드 호출. 성공은 { data }, 실패는 { error: { code, message } } (design.md 공통 규칙)
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const TOKEN_KEY = 'accessToken';
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// 401·IP 차단은 화면 전체가 반응해야 해서 라우터가 등록한다 (router/index.ts)
let onUnauthorized: () => void = () => {};
let onIpBlocked: (message: string) => void = () => {};
export function setApiHandlers(h: {
  unauthorized: () => void;
  ipBlocked: (message: string) => void;
}) {
  onUnauthorized = h.unauthorized;
  onIpBlocked = h.ipBlocked;
}

export async function api<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as {
    data?: T;
    error?: { code: string; message: string };
  };
  if (res.ok) return json.data as T;

  const error = new ApiError(
    json.error?.code ?? 'NETWORK_ERROR',
    json.error?.message ?? '서버에 연결할 수 없습니다',
    res.status,
  );
  if (error.code === 'UNAUTHORIZED') onUnauthorized();
  if (error.code === 'IP_NOT_ALLOWED') onIpBlocked(error.message);
  throw error;
}
