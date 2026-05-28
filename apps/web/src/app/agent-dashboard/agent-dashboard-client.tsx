'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { resolveBrowserApiBaseUrl } from '../browser-api-base-url.js';

interface AgentTrace {
  traceId: string;
  messageId: string;
  timestamp: string;
  intent: string;
  agents: string[];
  edges: Array<{ from: string; to: string; status?: string; order?: number }>;
  nodes?: Array<{ id: string; label: string; kind: 'agent' | 'db' | 'vector_db' | 'tool' | 'text' | 'file' | 'service' | 'llm'; status: string; detail?: string; metric?: string; agentName?: string; order?: number; iconKey?: string; shortCode?: string }>;
  graphEdges?: Array<{ from: string; to: string; status?: string; order?: number; label?: string; direction?: GraphEdgeDirection }>;
  playbackEvents?: Array<{ id: string; from: string; to: string; order: number; direction: GraphEdgeDirection; status: string; label?: string; durationMs?: number; payloadRef?: string }>;
  steps: Array<{ agent: string; status: string; summary: string }>;
  events: Array<{ timestamp: string; agent: string; type: string; summary: string }>;
  memory: {
    recentTurnCount: number;
    rollingSummaryLength: number;
    recentRecommendationIds: string[];
    preferenceKeys: string[];
  };
  retrieval: {
    lexicalCandidateIds: string[];
    selectedProductIds: string[];
    contextDocumentCount: number;
    rerankTopScores: number[];
    fallbackRanking?: 'lexical';
  };
  cart: {
    actionType: string;
    resolvedProductIds: string[];
    beforeItemCount: number;
    afterItemCount: number;
    result?: string;
    actions: Array<{ type: string; productIds: string[]; status: string; result?: string; error?: string }>;
  };
  llm: {
    model: string;
    contextDocumentCount: number;
    promptSections: string[];
  };
  pipeline?: Array<{ timestamp: string; agent: string; stage: string; status: string; summary: string; details?: Record<string, string | number | boolean | string[]> }>;
  toolResults?: Array<{ tool: string; status: string; productIds: string[]; beforeQuantity?: number; afterQuantity?: number; result?: string; error?: string }>;
  pendingPlan?: { id: string; expiresAt: string; confirmationText: string; resolvedProductIds: string[] };
  errors: Array<{ source: string; message: string }>;
}

interface PromptSetting {
  key: string;
  label: string;
  owner: string;
  description: string;
  content: string;
  updatedAt: string;
  source: 'default' | 'database';
}

const apiBaseUrl = resolveBrowserApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:6820');
const agentLabels: Record<string, string> = {
  'lead-agent': 'Lead',
  'cart-agent': 'Cart',
  'search-agent': 'Search',
  'recommendation-agent': 'Gợi ý',
  'storage-memory-agent': 'His chung',
  'history-agent': 'His agent',
  'rag-agent': 'RAG',
  'security-agent': 'Bảo mật',
  'customer-support-agent': 'Hỗ trợ',
  'memory-agent': 'Bộ nhớ',
  'user-analysis-agent': 'Phân tích người dùng',
  'product-manager-agent': 'Quản lý sản phẩm',
  'retrieval-agent': 'Truy xuất',
  'cart-manager-agent': 'Quản lý giỏ',
  'sales-agent': 'Tư vấn bán hàng',
  'sales-evaluator-agent': 'Sales QA',
};

type NodeTone = 'router' | 'memory' | 'cart' | 'product' | 'search' | 'recommendation' | 'rag' | 'security' | 'support' | 'sales' | 'db' | 'service' | 'tool';

const fallbackGraphNodes: Record<string, { x: number; y: number; icon: string; tone?: NodeTone; label?: string }> = {
  'lead-agent': { x: 14, y: 50, icon: 'LD', tone: 'router', label: 'Lead' },
  'storage-memory-agent': { x: 28, y: 28, icon: 'MEM', tone: 'memory', label: 'His chung' },
  'history-agent': { x: 28, y: 72, icon: 'HIS', tone: 'memory', label: 'His agent' },
  'search-agent': { x: 44, y: 32, icon: 'SRCH', tone: 'search', label: 'Search' },
  'recommendation-agent': { x: 44, y: 68, icon: 'REC', tone: 'recommendation', label: 'Gợi ý' },
  'cart-agent': { x: 62, y: 78, icon: 'CART', tone: 'cart', label: 'Cart' },
  'rag-agent': { x: 62, y: 24, icon: 'RAG', tone: 'rag', label: 'RAG' },
  'security-agent': { x: 78, y: 30, icon: 'SEC', tone: 'security', label: 'Bảo mật' },
  'customer-support-agent': { x: 78, y: 64, icon: 'SUP', tone: 'support', label: 'Hỗ trợ' },
  'sales-agent': { x: 92, y: 50, icon: 'SALE', tone: 'sales', label: 'Sales' },
  'postgres-db': { x: 50, y: 90, icon: 'PG', tone: 'db', label: 'Postgres' },
  'qdrant-db': { x: 50, y: 20, icon: 'VDB', tone: 'db', label: 'Qdrant' },
  'llm-service': { x: 92, y: 18, icon: 'LLM', tone: 'service', label: 'LLM' },
  'pipeline-executor': { x: 10, y: 18, icon: 'FLOW', tone: 'service', label: 'Executor' },
  'task-context': { x: 14, y: 28, icon: 'TASK', tone: 'service', label: 'Task' },
  'session-context': { x: 14, y: 42, icon: 'CTX', tone: 'service', label: 'His chung' },
  'memory-agent': { x: 18, y: 48, icon: 'M', tone: 'memory' },
  'user-analysis-agent': { x: 34, y: 48, icon: 'A', tone: 'router' },
  'product-manager-agent': { x: 50, y: 48, icon: 'P', tone: 'product' },
  'retrieval-agent': { x: 66, y: 48, icon: 'R' },
  'cart-manager-agent': { x: 61, y: 83, icon: 'C', tone: 'cart' },
  'sales-agent-legacy': { x: 82, y: 48, icon: 'S', tone: 'sales', label: 'Sales' },
  'sales-evaluator-agent': { x: 82, y: 72, icon: 'QA', tone: 'security', label: 'Evaluator' },
};

export function AgentDashboardClient() {
  const [trace, setTrace] = useState<AgentTrace | null>(null);
  const [statusText, setStatusText] = useState('Đang tải trace mới nhất...');
  const lastTraceKeyRef = useRef('');
  const inFlightRef = useRef(false);

  const loadTrace = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      const demoTraceMode = new URLSearchParams(window.location.search).get('demoTrace');
      if (demoTraceMode) {
        const demoTrace = createDashboardDemoTrace(demoTraceMode);
        setTrace(demoTrace);
        setStatusText(`Demo ${new Date(demoTrace.timestamp).toLocaleTimeString('vi-VN')}`);
        return;
      }

      const response = await fetch(`${apiBaseUrl}/api/v1/agent/traces/latest`, { credentials: 'include', cache: 'no-store' });
      const text = await response.text();
      if (!response.ok) throw new Error(parseErrorText(text, response.status));
      const payload = (text ? JSON.parse(text) : null) as AgentTrace | null;
      const nextKey = payload ? `${payload.traceId}:${payload.timestamp}:${payload.pipeline?.length ?? 0}:${payload.events.length}` : 'empty';

      if (nextKey !== lastTraceKeyRef.current) {
        lastTraceKeyRef.current = nextKey;
        setTrace(payload);
        setStatusText(payload ? `Realtime ${new Date(payload.timestamp).toLocaleTimeString('vi-VN')}` : 'Chưa có trace. Hãy gửi một lượt chat trước.');
      }
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : 'Không tải được trace');
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    void loadTrace();
    const timer = window.setInterval(() => void loadTrace(), 1500);
    return () => window.clearInterval(timer);
  }, [loadTrace]);

  return (
    <section className="agent-dashboard-shell">
      <div className="agent-dashboard-hero">
        <div>
          <p className="eyebrow">Agent Ops</p>
          <h1>Dashboard agent</h1>
          <p>Theo dõi luồng xử lý, bộ nhớ, truy xuất và giỏ hàng theo từng lượt chat.</p>
        </div>
        <button type="button" onClick={() => void loadTrace()}>Làm mới trace</button>
      </div>

      <div className="agent-trace-summary">
        <TraceMetric label="Trạng thái" value={statusText} />
        <TraceMetric label="Ý định" value={trace?.intent ?? 'không có'} />
        <TraceMetric label="Model" value={trace?.llm.model ?? 'đang chờ'} />
        <TraceMetric label="Xếp hạng lại" value={trace?.retrieval.fallbackRanking ? `dự phòng: ${trace.retrieval.fallbackRanking}` : trace ? 'ổn' : 'không có'} tone={trace?.retrieval.fallbackRanking ? 'warn' : undefined} />
      </div>

      {trace ? (
        <>
          <div className="agent-graph-card">
            <div className="section-heading">
              <h2>Sơ đồ agent</h2>
              <span>{trace.traceId.slice(0, 8)}</span>
            </div>
            <AgentGraph trace={trace} />
          </div>

          <div className="agent-dashboard-grid">
            <TracePanel title="Bộ nhớ/cache">
              <TraceMetric label="Lượt gần đây" value={trace.memory.recentTurnCount} />
              <TraceMetric label="Ký tự tóm tắt" value={trace.memory.rollingSummaryLength} />
              <ListBlock title="Đề xuất gần đây" items={trace.memory.recentRecommendationIds} />
              <ListBlock title="Khoá sở thích" items={trace.memory.preferenceKeys} />
            </TracePanel>
            <TracePanel title="Truy xuất/xếp hạng">
              <TraceMetric label="Số ứng viên" value={trace.retrieval.lexicalCandidateIds.length} />
              <TraceMetric label="Sản phẩm đã chọn" value={trace.retrieval.selectedProductIds.length} />
              <TraceMetric label="Tài liệu ngữ cảnh" value={trace.retrieval.contextDocumentCount} />
              <ListBlock title="Mã sản phẩm đã chọn" items={trace.retrieval.selectedProductIds} />
              <ListBlock title="Điểm rerank cao nhất" items={trace.retrieval.rerankTopScores.map((score) => score.toFixed(3))} />
            </TracePanel>
            <TracePanel title="Quản lý giỏ hàng">
              <TraceMetric label="Hành động" value={trace.cart.actionType} />
              <TraceMetric label="Số dòng trước" value={trace.cart.beforeItemCount} />
              <TraceMetric label="Số dòng sau" value={trace.cart.afterItemCount} />
              <ListBlock title="Sản phẩm đã resolve" items={trace.cart.resolvedProductIds} />
              <ListBlock title="Chuỗi hành động" items={trace.cart.actions.map((action) => `${action.type}: ${action.status}`)} />
              <ListBlock title="Xác minh tool" items={(trace.toolResults ?? []).map((tool) => `${tool.tool}: ${tool.status}${tool.beforeQuantity !== undefined || tool.afterQuantity !== undefined ? ` (${tool.beforeQuantity ?? '-'} → ${tool.afterQuantity ?? '-'})` : ''}`)} />
              {trace.pendingPlan ? <p className="trace-warning">Đang chờ xác nhận: {trace.pendingPlan.confirmationText}</p> : null}
              {trace.cart.result ? <p>{trace.cart.result}</p> : null}
            </TracePanel>
            <TracePanel title="LLM/ngữ cảnh">
              <TraceMetric label="Model" value={trace.llm.model} />
              <TraceMetric label="Tài liệu ngữ cảnh" value={trace.llm.contextDocumentCount} />
              <ListBlock title="Phần prompt" items={trace.llm.promptSections} />
            </TracePanel>
            <TracePanel title="Kiểm duyệt agent" wide>
              <QualityGateList trace={trace} />
            </TracePanel>
            <TracePanel title="Lỗi/dự phòng" wide>
              {trace.errors.length ? trace.errors.map((error) => <p className="trace-error" key={`${error.source}-${error.message}`}><strong>{error.source}</strong>: {error.message}</p>) : <p>Không có lỗi không nghiêm trọng trong lượt này.</p>}
            </TracePanel>
          </div>
        </>
      ) : (
        <div className="surface-card"><p>Chưa có trace. Mở chat, gửi một câu hỏi sản phẩm hoặc thao tác giỏ hàng để dashboard nhận dữ liệu.</p></div>
      )}
    </section>
  );
}

const AgentGraph = memo(function AgentGraph({ trace }: { trace: AgentTrace }) {
  const [detail, setDetail] = useState<GraphDetail | undefined>(undefined);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'overview' | 'prompt'>(() => (
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('tab') === 'prompt'
      ? 'prompt'
      : 'overview'
  ));
  const { activeAgent, playbackEvents, visibleEdges, visibleNodes } = useMemo(() => buildGraphView(trace), [trace.traceId, trace.pipeline?.length, trace.events.length]);
  const nodeStepBadges = useMemo(() => buildNodeStepBadges(visibleEdges), [visibleEdges]);
  const edgePathItems = useMemo(() => buildCanvasEdgePathItems(visibleNodes, visibleEdges), [visibleNodes, visibleEdges]);
  const hoveredNode = hoveredNodeId ? visibleNodes.find((node) => node.id === hoveredNodeId) : undefined;

  return (
    <>
      <GraphLegend />
      <div className="agent-node-canvas" aria-label="So do trace agent theo thu tu thuc thi">
        <TracePlaybackCanvas nodes={visibleNodes} events={playbackEvents} />
        <svg className="agent-node-edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {edgePathItems.map((item) => (
            <path
              className={`agent-node-edge ${item.edge.direction ?? 'call'} ${edgeFlowTone(item.edge.direction)}`}
              d={item.path}
              data-from={item.edge.from}
              data-to={item.edge.to}
              data-direction={item.edge.direction ?? 'call'}
              key={item.key}
            />
          ))}
        </svg>
        {visibleNodes.map((node) => (
          <button
            type="button"
            className={`agent-node ${node.kind} ${node.tone ?? ''} ${node.id === activeAgent ? 'active' : ''}`}
            data-node-id={node.id}
            style={{ '--node-x': `${node.x}%`, '--node-y': `${node.y}%` } as CSSProperties}
            onClick={() => setDetail(detailFromNode(node, trace, visibleEdges))}
            onFocus={() => setHoveredNodeId(node.id)}
            onBlur={() => setHoveredNodeId(undefined)}
            onPointerEnter={() => setHoveredNodeId(node.id)}
            onPointerLeave={() => setHoveredNodeId(undefined)}
            title={`${node.label}: ${node.detail ?? node.status}`}
            key={node.id}
          >
            <span className={`agent-node-icon ${nodeGlyphClass(node)}`} aria-hidden="true">
              <NodeIconSvg node={node} />
            </span>
            <strong className="agent-node-title">
              <span className="agent-node-name">{node.label}</span>
            </strong>
            <span className="agent-node-steps" aria-label={`Cac buoc bat dau tu ${node.label}`}>
              {(nodeStepBadges.get(node.id) ?? []).map((step) => <span key={`${node.id}-${step}`}>{step}</span>)}
            </span>
            <small>{node.detail ?? node.status}</small>
          </button>
        ))}
        {hoveredNode ? (
          <GraphNodeHoverCard
            node={hoveredNode}
            steps={nodeStepBadges.get(hoveredNode.id) ?? []}
            edges={visibleEdges.filter((edge) => edge.from === hoveredNode.id || edge.to === hoveredNode.id)}
          />
        ) : null}
        {detail ? <GraphDetailPopup detail={detail} onClose={() => setDetail(undefined)} /> : null}
      </div>
      <div className="agent-dashboard-tabs" role="tablist" aria-label="Công cụ dashboard">
        <button type="button" className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')} role="tab" aria-selected={activeTab === 'overview'}>Dashboard</button>
        <button type="button" className={activeTab === 'prompt' ? 'active' : ''} onClick={() => setActiveTab('prompt')} role="tab" aria-selected={activeTab === 'prompt'}>Prompt</button>
      </div>
      {activeTab === 'prompt' ? <PromptEditor trace={trace} /> : null}
    </>
  );
});
type GraphEdgeDirection = 'call' | 'return' | 'data' | 'guard' | 'write';
type GraphEdge = { from: string; to: string; status?: string; order?: number; label?: string; direction?: GraphEdgeDirection };
type GraphPlaybackEvent = { id: string; from: string; to: string; order: number; direction: GraphEdgeDirection; status?: string; label?: string };
type GraphDetail = { title: string; kind: string; status?: string; rows: Array<{ label: string; value: string }> };
type GraphCluster = { id: string; label: string; tone: string; x: number; y: number; width: number; height: number; detail: GraphDetail };

type PositionedGraphNode = { id: string; label: string; kind: string; status: string; detail?: string; x: number; y: number; icon: string; tone?: NodeTone; order?: number };
const maxVisibleTraceNodes = 40;

