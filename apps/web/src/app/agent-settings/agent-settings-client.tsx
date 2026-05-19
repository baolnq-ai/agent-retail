'use client';

import { useEffect, useState, type FormEvent } from 'react';

interface ModelSettings {
  chatModelBaseUrl: string;
  chatModelId: string;
  embedRerankBaseUrl: string;
  hasApiKey: boolean;
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:7010';

export function AgentSettingsClient() {
  const [settings, setSettings] = useState<ModelSettings | undefined>();
  const [apiKey, setApiKey] = useState('');
  const [statusText, setStatusText] = useState('Đang tải cấu hình model...');
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    void loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const payload = await getJson<ModelSettings>(`${apiBaseUrl}/api/v1/model-settings`);
      setSettings(payload);
      setStatusText('Đã tải cấu hình runtime.');
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : 'Không tải được cấu hình');
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings || isBusy) return;
    setIsBusy(true);
    setStatusText('Đang lưu cấu hình runtime...');
    try {
      const payload = await putJson<ModelSettings>(`${apiBaseUrl}/api/v1/model-settings`, { ...settings, apiKey });
      setSettings(payload);
      setApiKey('');
      setStatusText('Đã lưu cấu hình. Chat tiếp theo sẽ dùng setting mới.');
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : 'Không lưu được cấu hình');
    } finally {
      setIsBusy(false);
    }
  }

  async function handlePing() {
    setIsBusy(true);
    setStatusText('Đang ping OpenAI-compatible API và embed/rerank...');
    try {
      const payload = await postJson<{ chat: string; embedding: string }>(`${apiBaseUrl}/api/v1/model-settings/ping`, {});
      setStatusText(`Ping thành công · chat=${payload.chat} · embedding=${payload.embedding}`);
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : 'Ping thất bại');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section className="agent-dashboard-shell">
      <div className="agent-dashboard-hero">
        <div>
          <p className="eyebrow">API model runtime</p>
          <h1>Cấu hình API</h1>
          <p>Chỉnh OpenAI-compatible chat endpoint, model id, API key tuỳ chọn và embed/rerank endpoint mà không cần sửa env.</p>
        </div>
        <button type="button" onClick={() => void handlePing()} disabled={isBusy || !settings}>Kiểm tra kết nối</button>
      </div>

      {settings ? (
        <form className="api-settings-card" onSubmit={handleSubmit}>
          <label>
            Base URL chat tương thích /v1
            <input value={settings.chatModelBaseUrl} onChange={(event) => setSettings({ ...settings, chatModelBaseUrl: event.target.value })} placeholder="http://127.0.0.1:8000" />
          </label>
          <label>
            Mã model chat
            <input value={settings.chatModelId} onChange={(event) => setSettings({ ...settings, chatModelId: event.target.value })} placeholder="openai/gpt-oss" />
          </label>
          <label>
            API key tuỳ chọn
            <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={settings.hasApiKey ? 'Đã cấu hình, nhập mới để thay đổi' : 'sk-...'} type="password" />
          </label>
          <label>
            Base URL embedding/rerank
            <input value={settings.embedRerankBaseUrl} onChange={(event) => setSettings({ ...settings, embedRerankBaseUrl: event.target.value })} placeholder="https://replace-with-your-embed-rerank-gateway.example.invalid" />
          </label>
          <div className="account-auth-links">
            <button type="submit" disabled={isBusy}>Lưu cấu hình</button>
            <button type="button" className="button-secondary" onClick={() => void loadSettings()} disabled={isBusy}>Tải lại</button>
          </div>
          <p className="status-text">{statusText}</p>
        </form>
      ) : <div className="surface-card"><p>{statusText}</p></div>}
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
  const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' }, credentials: 'include', body: JSON.stringify(body) });
  const text = await response.text();
  if (!response.ok) throw new Error(text || `Yêu cầu thất bại ${response.status}`);
  return (text ? JSON.parse(text) : {}) as T;
}

async function putJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, { method: 'PUT', headers: { 'content-type': 'application/json; charset=utf-8' }, credentials: 'include', body: JSON.stringify(body) });
  const text = await response.text();
  if (!response.ok) throw new Error(text || `Yêu cầu thất bại ${response.status}`);
  return (text ? JSON.parse(text) : {}) as T;
}
