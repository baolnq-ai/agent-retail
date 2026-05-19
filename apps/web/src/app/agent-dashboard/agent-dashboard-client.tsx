'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

interface AgentTrace {
  traceId: string;
  messageId: string;
  timestamp: string;
  intent: string;
  agents: string[];
  edges: Array<{ from: string; to: string; status?: string; order?: number }>;
  nodes?: Array<{ id: string; label: string; kind: 'agent' | 'db' | 'tool' | 'text' | 'file' | 'service'; status: string; detail?: string; metric?: string; agentName?: string; order?: number }>;
  graphEdges?: Array<{ from: string; to: string; status?: string; order?: number; label?: string; direction?: 'call' | 'return' | 'data' }>;
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

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:7010';
const agentLabels: Record<string, string> = {
  'memory-agent': 'Bộ nhớ',
  'user-analysis-agent': 'Phân tích người dùng',
  'product-manager-agent': 'Quản lý sản phẩm',
  'retrieval-agent': 'Truy xuất',
  'cart-manager-agent': 'Quản lý giỏ',
  'sales-agent': 'Tư vấn bán hàng',
};

const fallbackGraphNodes: Record<string, { x: number; y: number; icon: string; tone?: 'router' | 'memory' | 'cart' | 'product' }> = {
  'memory-agent': { x: 18, y: 48, icon: 'M', tone: 'memory' },
  'user-analysis-agent': { x: 34, y: 48, icon: 'A', tone: 'router' },
  'product-manager-agent': { x: 50, y: 48, icon: 'P', tone: 'product' },
  'retrieval-agent': { x: 66, y: 48, icon: 'R' },
  'cart-manager-agent': { x: 50, y: 74, icon: 'C', tone: 'cart' },
  'sales-agent': { x: 82, y: 48, icon: 'S' },
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
      const response = await fetch(`${apiBaseUrl}/api/v1/agent/traces/latest`, { credentials: 'include', cache: 'no-store' });
      const payload = await response.json() as AgentTrace | null;
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
          <p className="eyebrow">Quan sát agent</p>
          <h1>Pipeline trợ lý bán hàng đang chạy</h1>
          <p>Xem bộ điều phối, bộ nhớ, truy xuất, rerank, quản lý giỏ và tư vấn bán hàng dùng dữ liệu nào cho từng lượt chat.</p>
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
            <GraphInteractionList trace={trace} />
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
  const { activeAgent, visibleEdges, visibleNodes } = useMemo(() => buildGraphView(trace), [trace.traceId, trace.pipeline?.length, trace.events.length]);
  const nodeById = new Map(visibleNodes.map((node) => [node.id, node]));

  return (
    <div className="agent-node-canvas" aria-label="Sơ đồ node agent đang chạy">
      <svg className="agent-node-edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <marker id="node-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto" markerUnits="strokeWidth">
            <path d="M 0 0 L 7 3.5 L 0 7 z" className="agent-node-arrow" />
          </marker>
        </defs>
        {visibleEdges.map((edge, index) => {
          const from = nodeById.get(edge.from);
          const to = nodeById.get(edge.to);
          if (!from || !to) return null;
          const midpointX = (from.x + to.x) / 2;
          const bend = Math.abs(from.y - to.y) > 18 ? 8 : 0;
          const path = `M ${from.x} ${from.y} C ${midpointX} ${from.y - bend}, ${midpointX} ${to.y + bend}, ${to.x} ${to.y}`;
          return <path className={`agent-node-edge ${edge.direction ?? 'call'}`} d={path} markerEnd="url(#node-arrow)" key={`${edge.from}-${edge.to}-${edge.order ?? index}`} />;
        })}
      </svg>
      {visibleNodes.map((node) => {
        const isActive = node.id === activeAgent;
        return (
          <div className={`agent-node ${node.kind} ${node.tone ?? ''} ${isActive ? 'active' : ''}`} style={{ left: `${node.x}%`, top: `${node.y}%` }} key={`${trace.traceId}-${node.id}`}>
            <span>{node.icon}</span>
            <strong>{node.label}</strong>
            <small>{node.kind === 'agent' ? 'agent' : node.detail}</small>
          </div>
        );
      })}
    </div>
  );
});