function PromptEditor({ trace }: { trace: AgentTrace }) {
  const [prompts, setPrompts] = useState<PromptSetting[]>([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState('Đang tải prompt...');
  const [isBusy, setIsBusy] = useState(false);
  const selectedPrompt = prompts.find((prompt) => prompt.key === selectedKey);

  const loadPrompts = useCallback(async () => {
    setIsBusy(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/prompt-settings`, { credentials: 'include', cache: 'no-store' });
      const text = await response.text();
      if (!response.ok) {
        const message = parseErrorText(text, response.status);
        throw new Error(response.status === 404
          ? 'Chưa thấy API prompt-settings. Hãy restart backend và chạy Prisma db push để dashboard đọc prompt từ DB.'
          : message);
      }
      const payload = JSON.parse(text) as { prompts: PromptSetting[] };
      if (!payload.prompts.length) throw new Error('DB chưa có prompt nào. Hãy chạy lại backend để seed PromptSetting mặc định.');
      setPrompts(payload.prompts);
      const nextSelected = selectedKey && payload.prompts.some((prompt) => prompt.key === selectedKey) ? selectedKey : payload.prompts[0]?.key ?? '';
      setSelectedKey(nextSelected);
      setDraft(payload.prompts.find((prompt) => prompt.key === nextSelected)?.content ?? '');
      setStatus(`Đã tải ${payload.prompts.length} prompt từ cơ sở dữ liệu.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Không tải được prompt');
    } finally {
      setIsBusy(false);
    }
  }, [selectedKey]);

  useEffect(() => {
    void loadPrompts();
  }, [loadPrompts]);

  const selectPrompt = (key: string) => {
    const prompt = prompts.find((item) => item.key === key);
    setSelectedKey(key);
    setDraft(prompt?.content ?? '');
  };

  const savePrompt = async () => {
    if (!selectedPrompt) return;
    setIsBusy(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/prompt-settings`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: selectedPrompt.key, content: draft }),
      });
      const text = await response.text();
      if (!response.ok) throw new Error(parseErrorText(text, response.status));
      const updated = JSON.parse(text) as PromptSetting;
      setPrompts((items) => items.map((item) => (item.key === updated.key ? updated : item)));
      setDraft(updated.content);
      setStatus(`Đã lưu ${updated.label}. Prompt có hiệu lực cho request mới.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Không lưu được prompt');
    } finally {
      setIsBusy(false);
    }
  };

  const resetPrompt = async () => {
    if (!selectedPrompt) return;
    setIsBusy(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/prompt-settings/reset`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: selectedPrompt.key }),
      });
      const text = await response.text();
      if (!response.ok) throw new Error(parseErrorText(text, response.status));
      const updated = JSON.parse(text) as PromptSetting;
      setPrompts((items) => items.map((item) => (item.key === updated.key ? updated : item)));
      setDraft(updated.content);
      setStatus(`Đã khôi phục ${updated.label}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Không khôi phục được prompt');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <section className="prompt-editor-panel" aria-label="Xem và sửa prompt">
      <div className="prompt-editor-sidebar" role="list" aria-label="Danh sách prompt">
        {prompts.map((prompt) => (
          <button type="button" className={prompt.key === selectedKey ? 'active' : ''} onClick={() => selectPrompt(prompt.key)} key={prompt.key}>
            <strong>{prompt.label}</strong>
            <span>{prompt.owner}</span>
          </button>
        ))}
      </div>
      <div className="prompt-editor-main">
        <div className="prompt-editor-header">
          <div>
            <strong>{selectedPrompt?.label ?? 'Prompt'}</strong>
            <span>{selectedPrompt ? `${selectedPrompt.owner} · ${selectedPrompt.source === 'default' ? 'mặc định' : 'đã sửa trong DB'}` : status}</span>
          </div>
          <div className="prompt-editor-actions">
            <button type="button" onClick={() => selectedPrompt && setDraft(selectedPrompt.content)} disabled={!selectedPrompt || isBusy}>Hoàn tác</button>
            <button type="button" onClick={() => void resetPrompt()} disabled={!selectedPrompt || isBusy}>Mặc định</button>
            <button type="button" className="primary" onClick={() => void savePrompt()} disabled={!selectedPrompt || isBusy || draft.trim().length < 20}>Lưu prompt</button>
          </div>
        </div>
        <textarea value={draft} onChange={(event) => setDraft(event.target.value)} spellCheck={false} aria-label="Nội dung prompt lưu trong DB" />
        <div className="prompt-editor-footer">
          <span>{draft.trim().length.toLocaleString('vi-VN')} ký tự</span>
          <span>{status}</span>
          <span>Trace đang dùng: {trace.llm.promptSections.join(', ') || 'không có section'}</span>
        </div>
      </div>
    </section>
  );
}

function TraceFlowBoard({
  activeAgent,
  edges,
  nodes,
  playbackEvents,
  trace,
  onSelect,
}: {
  activeAgent: string | undefined;
  edges: GraphEdge[];
  nodes: PositionedGraphNode[];
  playbackEvents: GraphPlaybackEvent[];
  trace: AgentTrace;
  onSelect: (detail: GraphDetail) => void;
}) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const orderedEdges = buildReadableTraceEdges(edges, [], nodeById);
  const agentsInRoute = uniqueRouteAgents(orderedEdges);
  const finalEdge = [...orderedEdges].reverse().find((edge) => edge.to === 'assistant-response' || edge.from === 'sales-agent') ?? orderedEdges[orderedEdges.length - 1];

  return (
    <div className="trace-flow-board">
      <div className="trace-flow-header">
        <div>
          <strong>{trace.intent}</strong>
          <span>{orderedEdges.length} bước · {agentsInRoute.length} agent · {trace.errors.length ? `${trace.errors.length} lỗi` : 'ổn'}</span>
        </div>
        <div className="trace-flow-agents" aria-label="Agent trong trace">
          {agentsInRoute.map((agent) => {
            const node = nodeById.get(agent) ?? fallbackRouteNode(agent);
            return (
              <button
                type="button"
                className={agent === activeAgent ? 'active' : ''}
                key={agent}
                onClick={() => onSelect(detailFromNode(node, trace, edges))}
                title={`${node.label}: ${node.detail ?? node.status}`}
              >
                {formatCompactNodeLabel(node)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="trace-flow-table" role="list" aria-label="Thứ tự flow agent">
        {orderedEdges.map((edge, index) => {
          const from = nodeById.get(edge.from) ?? fallbackRouteNode(edge.from);
          const to = nodeById.get(edge.to) ?? fallbackRouteNode(edge.to);
          return (
            <button
              type="button"
              className={`trace-flow-row ${edge.direction ?? 'call'} ${edgeFlowTone(edge.direction)}`}
              role="listitem"
              onClick={() => onSelect(detailFromEdge(edge, from, to))}
              key={`${edge.from}-${edge.to}-${edge.order ?? index}-${edge.label ?? ''}`}
            >
              <span className={`trace-flow-node trace-flow-source ${from.kind}`}>
                <span className="trace-flow-step">{String(index + 1).padStart(2, '0')}</span>
                <span className="trace-flow-node-label">{routeNodeName(edge.from, nodeById)}</span>
              </span>
              <span className="trace-flow-action">
                <strong>{directionLabel(edge.direction)}</strong>
                <small>{formatEdgeLabel(edge.label)}</small>
              </span>
              <span className={`trace-flow-node trace-flow-target ${to.kind}`}>{routeNodeName(edge.to, nodeById)}</span>
              <span className={`trace-flow-status ${edge.status ?? 'completed'}`}>{formatTraceStatus(edge.status)}</span>
            </button>
          );
        })}
      </div>

      {finalEdge ? (
        <button
          type="button"
          className="trace-flow-final"
          onClick={() => onSelect(detailFromEdge(finalEdge, nodeById.get(finalEdge.from) ?? fallbackRouteNode(finalEdge.from), nodeById.get(finalEdge.to) ?? fallbackRouteNode(finalEdge.to)))}
        >
          <span>Cuối</span>
          <strong>{routeNodeName(finalEdge.from, nodeById)} -&gt; {routeNodeName(finalEdge.to, nodeById)}</strong>
          <small>{formatEdgeLabel(finalEdge.label)}</small>
        </button>
      ) : null}
    </div>
  );
}

const agentOrder: AgentTrace['agents'] = [
  'lead-agent',
  'storage-memory-agent',
  'history-agent',
  'search-agent',
  'recommendation-agent',
  'cart-agent',
  'rag-agent',
  'security-agent',
  'customer-support-agent',
  'sales-agent',
  'memory-agent',
  'user-analysis-agent',
  'product-manager-agent',
  'retrieval-agent',
  'cart-manager-agent',
];

function buildGraphView(trace: AgentTrace): { activeAgent: string | undefined; visibleNodes: PositionedGraphNode[]; visibleEdges: GraphEdge[]; playbackEvents: GraphPlaybackEvent[] } {
  const activeAgent = trace.pipeline?.at(-1)?.agent ?? trace.steps.find((step) => step.status === 'completed')?.agent ?? trace.steps[0]?.agent;
  if (trace.nodes?.length) {
    const graphEdges = buildGraphEdges(trace);
    const expandedGraph = expandPrivateGraphInstances(augmentPipelineNodes(trace, buildPositionedGraphNodes(trace)), graphEdges);
    const positionedNodes = spreadNearbyNodes(applySessionFlowLayout(expandedGraph.nodes, trace, expandedGraph.edges));
    const expandedEdges = expandedGraph.edges;
    const connectedNodeIds = new Set(expandedEdges.flatMap((edge) => [edge.from, edge.to]));
    const visibleNodes = compactVisibleGraphNodes(positionedNodes.filter((node) => shouldShowNode(node, connectedNodeIds)));
    const nodeIds = new Set(visibleNodes.map((node) => node.id));
    const visibleEdges = selectVisibleGraphEdges(expandedEdges, nodeIds, 160);
    const routedNodes = avoidLineNodeCollisions(visibleNodes, visibleEdges);
    const routedNodeIds = new Set(routedNodes.map((node) => node.id));
    return { activeAgent, visibleNodes: routedNodes, visibleEdges, playbackEvents: buildPlaybackEvents(trace, visibleEdges, routedNodeIds) };
  }

  const activeAgents = agentOrder.filter((agent) => trace.agents.includes(agent) || trace.steps.some((step) => step.agent === agent));
  const agentNodes = activeAgents.map((agent, index) => {
    const fallback = fallbackGraphNodes[agent];
    return {
      id: agent,
      label: fallback?.label ?? agentLabels[agent] ?? formatUnknownNodeLabel(agent),
      kind: 'agent',
      status: trace.steps.find((step) => step.agent === agent)?.status ?? 'completed',
      detail: 'agent',
      x: 14 + index * (72 / Math.max(activeAgents.length - 1, 1)),
      y: 52,
      icon: fallback?.icon ?? shortCodeFromId(agent),
      tone: fallback?.tone,
    };
  });
  const supportNodes = buildSupportNodes(trace, activeAgents);
  const graphEdges = buildGraphEdges(trace);
  const expandedGraph = expandPrivateGraphInstances([...agentNodes, ...supportNodes], graphEdges);
  const visibleNodes = spreadNearbyNodes(applySessionFlowLayout(expandedGraph.nodes, trace, expandedGraph.edges));
  const nodeIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges = selectVisibleGraphEdges(expandedGraph.edges, nodeIds, 160);
  const routedNodes = avoidLineNodeCollisions(visibleNodes, visibleEdges);
  const routedNodeIds = new Set(routedNodes.map((node) => node.id));

  return { activeAgent, visibleNodes: routedNodes, visibleEdges, playbackEvents: buildPlaybackEvents(trace, visibleEdges, routedNodeIds) };
}

function buildGraphClusters(trace: AgentTrace, nodes: PositionedGraphNode[], edges: GraphEdge[]): GraphCluster[] {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const agentCount = nodes.filter((node) => node.kind === 'agent').length;
  const dbNodes = nodes.filter((node) => node.kind === 'db' || node.kind === 'vector_db');
  const toolNodes = nodes.filter((node) => node.kind === 'tool');
  const toolEdges = edges.filter((edge) => edge.from.includes('tool') || edge.to.includes('tool'));
  const taskEdges = edges.filter((edge) => edge.from === 'task-context' || edge.to === 'task-context');
  const historyEdges = edges.filter((edge) => edge.from.includes('memory') || edge.to.includes('memory') || edge.from.includes('history') || edge.to.includes('history'));
  const responseEdges = edges.filter((edge) => edge.to === 'assistant-response' || edge.from === 'sales-agent' || edge.to === 'sales-agent');

  const clusters: GraphCluster[] = [
    {
      id: 'cluster-session',
      label: 'Phiên',
      tone: 'context',
      x: 3,
      y: 18,
      width: 24,
      height: 22,
      detail: sessionContextDetail(trace, edges.filter((edge) => edge.from === 'session-context' || edge.to === 'session-context')),
    },
    {
      id: 'cluster-task',
      label: 'Task',
      tone: 'task',
      x: 3,
      y: 41,
      width: 24,
      height: 24,
      detail: taskContextDetail(trace, taskEdges),
    },
    {
      id: 'cluster-history',
      label: 'Lịch sử',
      tone: 'history',
      x: 3,
      y: 66,
      width: 24,
      height: 18,
      detail: historyContextDetail(trace, nodes.find((node) => node.id === 'history-agent') ?? fallbackRouteNode('history-agent'), historyEdges),
    },
    {
      id: 'cluster-agents',
      label: 'Agent có tương tác',
      tone: 'agents',
      x: 29,
      y: 12,
      width: 36,
      height: 76,
      detail: {
        title: 'Nhóm agent có tương tác',
        kind: 'Agent',
        rows: [
          { label: 'Số agent', value: `${agentCount}` },
          { label: 'Nhận request', value: joinList(edges.filter((edge) => edge.direction === 'call' && edge.to.endsWith('-agent')).map((edge) => nodeDisplayName(edge.to))) },
          { label: 'Trả kết quả', value: joinList(edges.filter((edge) => edge.direction === 'return' && edge.from.endsWith('-agent')).map((edge) => nodeDisplayName(edge.from))) },
          { label: 'Trong phiên', value: joinList(nodes.filter((node) => node.kind === 'agent').map((node) => node.label)) },
        ],
      },
    },
    {
      id: 'cluster-tools',
      label: 'Tool',
      tone: 'tools',
      x: 66,
      y: 13,
      width: 13,
      height: 74,
      detail: {
        title: 'Tool được gọi trong phiên',
        kind: 'Tool',
        rows: [
          { label: 'Tool trên canvas', value: toolNodes.length ? joinList(toolNodes.map((node) => node.label)) : 'Không có tool edge trong trace' },
          { label: 'Kết quả tool', value: trace.toolResults?.map((tool) => `${formatEdgeLabel(tool.tool)}: ${formatTraceStatus(tool.status)}`).join('; ') ?? '' },
          { label: 'Giỏ hàng', value: trace.cart.actions.map((action) => `${action.type}: ${formatTraceStatus(action.status)}`).join('; ') },
          { label: 'Đường tool', value: summarizeEdges(toolEdges) },
        ],
      },
    },
    {
      id: 'cluster-db',
      label: 'DB / State',
      tone: 'db',
      x: 82,
      y: 12,
      width: 14,
      height: 72,
      detail: {
        title: 'Database và state',
        kind: 'DB',
        rows: [
          { label: 'DB trên canvas', value: dbNodes.length ? joinList(dbNodes.map((node) => node.label)) : 'Không có DB edge trong trace' },
          { label: 'Sản phẩm chọn', value: joinList(trace.retrieval.selectedProductIds) },
          { label: 'Tài liệu context', value: String(trace.retrieval.contextDocumentCount) },
          { label: 'State giỏ', value: `${trace.cart.beforeItemCount} -> ${trace.cart.afterItemCount}` },
          { label: 'Đường DB', value: summarizeEdges(edges.filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to) && (edge.from.includes('db') || edge.to.includes('db') || edge.from === 'cart-state' || edge.to === 'cart-state'))) },
        ],
      },
    },
    {
      id: 'cluster-response',
      label: 'Phản hồi',
      tone: 'response',
      x: 82,
      y: 78,
      width: 14,
      height: 15,
      detail: responseNodeDetail(trace, nodes.find((node) => node.id === 'assistant-response') ?? fallbackRouteNode('assistant-response'), responseEdges),
    },
  ];

  return clusters.filter((cluster) => {
    if (cluster.id === 'cluster-history') return nodeIds.has('history-agent') || nodeIds.has('storage-memory-agent') || trace.memory.recentTurnCount > 0;
    if (cluster.id === 'cluster-tools') return true;
    if (cluster.id === 'cluster-db') return dbNodes.length > 0 || trace.retrieval.contextDocumentCount > 0 || trace.cart.afterItemCount !== trace.cart.beforeItemCount;
    return true;
  });
}

function expandPrivateGraphInstances(nodes: PositionedGraphNode[], edges: GraphEdge[]): { nodes: PositionedGraphNode[]; edges: GraphEdge[] } {
  const nextNodes = [...nodes];
  const nextEdges: GraphEdge[] = [];
  const nodeById = new Map(nextNodes.map((node) => [node.id, node]));
  const toolCalls = edges
    .filter((edge) => edge.from.endsWith('-agent') && isToolNodeId(edge.to))
    .sort(edgeOrderCompare)
    .map((edge) => ({ toolId: edge.to, agentId: edge.from, order: edge.order ?? 0 }));
  const toolCloneByCall = new Map<string, string>();

  const ensureNode = (node: PositionedGraphNode) => {
    if (!nodeById.has(node.id)) {
      nodeById.set(node.id, node);
      nextNodes.push(node);
    }
  };

  const ownerForToolEdge = (toolId: string, edge: GraphEdge): string | undefined => {
    if (edge.from.endsWith('-agent')) return edge.from;
    if (edge.to.endsWith('-agent')) return edge.to;
    const order = edge.order ?? Number.MAX_SAFE_INTEGER;
    return [...toolCalls]
      .filter((call) => call.toolId === toolId && call.order <= order + 0.01)
      .sort((left, right) => right.order - left.order)[0]?.agentId ?? toolCalls.find((call) => call.toolId === toolId)?.agentId;
  };

  const toolCloneId = (toolId: string, agentId: string): string => `${toolId}__for__${agentId}`;
  const cloneTool = (toolId: string, agentId: string): string => {
    const cloneId = toolCloneId(toolId, agentId);
    if (!toolCloneByCall.has(`${toolId}:${agentId}`)) {
      const base = nodeById.get(toolId) ?? fallbackRouteNode(toolId);
      ensureNode({
        ...base,
        id: cloneId,
        label: base.label,
        detail: `${base.detail ?? 'tool'} / ${agentLabels[agentId] ?? formatUnknownNodeLabel(agentId)}`,
        kind: 'tool',
        icon: base.icon,
        tone: 'tool',
      });
      toolCloneByCall.set(`${toolId}:${agentId}`, cloneId);
    }
    return cloneId;
  };

  for (const edge of edges) {
    const nextEdge = { ...edge };
    if (nextEdge.from === 'pipeline-executor' && nextEdge.to === 'lead-agent') continue;
    if (nodeById.get(nextEdge.from)?.kind === 'agent' && nodeById.get(nextEdge.to)?.kind === 'agent' && nextEdge.from !== 'lead-agent') {
      nextEdge.from = 'lead-agent';
      nextEdge.label = nextEdge.label ? `route ${nextEdge.label}` : 'route next agent';
    }
    if (isToolNodeId(nextEdge.to)) {
      const owner = ownerForToolEdge(nextEdge.to, edge);
      if (owner) nextEdge.to = cloneTool(nextEdge.to, owner);
    }
    if (isToolNodeId(nextEdge.from)) {
      const owner = ownerForToolEdge(nextEdge.from, edge);
      if (owner) nextEdge.from = cloneTool(nextEdge.from, owner);
    }
    nextEdges.push(nextEdge);
  }

  const hasEdge = (from: string, to: string, directions: GraphEdgeDirection[]) => nextEdges.some((edge) => edge.from === from && edge.to === to && directions.includes(edge.direction ?? 'call'));
  for (const edge of [...nextEdges]) {
    if ((edge.direction !== 'call' && edge.direction !== 'guard') || edge.to === 'assistant-response') continue;
    const source = nodeById.get(edge.from);
    const target = nodeById.get(edge.to);
    if (target?.kind === 'tool' && !hasEdge(edge.to, edge.from, ['return'])) {
      nextEdges.push({ from: edge.to, to: edge.from, status: edge.status, order: (edge.order ?? 80) + 0.18, label: 'tool result', direction: 'return' });
      continue;
    }
    if (source?.id === 'lead-agent' && target?.kind === 'agent') {
      if (!hasEdge(edge.to, 'task-context', ['write', 'return'])) {
        nextEdges.push({ from: edge.to, to: 'task-context', status: edge.status, order: (edge.order ?? 80) + 0.22, label: 'agent result', direction: 'write' });
      }
      if (!hasEdge('task-context', 'lead-agent', ['return'])) {
        nextEdges.push({ from: 'task-context', to: 'lead-agent', status: edge.status, order: (edge.order ?? 80) + 0.35, label: 'agent return', direction: 'return' });
      }
    }
  }

  const agentsWithPrivateHistory = new Set<string>();
  for (const edge of nextEdges) {
    if (nodeById.get(edge.from)?.kind === 'agent' && edge.from !== 'lead-agent' && edge.from !== 'storage-memory-agent') agentsWithPrivateHistory.add(edge.from);
    if (nodeById.get(edge.to)?.kind === 'agent' && edge.to !== 'lead-agent' && edge.to !== 'storage-memory-agent') agentsWithPrivateHistory.add(edge.to);
  }

  for (const agentId of agentsWithPrivateHistory) {
    const agentNode = nodeById.get(agentId);
    if (!agentNode) continue;
    const historyId = `history-agent__for__${agentId}`;
    ensureNode({
      id: historyId,
      label: 'His agent',
      kind: 'text',
      status: agentNode.status,
      detail: `History riêng của ${agentNode.label}`,
      x: agentNode.x,
      y: agentNode.y,
      icon: 'history',
      tone: 'memory',
      order: (agentNode.order ?? 0) + 0.2,
    });
    const firstOrder = Math.min(...nextEdges.filter((edge) => edge.from === agentId || edge.to === agentId).map((edge) => edge.order ?? 80), 80);
    nextEdges.push(
      { from: agentId, to: historyId, status: agentNode.status, order: firstOrder + 0.03, label: 'read private history', direction: 'data' },
      { from: historyId, to: agentId, status: agentNode.status, order: firstOrder + 0.06, label: 'history context', direction: 'return' },
    );
  }

  return { nodes: nextNodes.filter((node) => !isToolNodeId(node.id) || node.id.includes('__for__')), edges: nextEdges };
}

function isToolNodeId(id: string): boolean {
  return id.startsWith('tool-') || id.endsWith('-tool') || id.includes('tool');
}

function compactVisibleGraphNodes(nodes: PositionedGraphNode[]): PositionedGraphNode[] {
  const toolNodes = nodes
    .filter((node) => node.kind === 'tool')
    .sort((left, right) => (left.order ?? 999) - (right.order ?? 999) || left.label.localeCompare(right.label));
  let normalizedNodes = nodes;
  if (toolNodes.length > 12) {
    const keptToolIds = new Set(toolNodes.slice(0, 12).map((node) => node.id));
    const hiddenToolCount = toolNodes.length - keptToolIds.size;
    normalizedNodes = [
      ...nodes.filter((node) => node.kind !== 'tool' || keptToolIds.has(node.id)),
      {
        id: 'grouped-tool-nodes',
        label: 'Tool khác',
        kind: 'tool',
        status: toolNodes.some((node) => node.status === 'error') ? 'error' : toolNodes.some((node) => node.status === 'blocked') ? 'blocked' : 'completed',
        detail: `${hiddenToolCount} tool đã gom`,
        x: 88,
        y: 88,
        icon: `+${hiddenToolCount}`,
        tone: 'tool',
      },
    ];
  }

  if (normalizedNodes.length <= maxVisibleTraceNodes) return normalizedNodes;
  const priorityNodes = normalizedNodes
    .filter((node) => node.kind === 'agent' || node.kind === 'tool' || isImportantSupportNode(node.id))
    .sort((left, right) => graphNodePriority(left) - graphNodePriority(right) || (left.order ?? 999) - (right.order ?? 999));
  const priorityIds = new Set(priorityNodes.map((node) => node.id));
  const runtimeNodes = normalizedNodes.filter((node) => !priorityIds.has(node.id));
  const runtimeSlots = Math.min(Math.max(maxVisibleTraceNodes - 1 - priorityNodes.length, 0), 3);
  const kept = [...priorityNodes, ...runtimeNodes.slice(0, runtimeSlots)].slice(0, maxVisibleTraceNodes - 1);
  const keptIds = new Set(kept.map((node) => node.id));
  const hiddenNodes = normalizedNodes.filter((node) => !keptIds.has(node.id));
  const hiddenRuntimeCount = hiddenNodes.filter((node) => ['tool', 'service', 'db', 'vector_db', 'llm', 'text', 'file'].includes(node.kind)).length;
  if (hiddenNodes.length <= 2 || priorityNodes.length >= maxVisibleTraceNodes - 1) return kept;
  return [
    ...kept,
    {
      id: 'grouped-runtime-nodes',
      label: 'Nhóm runtime',
      kind: 'service',
      status: hiddenNodes.some((node) => node.status === 'error') ? 'error' : hiddenNodes.some((node) => node.status === 'blocked') ? 'blocked' : 'completed',
      detail: `${hiddenRuntimeCount || hiddenNodes.length} node được gom`,
      x: 88,
      y: 82,
      icon: `+${hiddenRuntimeCount || hiddenNodes.length}`,
      tone: 'router',
    },
  ];
}

function augmentPipelineNodes(trace: AgentTrace, nodes: PositionedGraphNode[]): PositionedGraphNode[] {
  if (!trace.pipeline?.length) return nodes;
  const nextNodes = [...nodes];
  const nodeIds = new Set(nextNodes.map((node) => node.id));
  const lastPipelineEventByAgent = new Map<string, NonNullable<AgentTrace['pipeline']>[number]>();
  for (const event of trace.pipeline) lastPipelineEventByAgent.set(event.agent, event);

  for (const [agent, event] of lastPipelineEventByAgent) {
    if (nodeIds.has(agent)) continue;
    const fallback = fallbackGraphNodes[agent];
    const layout = buildNodeLayout([agent]).get(agent) ?? fallback ?? { x: 50, y: 50 };
    nextNodes.push({
      id: agent,
      label: agentLabels[agent] ?? formatUnknownNodeLabel(agent),
      kind: 'agent',
      status: event.status,
      detail: `${event.stage}: ${event.summary.slice(0, 48)}`,
      x: layout.x,
      y: layout.y,
      icon: fallback?.icon ?? shortCodeFromId(agent),
      tone: fallback?.tone,
      order: 100 + nextNodes.length,
    });
    nodeIds.add(agent);
  }

  return spreadNearbyNodes(nextNodes);
}

function selectVisibleGraphEdges(graphEdges: GraphEdge[], nodeIds: Set<string>, limit: number): GraphEdge[] {
  const filteredEdges = graphEdges
    .filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to))
    .sort(edgeOrderCompare);

  if (filteredEdges.length <= limit) return filteredEdges;

  const selectedEdges = new Map<string, GraphEdge>();
  const importantEdges = filteredEdges.filter((edge) => isAnswerPathEdge(edge) || isPipelinePathEdge(edge));
  const importantKeys = new Set(importantEdges.map(edgeIdentityKey));

  for (const edge of filteredEdges.slice(0, limit)) selectedEdges.set(edgeIdentityKey(edge), edge);
  for (const edge of importantEdges) selectedEdges.set(edgeIdentityKey(edge), edge);
  for (const edge of filteredEdges) {
    const reverseSelected = [...selectedEdges.values()].some((selectedEdge) => selectedEdge.from === edge.to && selectedEdge.to === edge.from);
    const samePairSelected = [...selectedEdges.values()].some((selectedEdge) => edgePairKey(selectedEdge) === edgePairKey(edge));
    const isReturnOrWrite = edge.direction === 'return' || edge.direction === 'write';
    const isTaskOrSessionEdge = edge.from === 'task-context' || edge.to === 'task-context' || edge.from === 'session-context' || edge.to === 'session-context';
    if ((reverseSelected && isReturnOrWrite) || (samePairSelected && isTaskOrSessionEdge)) selectedEdges.set(edgeIdentityKey(edge), edge);
  }

  while (selectedEdges.size > limit) {
    const removable = [...selectedEdges.values()].reverse().find((edge) => !importantKeys.has(edgeIdentityKey(edge)));
    if (!removable) break;
    selectedEdges.delete(edgeIdentityKey(removable));
  }

  return [...selectedEdges.values()].sort(edgeOrderCompare).slice(0, limit);
}

function simplifyCanvasEdges(edges: GraphEdge[]): GraphEdge[] {
  const selected = new Map<string, GraphEdge>();
  const add = (edge: GraphEdge) => selected.set(edgeIdentityKey(edge), edge);

  for (const edge of edges.sort(edgeOrderCompare)) {
    const fromAgent = edge.from.endsWith('-agent');
    const toAgent = edge.to.endsWith('-agent');
    const fromTool = edge.from.startsWith('tool-') || edge.from.endsWith('-tool') || edge.from.includes('tool');
    const toTool = edge.to.startsWith('tool-') || edge.to.endsWith('-tool') || edge.to.includes('tool');
    const fromDb = edge.from.includes('db') || edge.from === 'llm-service' || edge.from === 'cart-state';
    const toDb = edge.to.includes('db') || edge.to === 'llm-service' || edge.to === 'cart-state';

    if (edge.from === 'pipeline-executor' && edge.to === 'session-context') { add(edge); continue; }
    if (edge.from === 'session-context' && edge.to === 'task-context') { add(edge); continue; }
    if (edge.from === 'task-context' && edge.to === 'lead-agent') { add(edge); continue; }
    if (edge.to === 'assistant-response' || edge.from === 'assistant-response') { add(edge); continue; }

    // Task/session read-write edges are important, but drawing all of them creates
    // spaghetti. Keep their counts inside node badges and popup details instead.
    if (edge.from === 'task-context' || edge.to === 'task-context' || edge.from === 'session-context' || edge.to === 'session-context') continue;

    if (edge.from === 'lead-agent' && toAgent) { add(edge); continue; }
    if (fromAgent && toTool) { add(edge); continue; }
    if (fromTool && (toDb || toAgent)) { add(edge); continue; }
    if (fromDb && toTool) { add(edge); continue; }
    if (fromAgent && toDb) { add(edge); continue; }
    if (fromDb && toAgent) { add(edge); continue; }
    if (fromAgent && toAgent && (edge.direction === 'call' || edge.direction === 'guard')) { add(edge); continue; }
  }

  return [...selected.values()].sort(edgeOrderCompare).slice(0, 34);
}

function isAnswerPathEdge(edge: GraphEdge): boolean {
  const importantIds = new Set(['sales-agent', 'llm-service', 'llm-call', 'assistant-response']);
  return importantIds.has(edge.from) || importantIds.has(edge.to);
}

function isPipelinePathEdge(edge: GraphEdge): boolean {
  const pipelineIds = new Set([
    'pipeline-executor',
    'memory-agent',
    'memory-result',
    'user-analysis-agent',
    'analysis-result',
    'product-manager-agent',
    'product-result',
    'recommendation-agent',
    'recommendation-result',
    'rag-agent',
    'rag-context',
    'cart-manager-agent',
    'cart-agent',
    'sales-evaluator-agent',
  ]);
  return pipelineIds.has(edge.from) || pipelineIds.has(edge.to);
}

function edgeIdentityKey(edge: GraphEdge): string {
  return `${edge.from}->${edge.to}:${edge.order ?? 'na'}:${edge.direction ?? 'call'}:${edge.label ?? ''}`;
}

function edgeOrderCompare(left: GraphEdge, right: GraphEdge): number {
  return (left.order ?? 0) - (right.order ?? 0) || edgeIdentityKey(left).localeCompare(edgeIdentityKey(right));
}

function buildReadableTraceEdges(edges: GraphEdge[], playbackEvents: GraphPlaybackEvent[], nodeById: Map<string, PositionedGraphNode>): GraphEdge[] {
  const sourceEdges = playbackEvents.length
    ? playbackEvents.map((event) => ({
      from: event.from,
      to: event.to,
      status: event.status,
      order: event.order,
      label: event.label,
      direction: event.direction,
    }))
    : edges;
  const readableEdges = sourceEdges
    .filter((edge) => edge.status !== 'skipped')
    .filter((edge) => isTraceCriticalEdge(edge))
    .sort(edgeOrderCompare);
  return readableEdges;
}

function isTraceCriticalEdge(edge: GraphEdge): boolean {
  if (edge.from === edge.to) return false;
  if (edge.from === 'task-context' && edge.direction === 'data' && !edge.to.endsWith('-agent') && !['assistant-response'].includes(edge.to)) return false;
  if (edge.to === 'task-context' || edge.from === 'task-context') return true;
  if (edge.direction === 'return' || edge.direction === 'write' || edge.direction === 'guard') return true;
  if (edge.from === 'lead-agent') return true;
  if (edge.from.endsWith('-agent') && edge.to.endsWith('-agent')) return true;
  return ['postgres-db', 'qdrant-db', 'llm-service', 'assistant-response'].includes(edge.from) || ['postgres-db', 'qdrant-db', 'llm-service', 'assistant-response'].includes(edge.to);
}

function uniqueRouteAgents(edges: GraphEdge[]): string[] {
  const agents = new Set<string>();
  for (const edge of edges) {
    if (edge.from.endsWith('-agent')) agents.add(edge.from);
    if (edge.to.endsWith('-agent')) agents.add(edge.to);
  }
  return [...agents];
}

function formatTraceStatus(status: string | undefined): string {
  if (status === 'error') return 'lỗi';
  if (status === 'blocked') return 'chặn';
  if (status === 'running') return 'đang chạy';
  if (status === 'pending') return 'chờ';
  if (status === 'skipped') return 'bỏ qua';
  return 'xong';
}

function formatCompactNodeLabel(node: PositionedGraphNode): string {
  if (node.id === 'pipeline-executor') return 'Executor';
  if (node.id === 'task-context') return 'Task';
  if (node.id === 'session-context') return 'His chung';
  if (node.id === 'storage-memory-agent') return 'His chung';
  if (node.id === 'history-agent') return 'His agent';
  if (node.id === 'postgres-db') return 'Postgres';
  if (node.id === 'qdrant-db') return 'Qdrant';
  if (node.id === 'llm-service' || node.kind === 'llm') return 'LLM';
  if (node.id === 'grouped-runtime-nodes') return 'Runtime';
  if (node.kind === 'tool') return 'Tool';
  if (node.kind === 'service') return 'Service';
  if (node.kind === 'text') return 'Text';
  if (node.kind === 'db' || node.kind === 'vector_db') return node.icon;
  const words = node.label.split(/\s+/).filter(Boolean);
  if (words.length <= 2 && node.label.length <= 14) return node.label;
  return words.slice(0, 2).join(' ');
}

function TracePlaybackCanvas({
  nodes,
  events,
}: {
  nodes: PositionedGraphNode[];
  events: GraphPlaybackEvent[];
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playbackPairCounts = useMemo(() => buildEdgePairCounts(events), [events]);
  const playbackObstacles = useMemo(() => nodes.length > 24 ? nodes.filter((node) => node.kind === 'agent' || node.kind === 'tool') : nodes, [nodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const context = canvas?.getContext('2d');
    if (!canvas || !host || !context) return;

    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const playableEvents = uniquePlaybackEvents(events.filter((event) => nodeById.has(event.from) && nodeById.has(event.to)));
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let animationFrame = 0;
    let startTime = performance.now();
    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      const rect = host.getBoundingClientRect();
      dpr = window.devicePixelRatio || 1;
      width = Math.max(rect.width, 1);
      height = Math.max(rect.height, 1);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      if (!playableEvents.length) return;

      const loopMs = reducedMotion ? 4800 : 2533;
      const elapsed = time - startTime;
      const visiblePlayEvents = playableEvents.slice(0, 56);
      visiblePlayEvents.forEach((event, index) => {
        const fromNode = nodeById.get(event.from);
        const toNode = nodeById.get(event.to);
        if (!fromNode || !toNode) return;
        const offsetProgress = ((elapsed + index * 170) % loopMs) / loopMs;
        drawPlaybackSegment(context, fromNode, toNode, event, offsetProgress, width, height, playbackPairCounts, playbackObstacles);
      });
      animationFrame = window.requestAnimationFrame(draw);
    };

    resize();
    startTime = performance.now();
    window.addEventListener('resize', resize);
    animationFrame = window.requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [nodes, events, playbackPairCounts, playbackObstacles]);

  return <canvas className="agent-playback-canvas" ref={canvasRef} aria-hidden="true" />;
}

function uniquePlaybackEvents(events: GraphPlaybackEvent[]): GraphPlaybackEvent[] {
  const byPath = new Map<string, GraphPlaybackEvent>();
  for (const event of events) {
    const key = `${event.from}->${event.to}:${edgeFlowTone(event.direction)}`;
    if (!byPath.has(key)) byPath.set(key, event);
  }
  return [...byPath.values()].sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
}

function buildPlaybackEvents(_trace: AgentTrace, edges: GraphEdge[], nodeIds: Set<string>): GraphPlaybackEvent[] {
  const edgeEvents = edges.map((edge, index) => ({
      id: `${edge.from}-${edge.to}-${edge.order ?? index}`,
      from: edge.from,
      to: edge.to,
      order: edge.order ?? index + 1,
      direction: edge.direction ?? 'call',
      status: edge.status,
      label: edge.label,
  }));
  const sourceEvents = _trace.playbackEvents?.length
    ? [..._trace.playbackEvents, ...edgeEvents]
    : edgeEvents;

  return uniquePlaybackEvents(sourceEvents
    .filter((event) => nodeIds.has(event.from) && nodeIds.has(event.to))
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id)))
    .slice(0, 72);
}

function drawPlaybackSegment(
  context: CanvasRenderingContext2D,
  fromNode: PositionedGraphNode,
  toNode: PositionedGraphNode,
  event: GraphPlaybackEvent,
  progress: number,
  width: number,
  height: number,
  pairCounts: Map<string, number>,
  obstacles: PositionedGraphNode[],
) {
  const from = { x: (fromNode.x / 100) * width, y: (fromNode.y / 100) * height };
  const to = { x: (toNode.x / 100) * width, y: (toNode.y / 100) * height };
  const controlPercent = graphEdgeControlPoint(fromNode, toNode, event, pairCounts, obstacles);
  const control = { x: (controlPercent.x / 100) * width, y: (controlPercent.y / 100) * height };
  const color = playbackColor(event.direction);

  context.save();
  drawFlowDot(context, quadraticPoint(from, control, to, progress), color.dot, color.glow, 3.4, 0.95);
  drawFlowDot(context, quadraticPoint(from, control, to, wrapProgress(progress - 0.18)), color.dot, color.glow, 2.25, 0.46);
  context.restore();
}

function drawFlowDot(
  context: CanvasRenderingContext2D,
  point: { x: number; y: number },
  fill: string,
  glow: string,
  radius: number,
  alpha: number,
) {
  context.globalAlpha = alpha;
  context.shadowColor = glow;
  context.shadowBlur = 9;
  context.fillStyle = fill;
  context.beginPath();
  context.arc(point.x, point.y, radius, 0, Math.PI * 2);
  context.fill();
  context.shadowBlur = 0;
  context.globalAlpha = Math.min(alpha + 0.16, 1);
  context.strokeStyle = glow;
  context.lineWidth = 1;
  context.beginPath();
  context.arc(point.x, point.y, radius + 2.6, 0, Math.PI * 2);
  context.stroke();
  context.globalAlpha = 1;
}

function quadraticPoint(
  from: { x: number; y: number },
  control: { x: number; y: number },
  to: { x: number; y: number },
  progress: number,
): { x: number; y: number } {
  const inverse = 1 - progress;
  return {
    x: inverse * inverse * from.x + 2 * inverse * progress * control.x + progress * progress * to.x,
    y: inverse * inverse * from.y + 2 * inverse * progress * control.y + progress * progress * to.y,
  };
}

function playbackColor(direction: GraphEdgeDirection): { stroke: string; glow: string; dot: string; ring: string } {
  if (edgeFlowTone(direction) === 'return') return { stroke: 'rgba(56, 189, 248, 0.95)', glow: 'rgba(56, 189, 248, 0.44)', dot: '#7dd3fc', ring: 'rgba(125, 211, 252, 0.4)' };
  return { stroke: 'rgba(34, 197, 94, 0.92)', glow: 'rgba(34, 197, 94, 0.38)', dot: '#4ade80', ring: 'rgba(74, 222, 128, 0.34)' };
}

function edgeFlowTone(direction: GraphEdgeDirection | undefined): 'call' | 'return' {
  return direction === 'return' ? 'return' : 'call';
}

function wrapProgress(value: number): number {
  return ((value % 1) + 1) % 1;
}

function GraphLegend() {
  return (
    <div className="graph-legend" aria-label="Chu giai duong di va loai node">
      <b>Chú thích</b>
      <span className="call">Gửi đi</span>
      <span className="return">Trả về</span>
      <span className="shape">
        <i className="graph-legend-icon"><NodeIconSvg node={{ id: 'pipeline-executor', label: 'Flow', kind: 'service', status: 'completed', x: 0, y: 0, icon: '', tone: 'service' }} /></i>
        Flow
      </span>
      <span className="shape">
        <i className="graph-legend-icon"><NodeIconSvg node={{ id: 'search-agent', label: 'Agent', kind: 'agent', status: 'completed', x: 0, y: 0, icon: '', tone: 'search' }} /></i>
        Agent
      </span>
      <span className="shape">
        <i className="graph-legend-icon"><NodeIconSvg node={{ id: 'lead-agent', label: 'Lead', kind: 'agent', status: 'completed', x: 0, y: 0, icon: '' }} /></i>
        Lead
      </span>
      <span className="shape">
        <i className="graph-legend-icon db"><NodeIconSvg node={{ id: 'postgres-db', label: 'DB', kind: 'db', status: 'completed', x: 0, y: 0, icon: '' }} /></i>
        DB
      </span>
      <span className="shape">
        <i className="graph-legend-icon tool"><NodeIconSvg node={{ id: 'tool-demo__for__search-agent', label: 'Tool', kind: 'tool', status: 'completed', x: 0, y: 0, icon: '' }} /></i>
        Tool
      </span>
      <span className="shape">
        <i className="graph-legend-icon llm"><NodeIconSvg node={{ id: 'llm-service', label: 'LLM', kind: 'llm', status: 'completed', x: 0, y: 0, icon: '' }} /></i>
        LLM
      </span>
      <span className="shape">
        <i className="graph-legend-icon"><NodeIconSvg node={{ id: 'task-context', label: 'Task', kind: 'text', status: 'completed', x: 0, y: 0, icon: '' }} /></i>
        Task
      </span>
      <span className="shape">
        <i className="graph-legend-icon"><NodeIconSvg node={{ id: 'session-context', label: 'His chung', kind: 'text', status: 'completed', x: 0, y: 0, icon: '' }} /></i>
        His chung
      </span>
      <span className="shape">
        <i className="graph-legend-icon"><NodeIconSvg node={{ id: 'history-agent__for__search-agent', label: 'His agent', kind: 'text', status: 'completed', x: 0, y: 0, icon: '' }} /></i>
        His agent
      </span>
      <span className="shape">
        <i className="graph-legend-icon response"><NodeIconSvg node={{ id: 'assistant-response', label: 'Response', kind: 'text', status: 'completed', x: 0, y: 0, icon: '' }} /></i>
        Phản hồi
      </span>
    </div>
  );
}

function GraphEdgeOrderBadges({
  nodes,
  edges,
  pairCounts,
  onSelect,
}: {
  nodes: PositionedGraphNode[];
  edges: GraphEdge[];
  pairCounts: Map<string, number>;
  onSelect: (detail: GraphDetail) => void;
}) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const orderedEdges = [...edges].sort(edgeOrderCompare);
  const sourceEdgeCounts = new Map<string, number>();
  return (
    <>
      {orderedEdges.map((edge, index) => {
        if (!shouldShowCanvasBadge(edge)) return null;
        const from = nodeById.get(edge.from);
        const to = nodeById.get(edge.to);
        if (!from || !to) return null;
        const sourceIndex = sourceEdgeCounts.get(edge.from) ?? 0;
        sourceEdgeCounts.set(edge.from, sourceIndex + 1);
        const point = edgeBadgePoint(from, to, edge, pairCounts, index, sourceIndex);
        return (
          <button
            type="button"
            className={`edge-order-badge ${edge.direction ?? 'call'} ${edgeFlowTone(edge.direction)}`}
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
            title={`${String(index + 1).padStart(2, '0')} ${routeNodeName(edge.from, nodeById)} -> ${routeNodeName(edge.to, nodeById)}: ${formatEdgeLabel(edge.label)}`}
            aria-label={`Buoc ${index + 1}: ${routeNodeName(edge.from, nodeById)} den ${routeNodeName(edge.to, nodeById)}`}
            onClick={() => onSelect(detailFromEdge(edge, from, to))}
            key={`${edge.from}-${edge.to}-${edge.order ?? index}-badge`}
          >
            {String(index + 1).padStart(2, '0')}
          </button>
        );
      })}
    </>
  );
}

function buildNodeStepBadges(edges: GraphEdge[]): Map<string, string[]> {
  const badges = new Map<string, string[]>();
  const orderedEdges = [...edges].sort(edgeOrderCompare);
  orderedEdges.forEach((edge, index) => {
    if (!shouldShowNodeStepNumber(edge)) return;
    const current = badges.get(edge.from) ?? [];
    current.push(String(index + 1).padStart(2, '0'));
    badges.set(edge.from, current);
  });
  return badges;
}

function shouldShowNodeStepNumber(edge: GraphEdge): boolean {
  if (edge.from === 'task-context' && edge.direction === 'data' && edge.to !== 'lead-agent') return false;
  if (edge.from === 'task-context' && edge.to === 'lead-agent') {
    return ['session context', 'analysis return', 'final answer ready'].includes(edge.label ?? '');
  }
  return true;
}

function shouldShowCanvasBadge(edge: GraphEdge): boolean {
  if (edge.from === 'task-context' && edge.direction === 'data' && edge.to !== 'lead-agent') return false;
  if (edge.from === 'task-context' && edge.to === 'lead-agent') {
    return ['session context', 'analysis return', 'final answer ready'].includes(edge.label ?? '');
  }
  return true;
}

function edgeBadgePoint(from: PositionedGraphNode, to: PositionedGraphNode, edge: GraphEdge, pairCounts: Map<string, number>, index: number, sourceIndex: number): { x: number; y: number } {
  const hasReverseOrPair = (pairCounts.get(edgePairKey(edge)) ?? 0) > 1;
  const baseOffset = edgeFlowTone(edge.direction) === 'return' ? -4 : 4;
  const offset = hasReverseOrPair ? baseOffset : 0;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const normalX = (-dy / length) * offset;
  const normalY = (dx / length) * offset;
  const lane = (sourceIndex % 5) - 2;
  const row = Math.floor(sourceIndex / 5);
  const horizontal = lane * 1.35 + ((index % 2) * 0.35);
  const vertical = 4.5 + row * 2.8;
  return {
    x: clampPercent(from.x + normalX + horizontal, 4, 96),
    y: clampPercent(from.y + normalY - vertical, 6, 94),
  };
}

function GraphRouteTimeline({
  trace,
  nodes,
  edges,
  onSelect,
}: {
  trace: AgentTrace;
  nodes: PositionedGraphNode[];
  edges: GraphEdge[];
  onSelect: (detail: GraphDetail) => void;
}) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const orderedEdges = [...edges].sort(edgeOrderCompare);
  const chipEdges = selectTimelineChipEdges(orderedEdges, 8);

  return (
    <div className="graph-route-summary" aria-label="Tóm tắt luồng agent">
      <div>
        <strong>{trace.intent}</strong>
        <span>{nodes.length} node · {edges.length} cạnh · {trace.errors.length ? `${trace.errors.length} lỗi` : 'ổn'}</span>
      </div>
      <div className="route-chip-row" aria-label="Thứ tự flow theo trace backend">
        {chipEdges.map((edge, index) => (
          <button
            type="button"
            className={`route-chip ${edge.direction ?? 'call'} ${edgeFlowTone(edge.direction)}`}
            key={`${edge.from}-${edge.to}-${edge.order ?? index}`}
            title={`${directionLabel(edge.direction)} ${routeNodeName(edge.from, nodeById)} -> ${routeNodeName(edge.to, nodeById)} (${formatEdgeLabel(edge.label)})`}
            onClick={() => onSelect(detailFromEdge(edge, nodeById.get(edge.from) ?? fallbackRouteNode(edge.from), nodeById.get(edge.to) ?? fallbackRouteNode(edge.to)))}
          >
            <span>{String(orderedEdges.findIndex((item) => edgeIdentityKey(item) === edgeIdentityKey(edge)) + 1).padStart(2, '0')}</span>
            <strong>{routeNodeName(edge.from, nodeById)} -&gt; {routeNodeName(edge.to, nodeById)}</strong>
          </button>
        ))}
        <button type="button" className="route-chip more" onClick={() => onSelect(fullRouteDetail(trace, nodes, orderedEdges))}>
          <span>{edges.length}</span>
          <strong>Chi tiết luồng</strong>
        </button>
      </div>
    </div>
  );
}

