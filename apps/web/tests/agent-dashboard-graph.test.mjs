import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const dashboardSource = await readFile(new URL('../src/app/agent-dashboard/agent-dashboard-client.tsx', import.meta.url), 'utf8');
const stylesSource = await readFile(new URL('../src/app/styles.css', import.meta.url), 'utf8');

test('agent dashboard supports new pipeline agent and infrastructure node contracts', () => {
  for (const id of [
    'lead-agent',
    'cart-agent',
    'search-agent',
    'recommendation-agent',
    'storage-memory-agent',
    'history-agent',
    'rag-agent',
    'security-agent',
    'customer-support-agent',
    'postgres-db',
    'qdrant-db',
    'llm-service',
    'pipeline-executor',
    'session-context',
    'task-context',
  ]) {
    assert.match(dashboardSource, new RegExp(id));
  }

  assert.match(dashboardSource, /vector_db/);
  assert.match(dashboardSource, /GraphEdgeDirection = 'call' \| 'return' \| 'data' \| 'guard' \| 'write'/);
  assert.match(dashboardSource, /shortCodeFromId/);
  assert.match(dashboardSource, /formatUnknownNodeLabel/);
  assert.match(dashboardSource, /trace\.nodes\?\.length/);
  assert.match(dashboardSource, /TracePlaybackCanvas/);
  assert.match(dashboardSource, /GraphClusterRegions/);
  assert.match(dashboardSource, /buildGraphClusters/);
  assert.match(dashboardSource, /sessionContextDetail/);
  assert.match(dashboardSource, /taskContextDetail/);
  assert.match(dashboardSource, /historyContextDetail/);
  assert.match(dashboardSource, /playbackEvents/);
  assert.match(dashboardSource, /requestAnimationFrame/);
  assert.match(dashboardSource, /prefers-reduced-motion/);
  assert.match(dashboardSource, /get\('demoTrace'\)/);
  assert.match(dashboardSource, /createDashboardDemoTrace/);
  assert.match(dashboardSource, /createDashboardCartDemoTrace/);
  assert.match(dashboardSource, /createDashboardRecommendationDemoTrace/);
  assert.match(dashboardSource, /createDashboardSupportDemoTrace/);
  assert.match(dashboardSource, /createDashboardSecurityDemoTrace/);
  assert.match(dashboardSource, /createDashboardDenseDemoTrace/);
  assert.match(dashboardSource, /compactVisibleGraphNodes/);
  assert.match(dashboardSource, /selectVisibleGraphEdges/);
  assert.match(dashboardSource, /isAnswerPathEdge/);
  assert.match(dashboardSource, /grouped-runtime-nodes/);
});

test('agent dashboard css has visual states for compact graph nodes and continuous two-way flow', () => {
  assert.match(stylesSource, /\.agent-node\.vector_db/);
  assert.match(stylesSource, /\.agent-node\.llm/);
  assert.match(stylesSource, /\.agent-node\.security/);
  assert.match(stylesSource, /\.agent-node\.support/);
  assert.match(stylesSource, /\.agent-interaction-item\.guard/);
  assert.match(stylesSource, /\.agent-interaction-item\.write/);
  assert.match(stylesSource, /\.agent-node-canvas/);
  assert.match(stylesSource, /\.agent-graph-cluster/);
  assert.match(stylesSource, /\.agent-graph-cluster\.context/);
  assert.match(stylesSource, /\.agent-graph-cluster\.task/);
  assert.match(stylesSource, /\.agent-graph-cluster\.history/);
  assert.match(stylesSource, /\.agent-graph-cluster\.db/);
  assert.match(stylesSource, /\.agent-graph-cluster\.tools/);
  assert.match(stylesSource, /\.agent-playback-canvas/);
  assert.match(stylesSource, /\.agent-node-edge/);
  assert.match(stylesSource, /\.agent-node-steps/);
  assert.match(dashboardSource, /buildPlaybackEvents\(_trace: AgentTrace, edges: GraphEdge\[\]/);
  assert.match(dashboardSource, /TracePlaybackCanvas/);
  assert.match(dashboardSource, /buildNodeStepBadges/);
  assert.match(dashboardSource, /shouldShowNodeStepNumber/);
  assert.match(dashboardSource, /dashboardCanvasPosition/);
  assert.match(dashboardSource, /GraphRouteTimeline/);
  assert.match(dashboardSource, /buildPlaybackGraphEdges/);
  assert.match(dashboardSource, /routeNodeName/);
  assert.match(dashboardSource, /selectTimelineChipEdges/);
  assert.match(dashboardSource, /uniqueAnswerPathEdges/);
  assert.match(dashboardSource, /isPipelinePathEdge/);
  assert.match(dashboardSource, /augmentPipelineNodes/);
  assert.match(dashboardSource, /directionLabel\(edge\.direction\)/);
  assert.match(dashboardSource, /className="agent-node-steps"/);
  assert.match(dashboardSource, /<span className="call">Gửi đi<\/span>/);
  assert.match(dashboardSource, /<span className="return">Trả về<\/span>/);
  assert.match(dashboardSource, /label: 'Flow'/);
  assert.doesNotMatch(dashboardSource, /<span className="data">Đọc dữ liệu<\/span>/);
  assert.doesNotMatch(dashboardSource, /<span className="write">Ghi dữ liệu<\/span>/);
  assert.doesNotMatch(dashboardSource, /<span className="guard">Guard<\/span>/);
  assert.match(dashboardSource, /if \(target\?\.kind === 'tool' && !hasEdge\(edge\.to, edge\.from, \['return'\]\)\)/);
  assert.match(dashboardSource, /from: 'task-context', to: 'lead-agent', status: edge\.status, order: \(edge\.order \?\? 80\) \+ 0\.35, label: 'agent return', direction: 'return'/);
  assert.match(dashboardSource, /if \(nextEdge\.from === 'pipeline-executor' && nextEdge\.to === 'lead-agent'\) continue/);
  assert.match(dashboardSource, /nextEdge\.from = 'lead-agent'/);
  assert.doesNotMatch(stylesSource, /@keyframes agentFlowDash/);
  assert.doesNotMatch(dashboardSource, /markerEnd=/);
  assert.doesNotMatch(stylesSource, /\.agent-playback-controls/);
});

test('chat product cards keep image, copy, and add button in separate columns on mobile', () => {
  assert.match(stylesSource, /\.chat-product-card\s*\{[^}]*grid-template-columns:\s*72px minmax\(0, 1fr\)/s);
  assert.match(stylesSource, /\.chat-product-card \.chat-product-media\s*\{[^}]*width:\s*72px;[^}]*height:\s*72px;/s);
  assert.match(stylesSource, /@media \(max-width: 420px\)\s*\{[^}]*\.chat-product-card\s*\{[^}]*grid-template-columns:\s*64px minmax\(0, 1fr\)/s);
  assert.doesNotMatch(stylesSource, /\.chat-product-card\s*\{[^}]*grid-template-columns:\s*42px minmax\(0, 1fr\)/s);
});
