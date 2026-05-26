'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { resolveBrowserApiBaseUrl } from '../browser-api-base-url.js';

interface AuthUser {
  id: string;
  name: string;
}

interface AccountClientProps {
  apiBaseUrl: string;
}

interface UserMemorySummary {
  threadCount: number;
  messageCount: number;
  preferenceKeys: string[];
  interactionCount: number;
  latestUpdatedAt?: string;
}

export function AccountClient({ apiBaseUrl }: AccountClientProps) {
  const resolvedApiBaseUrl = resolveBrowserApiBaseUrl(apiBaseUrl);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authName, setAuthName] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authUser, setAuthUser] = useState<AuthUser | undefined>();
  const [statusText, setStatusText] = useState('Đăng nhập hoặc tạo tài khoản để dùng giỏ hàng theo tài khoản.');
  const [memorySummary, setMemorySummary] = useState<UserMemorySummary | undefined>();
  const [isBusy, setIsBusy] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;
    getJson<{ user: AuthUser }>(`${resolvedApiBaseUrl}/api/v1/auth/me`)
      .then(async (response) => {
        if (!isMounted) return;
        setAuthUser(response.user);
        setStatusText(`Đang đăng nhập: ${response.user.name}`);
        try {
          const memory = await getJson<UserMemorySummary>(`${resolvedApiBaseUrl}/api/v1/account/memory`);
          if (isMounted) setMemorySummary(memory);
        } catch {
          if (isMounted) setMemorySummary(undefined);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setAuthUser(undefined);
        setMemorySummary(undefined);
        setStatusText('Đăng nhập hoặc tạo tài khoản để dùng giỏ hàng theo tài khoản.');
      })
      .finally(() => {
        if (isMounted) setIsChecking(false);
      });
    return () => {
      isMounted = false;
    };
  }, [resolvedApiBaseUrl]);

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isBusy) return;
    const normalizedName = authName.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,32}$/.test(normalizedName)) {
      setStatusText('Tên đăng nhập cần 3-32 ký tự, chỉ dùng chữ thường, số hoặc dấu gạch dưới.');
      return;
    }
    if (authPassword.length < 8 || authPassword.length > 128) {
      setStatusText('Mật khẩu cần từ 8 đến 128 ký tự.');
      return;
    }
    setIsBusy(true);
    setStatusText(authMode === 'login' ? 'Đang đăng nhập...' : 'Đang tạo tài khoản...');
    try {
      await postJson<{ user: AuthUser }>(`${resolvedApiBaseUrl}/api/v1/auth/${authMode}`, { name: normalizedName, password: authPassword });
      const verifiedSession = await getJson<{ user: AuthUser }>(`${resolvedApiBaseUrl}/api/v1/auth/me`);
      setAuthUser(verifiedSession.user);
      setAuthPassword('');
      try {
        setMemorySummary(await getJson<UserMemorySummary>(`${resolvedApiBaseUrl}/api/v1/account/memory`));
      } catch {
        setMemorySummary(undefined);
      }
      setStatusText(`Đã đăng nhập: ${verifiedSession.user.name}. Giỏ hàng sẽ đi theo tài khoản này.`);
      window.dispatchEvent(new CustomEvent('retail-auth-changed'));
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : 'Xác thực thất bại');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleLogout() {
    if (isBusy) return;
    setIsBusy(true);
    try {
      await postJson(`${resolvedApiBaseUrl}/api/v1/auth/logout`, {});
      setAuthUser(undefined);
      setMemorySummary(undefined);
      setStatusText('Đã đăng xuất. Đăng nhập lại để dùng giỏ hàng theo tài khoản.');
      window.dispatchEvent(new CustomEvent('retail-auth-changed'));
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : 'Đăng xuất thất bại');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDeleteMemory() {
    if (isBusy) return;
    const confirmed = window.confirm('Xoá toàn bộ lịch sử chat và hành vi mua sắm đã thu thập? Việc này sẽ làm mất các đề xuất tối ưu theo thói quen của bạn.');
    if (!confirmed) return;
    setIsBusy(true);
    setStatusText('Đang xoá lịch sử và dữ liệu cá nhân hoá...');
    try {
      const nextSummary = await deleteJson<UserMemorySummary>(`${resolvedApiBaseUrl}/api/v1/account/memory`);
      setMemorySummary(nextSummary);
      setStatusText('Đã xoá lịch sử chat, thói quen và dữ liệu đề xuất cá nhân hoá.');
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : 'Không xoá được lịch sử');
    } finally {
      setIsBusy(false);
    }
  }

  const normalizedAuthName = authName.trim().toLowerCase();
  const isAuthNameValid = /^[a-z0-9_]{3,32}$/.test(normalizedAuthName);
  const isAuthPasswordValid = authPassword.length >= 8 && authPassword.length <= 128;
  const canSubmitAuth = isAuthNameValid && isAuthPasswordValid && !isBusy;

  if (isChecking) {
    return <section className="account-auth-page"><div className="surface-card"><p>Đang kiểm tra phiên đăng nhập...</p></div></section>;
  }

  return (
    <section className="account-auth-page" aria-label="Đăng nhập đăng ký">
      <div className="account-auth-copy">
        <p className="eyebrow">Tài khoản</p>
        <h1>{authUser ? `Xin chào ${authUser.name}` : 'Đăng nhập để mua sắm'}</h1>
        <p>Đăng nhập hoặc tạo tài khoản để lưu giỏ hàng, đồng bộ lịch sử tư vấn và nhận gợi ý đúng nhu cầu nhà bạn.</p>
        <div className="account-benefits" aria-label="Tính năng tài khoản">
          <span>Giỏ hàng lưu theo tài khoản</span>
          <span>Chat AI nhớ nhu cầu mua sắm</span>
          <span>Phiên đăng nhập dùng cookie HttpOnly</span>
        </div>
      </div>

      <div className="account-auth-card">
        {authUser ? (
          <div className="account-dashboard-card">
            <p className="eyebrow">Tài khoản đang hoạt động</p>
            <h2>{authUser.name}</h2>
            <p className="status-text">{statusText}</p>
            <div className="account-memory-card">
              <strong>Lịch sử & cá nhân hoá</strong>
              <div className="memory-metrics">
                <span>{memorySummary?.threadCount ?? 0} hội thoại</span>
                <span>{memorySummary?.messageCount ?? 0} tin nhắn</span>
                <span>{memorySummary?.preferenceKeys.length ?? 0} sở thích</span>
                <span>{memorySummary?.interactionCount ?? 0} hành vi</span>
              </div>
              {memorySummary?.preferenceKeys.length ? <small>Keys: {memorySummary.preferenceKeys.join(', ')}</small> : <small>Chưa có dữ liệu cá nhân hoá.</small>}
              <button type="button" className="danger-button" onClick={() => void handleDeleteMemory()} disabled={isBusy}>Xoá lịch sử và dữ liệu cá nhân hoá</button>
            </div>
            <div className="account-auth-links">
              <a href="/cart">Vào giỏ hàng</a>
              <a href="/products">Tiếp tục mua sắm</a>
            </div>
            <button type="button" className="button-secondary" onClick={() => void handleLogout()} disabled={isBusy}>Đăng xuất</button>
          </div>
        ) : (
          <form className="auth-form account-auth-form" onSubmit={handleAuthSubmit}>
            <div className="auth-form-heading">
              <h2>{authMode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</h2>
              <p>{authMode === 'login' ? 'Dùng tài khoản đã tạo để mở lại giỏ hàng.' : 'Tên tài khoản chỉ dùng chữ thường, số hoặc dấu gạch dưới.'}</p>
            </div>
            <div className="auth-tabs" role="group" aria-label="Chọn chế độ tài khoản">
              <button type="button" className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>Đăng nhập</button>
              <button type="button" className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>Đăng ký</button>
            </div>
            <label>
              Tên đăng nhập
              <input aria-label="Tên đăng nhập" autoComplete="username" inputMode="text" pattern="[a-z0-9_]{3,32}" placeholder="VD: linh_home" value={authName} onChange={(event) => setAuthName(event.target.value.toLowerCase())} />
              <small>3-32 ký tự: a-z, 0-9 hoặc _</small>
            </label>
            <label>
              Mật khẩu
              <input aria-label="Mật khẩu" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} minLength={8} maxLength={128} placeholder="Tối thiểu 8 ký tự" type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} />
              <small>Tối thiểu 8 ký tự.</small>
            </label>
            <button type="submit" disabled={!canSubmitAuth}>{authMode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</button>
            <p className="status-text">{statusText}</p>
          </form>
        )}
      </div>
    </section>
  );
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: 'include' });
  const text = await response.text();
  if (!response.ok) throw new Error(readErrorMessage(text, `Yêu cầu thất bại ${response.status}`));
  return JSON.parse(text) as T;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(readErrorMessage(text, `Yêu cầu thất bại ${response.status}`));
  return (text ? JSON.parse(text) : {}) as T;
}

