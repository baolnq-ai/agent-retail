'use client';

import { useEffect, useState, type FormEvent } from 'react';

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
    getJson<{ user: AuthUser }>(`${apiBaseUrl}/api/v1/auth/me`)
      .then(async (response) => {
        if (!isMounted) return;
        setAuthUser(response.user);
        setStatusText(`Đang đăng nhập: ${response.user.name}`);
        const memory = await getJson<UserMemorySummary>(`${apiBaseUrl}/api/v1/account/memory`);
        if (isMounted) setMemorySummary(memory);
      })
      .catch(() => {
        if (!isMounted) return;
        setAuthUser(undefined);
        setMemorySummary(undefined);
      })
      .finally(() => {
        if (isMounted) setIsChecking(false);
      });
    return () => {
      isMounted = false;
    };
  }, [apiBaseUrl]);

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isBusy) return;
    setIsBusy(true);
    setStatusText(authMode === 'login' ? 'Đang đăng nhập...' : 'Đang tạo tài khoản...');
    try {
      const response = await postJson<{ user: AuthUser }>(`${apiBaseUrl}/api/v1/auth/${authMode}`, { name: authName, password: authPassword });
      setAuthUser(response.user);
      setAuthPassword('');
      setMemorySummary(await getJson<UserMemorySummary>(`${apiBaseUrl}/api/v1/account/memory`));
      setStatusText(`Đã đăng nhập: ${response.user.name}. Giỏ hàng sẽ đi theo tài khoản này.`);
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
      await postJson(`${apiBaseUrl}/api/v1/auth/logout`, {});
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
      const nextSummary = await deleteJson<UserMemorySummary>(`${apiBaseUrl}/api/v1/account/memory`);
      setMemorySummary(nextSummary);
      setStatusText('Đã xoá lịch sử chat, thói quen và dữ liệu đề xuất cá nhân hoá.');
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : 'Không xoá được lịch sử');
    } finally {
      setIsBusy(false);
    }
  }

  if (isChecking) {
    return <section className="account-auth-page"><div className="surface-card"><p>Đang kiểm tra phiên đăng nhập...</p></div></section>;
  }

  return (
    <section className="account-auth-page" aria-label="Đăng nhập đăng ký">
      <div className="account-auth-copy">
        <p className="eyebrow">Tài khoản bảo mật</p>
        <h1>{authUser ? `Xin chào ${authUser.name}` : 'Đăng nhập để mua sắm đúng tài khoản'}</h1>
        <p>Tài khoản dùng cookie HttpOnly để giỏ hàng, thanh toán và lịch sử chat đi theo đúng tài khoản. Không lưu token ở localStorage và không dùng giỏ demo.</p>
        <div className="account-benefits">
          <span>Giỏ hàng riêng theo tài khoản</span>
          <span>Chatbot thao tác giỏ hàng thật</span>
          <span>Phiên đăng nhập bảo mật bằng cookie HttpOnly</span>
        </div>
      </div>

      <div className="account-auth-card">
        {authUser ? (
          <div className="account-dashboard-card">
            <p className="eyebrow">Tài khoản đang hoạt động</p>
            <h2>{authUser.name}</h2>
            <p>{statusText}</p>
            <div className="account-memory-card">
              <strong>Lịch sử & cá nhân hoá</strong>
              <p>Hệ thống lưu lịch sử chat, rolling summary, sản phẩm vừa đề xuất và hành vi tương tác để tư vấn sát thói quen hơn.</p>
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
            <div className="auth-tabs" role="group" aria-label="Chọn chế độ tài khoản">
              <button type="button" className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>Đăng nhập</button>
              <button type="button" className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>Đăng ký</button>
            </div>
            <label>
              Tên đăng nhập
              <input aria-label="Tên đăng nhập" placeholder="VD: linh-home" value={authName} onChange={(event) => setAuthName(event.target.value)} />
            </label>
            <label>
              Mật khẩu
              <input aria-label="Mật khẩu" placeholder="Tối thiểu 8 ký tự" type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} />
            </label>
            <button type="submit" disabled={isBusy || authName.trim().length === 0 || authPassword.length < 8}>{authMode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</button>
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
  if (!response.ok) throw new Error(text || `Yêu cầu thất bại ${response.status}`);
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
  if (!response.ok) throw new Error(text || `Yêu cầu thất bại ${response.status}`);
  return (text ? JSON.parse(text) : {}) as T;
}

async function deleteJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { method: 'DELETE', credentials: 'include' });
  const text = await response.text();
  if (!response.ok) throw new Error(text || `Yêu cầu thất bại ${response.status}`);
  return (text ? JSON.parse(text) : {}) as T;
}
