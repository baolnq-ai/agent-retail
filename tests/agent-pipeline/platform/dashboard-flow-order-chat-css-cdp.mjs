import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const webUrl = process.env.FRONTEND_WEB_URL ?? 'http://127.0.0.1:7000';
const apiUrl = process.env.API_URL ?? 'http://127.0.0.1:7010';
const evidenceRoot = process.env.EVIDENCE_ROOT ?? join(process.cwd(), 'test', 'dashboard-flow-continuous-evidence-2026-05-25');
const appDir = join(evidenceRoot, 'app');
const reportsDir = join(evidenceRoot, 'reports');
const chromePath = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const remotePort = Number.parseInt(process.env.CDP_PORT ?? '9347', 10);
const userDataDir = join(process.cwd(), '.tmp', `chrome-dashboard-flow-order-${Date.now()}`);

class DevtoolsClient {
  constructor(url) {
    this.url = url;
    this.nextId = 1;
    this.pending = new Map();
  }

  open() {
    this.socket = new WebSocket(this.url);
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result ?? {});
    });
    return new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  close() {
    this.socket?.close();
  }
}

await mkdir(appDir, { recursive: true });
await mkdir(reportsDir, { recursive: true });

const chrome = spawn(chromePath, [
  `--remote-debugging-port=${remotePort}`,
  `--user-data-dir=${userDataDir}`,
  '--headless=new',
  '--disable-gpu',
  '--window-size=390,820',
  'about:blank',
], { stdio: 'ignore', detached: true });