function routeNodeName(id: string, nodeById: Map<string, PositionedGraphNode>): string {
  const node = nodeById.get(id);
  return compactRouteName(node ? formatCompactNodeLabel(node) : formatUnknownNodeLabel(id));
}

function selectTimelineChipEdges(orderedEdges: GraphEdge[], limit: number): GraphEdge[] {
  if (orderedEdges.length <= limit) return orderedEdges;

  const selectedEdges = new Map<string, GraphEdge>();
  const importantEdges = uniqueAnswerPathEdges(orderedEdges);
  const importantKeys = new Set(importantEdges.map(edgeIdentityKey));

  for (const edge of orderedEdges.slice(0, 2)) selectedEdges.set(edgeIdentityKey(edge), edge);
  for (const edge of importantEdges) selectedEdges.set(edgeIdentityKey(edge), edge);

  while (selectedEdges.size > limit) {
    const removable = [...selectedEdges.values()].reverse().find((edge) => !importantKeys.has(edgeIdentityKey(edge)));
    if (!removable) break;
    selectedEdges.delete(edgeIdentityKey(removable));
  }

  return [...selectedEdges.values()].sort(edgeOrderCompare);
}

function uniqueAnswerPathEdges(orderedEdges: GraphEdge[]): GraphEdge[] {
  const seenPairs = new Set<string>();
  return orderedEdges.filter((edge) => {
    if (!isAnswerPathEdge(edge)) return false;
    const pairKey = `${edge.from}->${edge.to}:${edge.direction ?? 'call'}`;
    if (seenPairs.has(pairKey)) return false;
    seenPairs.add(pairKey);
    return true;
  });
}