type GraphEdge = { from: string; to: string; status?: string; order?: number; label?: string; direction?: 'call' | 'return' | 'data' };

type PositionedGraphNode = { id: string; label: string; kind: string; status: string; detail?: string; x: number; y: number; icon: string; tone?: 'router' | 'memory' | 'cart' | 'product' };

const agentOrder: AgentTrace['agents'] = ['memory-agent', 'user-analysis-agent', 'product-manager-agent', 'retrieval-agent', 'cart-manager-agent', 'sales-agent'];

function buildGraphView(trace: AgentTrace): { activeAgent: string | undefined; visibleNodes: PositionedGraphNode[]; visibleEdges: GraphEdge[] } {
  const activeAgent = trace.pipeline?.at(-1)?.agent ?? trace.steps.find((step) => step.status === 'completed')?.agent ?? trace.steps[0]?.agent;
  const activeAgents = agentOrder.filter((agent) => trace.agents.includes(agent));
  const agentNodes = activeAgents.map((agent, index) => {
    const fallback = fallbackGraphNodes[agent];
    return {
      id: agent,
      label: agentLabels[agent] ?? agent,
      kind: 'agent',
      status: trace.steps.find((step) => step.agent === agent)?.status ?? 'completed',
      detail: 'agent',
      x: 14 + index * (72 / Math.max(activeAgents.length - 1, 1)),
      y: 52,
      icon: fallback.icon,
      tone: fallback.tone,
    };
  });
  const supportNodes = buildSupportNodes(trace, activeAgents);
  const visibleNodes = [...agentNodes, ...supportNodes];
  const nodeIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges = buildGraphEdges(trace)
    .filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to))
    .slice(0, 12);

  return { activeAgent, visibleNodes, visibleEdges };
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
  return trace.graphEdges?.length
    ? trace.graphEdges
    : trace.edges.map((edge) => ({ ...edge, label: undefined, direction: 'call' as const }));
}

function shouldShowNode(node: PositionedGraphNode, connectedNodeIds: Set<string>, activeAgentIds: Set<string>): boolean {
  if (!connectedNodeIds.has(node.id)) return false;
  if (node.kind === 'agent') return activeAgentIds.has(node.id);
  return node.status === 'completed' || node.status === 'running' || node.status === 'error';
}

function isImportantSupportNode(id: string): boolean {
  return [
    'user-message',
    'memory-db',
    'memory-result',
    'analysis-result',
    'product-db',
    'product-result',
    'ranking-service',
    'knowledge-db',
    'rag-context',
    'cart-state',
    'cart-tool-1',
    'llm-call',
    'assistant-response',
  ].includes(id);
}

function GraphInteractionList({ trace }: { trace: AgentTrace }) {
  const positionedNodes = buildPositionedGraphNodes(trace);
  const graphEdges = buildGraphEdges(trace);
  const activeAgentIds = new Set(trace.agents);
  const connectedNodeIds = new Set(graphEdges.flatMap((edge) => [edge.from, edge.to]));
  const visibleNodes = positionedNodes.filter((node) => shouldShowNode(node, connectedNodeIds, activeAgentIds));
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
    return trace.steps.filter((step) => fallbackGraphNodes[step.agent]).map((step) => {
      const position = fallbackGraphNodes[step.agent];
      return { id: step.agent, label: agentLabels[step.agent] ?? step.agent, kind: 'agent', status: step.status, x: position.x, y: position.y, icon: position.icon, tone: position.tone };
    });
  }

  const layout = buildNodeLayout(trace.nodes.map((node) => node.id));
  return trace.nodes.map((node, index) => {
    const fallback = fallbackGraphNodes[node.id];
    const position = fallback ?? layout.get(node.id) ?? { x: 12 + (index % 5) * 18, y: 20 + Math.floor(index / 5) * 18 };
    return {
      id: node.id,
      label: formatNodeLabel(node.agentName ? agentLabels[node.agentName] ?? node.label : node.label),
      kind: node.kind,
      status: node.status,
      detail: formatNodeDetail(node.detail ?? node.metric ?? node.status),
      x: position.x,
      y: position.y,
      icon: fallback?.icon ?? nodeIcon(node.kind),
      tone: fallback?.tone,
    };
  });
}