try {
  await waitForCdp();
  const page = await openPage(`${webUrl}/`);
  const cdp = new DevtoolsClient(page.webSocketDebuggerUrl);
  await cdp.open();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  await cdp.send('Page.navigate', { url: `${webUrl}/` });
  await waitForPageReady(cdp);
  await hideDevOverlays(cdp);
  await waitForSelector(cdp, '.chat-launcher');
  await evalJs(cdp, "document.querySelector('.chat-launcher')?.click()");
  await waitForSelector(cdp, '.chat-composer input');
  await submitPrompt(cdp, 'Toi muon xem san pham phu hop');
  await waitForSelector(cdp, '.chat-run-status');
  await waitForChatDone(cdp);
  await screenshot(cdp, join(appDir, '09-chat-product-card-css-fixed.png'));
  const chatAudit = await auditChatCards(cdp);

  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1365, height: 768, deviceScaleFactor: 1, mobile: false });
  await cdp.send('Page.navigate', { url: `${webUrl}/agent-dashboard` });
  await waitForPageReady(cdp);
  await hideDevOverlays(cdp);
  await waitForSelector(cdp, '.agent-node-canvas');
  await delay(350);
  await screenshot(cdp, join(appDir, '10-dashboard-flow-order-timeline.png'));
  const dashboardBefore = await auditDashboard(cdp);
  await delay(260);
  await screenshot(cdp, join(appDir, '11-dashboard-flow-animation-frame-a.png'));
  const dashboardMid = await auditDashboard(cdp);
  await delay(260);
  await screenshot(cdp, join(appDir, '12-dashboard-flow-animation-frame-b.png'));
  const dashboardAfter = await auditDashboard(cdp);
  const latestTrace = await fetchLatestTrace();
  const backendAudit = compareDashboardToBackend(dashboardAfter, latestTrace);

  const report = {
    createdAt: new Date().toISOString(),
    webUrl,
    apiUrl,
    screenshots: [
      'app/09-chat-product-card-css-fixed.png',
      'app/10-dashboard-flow-order-timeline.png',
      'app/11-dashboard-flow-animation-frame-a.png',
      'app/12-dashboard-flow-animation-frame-b.png',
    ],
    chatAudit,
    dashboardAudit: {
      before: dashboardBefore,
      mid: dashboardMid,
      after: dashboardAfter,
      animationChanged: dashboardBefore.canvasSignature !== dashboardMid.canvasSignature || dashboardMid.canvasSignature !== dashboardAfter.canvasSignature,
      backend: backendAudit,
    },
    pass: Boolean(
      chatAudit.productCardCount > 0 &&
      chatAudit.overlapCount === 0 &&
      dashboardAfter.edgeOrderBadgeCount >= 8 &&
      dashboardAfter.domEdgeCount >= 8 &&
      dashboardAfter.overlapPairs === 0 &&
      dashboardBefore.canvasSignature !== dashboardAfter.canvasSignature &&
      backendAudit.allDomEdgesInBackendOrPipeline &&
      backendAudit.hasVisibleAnalysisReturn &&
      backendAudit.hasVisibleEvaluatorRoundtrip &&
      backendAudit.hasVisibleSalesReturnChain &&
      !dashboardAfter.hasArrowMarker &&
      !dashboardAfter.hasBottomRouteSummary
    ),
  };

  await writeFile(join(reportsDir, 'dashboard-flow-order-chat-css-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
  await cdp.close();
} finally {
  if (chrome.pid) spawnSync('taskkill', ['/PID', String(chrome.pid), '/T', '/F'], { stdio: 'ignore' });
}

async function fetchLatestTrace() {
  const response = await fetch(`${apiUrl}/api/v1/agent/traces/latest`, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`latest_trace_failed:${response.status}`);
  return response.json();
}

function compareDashboardToBackend(dashboardAudit, trace) {
  const backendEdges = trace.graphEdges ?? trace.edges ?? [];
  const pipelineEdges = buildPipelinePairs(trace);
  const edgeMatches = dashboardAudit.domEdges.map((domEdge) => {
    const match = backendEdges.find((edge) =>
      edge.from === domEdge.from &&
      edge.to === domEdge.to &&
      String(edge.order ?? '') === String(domEdge.order ?? '') &&
      String(edge.direction ?? 'call') === String(domEdge.direction ?? 'call')
    );
    const inPipeline = pipelineEdges.has(`${domEdge.from}->${domEdge.to}:${domEdge.direction ?? 'call'}`);
    return { ...domEdge, inBackend: Boolean(match), inPipeline };
  });
  const visiblePairs = new Set(dashboardAudit.domEdges.map((edge) => `${edge.from}->${edge.to}:${edge.direction ?? 'call'}`));
  const serviceChainVisible = visiblePairs.has('sales-agent->llm-service:call') &&
    visiblePairs.has('llm-service->sales-agent:return') &&
    visiblePairs.has('sales-agent->assistant-response:return');
  const runtimeChainVisible = visiblePairs.has('sales-agent->llm-call:call') &&
    visiblePairs.has('llm-call->sales-agent:return') &&
    visiblePairs.has('sales-agent->assistant-response:return');
  const backendPairs = new Set(backendEdges.map((edge) => `${edge.from}->${edge.to}:${edge.direction ?? 'call'}`));

  return {
    traceId: trace.traceId,
    intent: trace.intent,
    backendEdgeCount: backendEdges.length,
    allDomEdgesInBackend: edgeMatches.every((edge) => edge.inBackend),
    allDomEdgesInBackendOrPipeline: edgeMatches.every((edge) => edge.inBackend || edge.inPipeline),
    missingDomEdges: edgeMatches.filter((edge) => !edge.inBackend),
    hasBackendSalesReturnChain: (
      backendPairs.has('sales-agent->llm-service:call') &&
      backendPairs.has('llm-service->sales-agent:return') &&
      backendPairs.has('sales-agent->assistant-response:return')
    ) || (
      backendPairs.has('sales-agent->llm-call:call') &&
      backendPairs.has('llm-call->sales-agent:return') &&
      backendPairs.has('sales-agent->assistant-response:return')
    ),
    hasVisibleSalesReturnChain: serviceChainVisible || runtimeChainVisible,
    hasVisibleAnalysisReturn: visiblePairs.has('user-analysis-agent->analysis-result:return'),
    hasVisibleEvaluatorRoundtrip: visiblePairs.has('sales-agent->sales-evaluator-agent:guard') && visiblePairs.has('sales-evaluator-agent->sales-agent:return'),
    visibleSalesEdges: dashboardAudit.domEdges.filter((edge) => edge.from.includes('sales') || edge.to.includes('sales') || edge.from.includes('llm') || edge.to.includes('llm') || edge.to === 'assistant-response'),
    visibleAnalysisEdges: dashboardAudit.domEdges.filter((edge) => edge.from.includes('analysis') || edge.to.includes('analysis')),
  };
}

function buildPipelinePairs(trace) {
  const pairs = new Set();
  const events = trace.pipeline ?? [];
  let previousAgent;
  for (const event of events) {
    if (!previousAgent) {
      previousAgent = event.agent;
      continue;
    }
    if (previousAgent !== event.agent) {
      const direction = event.stage === 'evaluate' ? 'guard' : event.stage === 'revise' ? 'return' : 'data';
      pairs.add(`${previousAgent}->${event.agent}:${direction}`);
    }
    previousAgent = event.agent;
  }
  if ((trace.nodes ?? []).some((node) => node.id === 'analysis-result')) {
    pairs.add('user-analysis-agent->analysis-result:return');
    pairs.add('analysis-result->product-manager-agent:data');
  }
  return pairs;
}

async function openPage(url) {
  const response = await fetch(`http://127.0.0.1:${remotePort}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  if (!response.ok) throw new Error(`open_page_failed:${response.status}`);
  return response.json();
}

async function waitForCdp() {
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${remotePort}/json/version`);
      if (response.ok) return;
    } catch {}
    await delay(250);
  }
  throw new Error('Chrome CDP did not start');
}

async function waitForPageReady(cdp) {
  await waitFor(cdp, "document.readyState === 'complete' || document.readyState === 'interactive'", 20000);
}

