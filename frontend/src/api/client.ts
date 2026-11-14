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

function request(method: string, path: string, body?: unknown) {
  const token = tokenStore.get();
  return fetch(`/api${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function api<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await request(method, path, body);
  const json = (await res.json().catch(() => ({}))) as {
    data?: T;
    error?: { code: string; message: string };
  };
  if (res.ok) return json.data as T;
  throw toError(res.status, json.error);
}

// 파일 응답(신청서 PDF). 토큰을 헤더로 보내야 해서 <a href> 대신 받아서 저장시킨다
export async function download(path: string, fileName: string) {
  const res = await request('GET', path);
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as {
      error?: { code: string; message: string };
    };
    throw toError(res.status, json.error);
  }
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement('a'), {
    href: url,
    download: fileName,
  });
  // 문서에 붙여야 Firefox도 받고, 해제는 다운로드가 시작된 뒤에
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function toError(
  status: number,
  body: { code: string; message: string } | undefined,
) {
  const error = new ApiError(
    body?.code ?? 'NETWORK_ERROR',
    body?.message ?? '서버에 연결할 수 없습니다',
    status,
  );
  if (error.code === 'UNAUTHORIZED') onUnauthorized();
  if (error.code === 'IP_NOT_ALLOWED') onIpBlocked(error.message);
  return error;
}
