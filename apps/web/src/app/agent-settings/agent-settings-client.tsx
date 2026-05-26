'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { resolveBrowserApiBaseUrl } from '../browser-api-base-url.js';

interface ModelSettings {
  chatModelBaseUrl: string;
  chatModelId: string;
  embedRerankBaseUrl: string;
  hasApiKey: boolean;
}

interface PingCheck {
  ok: boolean;
  endpoint: string;
  status?: number;
  error?: string;
}

interface PingResult {
  ok: boolean;
  checks: {
    chatModels: PingCheck;
    chatCompletions: PingCheck;
    embedding: PingCheck;
    rerank: PingCheck;
  };
}

const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:7010';

const contractRows = [
  { name: 'Models', endpoint: 'GET /v1/models' },
  { name: 'Chat', endpoint: 'POST /v1/chat/completions' },
  { name: 'Embed', endpoint: 'POST /api/v1/embed' },
  { name: 'Rerank', endpoint: 'POST /api/v1/rerank' },
];

const checkLabels: Record<keyof PingResult['checks'], string> = {
  chatModels: 'GET /v1/models',
  chatCompletions: 'POST /v1/chat/completions',
  embedding: 'POST /api/v1/embed',
  rerank: 'POST /api/v1/rerank',
};

export function AgentSettingsClient() {
  const apiBaseUrl = resolveBrowserApiBaseUrl(configuredApiBaseUrl);
  const [settings, setSettings] = useState<ModelSettings | undefined>();
  const [draftSettings, setDraftSettings] = useState<ModelSettings | undefined>();
  const [apiKey, setApiKey] = useState('');
  const [statusText, setStatusText] = useState('Đang tải cấu hình model...');
  const [pingResult, setPingResult] = useState<PingResult | undefined>();
  const [isBusy, setIsBusy] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  useEffect(() => {
    void loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const payload = await getJson<ModelSettings>(`${apiBaseUrl}/api/v1/model-settings`);
      setSettings(payload);
      setDraftSettings(payload);
      setStatusText('Đã tải cấu hình runtime.');
    } catch (error) {
      setStatusText(readError(error, 'Không tải được cấu hình'));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draftSettings || isBusy) return;
    setIsBusy(true);
    setStatusText('Đang lưu cấu hình runtime...');
    try {
      const payload = await putJson<ModelSettings>(`${apiBaseUrl}/api/v1/model-settings`, { ...draftSettings, apiKey });
      setSettings(payload);
      setDraftSettings(payload);
      setApiKey('');
      setIsEditorOpen(false);
      setStatusText('Đã lưu cấu hình. Chat tiếp theo sẽ dùng setting mới.');
    } catch (error) {
      setStatusText(readError(error, 'Không lưu được cấu hình'));
    } finally {
      setIsBusy(false);
    }
  }

  async function handlePing() {
    if (!settings || isBusy) return;
    setIsBusy(true);
    setPingResult(undefined);
    setStatusText('Đang kiểm tra 4 endpoint model bắt buộc...');
    try {
      const payload = await postJson<PingResult>(`${apiBaseUrl}/api/v1/model-settings/ping`, { ...settings, apiKey });
      setPingResult(payload);
      setStatusText(payload.ok ? 'Tất cả endpoint model đã sẵn sàng.' : 'Một số endpoint model lỗi. Chatbot sẽ báo lỗi cho tới khi chat completion hoạt động.');
    } catch (error) {
      setStatusText(readError(error, 'Kiểm tra kết nối thất bại'));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section className="agent-settings-compact">
      <div className="settings-compact-header">
        <div>
          <p className="eyebrow">Kết nối mô hình</p>
          <h1>Kiểm tra cấu hình tư vấn</h1>
        </div>
        <div className="settings-compact-actions">
          <button type="button" onClick={() => void loadSettings()} disabled={isBusy}>Tải lại .env</button>
          <button type="button" onClick={() => void handlePing()} disabled={isBusy || !settings}>Kiểm tra kết nối</button>
          <button type="button" onClick={() => { setDraftSettings(settings); setIsEditorOpen(true); }} disabled={!settings}>Chỉnh cấu hình</button>
        </div>
      </div>

      {settings ? (
        <>
          <section className="settings-summary-card">
            <div>
              <span>Model chat</span>
              <strong>{settings.chatModelId}</strong>
            </div>
            <div>
              <span>Chat URL</span>
              <strong>{settings.chatModelBaseUrl}</strong>
            </div>
            <div>
              <span>Embed/rerank</span>
              <strong>{settings.embedRerankBaseUrl}</strong>
            </div>
            <div>
              <span>API key</span>
              <strong>{settings.hasApiKey ? 'Đã cấu hình' : 'Chưa dùng'}</strong>
            </div>
          </section>

          <section className="settings-endpoint-strip" aria-label="Endpoint model bắt buộc">
            {contractRows.map((row) => (
              <article key={row.endpoint}>
                <strong>{row.endpoint}</strong>
                <span>{row.name}</span>
              </article>
            ))}
          </section>

          <p className={pingResult?.ok === false ? 'status-text danger-text' : 'status-text'}>{statusText}</p>

          {pingResult ? (
            <section className="model-check-results compact" aria-label="Kết quả kiểm tra model">
              {(Object.entries(pingResult.checks) as Array<[keyof PingResult['checks'], PingCheck]>).map(([key, check]) => (
                <article className={check.ok ? 'model-check-card ok' : 'model-check-card error'} key={key}>
                  <div>
                    <strong>{checkLabels[key]}</strong>
                    <span>{check.endpoint}</span>
                  </div>
                  <p>{check.ok ? `OK${check.status ? ` · HTTP ${check.status}` : ''}` : check.error ?? 'Endpoint lỗi'}</p>
                </article>
              ))}
            </section>
          ) : null}

          {isEditorOpen && draftSettings ? (
            <div className="settings-modal-backdrop" role="presentation" onClick={() => setIsEditorOpen(false)}>
              <form className="api-settings-card settings-modal" onSubmit={handleSubmit} role="dialog" aria-modal="true" aria-label="Chỉnh cấu hình model" onClick={(event) => event.stopPropagation()}>
                <div className="settings-modal-header">
                  <div>
                    <p className="eyebrow">Chỉnh runtime</p>
                    <h2>Cấu hình model</h2>
                  </div>
                  <button type="button" className="button-secondary" onClick={() => setIsEditorOpen(false)}>Đóng</button>
                </div>
                <label>
                  Base URL chat tương thích OpenAI
                  <input value={draftSettings.chatModelBaseUrl} onChange={(event) => setDraftSettings({ ...draftSettings, chatModelBaseUrl: event.target.value })} placeholder="Tải từ backend .env" />
                </label>
                <label>
                  Mã model chat
                  <input value={draftSettings.chatModelId} onChange={(event) => setDraftSettings({ ...draftSettings, chatModelId: event.target.value })} placeholder="Tải từ backend .env" />
                </label>
                <label>
                  API key tuỳ chọn
                  <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={draftSettings.hasApiKey ? 'Đã cấu hình, nhập mới để thay đổi' : 'sk-...'} type="password" />
                </label>
                <label>
                  Base URL embedding/rerank
                  <input value={draftSettings.embedRerankBaseUrl} onChange={(event) => setDraftSettings({ ...draftSettings, embedRerankBaseUrl: event.target.value })} placeholder="Tải từ backend .env" />
                </label>
                <div className="account-auth-links">
                  <button type="submit" disabled={isBusy}>Lưu cấu hình</button>
                  <button type="button" className="button-secondary" onClick={() => { setDraftSettings(settings); setApiKey(''); }} disabled={isBusy}>Hoàn tác</button>
                </div>
              </form>
            </div>
          ) : null}
        </>
      ) : <div className="surface-card"><p>{statusText}</p></div>}
    </section>
  );
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: 'include' });
  const text = await response.text();
  if (!response.ok) throw new Error(parseErrorText(text, response.status));
  return JSON.parse(text) as T;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' }, credentials: 'include', body: JSON.stringify(body) });
  const text = await response.text();
  if (!response.ok) throw new Error(parseErrorText(text, response.status));
  return (text ? JSON.parse(text) : {}) as T;
}

async function putJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, { method: 'PUT', headers: { 'content-type': 'application/json; charset=utf-8' }, credentials: 'include', body: JSON.stringify(body) });
  const text = await response.text();
  if (!response.ok) throw new Error(parseErrorText(text, response.status));
  return (text ? JSON.parse(text) : {}) as T;
}

function parseErrorText(text: string, status: number) {
  if (!text) return `Yêu cầu thất bại ${status}`;
  try {
    const payload = JSON.parse(text) as { message?: string | string[]; error?: string };
    if (Array.isArray(payload.message)) return payload.message.join(', ');
    return payload.message ?? payload.error ?? text;
  } catch {
    return text;
  }
}

function readError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