function buildNodeLayout(nodeIds: string[]): Map<string, { x: number; y: number }> {
  const fixed = new Map<string, { x: number; y: number }>([
    ['user-message', { x: 7, y: 52 }],
    ['memory-db', { x: 18, y: 74 }],
    ['memory-preferences', { x: 18, y: 86 }],
    ['memory-wiki', { x: 18, y: 24 }],
    ['memory-result', { x: 30, y: 24 }],
    ['analysis-result', { x: 36, y: 24 }],
    ['product-db', { x: 50, y: 24 }],
    ['product-result', { x: 60, y: 24 }],
    ['ranking-service', { x: 70, y: 24 }],
    ['knowledge-db', { x: 68, y: 76 }],
    ['rag-context', { x: 78, y: 24 }],
    ['embedding-tool', { x: 78, y: 12 }],
    ['rerank-tool', { x: 88, y: 12 }],
    ['cart-state', { x: 44, y: 82 }],
    ['cart-tool-1', { x: 58, y: 82 }],
    ['llm-call', { x: 86, y: 32 }],
    ['assistant-response', { x: 93, y: 52 }],
  ]);
  return new Map(nodeIds.map((id, index) => [id, fixed.get(id) ?? { x: 12 + (index % 5) * 18, y: 22 + Math.floor(index / 5) * 18 }]));
}

function formatNodeLabel(value: string): string {
  const labels: Record<string, string> = {
    'User message': 'Tin nhắn khách',
    'Wiki memory': 'Wiki bộ nhớ',
    'Memory result': 'Kết quả bộ nhớ',
    'Intent result': 'Kết quả ý định',
    'Product database': 'DB sản phẩm',
    'Product result': 'Kết quả sản phẩm',
    'Ranking service': 'Dịch vụ xếp hạng',
    'Prompt context': 'Ngữ cảnh prompt',
    'Embedding tool': 'Tool embedding',
    'Rerank tool': 'Tool rerank',
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
    .replace('product refs', 'tham chiếu sản phẩm');
}

function formatEdgeLabel(value: string | undefined): string {
  if (!value) return 'tương tác';
  const labels: Record<string, string> = {
    'search/resolve': 'tìm / resolve',
    'call model': 'gọi model',
    'read history': 'đọc lịch sử',
    'read cache': 'đọc cache',
    'policy lookup': 'tra chính sách',
    'frontend blocks': 'khối frontend',
    'product refs': 'tham chiếu sản phẩm',
    'selected': 'đã chọn',
    'candidates': 'ứng viên',
    'docs': 'tài liệu',
    'tokens': 'token',
    'context': 'ngữ cảnh',
    'grounding': 'neo dữ liệu',
  };
  return labels[value] ?? value;
}

function nodeIcon(kind: string): string {
  if (kind === 'db') return 'DB';
  if (kind === 'tool') return 'T';
  if (kind === 'text') return 'TXT';
  if (kind === 'file') return 'F';
  if (kind === 'service') return 'SVC';
  return 'N';
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
      {items.length ? <div>{items.map((item) => <code key={item}>{item}</code>)}</div> : <p>Không có dữ liệu.</p>}
    </div>
  );
}