function fallbackRouteNode(id: string): PositionedGraphNode {
  return { id, label: formatUnknownNodeLabel(id), kind: 'service', status: 'completed', x: 0, y: 0, icon: shortCodeFromId(id) };
}

function NodeIconSvg({ node }: { node: PositionedGraphNode }) {
  const icon = nodeIconKind(node);
  return (
    <svg className="agent-icon-svg" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      {icon === 'flow' ? (
        <>
          <rect x="4" y="4" width="6" height="6" rx="2" />
          <rect x="14" y="4" width="6" height="6" rx="2" />
          <rect x="9" y="14" width="6" height="6" rx="2" />
          <path d="M10 7h4M17 10v2.4L13.6 14M7 10v2.4L10.4 14" />
        </>
      ) : icon === 'lead' ? (
        <>
          <path d="M4 17h16l-1.5-9-4.1 4.2L12 5l-2.4 7.2L5.5 8 4 17Z" />
          <path d="M6 19h12" />
        </>
      ) : icon === 'db' ? (
        <>
          <ellipse cx="12" cy="6" rx="7" ry="3" />
          <path d="M5 6v9c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
          <path d="M5 10c0 1.7 3.1 3 7 3s7-1.3 7-3" />
        </>
      ) : icon === 'tool' ? (
        <>
          <path d="M14.7 5.3a4 4 0 0 0 4.9 4.9L11 18.8 6.2 14l8.5-8.7Z" />
          <path d="M5 19l3.5-3.5" />
        </>
      ) : icon === 'llm' ? (
        <>
          <rect x="6" y="7" width="12" height="10" rx="4" />
          <circle cx="10" cy="12" r="1" />
          <circle cx="14" cy="12" r="1" />
          <path d="M12 4v3M8 17l-2 3M16 17l2 3M8.5 15.5h7" />
        </>
      ) : icon === 'session' ? (
        <>
          <path d="M5 6h11v7H9l-4 4V6Z" />
          <path d="M12 10h7v6l-3-2h-4" />
          <path d="M8 9h5" />
        </>
      ) : icon === 'task' ? (
        <>
          <rect x="5" y="4" width="14" height="17" rx="3" />
          <path d="M9 4.5h6M8.5 10h7M8.5 14h6" />
        </>
      ) : icon === 'analysis' ? (
        <>
          <path d="M5 18V6" />
          <path d="M8 18v-6M12 18V8M16 18v-9M20 18H4" />
          <circle cx="16" cy="6" r="2" />
        </>
      ) : icon === 'history' ? (
        <>
          <path d="M5 7v5h5" />
          <path d="M5.8 12A6.2 6.2 0 1 0 8 7.3L5 10.2" />
          <path d="M12 8.5v4l3 1.8" />
        </>
      ) : icon === 'memory' ? (
        <>
          <path d="M7 7c0-1.4 2.2-2.5 5-2.5S17 5.6 17 7s-2.2 2.5-5 2.5S7 8.4 7 7Z" />
          <path d="M7 7v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V7" />
          <path d="M6 18c.8-1.8 2.8-3 6-3s5.2 1.2 6 3" />
          <circle cx="8" cy="18.5" r="1.4" />
          <circle cx="16" cy="18.5" r="1.4" />
        </>
      ) : icon === 'response' ? (
        <>
          <path d="M5 6h14v10H9l-4 4V6Z" />
          <path d="M9 10h6M9 13h4" />
        </>
      ) : icon === 'search' ? (
        <>
          <circle cx="10.5" cy="10.5" r="5.5" />
          <path d="M15 15l4 4" />
        </>
      ) : icon === 'recommendation' ? (
        <path d="m12 4 2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7L12 4Z" />
      ) : icon === 'security' ? (
        <path d="M12 3.5 19 6v5.3c0 4.1-2.7 7.2-7 9.2-4.3-2-7-5.1-7-9.2V6l7-2.5Z" />
      ) : icon === 'support' ? (
        <>
          <path d="M5 13v-1a7 7 0 0 1 14 0v1" />
          <path d="M5 13h3v5H5zM16 13h3v5h-3zM16 18c0 1.2-1.8 2-4 2" />
        </>
      ) : icon === 'cart' ? (
        <>
          <path d="M6 6h15l-2 8H8L6 3H3" />
          <circle cx="9" cy="19" r="1.5" />
          <circle cx="18" cy="19" r="1.5" />
        </>
      ) : icon === 'sales' ? (
        <>
          <path d="M4 5h9l7 7-8 8-8-8V5Z" />
          <circle cx="9" cy="9" r="1.5" />
        </>
      ) : (
        <>
          <rect x="5" y="5" width="14" height="14" rx="4" />
          <path d="M9 5V3M15 5V3M9 21v-2M15 21v-2M5 9H3M5 15H3M21 9h-2M21 15h-2" />
        </>
      )}
    </svg>
  );
}

function nodeIconKind(node: PositionedGraphNode): string {
  if (node.id === 'pipeline-executor') return 'flow';
  if (node.id === 'lead-agent') return 'lead';
  if (node.id === 'session-context') return 'session';
  if (node.id === 'task-context') return 'task';
  if (node.id === 'assistant-response') return 'response';
  if (node.id.includes('history-agent__for__') || node.id === 'history-agent') return 'history';
  if (node.id === 'user-analysis-agent') return 'analysis';
  if (node.id === 'storage-memory-agent' || node.id.includes('memory')) return 'memory';
  if (node.id === 'postgres-db' || node.id === 'qdrant-db' || node.kind === 'db' || node.kind === 'vector_db') return 'db';
  if (node.id === 'llm-service' || node.kind === 'llm') return 'llm';
  if (node.kind === 'tool') return 'tool';
  if (node.tone === 'search' || node.tone === 'rag' || node.id.includes('search') || node.id.includes('rag')) return 'search';
  if (node.tone === 'recommendation' || node.id.includes('recommendation')) return 'recommendation';
  if (node.tone === 'security' || node.id.includes('security')) return 'security';
  if (node.tone === 'support' || node.id.includes('support')) return 'support';
  if (node.tone === 'cart' || node.id.includes('cart')) return 'cart';
  if (node.tone === 'sales' || node.id.includes('sales')) return 'sales';
  return 'agent';
}

function nodeGlyphClass(node: PositionedGraphNode): string {
  if (node.id === 'lead-agent') return 'glyph-lead';
  if (node.id === 'pipeline-executor') return 'glyph-flow';
  if (node.id === 'session-context') return 'glyph-context';
  if (node.id === 'task-context') return 'glyph-task';
  if (node.id === 'assistant-response') return 'glyph-response';
  if (node.id === 'postgres-db') return 'glyph-postgres';
  if (node.id === 'qdrant-db') return 'glyph-qdrant';
  if (node.id === 'llm-service' || node.kind === 'llm') return 'glyph-llm';
  if (node.kind === 'db') return 'glyph-db';
  if (node.kind === 'vector_db') return 'glyph-vector-db';
  if (node.kind === 'tool') return 'glyph-tool';
  if (node.tone === 'memory' || node.id.includes('memory') || node.id.includes('history')) return node.id.includes('history') ? 'glyph-history' : 'glyph-memory';
  if (node.tone === 'search' || node.tone === 'rag' || node.id.includes('search') || node.id.includes('rag')) return 'glyph-search';
  if (node.tone === 'recommendation' || node.id.includes('recommendation')) return 'glyph-recommendation';
  if (node.tone === 'security' || node.id.includes('security')) return 'glyph-security';
  if (node.tone === 'support' || node.id.includes('support')) return 'glyph-support';
  if (node.tone === 'cart' || node.id.includes('cart')) return 'glyph-cart';
  if (node.tone === 'sales' || node.id.includes('sales')) return 'glyph-sales';
  if (node.kind === 'text' || node.kind === 'file') return 'glyph-document';
  return 'glyph-agent';
}

function GraphRouteSummary({
  trace,
  nodes,
  edges,
  onSelect,
}: {
  trace: AgentTrace;
  nodes: PositionedGraphNode[];
  edges: GraphEdge[];
  onSelect: (detail: GraphDetail) => void;
}) {
  return (
    <div className="graph-route-summary" aria-label="Tóm tắt luồng agent">
      <div>
        <strong>{trace.intent}</strong>
        <span>{nodes.length} node · {edges.length} cạnh · {trace.errors.length ? `${trace.errors.length} lỗi` : 'ổn'}</span>
      </div>
      <button type="button" className="route-chip more" onClick={() => onSelect(fullRouteDetail(trace, nodes, edges))}>
        <span>{edges.length}</span>
        <strong>Chi tiết luồng</strong>
      </button>
    </div>
  );
}

function GraphClusterRegions({ clusters, onSelect }: { clusters: GraphCluster[]; onSelect: (detail: GraphDetail) => void }) {
  return (
    <div className="agent-graph-clusters" aria-label="Cum chuc nang trong flow agent">
      {clusters.map((cluster) => (
        <button
          type="button"
          className={`agent-graph-cluster ${cluster.tone}`}
          style={{ left: `${cluster.x}%`, top: `${cluster.y}%`, width: `${cluster.width}%`, height: `${cluster.height}%` }}
          onClick={() => onSelect(cluster.detail)}
          title={`${cluster.label}: ${cluster.detail.rows.map((row) => `${row.label} ${row.value}`).join(', ')}`}
          key={cluster.id}
        >
          <span>{cluster.label}</span>
        </button>
      ))}
    </div>
  );
}