async function waitForSelector(cdp, selector) {
  await waitFor(cdp, `Boolean(document.querySelector(${JSON.stringify(selector)}))`, 22000);
}

async function waitForChatDone(cdp) {
  await waitFor(cdp, `!document.querySelector('.chat-run-status') && document.querySelectorAll('.chat-product-card').length > 0`, 50000);
  await delay(500);
}

async function submitPrompt(cdp, prompt) {
  await evalJs(cdp, `(() => {
    const input = document.querySelector('.chat-composer input');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, ${JSON.stringify(prompt)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('.chat-composer').requestSubmit();
  })()`);
}

async function screenshot(cdp, path) {
  const result = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  await writeFile(path, Buffer.from(result.data, 'base64'));
}

async function auditChatCards(cdp) {
  return evalJson(cdp, `(() => {
    const cards = [...document.querySelectorAll('.chat-product-card')].map((card) => {
      const media = card.querySelector('.chat-product-media')?.getBoundingClientRect();
      const copy = card.querySelector('.chat-product-card-copy')?.getBoundingClientRect();
      const button = card.querySelector('button')?.getBoundingClientRect();
      const image = card.querySelector('img')?.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const overlap = Boolean(media && copy && media.right > copy.left + 1);
      const buttonInside = Boolean(button && button.left >= cardRect.left && button.right <= cardRect.right + 1 && button.bottom <= cardRect.bottom + 1);
      return {
        text: card.textContent.trim(),
        media: media ? { left: media.left, right: media.right, width: media.width, height: media.height } : null,
        copy: copy ? { left: copy.left, right: copy.right, width: copy.width } : null,
        image: image ? { width: image.width, height: image.height } : null,
        buttonInside,
        overlap,
      };
    });
    return {
      productCardCount: cards.length,
      overlapCount: cards.filter((card) => card.overlap || !card.buttonInside).length,
      cards: cards.slice(-3),
      latestAssistantText: [...document.querySelectorAll('.chat-bubble.assistant')].at(-1)?.textContent.trim().slice(0, 900) ?? '',
    };
  })()`);
}

async function auditDashboard(cdp) {
  return evalJson(cdp, `(() => {
    const nodes = [...document.querySelectorAll('.agent-node')].map((node) => {
      const rect = node.getBoundingClientRect();
      return { id: node.dataset.nodeId, text: node.textContent.trim(), left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
    });
    let overlapPairs = 0;
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const x = Math.max(0, Math.min(nodes[i].right, nodes[j].right) - Math.max(nodes[i].left, nodes[j].left));
        const y = Math.max(0, Math.min(nodes[i].bottom, nodes[j].bottom) - Math.max(nodes[i].top, nodes[j].top));
        if (x * y > 12) overlapPairs += 1;
      }
    }
    const canvas = document.querySelector('.agent-playback-canvas');
    return {
      nodeCount: nodes.length,
      nodes,
      overlapPairs,
      domEdgeCount: document.querySelectorAll('.agent-node-edge').length,
      domEdges: [...document.querySelectorAll('.agent-node-edge')].map((edge) => ({
        from: edge.dataset.edgeFrom,
        to: edge.dataset.edgeTo,
        order: edge.dataset.edgeOrder,
        direction: edge.dataset.edgeDirection,
        label: edge.dataset.edgeLabel,
      })),
      routeChipCount: document.querySelectorAll('.route-chip-row .route-chip:not(.more)').length,
      routeChips: [...document.querySelectorAll('.route-chip-row .route-chip:not(.more)')].map((chip) => chip.textContent.trim()),
      edgeOrderBadgeCount: document.querySelectorAll('.edge-order-badge').length,
      edgeOrderBadges: [...document.querySelectorAll('.edge-order-badge')].map((badge) => badge.textContent.trim()),
      hasArrowMarker: Boolean(document.querySelector('[marker-end], marker')),
      hasBottomRouteSummary: Boolean(document.querySelector('.graph-route-summary')),
      routeSummary: document.querySelector('.graph-route-summary')?.textContent.trim() ?? '',
      canvasSignature: canvas?.toDataURL('image/png').slice(-180) ?? '',
    };
  })()`);
}

async function hideDevOverlays(cdp) {
  await evalJs(cdp, `(() => {
    const style = document.createElement('style');
    style.textContent = 'nextjs-portal,[data-nextjs-toast],[data-nextjs-dialog-overlay],[data-nextjs-dev-tools-button],[data-nextjs-dev-tools-indicator]{display:none!important}';
    document.head.appendChild(style);
  })()`);
}

async function waitFor(cdp, expression, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await evalJson(cdp, expression);
    if (result) return;
    await delay(250);
  }
  throw new Error(`wait_timeout:${expression}`);
}

async function evalJs(cdp, expression) {
  return cdp.send('Runtime.evaluate', { expression, awaitPromise: true, userGesture: true });
}

async function evalJson(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text ?? 'Runtime.evaluate failed');
  return result.result.value;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