async function deleteJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { method: 'DELETE', credentials: 'include' });
  const text = await response.text();
  if (!response.ok) throw new Error(readErrorMessage(text, `Yêu cầu thất bại ${response.status}`));
  return (text ? JSON.parse(text) : {}) as T;
}

function readErrorMessage(text: string, fallback: string) {
  if (!text) return fallback;
  try {
    const payload = JSON.parse(text) as { message?: string | string[] };
    const message = Array.isArray(payload.message) ? payload.message.join(', ') : payload.message;
    return translateAuthError(message ?? fallback);
  } catch {
    return translateAuthError(text);
  }
}

function translateAuthError(message: string) {
  const knownMessages: Record<string, string> = {
    'invalid credentials': 'Tên đăng nhập hoặc mật khẩu không đúng.',
    'not authenticated': 'Đăng nhập chưa được trình duyệt lưu phiên. Hãy mở web và API cùng hostname, ví dụ cùng dùng localhost hoặc cùng dùng 127.0.0.1.',
    'name is already registered': 'Tên đăng nhập này đã được đăng ký.',
    'name must be 3-32 characters and contain only lowercase letters, numbers, or underscore': 'Tên đăng nhập cần 3-32 ký tự, chỉ dùng chữ thường, số hoặc dấu gạch dưới.',
    'password must be 8-128 characters': 'Mật khẩu cần từ 8 đến 128 ký tự.',
  };
  return knownMessages[message] ?? message;
}