function GraphDetailPopup({ detail, onClose }: { detail: GraphDetail; onClose: () => void }) {
  return (
    <div className="graph-detail-backdrop" role="presentation" onClick={onClose}>
      <section className="graph-detail-popup" role="dialog" aria-modal="true" aria-label={detail.title} onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span>{detail.kind}</span>
            <h3>{detail.title}</h3>
          </div>
          <button type="button" aria-label="Đóng chi tiết" onClick={onClose}>Đóng</button>
        </header>
        <dl>
          {detail.rows.map((row) => (
            <div key={`${row.label}-${row.value}`}>
              <dt>{row.label}</dt>
              <dd>{row.value || 'không có dữ liệu'}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

function GraphNodeHoverCard({ edges, node, steps }: { edges: GraphEdge[]; node: PositionedGraphNode; steps: string[] }) {
  return (
    <aside
      className={`agent-node-hover-card ${node.kind} ${node.tone ?? ''}`}
      style={{ '--tip-x': `${node.x}%`, '--tip-y': `${node.y}%` } as CSSProperties}
      role="status"
      aria-live="polite"
    >
      <span>{nodeKindLabel(node)}</span>
      <strong>{node.label}</strong>
      <small>{nodePurpose(node)}</small>
      <p>{nodeInteractionSummary(node, edges)}</p>
      <em>{formatTraceStatus(node.status)}{steps.length ? ` · bước ${steps.join(', ')}` : ''}</em>
    </aside>
  );
}

function nodePurpose(node: PositionedGraphNode): string {
  const agentRoles: Record<string, string> = {
    'lead-agent': 'Điều phối phiên: đọc task/context, gọi agent phù hợp, nhận kết quả và quyết định bước tiếp theo.',
    'storage-memory-agent': 'His chung: gom bộ nhớ dùng chung, sở thích và tín hiệu gần đây để các agent cùng đọc.',
    'history-agent': 'His riêng của agent: resolve tham chiếu/lịch sử phục vụ nhánh agent đang xử lý.',
    'search-agent': 'Tìm sản phẩm/tài liệu ứng viên bằng catalog hoặc semantic search.',
    'rag-agent': 'Lấy ngữ cảnh chính sách/FAQ/tài liệu để grounding câu trả lời.',
    'recommendation-agent': 'Chấm điểm và chọn gợi ý phù hợp từ ứng viên đã truy xuất.',
    'cart-agent': 'Kiểm tra, lập kế hoạch và ghi thay đổi giỏ hàng qua tool/state.',
    'security-agent': 'Kiểm duyệt input/output và chặn hoặc yêu cầu sửa khi có rủi ro.',
    'customer-support-agent': 'Xử lý nhánh hỗ trợ/chính sách khi câu hỏi không chỉ là bán hàng.',
    'sales-agent': 'Soạn câu trả lời bán hàng cuối dựa trên task, context, sản phẩm và kết quả agent.',
    'memory-agent': 'Đọc bộ nhớ/cached profile cho pipeline cũ.',
    'user-analysis-agent': 'Phân tích ý định người dùng và ghi kết quả vào task chung.',
    'product-manager-agent': 'Resolve sản phẩm và dữ liệu catalog cho pipeline cũ.',
    'retrieval-agent': 'Truy xuất tài liệu/sản phẩm liên quan cho pipeline cũ.',
    'cart-manager-agent': 'Quản lý thao tác giỏ hàng cho pipeline cũ.',
  };
  if (agentRoles[node.id]) return agentRoles[node.id];
  if (node.id === 'pipeline-executor') return 'Khởi chạy ExecutionPlan, tạo task/context và bắt đầu luồng agent.';
  if (node.id === 'session-context') return 'His chung: context phiên, lượt chat, sở thích, tóm tắt và tài liệu dùng chung.';
  if (node.id === 'task-context') return 'Task: workspace chung nơi Lead giao việc, agent đọc yêu cầu và ghi kết quả.';
  if (node.id === 'assistant-response') return 'Đầu ra cuối gửi về frontend sau khi Lead/Sales đã tổng hợp.';
  if (node.id === 'llm-service' || node.kind === 'llm') return 'Model gateway/LLM service dùng để phân loại, rerank hoặc soạn câu trả lời.';
  if (node.kind === 'db' || node.kind === 'vector_db') return databaseRole(node.id);
  if (node.kind === 'tool') return toolRole(node.id);
  if (node.kind === 'text' || node.kind === 'file') return formatNodeDetail(node.detail ?? 'Node dữ liệu trung gian trong phiên.');
  return formatNodeDetail(node.detail ?? 'Node runtime trong flow.');
}

function nodeInteractionSummary(node: PositionedGraphNode, edges: GraphEdge[]): string {
  if (!edges.length) return 'Chưa có tương tác trực tiếp trong lát cắt đang hiển thị.';
  const incoming = edges
    .filter((edge) => edge.to === node.id)
    .slice(0, 3)
    .map((edge) => `${nodeDisplayName(edge.from)} ${directionLabel(edge.direction).toLowerCase()}`);
  const outgoing = edges
    .filter((edge) => edge.from === node.id)
    .slice(0, 3)
    .map((edge) => `${directionLabel(edge.direction).toLowerCase()} ${nodeDisplayName(edge.to)}`);
  const parts = [];
  if (incoming.length) parts.push(`Nhận: ${incoming.join(', ')}`);
  if (outgoing.length) parts.push(`Gửi: ${outgoing.join(', ')}`);
  return parts.join('. ');
}

function detailFromNode(node: PositionedGraphNode, trace: AgentTrace, edges: GraphEdge[]): GraphDetail {
  const relatedEdges = edges.filter((edge) => edge.from === node.id || edge.to === node.id);
  if (node.id === 'task-context') return taskContextDetail(trace, relatedEdges);
  if (node.id === 'session-context') return sessionContextDetail(trace, relatedEdges);
  if (node.id === 'history-agent' || node.id === 'memory-db' || node.id === 'memory-preferences' || node.id === 'memory-wiki' || node.id === 'memory-result') {
    return historyContextDetail(trace, node, relatedEdges);
  }
  if (node.kind === 'db' || node.kind === 'vector_db') return databaseNodeDetail(trace, node, relatedEdges);
  if (node.kind === 'tool') return toolNodeDetail(trace, node, relatedEdges);
  if (node.id === 'assistant-response') return responseNodeDetail(trace, node, relatedEdges);
  return {
    title: node.label,
    kind: nodeKindLabel(node),
    status: node.status,
    rows: [
      { label: 'ID', value: nodeDisplayName(node.id) },
      { label: 'Trạng thái', value: node.status },
      { label: 'Chi tiết', value: node.detail ?? '' },
      { label: 'Vị trí', value: `${Math.round(node.x)}%, ${Math.round(node.y)}%` },
      { label: 'Tương tác', value: summarizeEdges(relatedEdges) },
    ],
  };
}

function taskContextDetail(trace: AgentTrace, edges: GraphEdge[]): GraphDetail {
  const writes = edges.filter((edge) => edge.to === 'task-context' || edge.direction === 'write');
  const reads = edges.filter((edge) => edge.from === 'task-context' || edge.direction === 'data');
  return {
    title: 'Task',
    kind: 'Task',
    status: trace.errors.length ? 'blocked' : 'completed',
    rows: [
      { label: 'Ý định', value: trace.intent },
      { label: 'Dữ liệu task', value: `${trace.retrieval.selectedProductIds.length} sản phẩm, ${trace.cart.actions.length} thao tác giỏ, ${trace.llm.promptSections.length} phần prompt` },
      { label: 'Agent liên quan', value: joinList(trace.agents.map((agent) => agentLabels[agent] ?? agent)) },
      { label: 'Ghi vào task', value: summarizeEdges(writes) },
      { label: 'Đọc/trả về', value: summarizeEdges(reads) },
      { label: 'Lỗi', value: trace.errors.map((error) => `${nodeDisplayName(error.source)}: ${error.message}`).join('; ') },
    ],
  };
}

function sessionContextDetail(trace: AgentTrace, edges: GraphEdge[]): GraphDetail {
  return {
    title: 'His chung',
    kind: 'History chung',
    status: trace.errors.length ? 'blocked' : 'completed',
    rows: [
      { label: 'Trace', value: `${trace.traceId} / ${trace.messageId}` },
      { label: 'Thời gian', value: trace.timestamp },
      { label: 'Lượt history', value: String(trace.memory.recentTurnCount) },
      { label: 'Tóm tắt', value: `${trace.memory.rollingSummaryLength} ký tự` },
      { label: 'Sở thích', value: joinList(trace.memory.preferenceKeys) },
      { label: 'Sản phẩm gần đây', value: joinList(trace.memory.recentRecommendationIds) },
      { label: 'Tài liệu context', value: String(trace.retrieval.contextDocumentCount) },
      { label: 'Đường his chung', value: summarizeEdges(edges) },
    ],
  };
}

function historyContextDetail(trace: AgentTrace, node: PositionedGraphNode, edges: GraphEdge[]): GraphDetail {
  return {
    title: node.label,
    kind: 'History agent',
    status: node.status,
    rows: [
      { label: 'Node', value: nodeDisplayName(node.id) },
      { label: 'Lượt gần đây', value: String(trace.memory.recentTurnCount) },
      { label: 'Độ dài tóm tắt', value: `${trace.memory.rollingSummaryLength} ký tự` },
      { label: 'Khóa sở thích', value: joinList(trace.memory.preferenceKeys) },
      { label: 'Ref đã resolve', value: joinList(trace.memory.recentRecommendationIds) },
      { label: 'Flow history', value: `${edges.length} đường: Task -> His agent/His chung -> Task -> Lead` },
    ],
  };
}

function databaseNodeDetail(trace: AgentTrace, node: PositionedGraphNode, edges: GraphEdge[]): GraphDetail {
  return {
    title: node.label,
    kind: 'DB',
    status: node.status,
    rows: [
      { label: 'DB node', value: nodeDisplayName(node.id) },
      { label: 'Vai tro', value: databaseRole(node.id) },
      { label: 'San pham', value: joinList([...trace.retrieval.lexicalCandidateIds, ...trace.retrieval.selectedProductIds]) },
      { label: 'State gio', value: `${trace.cart.beforeItemCount} -> ${trace.cart.afterItemCount} dong` },
      { label: 'Tai lieu context', value: String(trace.retrieval.contextDocumentCount) },
      { label: 'Duong DB', value: summarizeEdges(edges) },
    ],
  };
}

function toolNodeDetail(trace: AgentTrace, node: PositionedGraphNode, edges: GraphEdge[]): GraphDetail {
  const toolRows = trace.toolResults?.map((tool) => `${formatEdgeLabel(tool.tool)}: ${formatTraceStatus(tool.status)}`).join('; ') ?? '';
  return {
    title: node.label,
    kind: 'tool',
    status: node.status,
    rows: [
      { label: 'Tool node', value: nodeDisplayName(node.id) },
      { label: 'Vai tro', value: formatNodeDetail(node.detail ?? toolRole(node.id)) },
      { label: 'Ket qua tool', value: toolRows },
      { label: 'Gio hang', value: trace.cart.actions.map((action) => `${action.type}: ${formatTraceStatus(action.status)}`).join('; ') },
      { label: 'Duong tool', value: summarizeEdges(edges) },
    ],
  };
}

function responseNodeDetail(trace: AgentTrace, node: PositionedGraphNode, edges: GraphEdge[]): GraphDetail {
  return {
    title: node.label,
    kind: 'response',
    status: node.status,
    rows: [
      { label: 'Agent cuoi', value: 'Lead tra phan hoi cuoi sau khi Sales ghi ban nhap vao Task' },
      { label: 'Model LLM', value: trace.llm.model },
      { label: 'Phan prompt', value: joinList(trace.llm.promptSections) },
      { label: 'San pham chon', value: joinList(trace.retrieval.selectedProductIds) },
      { label: 'Duong phan hoi', value: summarizeEdges(edges) },
    ],
  };
}

function summarizeEdges(edges: GraphEdge[]): string {
  if (!edges.length) return '';
  return edges
    .slice(0, 5)
    .map((edge) => `${nodeDisplayName(edge.from)} -> ${nodeDisplayName(edge.to)}${edge.label ? `: ${formatEdgeLabel(edge.label)}` : ''}`)
    .join('; ');
}

function joinList(values: string[]): string {
  return values.filter(Boolean).slice(0, 10).join(', ');
}

function nodeDisplayName(id: string): string {
  const labels: Record<string, string> = {
    'pipeline-executor': 'Executor',
    'session-context': 'His chung',
    'task-context': 'Task',
    'assistant-response': 'Phan hoi bot',
    'postgres-db': 'Postgres',
    'qdrant-db': 'Qdrant',
    'llm-service': 'LLM',
    'memory-result': 'Ket qua bo nho',
    'analysis-result': 'Ket qua phan tich',
    'product-result': 'Ket qua san pham',
    'recommendation-result': 'Ket qua goi y',
    'rag-context': 'Context RAG',
    'cart-state': 'State gio',
    'security-result': 'Ket qua bao mat',
  };
  if (agentLabels[id]) return agentLabels[id];
  if (labels[id]) return labels[id];
  if (id.startsWith('tool-')) return formatEdgeLabel(id.replace(/^tool-/, '').replaceAll('-', '.'));
  return formatUnknownNodeLabel(id);
}

function nodeKindLabel(node: PositionedGraphNode): string {
  if (node.kind === 'agent') return 'Agent';
  if (node.kind === 'tool') return 'Tool';
  if (node.kind === 'db' || node.kind === 'vector_db') return 'DB';
  if (node.kind === 'llm') return 'LLM';
  if (node.id === 'task-context') return 'Task';
  if (node.id === 'session-context') return 'His chung';
  if (node.kind === 'service') return 'Service';
  return 'Node';
}

function databaseRole(id: string): string {
  if (id === 'postgres-db') return 'Catalog, gio hang va state ung dung';
  if (id === 'qdrant-db') return 'Vector search cho RAG/context san pham';
  if (id === 'memory-db') return 'Luu lich su hoi thoai';
  if (id === 'memory-preferences') return 'Cache so thich nguoi dung';
  if (id === 'knowledge-db') return 'Chinh sach va FAQ';
  if (id === 'cart-state') return 'State gio hang truoc/sau khi tool ghi';
  return 'Kho du lieu runtime';
}

function toolRole(id: string): string {
  if (id.includes('cart')) return 'Tool doc/ghi gio hang';
  if (id.includes('search')) return 'Tool tim catalog hoac RAG';
  if (id.includes('rerank')) return 'Tool xep hang ung vien';
  if (id.includes('recommendation')) return 'Tool cham diem goi y';
  if (id.includes('security')) return 'Tool kiem duyet dau ra';
  if (id.includes('support')) return 'Tool xu ly ho tro';
  if (id.includes('sales')) return 'Tool soan cau tra loi ban hang';
  return 'Tool cua agent';
}

function detailFromEdge(edge: GraphEdge, from: PositionedGraphNode, to: PositionedGraphNode): GraphDetail {
  return {
    title: `${from.label} → ${to.label}`,
    kind: directionLabel(edge.direction),
    status: edge.status,
    rows: [
      { label: 'Từ', value: `${from.label} (${edge.from})` },
      { label: 'Đến', value: `${to.label} (${edge.to})` },
      { label: 'Loại đường', value: directionLabel(edge.direction) },
      { label: 'Trạng thái', value: edge.status ?? 'completed' },
      { label: 'Nhãn', value: formatEdgeLabel(edge.label) },
      { label: 'Thứ tự', value: String(edge.order ?? '-') },
    ],
  };
}

function fullRouteDetail(trace: AgentTrace, nodes: PositionedGraphNode[], edges: GraphEdge[]): GraphDetail {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  return {
    title: `Luồng ${trace.intent}`,
    kind: 'route',
    rows: edges.slice(0, 18).map((edge, index) => ({
      label: `${index + 1}. ${directionLabel(edge.direction)}`,
      value: `${nodeById.get(edge.from)?.label ?? edge.from} -> ${nodeById.get(edge.to)?.label ?? edge.to}: ${formatEdgeLabel(edge.label)}`,
    })),
  };
}

function directionLabel(direction: GraphEdgeDirection | undefined): string {
  if (direction === 'return') return 'Trả về';
  if (direction === 'data') return 'Dữ liệu';
  if (direction === 'write') return 'Ghi';
  if (direction === 'guard') return 'Guard';
  return 'Gọi';
}

function compactRouteName(value: string): string {
  const words = value.split(/\s+/).filter(Boolean);
  return words.length > 2 ? words.slice(0, 2).join(' ') : value;
}

function buildEdgePairCounts(edges: GraphEdge[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const edge of edges) {
    const key = edgePairKey(edge);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function edgePairKey(edge: GraphEdge): string {
  return [edge.from, edge.to].sort().join('__');
}

function buildCanvasEdgePathItems(nodes: PositionedGraphNode[], edges: GraphEdge[]): Array<{ edge: GraphEdge; key: string; path: string }> {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const pairCounts = buildEdgePairCounts(edges);
  const obstacles = nodes.length > 24 ? nodes.filter((node) => node.kind === 'agent' || node.kind === 'tool') : nodes;
  return edges.flatMap((edge, index) => {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    if (!from || !to) return [];
    return [{
      edge,
      key: `${edge.from}-${edge.to}-${edge.order ?? index}-edge`,
      path: graphEdgePath(from, to, edge, pairCounts, obstacles),
    }];
  });
}

function graphEdgePath(from: PositionedGraphNode, to: PositionedGraphNode, edge: GraphEdge, pairCounts: Map<string, number>, obstacles: PositionedGraphNode[] = []): string {
  const control = graphEdgeControlPoint(from, to, edge, pairCounts, obstacles);
  return `M ${from.x} ${from.y} Q ${control.x} ${control.y} ${to.x} ${to.y}`;
}

function graphEdgeControlPoint(from: PositionedGraphNode, to: PositionedGraphNode, edge: GraphEdge, pairCounts: Map<string, number>, obstacles: PositionedGraphNode[] = []): { x: number; y: number } {
  const hasReverseOrPair = (pairCounts.get(edgePairKey(edge)) ?? 0) > 1;
  const baseOffset = edgeFlowTone(edge.direction) === 'return' ? -6 : 6;
  const offset = hasReverseOrPair ? baseOffset : 0;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const normalX = (-dy / length) * offset;
  const normalY = (dx / length) * offset;
  const midX = (from.x + to.x) / 2 + normalX;
  const midY = (from.y + to.y) / 2 + normalY;
  return routeEdgeControlAroundNodes(from, { x: midX, y: midY }, to, edge, obstacles);
}

function routeEdgeControlAroundNodes(
  from: PositionedGraphNode,
  control: { x: number; y: number },
  to: PositionedGraphNode,
  edge: GraphEdge,
  obstacles: PositionedGraphNode[],
): { x: number; y: number } {
  if (obstacles.length === 0) return control;

  let routedX = control.x;
  let routedY = control.y;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const normal = edgeFlowTone(edge.direction) === 'return'
    ? { x: dy / length, y: -dx / length }
    : { x: -dy / length, y: dx / length };

  for (const obstacle of obstacles) {
    if (obstacle.id === edge.from || obstacle.id === edge.to) continue;
    const nearest = nearestPointOnQuadratic(obstacle, from, { x: routedX, y: routedY }, to);
    const clearance = edgeCollisionClearance(obstacle) + 1.2;
    if (nearest.distance >= clearance) continue;
    const side = Math.sign((obstacle.x - from.x) * normal.x + (obstacle.y - from.y) * normal.y) || 1;
    const strength = Math.min((clearance - nearest.distance + 1) * 1.8, 12);
    routedX = clampPercent(routedX - normal.x * side * strength, 4, 96);
    routedY = clampPercent(routedY - normal.y * side * strength, 6, 94);
  }

  return { x: routedX, y: routedY };
}

function buildSupportNodes(trace: AgentTrace, activeAgents: string[]): PositionedGraphNode[] {
  const nodeById = new Map(buildPositionedGraphNodes(trace).map((node) => [node.id, node]));
  const candidates: Array<{ id: string; x: number; y: number }> = [];
  if (activeAgents.includes('memory-agent')) candidates.push({ id: 'memory-db', x: 14, y: 78 }, { id: 'memory-result', x: 24, y: 20 });
  if (activeAgents.includes('user-analysis-agent')) candidates.push({ id: 'analysis-result', x: 38, y: 14 });
  if (activeAgents.includes('product-manager-agent')) candidates.push({ id: 'product-db', x: 50, y: 24 }, { id: 'product-result', x: 62, y: 14 });
  if (activeAgents.includes('retrieval-agent')) candidates.push({ id: 'knowledge-db', x: 70, y: 78 }, { id: 'rag-context', x: 78, y: 22 });
  if (activeAgents.includes('cart-manager-agent')) candidates.push({ id: 'cart-state', x: 48, y: 84 }, { id: 'cart-tool-1', x: 62, y: 84 });
  if (activeAgents.includes('sales-agent')) candidates.push({ id: 'llm-call', x: 88, y: 24 }, { id: 'assistant-response', x: 94, y: 54 });

  return candidates
    .map((candidate) => {
      const node = nodeById.get(candidate.id);
      return node && (node.status === 'completed' || node.status === 'running' || node.status === 'error') ? { ...node, x: candidate.x, y: candidate.y } : undefined;
    })
    .filter((node): node is PositionedGraphNode => Boolean(node))
    .slice(0, 8);
}

function buildGraphEdges(trace: AgentTrace): GraphEdge[] {
  const graphEdges = trace.graphEdges?.length
    ? trace.graphEdges
    : trace.edges.map((edge) => ({ ...edge, label: undefined, direction: 'call' as const }));
  const explicitEdges = mergeGraphEdges(graphEdges, buildPlaybackGraphEdges(trace.playbackEvents ?? []));
  if (explicitEdges.length) return explicitEdges;
  return buildPipelineEventEdges(trace, graphEdges);
}

function buildPlaybackGraphEdges(events: NonNullable<AgentTrace['playbackEvents']>): GraphEdge[] {
  return events.map((event) => ({
    from: event.from,
    to: event.to,
    status: event.status,
    order: event.order,
    label: event.label,
    direction: event.direction,
  }));
}

function mergeGraphEdges(baseEdges: GraphEdge[], extraEdges: GraphEdge[]): GraphEdge[] {
  const nextEdges = new Map(baseEdges.map((edge) => [edgeIdentityKey(edge), edge]));
  for (const edge of extraEdges) nextEdges.set(edgeIdentityKey(edge), edge);
  return [...nextEdges.values()];
}

function buildPipelineEventEdges(trace: AgentTrace, existingEdges: GraphEdge[]): GraphEdge[] {
  if (!trace.pipeline?.length) return [];

  const existingPairs = new Set(existingEdges.map((edge) => `${edge.from}->${edge.to}`));
  const nodeIds = new Set((trace.nodes ?? []).map((node) => node.id));
  const sortedEvents = trace.pipeline;
  const derivedEdges: GraphEdge[] = [];
  let previousAgent: string | undefined;

  sortedEvents.forEach((event, index) => {
    if (!previousAgent) {
      previousAgent = event.agent;
      return;
    }
    if (previousAgent === event.agent) return;
    const pairKey = `${previousAgent}->${event.agent}`;
    if (existingPairs.has(pairKey)) {
      previousAgent = event.agent;
      return;
    }
    const direction: GraphEdgeDirection = event.stage === 'evaluate' ? 'guard' : event.stage === 'revise' ? 'return' : 'data';
    derivedEdges.push({
      from: previousAgent,
      to: event.agent,
      status: event.status,
      order: 1000 + index,
      label: `pipeline ${event.stage}`,
      direction,
    });
    existingPairs.add(pairKey);
    previousAgent = event.agent;
  });

  if (nodeIds.has('analysis-result') && !existingPairs.has('user-analysis-agent->analysis-result')) {
    derivedEdges.push({
      from: 'user-analysis-agent',
      to: 'analysis-result',
      status: 'completed',
      order: 901,
      label: 'intent result',
      direction: 'return',
    });
    existingPairs.add('user-analysis-agent->analysis-result');
  }
  if (nodeIds.has('analysis-result') && sortedEvents.some((event) => event.agent === 'product-manager-agent') && !existingPairs.has('analysis-result->product-manager-agent')) {
    derivedEdges.push({
      from: 'analysis-result',
      to: 'product-manager-agent',
      status: 'completed',
      order: 902,
      label: 'product task',
      direction: 'data',
    });
  }

  return derivedEdges;
}

function shouldShowNode(node: PositionedGraphNode, connectedNodeIds: Set<string>): boolean {
  if (node.kind === 'agent') return connectedNodeIds.has(node.id) && ['completed', 'running', 'error', 'blocked'].includes(node.status);
  if (node.kind === 'tool') return connectedNodeIds.has(node.id) && ['completed', 'running', 'error', 'blocked'].includes(node.status);
  if (node.id.includes('history-agent__for__')) return connectedNodeIds.has(node.id) && ['completed', 'running', 'error', 'blocked'].includes(node.status);
  if (!isImportantSupportNode(node.id)) return false;
  if (!connectedNodeIds.has(node.id) && node.status !== 'error' && node.status !== 'blocked') return false;
  return ['completed', 'running', 'error', 'blocked'].includes(node.status);
}

function isImportantSupportNode(id: string): boolean {
  return [
    'postgres-db',
    'qdrant-db',
    'llm-service',
    'pipeline-executor',
    'session-context',
    'task-context',
    'cart-state',
    'assistant-response',
  ].includes(id);
}

function graphNodePriority(node: PositionedGraphNode): number {
  const priorities: Record<string, number> = {
    'pipeline-executor': 0,
    'session-context': 1,
    'task-context': 2,
    'memory-agent': 3,
    'memory-result': 4,
    'user-analysis-agent': 5,
    'analysis-result': 6,
    'product-manager-agent': 7,
    'product-result': 8,
    'recommendation-agent': 9,
    'recommendation-result': 10,
    'rag-agent': 11,
    'rag-context': 12,
    'cart-manager-agent': 13,
    'cart-agent': 14,
    'sales-agent': 15,
    'llm-call': 16,
    'sales-evaluator-agent': 17,
    'assistant-response': 18,
    'security-result': 19,
    'lead-agent': 30,
    'storage-memory-agent': 31,
    'history-agent': 32,
    'search-agent': 33,
    'security-agent': 34,
    'customer-support-agent': 35,
    'postgres-db': 40,
    'qdrant-db': 41,
    'llm-service': 42,
    'support-case': 43,
    'cart-state': 44,
  };
  return priorities[node.id] ?? (node.kind === 'agent' ? 12 : 50);
}

function QualityGateList({ trace }: { trace: AgentTrace }) {
  const gateEvents = (trace.pipeline ?? []).filter((event) => event.stage === 'evaluate');
  if (!gateEvents.length) return <p>Chưa có gate kiểm duyệt trong trace này.</p>;

  return (
    <div className="agent-interaction-strip">
      {gateEvents.slice(-8).map((event, index) => (
        <div className={`agent-interaction-item ${event.status === 'error' ? 'return' : 'data'}`} key={`${event.agent}-${event.timestamp}-${index}`}>
          <span>{event.status === 'completed' ? 'pass' : event.details?.outcome ?? event.status}</span>
          <strong>{agentLabels[event.agent] ?? event.agent}</strong>
          <small>{event.summary}</small>
        </div>
      ))}
    </div>
  );
}

function GraphInteractionList({ trace }: { trace: AgentTrace }) {
  const positionedNodes = buildPositionedGraphNodes(trace);
  const graphEdges = buildGraphEdges(trace);
  const connectedNodeIds = new Set(graphEdges.flatMap((edge) => [edge.from, edge.to]));
  const visibleNodes = positionedNodes.filter((node) => shouldShowNode(node, connectedNodeIds));
  const nodeById = new Map(visibleNodes.map((node) => [node.id, node]));
  const interactions = graphEdges
    .filter((edge) => edge.label && nodeById.has(edge.from) && nodeById.has(edge.to))
    .slice(0, 18);

  if (!interactions.length) return null;

  return (
    <div className="agent-interaction-strip">
      {interactions.map((edge, index) => (
        <div className={`agent-interaction-item ${edge.direction ?? 'call'}`} key={`${edge.from}-${edge.to}-${edge.order ?? index}`}>
          <span>{edge.direction === 'return' ? 'trả về' : edge.direction === 'data' ? 'dữ liệu' : 'gọi'}</span>
          <strong>{formatNodeLabel(nodeById.get(edge.from)?.label ?? agentLabels[edge.from] ?? edge.from)}</strong>
          <small>{formatEdgeLabel(edge.label)}</small>
          <strong>{formatNodeLabel(nodeById.get(edge.to)?.label ?? agentLabels[edge.to] ?? edge.to)}</strong>
        </div>
      ))}
    </div>
  );
}

function buildPositionedGraphNodes(trace: AgentTrace): PositionedGraphNode[] {
  if (!trace.nodes?.length) {
    return spreadNearbyNodes(trace.steps.filter((step) => fallbackGraphNodes[step.agent]).map((step) => {
      const position = fallbackGraphNodes[step.agent];
      return { id: step.agent, label: agentLabels[step.agent] ?? step.agent, kind: 'agent', status: step.status, x: position.x, y: position.y, icon: position.icon, tone: position.tone };
    }));
  }

  const layout = buildNodeLayout(trace.nodes.map((node) => node.id));
  return spreadNearbyNodes(trace.nodes.map((node, index) => {
    const fallback = fallbackGraphNodes[node.id];
    const position = dashboardCanvasPosition(node.id, fallback ?? layout.get(node.id) ?? { x: 12 + (index % 5) * 18, y: 20 + Math.floor(index / 5) * 18 });
    return {
      id: node.id,
      label: formatNodeLabel(node.agentName ? agentLabels[node.agentName] ?? node.label : node.label),
      kind: node.kind,
      status: node.status,
      detail: formatNodeDetail(node.detail ?? node.metric ?? node.status),
      x: position.x,
      y: position.y,
      icon: node.shortCode ?? fallback?.icon ?? nodeIcon(node.kind, node.id),
      tone: fallback?.tone,
      order: node.order,
    };
  }));
}

function dashboardCanvasPosition(id: string, fallback: { x: number; y: number }): { x: number; y: number } {
  const positions = new Map<string, { x: number; y: number }>([
    ['pipeline-executor', { x: 10, y: 23 }],
    ['session-context', { x: 15, y: 37 }],
    ['task-context', { x: 15, y: 50 }],
    ['lead-agent', { x: 14, y: 60 }],
    ['user-analysis-agent', { x: 34, y: 54 }],
    ['analysis-result', { x: 28, y: 70 }],
    ['storage-memory-agent', { x: 36, y: 28 }],
    ['postgres-db', { x: 56, y: 91 }],
    ['qdrant-db', { x: 60, y: 22 }],
    ['search-agent', { x: 54, y: 38 }],
    ['recommendation-agent', { x: 58, y: 70 }],
    ['cart-agent', { x: 66, y: 83 }],
    ['rag-agent', { x: 66, y: 24 }],
    ['security-agent', { x: 78, y: 30 }],
    ['customer-support-agent', { x: 80, y: 64 }],
    ['sales-agent', { x: 82, y: 54 }],
    ['llm-service', { x: 82, y: 18 }],
    ['assistant-response', { x: 82, y: 70 }],
    ['tool-catalog-search-semantic', { x: 49, y: 22 }],
    ['tool-catalog-search-hard', { x: 52, y: 24 }],
    ['tool-catalog-rerank', { x: 56, y: 50 }],
    ['tool-recommendation-score', { x: 66, y: 63 }],
    ['tool-cart-add-item', { x: 76, y: 88 }],
  ]);
  return positions.get(id) ?? fallback;
}

function applySessionFlowLayout(nodes: PositionedGraphNode[], trace: AgentTrace, providedEdges?: GraphEdge[]): PositionedGraphNode[] {
  const graphEdges = providedEdges ?? buildGraphEdges(trace);
  const firstOrderByNode = new Map<string, number>();
  for (const edge of graphEdges) {
    const order = edge.order ?? 999;
    firstOrderByNode.set(edge.from, Math.min(firstOrderByNode.get(edge.from) ?? order, order));
    firstOrderByNode.set(edge.to, Math.min(firstOrderByNode.get(edge.to) ?? order, order));
  }

  const nextNodes = nodes.map((node) => ({ ...node }));
  const agentNodes = nextNodes
    .filter((node) => node.kind === 'agent')
    .sort((left, right) => (firstOrderByNode.get(left.id) ?? 999) - (firstOrderByNode.get(right.id) ?? 999) || left.label.localeCompare(right.label));
  const toolNodes = nextNodes
    .filter((node) => node.kind === 'tool')
    .sort((left, right) => (firstOrderByNode.get(left.id) ?? 999) - (firstOrderByNode.get(right.id) ?? 999) || left.label.localeCompare(right.label));
  const dbNodes = nextNodes
    .filter((node) => node.kind === 'db' || node.kind === 'vector_db' || node.id === 'llm-service')
    .sort((left, right) => (firstOrderByNode.get(left.id) ?? 999) - (firstOrderByNode.get(right.id) ?? 999) || left.label.localeCompare(right.label));

  const fixedPositions = new Map<string, { x: number; y: number }>([
    ['pipeline-executor', { x: 13, y: 23 }],
    ['session-context', { x: 13, y: 38 }],
    ['task-context', { x: 13, y: 54 }],
    ['history-agent', { x: 25, y: 58 }],
    ['assistant-response', { x: 91, y: 65 }],
  ]);

  if (agentNodes.length > 3) {
    const preferredAgentGrid = new Map<string, { x: number; y: number }>([
      ['lead-agent', { x: 36, y: 47 }],
      ['storage-memory-agent', { x: 25, y: 34 }],
      ['history-agent', { x: 24, y: 62 }],
      ['user-analysis-agent', { x: 31, y: 78 }],
      ['search-agent', { x: 51, y: 30 }],
      ['rag-agent', { x: 43, y: 82 }],
      ['recommendation-agent', { x: 56, y: 75 }],
      ['security-agent', { x: 76, y: 31 }],
      ['customer-support-agent', { x: 76, y: 48 }],
      ['cart-agent', { x: 70, y: 82 }],
      ['sales-agent', { x: 84, y: 62 }],
    ]);
    const remainingAgents = agentNodes.filter((node) => !preferredAgentGrid.has(node.id));
    for (const node of agentNodes) {
      const position = preferredAgentGrid.get(node.id);
      if (position) fixedPositions.set(node.id, position);
    }
    const leftCount = Math.ceil(agentNodes.length / 2);
    remainingAgents.forEach((node, index) => {
      const isRight = index >= leftCount;
      const columnIndex = isRight ? index - leftCount : index;
      const columnCount = isRight ? agentNodes.length - leftCount : leftCount;
      const gap = columnCount <= 1 ? 0 : 56 / (columnCount - 1);
      fixedPositions.set(node.id, { x: isRight ? 58 : 30, y: 22 + columnIndex * gap });
    });
  } else {
    agentNodes.forEach((node, index) => {
      const count = Math.max(agentNodes.length, 1);
      const gap = count <= 1 ? 0 : 54 / (count - 1);
      fixedPositions.set(node.id, { x: 43, y: 24 + index * gap });
    });
  }

  const ownerAgentByTool = new Map<string, string>();
  for (const edge of graphEdges) {
    if (edge.from.endsWith('-agent') && (edge.to.startsWith('tool-') || edge.to.endsWith('-tool') || edge.to.includes('tool'))) ownerAgentByTool.set(edge.to, edge.from);
  }
  const toolSlotByAgent = new Map<string, number>();
  const toolLaneOffsets = new Map<string, Array<{ x: number; y: number }>>([
    ['search-agent', [
      { x: 10, y: -17 },
      { x: 27, y: 2 },
      { x: 12, y: 23 },
      { x: 31, y: 24 },
      { x: -14, y: 22 },
      { x: 39, y: -15 },
      { x: -22, y: 34 },
      { x: 0, y: 36 },
    ]],
    ['recommendation-agent', [
      { x: 13, y: -19 },
      { x: 26, y: -5 },
      { x: 13, y: 11 },
      { x: 28, y: 18 },
      { x: -13, y: 11 },
      { x: 2, y: -31 },
    ]],
    ['sales-agent', [
      { x: -14, y: -18 },
      { x: 13, y: -14 },
      { x: -14, y: 9 },
      { x: 13, y: 12 },
    ]],
    ['cart-agent', [
      { x: 12, y: -18 },
      { x: 23, y: -5 },
      { x: 11, y: 11 },
    ]],
    ['customer-support-agent', [
      { x: 13, y: -14 },
      { x: 24, y: 3 },
      { x: 12, y: 17 },
    ]],
  ]);
  toolNodes.forEach((node, index) => {
    const ownerAgentId = ownerAgentByTool.get(node.id);
    const ownerPosition = ownerAgentId ? fixedPositions.get(ownerAgentId) : undefined;
    if (ownerAgentId && ownerPosition) {
      const slot = toolSlotByAgent.get(ownerAgentId) ?? 0;
      toolSlotByAgent.set(ownerAgentId, slot + 1);
      const ownerOffsets = toolLaneOffsets.get(ownerAgentId);
      if (ownerOffsets?.length) {
        const offset = ownerOffsets[slot % ownerOffsets.length];
        const wrap = Math.floor(slot / ownerOffsets.length);
        fixedPositions.set(node.id, {
          x: clampPercent(ownerPosition.x + offset.x + wrap * 2.2, 18, 90),
          y: clampPercent(ownerPosition.y + offset.y + wrap * 3.2, 15, 88),
        });
        return;
      }
      fixedPositions.set(node.id, {
        x: clampPercent(ownerPosition.x + 18 + (slot % 2) * 13, 18, 90),
        y: clampPercent(ownerPosition.y - 22 + Math.floor(slot / 2) * 20, 15, 88),
      });
      return;
    }
    const count = Math.min(Math.max(toolNodes.length, 1), 3);
    const gap = count <= 1 ? 0 : 34 / (count - 1);
    fixedPositions.set(node.id, { x: 57, y: 28 + Math.min(index, 2) * gap });
  });

  nextNodes
    .filter((node) => node.id.includes('history-agent__for__'))
    .forEach((node) => {
      const ownerId = node.id.split('__for__')[1];
      const ownerPosition = ownerId ? fixedPositions.get(ownerId) : undefined;
      if (!ownerId || !ownerPosition) return;
      if (ownerId === 'sales-agent') {
        fixedPositions.set(node.id, {
          x: clampPercent(ownerPosition.x - 20, 16, 86),
          y: clampPercent(ownerPosition.y - 21, 15, 88),
        });
        return;
      }
      fixedPositions.set(node.id, {
        x: clampPercent(ownerPosition.x - 16, 16, 86),
        y: clampPercent(ownerPosition.y + 12, 15, 88),
      });
    });

  const preferredDbPositions = new Map<string, { x: number; y: number }>([
    ['postgres-db', { x: 22, y: 25 }],
    ['qdrant-db', { x: 72, y: 16 }],
    ['llm-service', { x: 86, y: 43 }],
    ['cart-state', { x: 75, y: 83 }],
  ]);
  const remainingDbNodes = dbNodes.filter((node) => !preferredDbPositions.has(node.id));
  for (const node of dbNodes) {
    const position = preferredDbPositions.get(node.id);
    if (position) fixedPositions.set(node.id, position);
  }
  remainingDbNodes.forEach((node, index) => {
    const count = Math.max(remainingDbNodes.length, 1);
    const gap = count <= 1 ? 0 : 52 / (count - 1);
    fixedPositions.set(node.id, { x: 79, y: 24 + index * gap });
  });

  return nextNodes.map((node) => {
    const position = fixedPositions.get(node.id);
    return position ? { ...node, x: position.x, y: position.y } : node;
  });
}

function spreadNearbyNodes(nodes: PositionedGraphNode[], minDistance = 11.5): PositionedGraphNode[] {
  const nextNodes = nodes.map((node) => ({ ...node }));

  for (let pass = 0; pass < 8; pass += 1) {
    for (let leftIndex = 0; leftIndex < nextNodes.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < nextNodes.length; rightIndex += 1) {
        const left = nextNodes[leftIndex];
        const right = nextNodes[rightIndex];
        const dx = right.x - left.x;
        const dy = right.y - left.y;
        const distance = Math.hypot(dx, dy);
        if (distance >= minDistance) continue;

        const angle = distance < 0.1 ? (leftIndex + rightIndex) * 0.73 : Math.atan2(dy, dx);
        const push = (minDistance - Math.max(distance, 0.1)) / 2;
        const pushX = Math.cos(angle) * push;
        const pushY = Math.sin(angle) * push;
        const leftMobility = nodeMobility(left);
        const rightMobility = nodeMobility(right);
        const totalMobility = leftMobility + rightMobility || 1;
        const leftShare = leftMobility / totalMobility;
        const rightShare = rightMobility / totalMobility;
        left.x = clampPercent(left.x - pushX * 2 * leftShare, 7, 93);
        left.y = clampPercent(left.y - pushY * 2 * leftShare, 10, 90);
        right.x = clampPercent(right.x + pushX * 2 * rightShare, 7, 93);
        right.y = clampPercent(right.y + pushY * 2 * rightShare, 10, 90);
      }
    }
  }

  return resolveVisualNodeOverlaps(nextNodes);
}

function avoidLineNodeCollisions(nodes: PositionedGraphNode[], edges: GraphEdge[]): PositionedGraphNode[] {
  if (nodes.length < 3 || edges.length === 0) return nodes;

  const homes = new Map(nodes.map((node) => [node.id, { x: node.x, y: node.y }]));
  const owners = buildNodeOwnerAnchors(nodes, edges);
  let nextNodes = nodes.map((node) => ({ ...node }));
  const pairCounts = buildEdgePairCounts(edges);
  const routedEdges = edges.filter(shouldAvoidNodeEdgeCollision);

  for (let pass = 0; pass < 3; pass += 1) {
    const nodeById = new Map(nextNodes.map((node) => [node.id, node]));
    for (let index = 0; index < nextNodes.length; index += 1) {
      const node = nextNodes[index];
      const owner = owners.get(node.id);
      const home = homes.get(node.id) ?? node;
      const anchor = owner ? nodeById.get(owner) ?? home : home;
      const candidate = bestCollisionAwareNodePosition(node, {
        anchor,
        home,
        nodes: nextNodes,
        edges: routedEdges,
        pairCounts,
        nodeById,
        index,
      });
      node.x = candidate.x;
      node.y = candidate.y;
    }
  }

  return resolveVisualNodeOverlaps(nextNodes);
}

function buildNodeOwnerAnchors(nodes: PositionedGraphNode[], edges: GraphEdge[]): Map<string, string> {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const owners = new Map<string, string>();
  for (const node of nodes) {
    if (node.id.includes('__for__')) {
      const ownerId = node.id.split('__for__')[1];
      if (ownerId && nodeIds.has(ownerId)) owners.set(node.id, ownerId);
    }
  }
  for (const edge of edges) {
    const target = nodeById.get(edge.to);
    const source = nodeById.get(edge.from);
    if (edge.from.endsWith('-agent') && target && !isSharedInfrastructureNode(target) && !owners.has(edge.to)) owners.set(edge.to, edge.from);
    if (edge.to.endsWith('-agent') && source && !source.id.endsWith('-agent') && !isSharedInfrastructureNode(source) && !owners.has(edge.from)) owners.set(edge.from, edge.to);
  }
  return owners;
}

function isSharedInfrastructureNode(node: PositionedGraphNode): boolean {
  return node.kind === 'db' || node.kind === 'vector_db' || node.kind === 'llm' || node.kind === 'service';
}

function bestCollisionAwareNodePosition(
  node: PositionedGraphNode,
  params: {
    anchor: { x: number; y: number };
    home: { x: number; y: number };
    nodes: PositionedGraphNode[];
    edges: GraphEdge[];
    pairCounts: Map<string, number>;
    nodeById: Map<string, PositionedGraphNode>;
    index: number;
  },
): { x: number; y: number } {
  const maxDrift = node.kind === 'agent' ? 3.2 : node.id.includes('__for__') || node.kind === 'tool' ? 8.4 : 6.2;
  const candidates = nodePositionCandidates(node, params.home, params.anchor, maxDrift);
  let best = { x: node.x, y: node.y };
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const score = scoreNodePosition(node, candidate, params);
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return best;
}

function nodePositionCandidates(
  node: PositionedGraphNode,
  home: { x: number; y: number },
  anchor: { x: number; y: number },
  maxDrift: number,
): Array<{ x: number; y: number }> {
  const candidates = [
    { x: node.x, y: node.y },
    { x: home.x, y: home.y },
  ];
  const idealRadius = node.kind === 'agent' ? 0 : node.kind === 'tool' ? 13.5 : node.id.includes('history-agent__for__') ? 11 : 9;
  const baseAngle = Math.atan2(home.y - anchor.y, home.x - anchor.x) || 0;
  const angles = [baseAngle, baseAngle + Math.PI / 5, baseAngle - Math.PI / 5, baseAngle + Math.PI / 2, baseAngle - Math.PI / 2, baseAngle + Math.PI];
  const radii = node.kind === 'agent' ? [0, 1.8, 2.8] : [idealRadius * 0.76, idealRadius, idealRadius * 1.18];

  for (const radius of radii) {
    for (const angle of angles) {
      const x = anchor.x + Math.cos(angle) * radius;
      const y = anchor.y + Math.sin(angle) * radius;
      candidates.push({
        x: clampPercent(x, Math.max(7, home.x - maxDrift), Math.min(93, home.x + maxDrift)),
        y: clampPercent(y, Math.max(10, home.y - maxDrift), Math.min(90, home.y + maxDrift)),
      });
    }
  }

  if (node.kind !== 'agent') {
    for (const dx of [-5.8, 0, 5.8]) {
      for (const dy of [-8.6, 0, 8.6]) {
        candidates.push({
          x: clampPercent(home.x + dx, Math.max(7, home.x - maxDrift), Math.min(93, home.x + maxDrift)),
          y: clampPercent(home.y + dy, Math.max(10, home.y - maxDrift), Math.min(90, home.y + maxDrift)),
        });
      }
    }
  }

  return candidates;
}

function scoreNodePosition(
  node: PositionedGraphNode,
  candidate: { x: number; y: number },
  params: {
    anchor: { x: number; y: number };
    home: { x: number; y: number };
    nodes: PositionedGraphNode[];
    edges: GraphEdge[];
    pairCounts: Map<string, number>;
    nodeById: Map<string, PositionedGraphNode>;
    index: number;
  },
): number {
  const candidateNode = { ...node, ...candidate };
  const homeDistance = Math.hypot(candidate.x - params.home.x, candidate.y - params.home.y);
  const anchorDistance = Math.hypot(candidate.x - params.anchor.x, candidate.y - params.anchor.y);
  const anchorWeight = node.id.includes('history-agent__for__') ? 0.2 : node.kind === 'agent' ? 0.2 : 1.1;
  let score = homeDistance * (node.kind === 'agent' ? 10 : 2.2) + anchorDistance * anchorWeight;

  for (const edge of params.edges) {
    if (edge.from === node.id || edge.to === node.id) continue;
    const from = params.nodeById.get(edge.from);
    const to = params.nodeById.get(edge.to);
    if (!from || !to) continue;
    const nearest = nearestPointOnEdgeCurve(candidateNode, from, to, edge, params.pairCounts);
    const clearance = edgeCollisionClearance(node);
    if (nearest.distance < clearance) score += (clearance - nearest.distance + 1) ** 2 * 24;
  }

  for (let index = 0; index < params.nodes.length; index += 1) {
    if (index === params.index) continue;
    const other = params.nodes[index];
    score += nodeRectOverlapPenalty(candidateNode, other) * 34;
  }

  return score;
}

function shouldAvoidNodeEdgeCollision(edge: GraphEdge): boolean {
  const fromIsContext = edge.from === 'task-context' || edge.from === 'session-context';
  const toIsContext = edge.to === 'task-context' || edge.to === 'session-context';
  if (fromIsContext && toIsContext) return false;
  if ((fromIsContext || toIsContext) && edge.direction !== 'call' && edge.direction !== 'return') return false;
  return true;
}

function nearestPointOnEdgeCurve(
  node: PositionedGraphNode,
  from: PositionedGraphNode,
  to: PositionedGraphNode,
  edge: GraphEdge,
  pairCounts: Map<string, number>,
): { point: { x: number; y: number }; distance: number } {
  const control = graphEdgeControlPoint(from, to, edge, pairCounts);
  return nearestPointOnQuadratic(node, from, control, to);
}

function nearestPointOnQuadratic(
  node: PositionedGraphNode,
  from: { x: number; y: number },
  control: { x: number; y: number },
  to: { x: number; y: number },
): { point: { x: number; y: number }; distance: number } {
  let bestPoint = quadraticPoint(from, control, to, 0.5);
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 2; index <= 18; index += 1) {
    const progress = index / 20;
    const point = quadraticPoint(from, control, to, progress);
    const distance = Math.hypot(node.x - point.x, node.y - point.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestPoint = point;
    }
  }

  return { point: bestPoint, distance: bestDistance };
}

function edgeCollisionClearance(node: PositionedGraphNode): number {
  if (node.kind === 'agent') return 7.4;
  if (node.kind === 'tool') return 6.3;
  if (node.kind === 'db' || node.kind === 'vector_db' || node.kind === 'llm') return 6.7;
  if (node.id === 'task-context' || node.id === 'session-context') return 7.2;
  return 5.9;
}

function nodePairMinDistance(left: PositionedGraphNode, right: PositionedGraphNode): number {
  const leftSize = left.kind === 'agent' ? 8.4 : left.kind === 'tool' ? 6.3 : 6.9;
  const rightSize = right.kind === 'agent' ? 8.4 : right.kind === 'tool' ? 6.3 : 6.9;
  const sameOwner = ownerSuffix(left.id) && ownerSuffix(left.id) === ownerSuffix(right.id);
  return (leftSize + rightSize) * (sameOwner ? 0.62 : 0.78);
}

function nodeRectOverlapPenalty(left: PositionedGraphNode, right: PositionedGraphNode): number {
  const leftSize = nodeLayoutFootprint(left);
  const rightSize = nodeLayoutFootprint(right);
  const minX = leftSize.x + rightSize.x;
  const minY = leftSize.y + rightSize.y;
  const overlapX = minX - Math.abs(left.x - right.x);
  const overlapY = minY - Math.abs(left.y - right.y);
  if (overlapX <= 0 || overlapY <= 0) return 0;
  const sameOwner = ownerSuffix(left.id) && ownerSuffix(left.id) === ownerSuffix(right.id);
  const ownerFactor = sameOwner ? 0.72 : 1;
  return ((overlapX / minX) ** 2 + (overlapY / minY) ** 2) * ownerFactor;
}

function resolveVisualNodeOverlaps(nodes: PositionedGraphNode[]): PositionedGraphNode[] {
  const nextNodes = nodes.map((node) => ({ ...node }));

  for (let pass = 0; pass < 24; pass += 1) {
    let moved = false;
    for (let leftIndex = 0; leftIndex < nextNodes.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < nextNodes.length; rightIndex += 1) {
        const left = nextNodes[leftIndex];
        const right = nextNodes[rightIndex];
        const leftSize = nodeLayoutFootprint(left);
        const rightSize = nodeLayoutFootprint(right);
        const minX = leftSize.x + rightSize.x + 0.9;
        const minY = leftSize.y + rightSize.y + 0.9;
        const dx = right.x - left.x;
        const dy = right.y - left.y;
        const overlapX = minX - Math.abs(dx);
        const overlapY = minY - Math.abs(dy);
        if (overlapX <= 0 || overlapY <= 0) continue;

        const leftMobility = nodeMobility(left);
        const rightMobility = nodeMobility(right);
        const totalMobility = leftMobility + rightMobility || 1;
        const leftShare = leftMobility / totalMobility;
        const rightShare = rightMobility / totalMobility;
        const directionX = dx >= 0 ? 1 : -1;
        const directionY = dy >= 0 ? 1 : -1;

        if (overlapX / minX < overlapY / minY) {
          const push = Math.min(overlapX + 1.4, 8.8);
          left.x = clampPercent(left.x - directionX * push * leftShare, 7, 93);
          right.x = clampPercent(right.x + directionX * push * rightShare, 7, 93);
        } else {
          const push = Math.min(overlapY + 1.4, 10.8);
          left.y = clampPercent(left.y - directionY * push * leftShare, 10, 90);
          right.y = clampPercent(right.y + directionY * push * rightShare, 10, 90);
        }
        moved = true;
      }
    }
    if (!moved) break;
  }

  return nextNodes;
}

function nodeLayoutFootprint(node: PositionedGraphNode): { x: number; y: number } {
  if (node.kind === 'agent') return { x: 3.4, y: 7.5 };
  if (node.kind === 'tool') return { x: 3.1, y: 6.4 };
  if (node.kind === 'db' || node.kind === 'vector_db' || node.kind === 'llm' || node.kind === 'service') return { x: 3.4, y: 6.8 };
  if (node.id === 'task-context' || node.id === 'session-context') return { x: 3.6, y: 7.2 };
  return { x: 3.2, y: 6.4 };
}

function nodeMobility(node: PositionedGraphNode): number {
  if (node.kind === 'agent') return 0.16;
  if (node.id === 'task-context' || node.id === 'session-context' || node.id === 'pipeline-executor') return 0.26;
  if (isSharedInfrastructureNode(node)) return 0.18;
  if (node.id.includes('history-agent__for__')) return 0.62;
  if (node.kind === 'tool' || node.id.includes('__for__')) return 1.9;
  return 0.85;
}

function ownerSuffix(id: string): string | undefined {
  return id.includes('__for__') ? id.split('__for__')[1] : undefined;
}

function collisionFallbackAngle(node: PositionedGraphNode, edge: GraphEdge, pass: number): number {
  let hash = pass + node.id.length * 17 + edge.from.length * 7 + edge.to.length * 11;
  for (const char of `${node.id}:${edge.from}:${edge.to}`) hash = (hash * 31 + char.charCodeAt(0)) % 9973;
  return (hash / 9973) * Math.PI * 2;
}

function clampPercent(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function buildNodeLayout(nodeIds: string[]): Map<string, { x: number; y: number }> {
  const fixed = new Map<string, { x: number; y: number }>([
    ['user-message', { x: 6, y: 50 }],
    ['memory-db', { x: 28, y: 86 }],
    ['memory-preferences', { x: 20, y: 86 }],
    ['memory-wiki', { x: 28, y: 14 }],
    ['memory-result', { x: 36, y: 14 }],
    ['analysis-result', { x: 22, y: 50 }],
    ['product-db', { x: 44, y: 16 }],
    ['product-result', { x: 52, y: 32 }],
    ['ranking-service', { x: 52, y: 68 }],
    ['knowledge-db', { x: 62, y: 12 }],
    ['rag-context', { x: 70, y: 24 }],
    ['embedding-tool', { x: 70, y: 12 }],
    ['rerank-tool', { x: 78, y: 12 }],
    ['cart-state', { x: 62, y: 90 }],
    ['cart-tool-1', { x: 72, y: 86 }],
    ['lead-agent', { x: 14, y: 50 }],
    ['storage-memory-agent', { x: 28, y: 28 }],
    ['history-agent', { x: 28, y: 72 }],
    ['search-agent', { x: 44, y: 32 }],
    ['recommendation-agent', { x: 44, y: 68 }],
    ['cart-agent', { x: 62, y: 78 }],
    ['rag-agent', { x: 62, y: 24 }],
    ['security-agent', { x: 78, y: 30 }],
    ['customer-support-agent', { x: 78, y: 64 }],
    ['sales-agent', { x: 92, y: 50 }],
    ['postgres-db', { x: 50, y: 90 }],
    ['qdrant-db', { x: 50, y: 24 }],
    ['llm-service', { x: 92, y: 18 }],
    ['pipeline-executor', { x: 10, y: 24 }],
    ['session-context', { x: 14, y: 38 }],
    ['task-context', { x: 14, y: 54 }],
    ['memory-agent', { x: 18, y: 44 }],
    ['user-analysis-agent', { x: 30, y: 44 }],
    ['product-manager-agent', { x: 42, y: 44 }],
    ['retrieval-agent', { x: 62, y: 44 }],
    ['cart-manager-agent', { x: 61, y: 83 }],
    ['sales-evaluator-agent', { x: 82, y: 72 }],
    ['tool-catalog-search-hard', { x: 53, y: 25 }],
    ['tool-catalog-search-semantic', { x: 47, y: 22 }],
    ['tool-catalog-rerank', { x: 54, y: 50 }],
    ['tool-recommendation-score', { x: 52, y: 64 }],
    ['tool-cart-add-item', { x: 76, y: 88 }],
    ['tool-rag-search-policy', { x: 72, y: 25 }],
    ['tool-support-handle-case', { x: 64, y: 76 }],
    ['tool-security-review-output', { x: 82, y: 52 }],
    ['tool-sales-compose', { x: 82, y: 64 }],
    ['support-case', { x: 82, y: 84 }],
    ['security-result', { x: 75, y: 18 }],
    ['llm-call', { x: 86, y: 32 }],
    ['assistant-response', { x: 93, y: 66 }],
  ]);
  return new Map(nodeIds.map((id, index) => [id, fixed.get(id) ?? { x: 12 + (index % 5) * 18, y: 22 + Math.floor(index / 5) * 18 }]));
}

function formatNodeLabel(value: string): string {
  const labels: Record<string, string> = {
    'Pipeline executor': 'Luồng pipeline',
    'Session context': 'Context phiên',
    'Task workspace': 'Task lượt chat',
    'Postgres DB': 'Postgres DB',
    'Qdrant DB': 'Qdrant DB',
    'LLM service': 'Dịch vụ LLM',
    'User message': 'Tin nhắn khách',
    'Wiki memory': 'Wiki bộ nhớ',
    'Memory result': 'Kết quả bộ nhớ',
    'Intent result': 'Kết quả ý định',
    'Product database': 'DB sản phẩm',
    'Product result': 'Kết quả sản phẩm',
    'Ranking service': 'Dịch vụ xếp hạng',
    'Prompt context': 'Ngữ cảnh prompt',
    'Embedding tool': 'Tool nhúng',
    'Rerank tool': 'Tool xếp hạng',
    'LLM call': 'Gọi LLM',
    'Assistant response': 'Phản hồi bot',
    'DB chat history': 'DB lịch sử chat',
    'DB preferences': 'DB sở thích',
    'Knowledge DB': 'DB kiến thức',
  };
  return labels[value] ?? value;
}

function formatNodeDetail(value: string): string {
  return value
    .replace('input', 'đầu vào')
    .replace('completed', 'hoàn tất')
    .replace('running', 'đang chạy')
    .replace('skipped', 'bỏ qua')
    .replace('error', 'lỗi')
    .replace('recommended', 'đề xuất')
    .replace('fresh', 'tìm mới')
    .replace('selected', 'đã chọn')
    .replace('docs', 'tài liệu')
    .replace('sales response', 'trả lời bán hàng')
    .replace('frontend blocks', 'khối frontend')
    .replace('real embedding', 'embedding thật')
    .replace('real rerank', 'rerank thật')
    .replace('policy/faq', 'chính sách/FAQ')
    .replace('recent turns', 'lượt gần đây')
    .replace('keys', 'khoá')
    .replace('nodes', 'node')
    .replace('evaluate', 'kiem duyet')
    .replace('revise', 'sua ban nhap')
    .replace('Quality gate passed', 'Gate chat luong dat')
    .replace('server tool', 'tool backend')
    .replace('runtime dependency', 'phu thuoc runtime')
    .replace('final customer answer', 'phan hoi cuoi cho khach')
    .replace('shared task refs and agent results', 'task + ket qua chung')
    .replace('shared task refs', 'refs task chung')
    .replace('product refs', 'tham chiếu sản phẩm');
}

function formatEdgeLabel(value: string | undefined): string {
  if (!value) return 'tương tác';
  const labels: Record<string, string> = {
    'search/resolve': 'tìm / resolve',
    'call model': 'gọi model',
    'seed task': 'khởi tạo task',
    'session context': 'context phiên',
    'analysis return': 'trả kết quả phân tích',
    'memory return': 'bộ nhớ trả về',
    'search return': 'tìm kiếm trả về',
    'recommendation return': 'gợi ý trả về',
    'rag return': 'RAG trả về',
    'final answer ready': 'sẵn sàng trả lời',
    'read task context': 'đọc task chung',
    'final answer write': 'ghi câu trả lời cuối',
    'persist context': 'lưu context phiên',
    'customer response': 'trả lời khách',
    'read history': 'đọc lịch sử',
    'read cache': 'đọc cache',
    'policy lookup': 'tra chính sách',
    'frontend blocks': 'khối frontend',
    'product refs': 'tham chiếu sản phẩm',
    'selected': 'đã chọn',
    'candidates': 'ứng viên',
    'docs': 'tài liệu',
    'tokens': 'token',
    'pipeline evaluate': 'pipeline kiem duyet',
    'pipeline revise': 'pipeline sua ban nhap',
    'cart.add_item': 'them vao gio',
    'catalog.search_hard': 'tim catalog',
    'catalog.search_semantic': 'tim semantic',
    'catalog.rerank': 'xep hang lai',
    'recommendation.score': 'cham diem goi y',
    'security.review_output': 'kiem duyet dau ra',
    'support.handle_case': 'xu ly ho tro',
    'rag.search_policy': 'tra chinh sach RAG',
    'semantic fallback': 'tim semantic du phong',
    'vector query': 'truy van vector',
    'candidate_refs': 'ref ung vien',
    'ranked_refs': 'ref da xep hang',
    'score reasons': 'ly do cham diem',
    'personalized reasons': 'ly do ca nhan hoa',
    'completed': 'hoan tat',
    'product_ref': 'ref san pham',
    'cart_ref': 'ref gio hang',
    'cart write': 'ghi gio hang',
    'final compose': 'soan phan hoi cuoi',
    'compose cards': 'soan the san pham',
    'context': 'ngữ cảnh',
    'grounding': 'neo dữ liệu',
  };
  return labels[value] ?? value;
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

function createDashboardDemoTrace(mode: string): AgentTrace {
  if (mode === 'cart') return withSharedTaskContextDemo(createDashboardCartDemoTrace());
  if (mode === 'recommendation') return withSharedTaskContextDemo(createDashboardRecommendationDemoTrace());
  if (mode === 'security') return withSharedTaskContextDemo(createDashboardSecurityDemoTrace());
  if (mode === 'dense') return withSharedTaskContextDemo(createDashboardDenseDemoTrace());
  return withSharedTaskContextDemo(createDashboardSupportDemoTrace());
}

function withSharedTaskContextDemo(trace: AgentTrace): AgentTrace {
  const nodes = [...(trace.nodes ?? [])];
  const ensureDemoNode = (node: NonNullable<AgentTrace['nodes']>[number]) => {
    if (!nodes.some((candidate) => candidate.id === node.id)) nodes.push(node);
  };
  ensureDemoNode({ id: 'session-context', label: 'Context phiên', kind: 'text', status: 'completed', detail: `${trace.memory.recentTurnCount} turns, ${trace.memory.preferenceKeys.length} prefs, ${trace.retrieval.contextDocumentCount} docs`, shortCode: 'CTX' });
  ensureDemoNode({ id: 'task-context', label: 'Task lượt chat', kind: 'text', status: 'completed', detail: 'shared task refs', shortCode: 'TASK' });
  ensureDemoNode({ id: 'user-analysis-agent', label: 'User analysis', kind: 'agent', status: 'completed', detail: 'intent analysis', agentName: 'user-analysis-agent', shortCode: 'ANL' });
  ensureDemoNode({ id: 'analysis-result', label: 'Intent result', kind: 'text', status: 'completed', detail: trace.intent, shortCode: 'TXT' });
  if (trace.agents.includes('sales-agent')) {
    ensureDemoNode({ id: 'assistant-response', label: 'Phản hồi bot', kind: 'text', status: 'completed', detail: 'final customer answer', shortCode: 'TXT' });
  }

  const graphEdges = [...(trace.graphEdges ?? [])];
  const existingKeys = new Set(graphEdges.map(edgeIdentityKey));
  const addEdge = (edge: GraphEdge) => {
    const key = edgeIdentityKey(edge);
    if (!existingKeys.has(key)) {
      graphEdges.push(edge);
      existingKeys.add(key);
    }
  };

  addEdge({ from: 'pipeline-executor', to: 'session-context', status: 'completed', order: -6, label: 'load session', direction: 'data' });
  addEdge({ from: 'session-context', to: 'task-context', status: 'completed', order: -5.5, label: 'seed task', direction: 'write' });
  addEdge({ from: 'task-context', to: 'lead-agent', status: 'completed', order: -5, label: 'session context', direction: 'data' });
  addEdge({ from: 'lead-agent', to: 'user-analysis-agent', status: 'completed', order: -4, label: 'analyze intent', direction: 'call' });
  addEdge({ from: 'task-context', to: 'user-analysis-agent', status: 'completed', order: -3, label: 'shared refs', direction: 'data' });
  addEdge({ from: 'user-analysis-agent', to: 'analysis-result', status: 'completed', order: -2, label: 'intent result', direction: 'return' });
  addEdge({ from: 'analysis-result', to: 'task-context', status: 'completed', order: -1, label: 'write analysis', direction: 'write' });
  addEdge({ from: 'task-context', to: 'lead-agent', status: 'completed', order: 0, label: 'analysis return', direction: 'return' });

  for (const edge of [...graphEdges]) {
    if (!edge.from.endsWith('-agent') || !edge.to.endsWith('-agent')) continue;
    if (edge.to === 'task-context' || edge.to === 'user-analysis-agent') continue;
    if (edge.direction === 'return') continue;
    const order = edge.order ?? 50;
    addEdge({ from: 'task-context', to: edge.to, status: edge.status ?? 'completed', order: order - 0.2, label: 'read task context', direction: 'data' });
    addEdge({ from: edge.to, to: 'task-context', status: edge.status ?? 'completed', order: order + 0.2, label: `${formatEdgeLabel(edge.label)} result`, direction: 'write' });
    addEdge({ from: 'task-context', to: 'lead-agent', status: edge.status ?? 'completed', order: order + 0.4, label: `${formatCompactNodeLabel(fallbackRouteNode(edge.to))} return`, direction: 'return' });
  }

  if (trace.agents.includes('sales-agent')) {
    const maxOrder = Math.max(0, ...graphEdges.map((edge) => edge.order ?? 0));
    addEdge({ from: 'sales-agent', to: 'task-context', status: 'completed', order: maxOrder + 1, label: 'final answer write', direction: 'write' });
    addEdge({ from: 'task-context', to: 'session-context', status: 'completed', order: maxOrder + 1.1, label: 'persist context', direction: 'write' });
    addEdge({ from: 'task-context', to: 'lead-agent', status: 'completed', order: maxOrder + 1.2, label: 'final answer ready', direction: 'return' });
    addEdge({ from: 'lead-agent', to: 'assistant-response', status: 'completed', order: maxOrder + 1.4, label: 'customer response', direction: 'return' });
  }

  return {
    ...trace,
    nodes,
    graphEdges,
    playbackEvents: buildPlaybackEvents({ ...trace, nodes, graphEdges }, graphEdges, new Set(nodes.map((node) => node.id))).map((event) => ({
      ...event,
      status: event.status ?? 'completed',
    })),
  };
}

function createDashboardSupportDemoTrace(): AgentTrace {
  const timestamp = new Date().toISOString();
  return {
    traceId: 'trace-demo-dashboard',
    messageId: 'msg-demo-dashboard',
    timestamp,
    intent: 'dashboard_demo',
    agents: ['lead-agent', 'rag-agent', 'customer-support-agent', 'security-agent'],
    edges: [],
    nodes: [
      { id: 'pipeline-executor', label: 'Pipeline executor', kind: 'service', status: 'completed', detail: 'ExecutionPlan', shortCode: 'FLOW' },
      { id: 'lead-agent', label: 'Lead', kind: 'agent', status: 'completed', detail: 'route', agentName: 'lead-agent', shortCode: 'LD' },
      { id: 'rag-agent', label: 'RAG', kind: 'agent', status: 'completed', detail: 'rag.search_policy', agentName: 'rag-agent', shortCode: 'RAG' },
      { id: 'tool-rag-search-policy', label: 'rag.search_policy', kind: 'tool', status: 'completed', detail: 'server tool', shortCode: 'TOOL' },
      { id: 'qdrant-db', label: 'Qdrant', kind: 'vector_db', status: 'completed', detail: 'runtime dependency', shortCode: 'VDB' },
      { id: 'customer-support-agent', label: 'Customer Support', kind: 'agent', status: 'completed', detail: 'support.handle_case', agentName: 'customer-support-agent', shortCode: 'SUP' },
      { id: 'tool-support-handle-case', label: 'support.handle_case', kind: 'tool', status: 'completed', detail: 'server tool', shortCode: 'TOOL' },
      { id: 'postgres-db', label: 'Postgres', kind: 'db', status: 'completed', detail: 'runtime dependency', shortCode: 'PG' },
      { id: 'security-agent', label: 'Security', kind: 'agent', status: 'completed', detail: 'security.review_output', agentName: 'security-agent', shortCode: 'SEC' },
      { id: 'tool-security-review-output', label: 'security.review_output', kind: 'tool', status: 'completed', detail: 'server tool', shortCode: 'TOOL' },
      { id: 'llm-service', label: 'LLM service', kind: 'llm', status: 'completed', detail: 'runtime dependency', shortCode: 'LLM' },
    ],
    graphEdges: [
      { from: 'pipeline-executor', to: 'lead-agent', status: 'completed', order: 1, label: 'plan', direction: 'call' },
      { from: 'lead-agent', to: 'rag-agent', status: 'completed', order: 2, label: 'rag.search_policy', direction: 'call' },
      { from: 'rag-agent', to: 'tool-rag-search-policy', status: 'completed', order: 3, label: 'rag.search_policy', direction: 'call' },
      { from: 'tool-rag-search-policy', to: 'qdrant-db', status: 'completed', order: 4, label: 'rag.search_policy', direction: 'data' },
      { from: 'qdrant-db', to: 'tool-rag-search-policy', status: 'completed', order: 5, label: 'completed', direction: 'return' },
      { from: 'tool-rag-search-policy', to: 'rag-agent', status: 'completed', order: 6, label: 'completed', direction: 'return' },
      { from: 'rag-agent', to: 'customer-support-agent', status: 'completed', order: 7, label: 'support.handle_case', direction: 'call' },
      { from: 'customer-support-agent', to: 'tool-support-handle-case', status: 'completed', order: 8, label: 'support.handle_case', direction: 'call' },
      { from: 'tool-support-handle-case', to: 'postgres-db', status: 'completed', order: 9, label: 'support.handle_case', direction: 'data' },
      { from: 'postgres-db', to: 'tool-support-handle-case', status: 'completed', order: 10, label: 'completed', direction: 'return' },
      { from: 'tool-support-handle-case', to: 'customer-support-agent', status: 'completed', order: 11, label: 'completed', direction: 'return' },
      { from: 'customer-support-agent', to: 'security-agent', status: 'completed', order: 12, label: 'security.review_output', direction: 'guard' },
      { from: 'security-agent', to: 'tool-security-review-output', status: 'completed', order: 13, label: 'security.review_output', direction: 'guard' },
      { from: 'tool-security-review-output', to: 'llm-service', status: 'completed', order: 14, label: 'security.review_output', direction: 'data' },
      { from: 'llm-service', to: 'tool-security-review-output', status: 'completed', order: 15, label: 'completed', direction: 'return' },
      { from: 'tool-security-review-output', to: 'security-agent', status: 'completed', order: 16, label: 'completed', direction: 'return' },
    ],
    steps: [
      { agent: 'lead-agent', status: 'completed', summary: 'Plan route' },
      { agent: 'rag-agent', status: 'completed', summary: 'Retrieved policy context' },
      { agent: 'customer-support-agent', status: 'completed', summary: 'Prepared support answer' },
      { agent: 'security-agent', status: 'completed', summary: 'Output allowed' },
    ],
    events: [],
    memory: { recentTurnCount: 2, rollingSummaryLength: 120, recentRecommendationIds: [], preferenceKeys: [] },
    retrieval: { lexicalCandidateIds: [], selectedProductIds: [], contextDocumentCount: 2, rerankTopScores: [] },
    cart: { actionType: 'none', resolvedProductIds: [], beforeItemCount: 0, afterItemCount: 0, actions: [] },
    llm: { model: 'demo', contextDocumentCount: 2, promptSections: ['demo'] },
    pipeline: [],
    errors: [],
  };
}

function createDashboardCartDemoTrace(): AgentTrace {
  const timestamp = new Date().toISOString();
  return {
    traceId: 'trace-demo-cart',
    messageId: 'msg-demo-cart',
    timestamp,
    intent: 'cart_add_demo',
    agents: ['lead-agent', 'search-agent', 'cart-agent', 'recommendation-agent', 'sales-agent'],
    edges: [],
    nodes: [
      { id: 'pipeline-executor', label: 'Pipeline executor', kind: 'service', status: 'completed', detail: 'ExecutionPlan', shortCode: 'FLOW' },
      { id: 'lead-agent', label: 'Lead', kind: 'agent', status: 'completed', detail: 'cart add plan', agentName: 'lead-agent', shortCode: 'LD' },
      { id: 'search-agent', label: 'Search', kind: 'agent', status: 'completed', detail: 'catalog.search_hard', agentName: 'search-agent', shortCode: 'SRCH' },
      { id: 'tool-catalog-search-hard', label: 'catalog.search_hard', kind: 'tool', status: 'completed', detail: 'server tool', shortCode: 'TOOL' },
      { id: 'postgres-db', label: 'Postgres', kind: 'db', status: 'completed', detail: 'catalog/cart data', shortCode: 'PG' },
      { id: 'cart-agent', label: 'Cart', kind: 'agent', status: 'completed', detail: 'cart.add_item', agentName: 'cart-agent', shortCode: 'CART' },
      { id: 'tool-cart-add-item', label: 'cart.add_item', kind: 'tool', status: 'completed', detail: 'server tool', shortCode: 'TOOL' },
      { id: 'recommendation-agent', label: 'Recommendation', kind: 'agent', status: 'completed', detail: 'recommendation.score', agentName: 'recommendation-agent', shortCode: 'REC' },
      { id: 'tool-recommendation-score', label: 'recommendation.score', kind: 'tool', status: 'completed', detail: 'server tool', shortCode: 'TOOL' },
      { id: 'llm-service', label: 'LLM service', kind: 'llm', status: 'completed', detail: 'sales compose', shortCode: 'LLM' },
      { id: 'sales-agent', label: 'Sales', kind: 'agent', status: 'completed', detail: 'compose final answer', agentName: 'sales-agent', shortCode: 'SALE' },
    ],
    graphEdges: [
      { from: 'pipeline-executor', to: 'lead-agent', status: 'completed', order: 1, label: 'plan', direction: 'call' },
      { from: 'lead-agent', to: 'search-agent', status: 'completed', order: 2, label: 'resolve product', direction: 'call' },
      { from: 'search-agent', to: 'tool-catalog-search-hard', status: 'completed', order: 3, label: 'catalog.search_hard', direction: 'call' },
      { from: 'tool-catalog-search-hard', to: 'postgres-db', status: 'completed', order: 4, label: 'catalog rows', direction: 'data' },
      { from: 'postgres-db', to: 'tool-catalog-search-hard', status: 'completed', order: 5, label: 'product_ref', direction: 'return' },
      { from: 'tool-catalog-search-hard', to: 'search-agent', status: 'completed', order: 6, label: 'product_ref', direction: 'return' },
      { from: 'search-agent', to: 'cart-agent', status: 'completed', order: 7, label: 'product id', direction: 'call' },
      { from: 'cart-agent', to: 'tool-cart-add-item', status: 'completed', order: 8, label: 'cart.add_item', direction: 'write' },
      { from: 'tool-cart-add-item', to: 'postgres-db', status: 'completed', order: 9, label: 'cart write', direction: 'write' },
      { from: 'postgres-db', to: 'tool-cart-add-item', status: 'completed', order: 10, label: 'cart_ref', direction: 'return' },
      { from: 'tool-cart-add-item', to: 'cart-agent', status: 'completed', order: 11, label: 'added', direction: 'return' },
      { from: 'cart-agent', to: 'recommendation-agent', status: 'completed', order: 12, label: 'next best offer', direction: 'call' },
      { from: 'recommendation-agent', to: 'tool-recommendation-score', status: 'completed', order: 13, label: 'recommendation.score', direction: 'call' },
      { from: 'tool-recommendation-score', to: 'llm-service', status: 'completed', order: 14, label: 'score reasons', direction: 'data' },
      { from: 'llm-service', to: 'tool-recommendation-score', status: 'completed', order: 15, label: 'ranked_refs', direction: 'return' },
      { from: 'recommendation-agent', to: 'sales-agent', status: 'completed', order: 16, label: 'final compose', direction: 'call' },
    ],
    steps: [
      { agent: 'lead-agent', status: 'completed', summary: 'Plan cart add' },
      { agent: 'search-agent', status: 'completed', summary: 'Resolved product' },
      { agent: 'cart-agent', status: 'completed', summary: 'Added item' },
      { agent: 'recommendation-agent', status: 'completed', summary: 'Suggested add-ons' },
      { agent: 'sales-agent', status: 'completed', summary: 'Composed answer' },
    ],
    events: [],
    memory: { recentTurnCount: 4, rollingSummaryLength: 260, recentRecommendationIds: ['prod_filter_pack'], preferenceKeys: ['budget', 'cleaning'] },
    retrieval: { lexicalCandidateIds: ['prod_mop_max_2'], selectedProductIds: ['prod_mop_max_2'], contextDocumentCount: 0, rerankTopScores: [0.91] },
    cart: {
      actionType: 'add',
      resolvedProductIds: ['prod_mop_max_2'],
      beforeItemCount: 1,
      afterItemCount: 2,
      result: 'Added HomeSweep Mop Max 2.',
      actions: [{ type: 'add', productIds: ['prod_mop_max_2'], status: 'completed', result: 'added' }],
    },
    toolResults: [{ tool: 'cart.add_item', status: 'completed', productIds: ['prod_mop_max_2'], beforeQuantity: 0, afterQuantity: 1, result: 'added' }],
    llm: { model: 'demo', contextDocumentCount: 1, promptSections: ['cart_result', 'recommendations'] },
    pipeline: [],
    errors: [],
  };
}

function createDashboardRecommendationDemoTrace(): AgentTrace {
  const timestamp = new Date().toISOString();
  return {
    traceId: 'trace-demo-recommendation',
    messageId: 'msg-demo-recommendation',
    timestamp,
    intent: 'recommendation_demo',
    agents: ['lead-agent', 'storage-memory-agent', 'search-agent', 'recommendation-agent', 'sales-agent'],
    edges: [],
    nodes: [
      { id: 'pipeline-executor', label: 'Pipeline executor', kind: 'service', status: 'completed', detail: 'ExecutionPlan', shortCode: 'FLOW' },
      { id: 'lead-agent', label: 'Lead', kind: 'agent', status: 'completed', detail: 'recommendation plan', agentName: 'lead-agent', shortCode: 'LD' },
      { id: 'storage-memory-agent', label: 'Memory', kind: 'agent', status: 'completed', detail: 'memory.get_context', agentName: 'storage-memory-agent', shortCode: 'MEM' },
      { id: 'postgres-db', label: 'Postgres', kind: 'db', status: 'completed', detail: 'memory/catalog data', shortCode: 'PG' },
      { id: 'search-agent', label: 'Search', kind: 'agent', status: 'completed', detail: 'semantic fallback', agentName: 'search-agent', shortCode: 'SRCH' },
      { id: 'tool-catalog-search-semantic', label: 'catalog.search_semantic', kind: 'tool', status: 'completed', detail: 'server tool', shortCode: 'TOOL' },
      { id: 'qdrant-db', label: 'Qdrant', kind: 'vector_db', status: 'completed', detail: 'product vectors', shortCode: 'VDB' },
      { id: 'tool-catalog-rerank', label: 'catalog.rerank', kind: 'tool', status: 'completed', detail: 'server tool', shortCode: 'TOOL' },
      { id: 'recommendation-agent', label: 'Recommendation', kind: 'agent', status: 'completed', detail: 'recommendation.score', agentName: 'recommendation-agent', shortCode: 'REC' },
      { id: 'tool-recommendation-score', label: 'recommendation.score', kind: 'tool', status: 'completed', detail: 'server tool', shortCode: 'TOOL' },
      { id: 'llm-service', label: 'LLM service', kind: 'llm', status: 'completed', detail: 'judge reasons', shortCode: 'LLM' },
      { id: 'sales-agent', label: 'Sales', kind: 'agent', status: 'completed', detail: 'final product answer', agentName: 'sales-agent', shortCode: 'SALE' },
    ],
    graphEdges: [
      { from: 'pipeline-executor', to: 'lead-agent', status: 'completed', order: 1, label: 'plan', direction: 'call' },
      { from: 'lead-agent', to: 'storage-memory-agent', status: 'completed', order: 2, label: 'memory.get_context', direction: 'call' },
      { from: 'storage-memory-agent', to: 'postgres-db', status: 'completed', order: 3, label: 'preferences', direction: 'data' },
      { from: 'postgres-db', to: 'storage-memory-agent', status: 'completed', order: 4, label: 'signals', direction: 'return' },
      { from: 'lead-agent', to: 'search-agent', status: 'completed', order: 5, label: 'catalog.search_semantic', direction: 'call' },
      { from: 'search-agent', to: 'tool-catalog-search-semantic', status: 'completed', order: 6, label: 'semantic fallback', direction: 'call' },
      { from: 'tool-catalog-search-semantic', to: 'qdrant-db', status: 'completed', order: 7, label: 'vector query', direction: 'data' },
      { from: 'qdrant-db', to: 'tool-catalog-search-semantic', status: 'completed', order: 8, label: 'candidate_refs', direction: 'return' },
      { from: 'search-agent', to: 'tool-catalog-rerank', status: 'completed', order: 9, label: 'catalog.rerank', direction: 'call' },
      { from: 'tool-catalog-rerank', to: 'llm-service', status: 'completed', order: 10, label: 'judge candidates', direction: 'data' },
      { from: 'llm-service', to: 'tool-catalog-rerank', status: 'completed', order: 11, label: 'ranked_refs', direction: 'return' },
      { from: 'search-agent', to: 'recommendation-agent', status: 'completed', order: 12, label: 'ranked candidates', direction: 'call' },
      { from: 'recommendation-agent', to: 'tool-recommendation-score', status: 'completed', order: 13, label: 'recommendation.score', direction: 'call' },
      { from: 'tool-recommendation-score', to: 'llm-service', status: 'completed', order: 14, label: 'personalized reasons', direction: 'data' },
      { from: 'recommendation-agent', to: 'sales-agent', status: 'completed', order: 15, label: 'compose cards', direction: 'call' },
    ],
    steps: [
      { agent: 'lead-agent', status: 'completed', summary: 'Plan recommendation' },
      { agent: 'storage-memory-agent', status: 'completed', summary: 'Loaded preferences' },
      { agent: 'search-agent', status: 'completed', summary: 'Semantic fallback and rerank' },
      { agent: 'recommendation-agent', status: 'completed', summary: 'Scored products' },
      { agent: 'sales-agent', status: 'completed', summary: 'Composed product cards' },
    ],
    events: [],
    memory: { recentTurnCount: 6, rollingSummaryLength: 440, recentRecommendationIds: ['prod_air_p35'], preferenceKeys: ['budget_under_2m', 'small_room'] },
    retrieval: { lexicalCandidateIds: ['prod_air_p35', 'prod_air_mini'], selectedProductIds: ['prod_air_p35', 'prod_air_mini'], contextDocumentCount: 0, rerankTopScores: [0.94, 0.89], fallbackRanking: 'lexical' },
    cart: { actionType: 'none', resolvedProductIds: [], beforeItemCount: 0, afterItemCount: 0, actions: [] },
    llm: { model: 'demo', contextDocumentCount: 3, promptSections: ['memory', 'semantic_candidates', 'rerank', 'sales'] },
    pipeline: [],
    errors: [],
  };
}

function createDashboardSecurityDemoTrace(): AgentTrace {
  const timestamp = new Date().toISOString();
  return {
    traceId: 'trace-demo-security',
    messageId: 'msg-demo-security',
    timestamp,
    intent: 'security_block_demo',
    agents: ['lead-agent', 'security-agent'],
    edges: [],
    nodes: [
      { id: 'pipeline-executor', label: 'Pipeline executor', kind: 'service', status: 'completed', detail: 'ExecutionPlan', shortCode: 'FLOW' },
      { id: 'lead-agent', label: 'Lead', kind: 'agent', status: 'completed', detail: 'risk route', agentName: 'lead-agent', shortCode: 'LD' },
      { id: 'security-agent', label: 'Security', kind: 'agent', status: 'blocked', detail: 'security.review_input', agentName: 'security-agent', shortCode: 'SEC' },
      { id: 'tool-security-review-output', label: 'security.review_output', kind: 'tool', status: 'blocked', detail: 'server guard', shortCode: 'TOOL' },
      { id: 'llm-service', label: 'LLM service', kind: 'llm', status: 'completed', detail: 'risk classifier', shortCode: 'LLM' },
      { id: 'security-result', label: 'Security block', kind: 'text', status: 'blocked', detail: 'blocked response', shortCode: 'SEC' },
      { id: 'assistant-response', label: 'Assistant response', kind: 'text', status: 'blocked', detail: 'safe refusal', shortCode: 'TXT' },
    ],
    graphEdges: [
      { from: 'pipeline-executor', to: 'lead-agent', status: 'completed', order: 1, label: 'plan', direction: 'call' },
      { from: 'lead-agent', to: 'security-agent', status: 'blocked', order: 2, label: 'security.review_input', direction: 'guard' },
      { from: 'security-agent', to: 'tool-security-review-output', status: 'blocked', order: 3, label: 'security.review_output', direction: 'guard' },
      { from: 'tool-security-review-output', to: 'llm-service', status: 'completed', order: 4, label: 'classify risk', direction: 'data' },
      { from: 'llm-service', to: 'tool-security-review-output', status: 'completed', order: 5, label: 'block', direction: 'return' },
      { from: 'tool-security-review-output', to: 'security-result', status: 'blocked', order: 6, label: 'blocked', direction: 'return' },
      { from: 'security-result', to: 'assistant-response', status: 'blocked', order: 7, label: 'safe refusal', direction: 'guard' },
    ],
    steps: [
      { agent: 'lead-agent', status: 'completed', summary: 'Detected safety-sensitive request' },
      { agent: 'security-agent', status: 'blocked', summary: 'Blocked unsafe output path' },
    ],
    events: [],
    memory: { recentTurnCount: 0, rollingSummaryLength: 0, recentRecommendationIds: [], preferenceKeys: [] },
    retrieval: { lexicalCandidateIds: [], selectedProductIds: [], contextDocumentCount: 0, rerankTopScores: [] },
    cart: { actionType: 'none', resolvedProductIds: [], beforeItemCount: 0, afterItemCount: 0, actions: [] },
    llm: { model: 'demo', contextDocumentCount: 0, promptSections: ['security_guard'] },
    pipeline: [],
    errors: [{ source: 'security-agent', message: 'Blocked by security guard fixture.' }],
  };
}

function createDashboardDenseDemoTrace(): AgentTrace {
  const trace = createDashboardRecommendationDemoTrace();
  const extraNodes = Array.from({ length: 14 }, (_, index) => ({
    id: `tool-dense-${index + 1}`,
    label: `runtime.tool.${index + 1}`,
    kind: 'tool' as const,
    status: 'completed' as const,
    detail: 'dense fixture',
    shortCode: 'TOOL',
  }));
  return {
    ...trace,
    traceId: 'trace-demo-dense',
    messageId: 'msg-demo-dense',
    intent: 'dense_trace_demo',
    nodes: [...(trace.nodes ?? []), ...extraNodes],
    graphEdges: [
      ...(trace.graphEdges ?? []),
      ...extraNodes.map((node, index) => ({
        from: index % 2 === 0 ? 'recommendation-agent' : 'search-agent',
        to: node.id,
        status: 'completed' as const,
        order: 100 + index,
        label: node.label,
        direction: 'call' as const,
      })),
    ],
  };
}

function nodeIcon(kind: string, id?: string): string {
  if (id && fallbackGraphNodes[id]) return fallbackGraphNodes[id].icon;
  if (kind === 'agent') return id ? shortCodeFromId(id) : 'AG';
  if (kind === 'db') return 'DB';
  if (kind === 'vector_db') return 'VDB';
  if (kind === 'tool') return 'T';
  if (kind === 'text') return 'TXT';
  if (kind === 'file') return 'F';
  if (kind === 'service') return 'SVC';
  if (kind === 'llm') return 'LLM';
  return 'N';
}

function shortCodeFromId(id: string): string {
  const parts = id
    .replace(/agent$/i, '')
    .split(/[-_]/)
    .filter(Boolean);
  const code = parts.map((part) => part[0]?.toUpperCase()).join('').slice(0, 4);
  return code || 'NODE';
}

function formatUnknownNodeLabel(id: string): string {
  return id
    .split(/[-_]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join(' ');
}

function TraceMetric({ label, value, tone }: { label: string; value: string | number; tone?: 'warn' }) {
  return <div className={`trace-metric ${tone ?? ''}`}><span>{label}</span><strong>{value}</strong></div>;
}

function TracePanel({ title, children, wide }: { title: string; children: ReactNode; wide?: boolean }) {
  return <article className={wide ? 'trace-panel wide' : 'trace-panel'}><h3>{title}</h3>{children}</article>;
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="trace-list-block">
      <span>{title}</span>
      {items.length ? <div>{items.map((item, index) => <code key={`${title}-${item}-${index}`}>{item}</code>)}</div> : <p>Không có dữ liệu.</p>}
    </div>
  );
}
