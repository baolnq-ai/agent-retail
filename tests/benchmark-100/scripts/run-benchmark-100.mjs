import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const apiBaseUrl = envValue('BENCHMARK_API_BASE_URL', 'http://127.0.0.1:7010');
const casesPath = envValue('BENCHMARK_CASES_PATH', join(repoRoot, 'tests', 'benchmark-100', 'cases', 'variant-a.json'));
const runId = envValue('BENCHMARK_RUN_ID', `variant-a-${timestampForFile(new Date())}`);
const reportRoot = envValue('BENCHMARK_REPORT_ROOT', join(repoRoot, 'tests', 'benchmark-100', 'reports'));
const reportJsonPath = envValue('BENCHMARK_REPORT_JSON', join(reportRoot, `${runId}-results.json`));
const reportMdPath = envValue('BENCHMARK_REPORT_MD', join(reportRoot, `${runId}-report.md`));
const checkpointPath = envValue('BENCHMARK_CHECKPOINT_JSON', join(reportRoot, `${runId}-checkpoint.json`));
const delayMs = Number.parseInt(envValue('BENCHMARK_DELAY_MS', '5000'), 10);
const requestTimeoutMs = Number.parseInt(envValue('BENCHMARK_REQUEST_TIMEOUT_MS', '90000'), 10);
const startIndex = Number.parseInt(envValue('BENCHMARK_START_INDEX', '1'), 10);
const limit = Number.parseInt(envValue('BENCHMARK_LIMIT', '100'), 10);
const resume = envValue('BENCHMARK_RESUME', '0') === '1';
const writeAuthCheckpoint = envValue('BENCHMARK_WRITE_AUTH_CHECKPOINT', '0') === '1';
const warmupGroups = envValue('BENCHMARK_WARMUP_GROUPS', '1') === '1';
const warmupDelayMs = Number.parseInt(envValue('BENCHMARK_WARMUP_DELAY_MS', String(Math.min(delayMs, 1000))), 10);

const cases = JSON.parse(await readFile(casesPath, 'utf8'));
if (!Array.isArray(cases) || cases.length < 100) {
  throw new Error(`Bộ case phải có ít nhất 100 case, hiện có ${Array.isArray(cases) ? cases.length : 'không hợp lệ'}.`);
}

await waitForHealth();
await mkdir(reportRoot, { recursive: true });

const previous = resume ? await readCheckpoint().catch(() => undefined) : undefined;
const results = previous?.results ?? [];
const completedIds = new Set(results.map((item) => item.id));
const authGroups = new Map(previous?.authGroups ?? []);
const groupState = new Map(previous?.groupState ?? []);

const selectedCases = cases.slice(Math.max(0, startIndex - 1), Math.max(0, startIndex - 1) + limit);

if (warmupGroups && startIndex > 1) {
  const selectedGroupIds = new Set(selectedCases.map((testCase) => testCase.group).filter((group) => !groupState.has(group)));
  const warmupCases = cases.slice(0, Math.max(0, startIndex - 1)).filter((testCase) => selectedGroupIds.has(testCase.group));
  if (warmupCases.length > 0) {
    console.log(`WARMUP ${warmupCases.length} prior turns for ${selectedGroupIds.size} selected conversation group(s).`);
  }
  for (let warmupIndex = 0; warmupIndex < warmupCases.length; warmupIndex += 1) {
    const testCase = warmupCases[warmupIndex];
    const startedAt = Date.now();
    try {
      const cookie = testCase.mode === 'auth' ? await cookieForGroup(testCase.group, authGroups) : '';
      const beforeState = groupState.get(testCase.group) ?? {};
      const response = await postJson('/api/v1/chat', { message: testCase.prompt }, cookie);
      const warmupResult = evaluateCase(testCase, response, Date.now() - startedAt, beforeState);
      groupState.set(testCase.group, stateFromResponse(response, warmupResult));
      console.log(`WARMUP ${warmupIndex + 1}/${warmupCases.length} ${testCase.id} ${testCase.group} ${warmupResult.elapsedMs}ms ${warmupResult.issues.map((issue) => issue.code).join(', ')}`);
    } catch (error) {
      console.log(`WARMUP_FAIL ${warmupIndex + 1}/${warmupCases.length} ${testCase.id} ${error instanceof Error ? error.message : String(error)}`);
    }
    if (warmupIndex < warmupCases.length - 1 && warmupDelayMs > 0) await sleep(warmupDelayMs);
  }
}

for (let caseIndex = 0; caseIndex < selectedCases.length; caseIndex += 1) {
  const testCase = selectedCases[caseIndex];
  if (completedIds.has(testCase.id)) continue;

  const startedAt = Date.now();
  let result;
  try {
    const cookie = testCase.mode === 'auth' ? await cookieForGroup(testCase.group, authGroups) : '';
    const beforeState = groupState.get(testCase.group) ?? {};
    const response = await postJson('/api/v1/chat', { message: testCase.prompt }, cookie);
    const elapsedMs = Date.now() - startedAt;
    result = evaluateCase(testCase, response, elapsedMs, beforeState);
    groupState.set(testCase.group, stateFromResponse(response, result));
  } catch (error) {
    result = failedRequestResult(testCase, Date.now() - startedAt, error);
  }

  results.push(result);
  completedIds.add(testCase.id);
  await writeReports({ inProgress: results.length < selectedCases.length, results, authGroups, groupState });
  console.log(`${result.grade.toUpperCase()} ${results.length}/${selectedCases.length} ${testCase.id} ${testCase.category} ${result.elapsedMs}ms ${result.issues.map((issue) => issue.code).join(', ')}`);

  if (caseIndex < selectedCases.length - 1 && delayMs > 0) await sleep(delayMs);
}

const summary = await writeReports({ inProgress: false, results, authGroups, groupState });
console.log(JSON.stringify(summary, null, 2));
console.log(`json=${reportJsonPath}`);
console.log(`md=${reportMdPath}`);
if (summary.fail > 0) process.exitCode = 1;

function evaluateCase(testCase, response, elapsedMs, beforeState) {
  const text = textFromResponse(response);
  const blocks = Array.isArray(response.blocks) ? response.blocks : [];
  const blockTypes = blocks.map((block) => block.type);
  const trace = response.trace;
  const issues = [
    ...evaluateResponseShape(testCase, response, text, blockTypes, elapsedMs),
    ...evaluateBlocks(testCase, blocks, text),
    ...evaluateTrace(testCase, trace),
    ...evaluateCart(testCase, response, beforeState, text),
    ...evaluateTextQuality(testCase, text),
  ];

  return {
    id: testCase.id,
    group: testCase.group,
    mode: testCase.mode,
    category: testCase.category,
    prompt: testCase.prompt,
    grade: gradeFromIssues(issues),
    score: scoreFromIssues(issues),
    elapsedMs,
    model: response.model,
    intent: trace?.intent,
    blockTypes,
    text,
    textPreview: text.slice(0, 700),
    productIds: productItems(blocks).map((item) => item.id),
    policyIds: policyItems(blocks).map((item) => item.id),
    cart: cartSummary(blocks),
    flow: traceSummary(trace),
    issues,
  };
}

function evaluateResponseShape(testCase, response, text, blockTypes, elapsedMs) {
  const issues = [];
  if (!response || typeof response !== 'object') issues.push(fail('response_invalid'));
  if (typeof response.messageId !== 'string') issues.push(fail('missing_message_id'));
  if (!Array.isArray(response.blocks)) issues.push(fail('missing_blocks'));
  if (response.model === 'safe-fallback') issues.push(fail('safe_fallback_model_used'));
  if (text.trim().length < 18) issues.push(fail('text_too_short'));
  if (elapsedMs > requestTimeoutMs) issues.push(fail('request_timeout_threshold'));
  if (elapsedMs > 45000) issues.push(warn('response_slow_over_45s'));
  for (const blockType of testCase.expectedBlocks ?? []) {
    if (!blockTypes.includes(blockType)) issues.push(fail(`missing_block:${blockType}`));
  }
  return issues;
}

function evaluateBlocks(testCase, blocks, text) {
  const issues = [];
  const products = productItems(blocks);
  const policies = policyItems(blocks);
  const normalized = normalize(text);

  if (testCase.expectedBlocks?.includes('product_list') && products.length === 0) issues.push(fail('empty_product_list'));
  if (testCase.semanticStrict && testCase.expectedBlocks?.includes('product_list') && products.length > 0 && Array.isArray(testCase.expectedFamilies) && testCase.expectedFamilies.length > 0) {
    const mismatchedProducts = products.filter((product) => !matchesAnyExpectedFamily(product, testCase.expectedFamilies));
    if (mismatchedProducts.length === products.length) issues.push(fail(`semantic_product_family_mismatch:${testCase.expectedFamilies.join('+')}`));
  }
  if (testCase.semanticStrict && testCase.expectedBlocks?.includes('product_list') && products.length > 0) {
    const budgetMax = parseBudgetMax(testCase.prompt);
    if (budgetMax !== undefined && products.some((product) => product.price > budgetMax) && !/chưa có|không có|vượt ngân sách|cao hơn ngân sách/i.test(text)) {
      issues.push(fail(`semantic_budget_mismatch:max_${budgetMax}`));
    }
  }
  if (testCase.expectedBlocks?.includes('policy_answer') && policies.length === 0) issues.push(fail('empty_policy_sources'));
  if (testCase.category === 'policy' && products.length > 0 && !/sản phẩm|san pham|hàng|hang/.test(normalized)) issues.push(warn('policy_returned_product_rail_review'));
  if (testCase.category.includes('cart') && !blocks.some((block) => block.type === 'cart_summary')) issues.push(fail('missing_cart_summary'));
  if (testCase.expectRefusalOrClarify && !looksLikeRefusalOrClarify(normalized)) issues.push(warn('expected_refusal_or_clarification_review'));
  return issues;
}

function evaluateTrace(testCase, trace) {
  const issues = [];
  if (!trace) return [fail('missing_trace')];
  const nodeIds = new Set((trace.nodes ?? []).map((node) => node.id));
  const edges = trace.graphEdges ?? [];
  const agents = trace.agents ?? [];
  const requiredNodes = testCase.semanticStrict
    ? ['pipeline-executor', 'task-blackboard', 'session-context', 'task-context', 'lead-agent', 'sales-agent', 'assistant-response']
    : ['pipeline-executor', 'session-context', 'task-context', 'lead-agent', 'sales-agent', 'assistant-response'];
  for (const id of requiredNodes) {
    if (!nodeIds.has(id)) issues.push(fail(`flow_missing_node:${id}`));
  }
  if (!edges.length) issues.push(fail('flow_missing_graph_edges'));
  if (!trace.playbackEvents?.length) issues.push(fail('flow_missing_playback_events'));
  if (edges.some((edge) => edge.from === 'sales-agent' && edge.to === 'assistant-response')) issues.push(fail('flow_direct_sales_to_response'));
  for (const agent of testCase.expectedAgents ?? []) {
    if (!agents.includes(agent)) issues.push(fail(`missing_expected_agent:${agent}`));
  }
  if (testCase.expectedIntent && trace.intent && trace.intent !== testCase.expectedIntent) issues.push(warn(`intent_review:${trace.intent}:expected_${testCase.expectedIntent}`));
  if (testCase.historySensitive) {
    if (!agents.includes('history-agent')) issues.push(fail('history_case_missing_history_agent'));
    if (!testCase.expectAuthBlock && (trace.memory?.recentTurnCount ?? 0) < 1) issues.push(fail('history_case_no_recent_turns'));
    const refs = trace.retrieval?.selectedProductIds ?? [];
    const cartRefs = trace.cart?.resolvedProductIds ?? [];
    if (!testCase.expectAuthBlock && refs.length === 0 && cartRefs.length === 0 && !trace.pipeline?.some((event) => /history|memory/i.test(event.summary ?? ''))) {
      issues.push(warn('history_case_no_resolved_reference_visible'));
    }
  }
  if (testCase.category === 'policy' && (trace.retrieval?.contextDocumentCount ?? 0) === 0) issues.push(fail('policy_without_rag_context'));
  if (testCase.semanticStrict && testCase.category === 'policy' && (trace.blackboard?.evidence?.length ?? 0) === 0) issues.push(fail('policy_without_blackboard_evidence'));
  if ((testCase.category === 'product' || testCase.category === 'compare' || testCase.category === 'product_detail') && !agents.includes('search-agent')) issues.push(fail('product_without_search_agent'));
  return issues;
}

function evaluateCart(testCase, response, beforeState, text) {
  const issues = [];
  const trace = response.trace;
  const toolResults = trace?.toolResults ?? [];
  const actionType = normalize(trace?.cart?.actionType ?? '');
  const normalizedText = normalize(text);
  const cart = cartSummary(response.blocks ?? []);
  const beforeCount = beforeState.cartItemCount ?? 0;
  const afterCount = cart?.items?.length ?? trace?.cart?.afterItemCount ?? 0;
  const hasCompletedTool = toolResults.some((tool) => tool.status === 'completed' && ((tool.productIds?.length ?? 0) > 0 || ['clear', 'confirm_pending', 'cancel_pending'].includes(testCase.expectedCartOperation ?? '')));
  const hasPendingTool = toolResults.some((tool) => tool.status === 'pending_confirmation') || Boolean(trace?.pendingPlan);

  if (testCase.expectedCartOperation) {
    if (!response.trace?.agents?.includes('cart-agent')) issues.push(fail('cart_operation_missing_cart_agent'));
    if (!actionType.includes(normalize(testCase.expectedCartOperation)) && !toolResults.some((tool) => normalize(tool.tool ?? '').includes(cartOperationNeedle(testCase.expectedCartOperation)))) {
      issues.push(warn(`cart_operation_trace_review:${testCase.expectedCartOperation}:${trace?.cart?.actionType ?? 'none'}`));
    }
    if (!testCase.allowPending && !testCase.expectAuthBlock && !hasCompletedTool) issues.push(fail('cart_operation_without_completed_tool'));
    if (testCase.allowPending && !hasCompletedTool && !hasPendingTool) issues.push(fail('cart_operation_without_completed_or_pending_tool'));
  }
  if (testCase.expectAuthBlock) {
    if (hasCompletedTool) issues.push(fail('guest_cart_mutated'));
    if (!/đăng nhập|dang nhap|tài khoản|tai khoan/.test(normalizedText)) issues.push(fail('guest_cart_missing_login_message'));
  }
  if (testCase.expectedCartOperation === 'add' && !testCase.allowPending && !testCase.expectAuthBlock && afterCount < beforeCount) issues.push(fail('cart_add_reduced_item_count'));
  if ((testCase.expectedCartOperation === 'remove' || testCase.expectedCartOperation === 'decrement_quantity') && !testCase.expectAuthBlock && afterCount > beforeCount + 1) issues.push(warn('cart_remove_count_review'));
  return issues;
}

function evaluateTextQuality(testCase, text) {
  const issues = [];
  const normalized = normalize(text);
  if (/prod_[a-z0-9_]+/i.test(text)) issues.push(fail('leaked_internal_product_id'));
  if (/Recommendation-agent|shouldShowProducts|presentationIntent|mustMentionProductIds|PrismaClient|TypeError|stack trace/i.test(text)) issues.push(fail('leaked_internal_pipeline_text'));
  for (const forbidden of testCase.forbidden ?? []) {
    if (normalized.includes(normalize(forbidden)) && !looksLikeRefusalOrClarify(normalized)) issues.push(fail(`forbidden_text:${forbidden}`));
  }
  for (const required of testCase.requiredText ?? []) {
    if (!normalized.includes(normalize(required))) issues.push(fail(`missing_required_text:${required}`));
  }
  if (testCase.maxTextChars && text.length > testCase.maxTextChars) issues.push(warn(`answer_too_long:${text.length}:max_${testCase.maxTextChars}`));
  if (testCase.expectedBlocks?.includes('product_list') && /không có sản phẩm|khong co san pham|chưa tìm thấy|chua tim thay/.test(normalized)) issues.push(warn('text_contradicts_product_rail_review'));
  return issues;
}

function stateFromResponse(response, result) {
  const cart = result.cart;
  return {
    lastIntent: response.trace?.intent,
    lastProductIds: result.productIds,
    lastCartProductIds: response.trace?.cart?.resolvedProductIds ?? [],
    cartItemCount: cart?.items?.length ?? 0,
    cartGrandTotal: cart?.grandTotal ?? 0,
  };
}

function failedRequestResult(testCase, elapsedMs, error) {
  return {
    id: testCase.id,
    group: testCase.group,
    mode: testCase.mode,
    category: testCase.category,
    prompt: testCase.prompt,
    grade: 'fail',
    score: 0,
    elapsedMs,
    model: undefined,
    intent: undefined,
    blockTypes: [],
    text: '',
    textPreview: '',
    productIds: [],
    policyIds: [],
    cart: undefined,
    flow: { agents: [], nodeCount: 0, edgeCount: 0, playbackCount: 0, toolResults: [] },
    issues: [fail(error instanceof Error ? error.message : String(error))],
  };
}

async function writeReports({ inProgress, results, authGroups, groupState }) {
  const summary = summarize(results, inProgress);
  const payload = {
    generatedAt: new Date().toISOString(),
    suite: 'benchmark-100-pipeline-audit',
    apiBaseUrl,
    casesPath,
    runId,
    delayMs,
    requestTimeoutMs,
    ...summary,
    results,
  };
  await mkdir(dirname(reportJsonPath), { recursive: true });
  await writeFile(reportJsonPath, JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(reportMdPath, renderMarkdownReport(payload), 'utf8');
  await writeFile(checkpointPath, JSON.stringify({
    generatedAt: payload.generatedAt,
    authGroups: writeAuthCheckpoint ? [...authGroups.entries()] : [...authGroups.keys()].map((group) => [group, '[redacted]']),
    groupState: [...groupState.entries()],
    results,
  }, null, 2), 'utf8');
  return summary;
}

function summarize(results, inProgress) {
  const pass = results.filter((item) => item.grade === 'pass').length;
  const warn = results.filter((item) => item.grade === 'warn').length;
  const failCount = results.filter((item) => item.grade === 'fail').length;
  const avgLatencyMs = results.length ? Math.round(results.reduce((sum, item) => sum + item.elapsedMs, 0) / results.length) : 0;
  const sorted = [...results].sort((left, right) => left.elapsedMs - right.elapsedMs);
  const p95LatencyMs = sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))].elapsedMs : 0;
  return {
    total: results.length,
    pass,
    warn,
    fail: failCount,
    inProgress,
    avgLatencyMs,
    p95LatencyMs,
    topIssueCodes: topIssues(results),
  };
}

function renderMarkdownReport(payload) {
  const lines = [
    `# Báo cáo benchmark 100 pipeline chatbot retail`,
    ``,
    `- Run: \`${payload.runId}\``,
    `- Thời gian: ${payload.generatedAt}`,
    `- API: \`${payload.apiBaseUrl}\``,
    `- Bộ case: \`${payload.casesPath}\``,
    `- Delay giữa request: ${payload.delayMs} ms`,
    `- Trạng thái: ${payload.inProgress ? 'đang chạy/chưa đủ 100 case' : 'đã hoàn tất batch'}`,
    `- Kết quả: ${payload.pass} pass, ${payload.warn} warn, ${payload.fail} fail / ${payload.total}`,
    `- Latency avg/p95: ${payload.avgLatencyMs}/${payload.p95LatencyMs} ms`,
    ``,
    `## Lỗi nổi bật`,
    ``,
    ...(payload.topIssueCodes.length ? payload.topIssueCodes.map((item) => `- \`${item.code}\`: ${item.count}`) : ['- Chưa có lỗi.']),
    ``,
    `## Kết quả từng case`,
    ``,
    `| Case | Nhóm | Loại | Grade | Intent | Latency | Issue | Tóm tắt trả lời thật |`,
    `| --- | --- | --- | --- | --- | ---: | --- | --- |`,
    ...payload.results.map((item) => `| ${item.id} | ${item.group} | ${item.category} | ${item.grade} | ${item.intent ?? '-'} | ${item.elapsedMs} | ${item.issues.map((issue) => `\`${issue.code}\``).join('<br>') || '-'} | ${escapeTable(item.textPreview.slice(0, 260))} |`),
    ``,
    `## Ghi chú đọc report`,
    ``,
    `- Đây là response thật từ API, không phải mock.`,
    `- Case fail cần đọc \`text\`, \`flow\`, \`cart\`, \`productIds\`, \`policyIds\` trong JSON để quyết định fix pipeline/tool/prompt.`,
    `- Sau khi fix lớn phải đổi bộ câu và chạy lại từ đầu theo yêu cầu task.`,
  ];
  return `${lines.join('\n')}\n`;
}

function topIssues(results) {
  const counts = new Map();
  for (const result of results) {
    for (const issue of result.issues) counts.set(issue.code, (counts.get(issue.code) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((left, right) => right.count - left.count || left.code.localeCompare(right.code))
    .slice(0, 20);
}

async function cookieForGroup(group, authGroups) {
  if (authGroups.has(group)) return authGroups.get(group);
  let lastError = '';
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const randomPart = Math.random().toString(36).slice(2, 10);
    const groupPart = group.toLocaleLowerCase('vi-VN').replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').slice(0, 12);
    const suffix = `${randomPart}_${Date.now().toString(36).slice(-6)}_${groupPart}`.slice(0, 24);
    const response = await fetch(`${apiBaseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ name: `bench_${suffix}`.slice(0, 32), password: `StrongPass_${suffix}` }),
    });
    const text = await response.text();
    if (response.status === 201) {
      const cookie = response.headers.get('set-cookie') ?? '';
      authGroups.set(group, cookie);
      return cookie;
    }
    lastError = `auth_register_${response.status}:${text.slice(0, 200)}`;
    if (response.status !== 409) break;
  }
  throw new Error(lastError);
}

async function postJson(path, body, cookie = '') {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8', ...(cookie ? { cookie } : {}) },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    if (response.status !== 201) throw new Error(`http_${response.status}:${text.slice(0, 400)}`);
    return text ? JSON.parse(text) : {};
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${apiBaseUrl}/health`);
      if (response.ok) return;
    } catch {}
    await sleep(1000);
  }
  throw new Error(`API không sẵn sàng: ${apiBaseUrl}/health`);
}

async function readCheckpoint() {
  return JSON.parse(await readFile(checkpointPath, 'utf8'));
}

function productItems(blocks) {
  return blocks.find((block) => block.type === 'product_list')?.items ?? [];
}

function policyItems(blocks) {
  return blocks.find((block) => block.type === 'policy_answer')?.items ?? [];
}

function cartSummary(blocks) {
  return blocks.find((block) => block.type === 'cart_summary')?.cart;
}

function textFromResponse(response) {
  return response.blocks?.find((block) => block.type === 'text')?.content ?? '';
}

function traceSummary(trace) {
  return {
    agents: trace?.agents ?? [],
    nodeCount: trace?.nodes?.length ?? 0,
    edgeCount: trace?.graphEdges?.length ?? 0,
    playbackCount: trace?.playbackEvents?.length ?? 0,
    pipeline: (trace?.pipeline ?? []).map((event) => `${event.agent}:${event.stage}:${event.status}`).slice(0, 40),
    toolResults: trace?.toolResults ?? [],
    cartActionType: trace?.cart?.actionType,
    cartResolvedProductIds: trace?.cart?.resolvedProductIds ?? [],
    memory: trace?.memory,
    retrieval: trace?.retrieval,
    errors: trace?.errors ?? [],
  };
}

function cartOperationNeedle(operation) {
  if (operation === 'add') return 'add';
  if (operation === 'remove') return 'remove';
  if (operation === 'set_quantity') return 'set';
  if (operation === 'increment_quantity') return 'increment';
  if (operation === 'decrement_quantity') return 'decrement';
  if (operation === 'clear') return 'clear';
  return operation;
}

function fail(code) {
  return { severity: 'fail', code };
}

function warn(code) {
  return { severity: 'warn', code };
}

function gradeFromIssues(issues) {
  if (issues.some((issue) => issue.severity === 'fail')) return 'fail';
  return issues.length ? 'warn' : 'pass';
}

function scoreFromIssues(issues) {
  return Math.max(0, 100 - issues.reduce((score, issue) => score + (issue.severity === 'fail' ? 20 : 6), 0));
}

function normalize(value) {
  return String(value)
    .toLocaleLowerCase('vi-VN')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesAnyExpectedFamily(product, expectedFamilies) {
  const normalizedProduct = normalize(`${product.title ?? ''} ${product.brand ?? ''} ${product.category ?? ''} ${product.description ?? ''} ${Object.values(product.attributes ?? {}).join(' ')}`);
  return expectedFamilies.some((family) => familyPattern(family).test(normalizedProduct));
}

function familyPattern(family) {
  const patterns = {
    may_loc_khong_khi: /\b(may loc|loc kk|loc khong khi|loc khi|hepa|pm2|air purifier)\b/,
    quat_dieu_hoa: /\b(quat|lam mat|dieu hoa|cooling|dao gio|remote|lit)\b/,
    robot_hut_bui: /\b(robot hut|hut bui|lau nha|vacuum)\b/,
    may_hut_bui: /\b(hut bui|vacuum)\b/,
    smart_home: /\b(camera|cam bien|bao dong|doorbell|chuong hinh|aqara|tapo|zigbee|matter|thread|homekit)\b/,
    camera: /\b(camera|chuong hinh|doorbell|ezviz|imou|tapo)\b/,
    cham_soc_ca_nhan: /\b(may say toc|ban chai|can suc khoe|can thong minh|beurer|oral|body composition)\b/,
    noi_com: /\b(noi com|rice cooker)\b/,
    noi_chien: /\b(noi chien|lo chien|air fryer)\b/,
    may_xay: /\b(may xay|may ep|xay sinh to|xay da|sinh to|blender)\b/,
  };
  return patterns[family] ?? new RegExp(`\\b${escapeRegex(String(family))}\\b`);
}

function parseBudgetMax(prompt) {
  const normalizedPrompt = normalize(prompt);
  const millionMatch = normalizedPrompt.match(/(?:duoi|khong qua|tam|toi da|khoang)\s*(\d+(?:[,.]\d+)?)\s*(?:trieu|tr)\b/);
  if (millionMatch) return Math.round(Number.parseFloat(millionMatch[1].replace(',', '.')) * 1_000_000);
  const thousandMatch = normalizedPrompt.match(/(?:duoi|khong qua|tam|toi da|khoang)\s*(\d+(?:[,.]\d+)?)\s*(?:k|nghin|ngan)\b/);
  if (thousandMatch) return Math.round(Number.parseFloat(thousandMatch[1].replace(',', '.')) * 1_000);
  return undefined;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function looksLikeRefusalOrClarify(normalizedText) {
  return /khong the|khong duoc|khong tim thay|chua the them|xin loi|can dang nhap|dang nhap|can xac nhan|hay xac nhan|ban vui long|kiem tra lai|noi ro|lam ro|khong co chuc nang|chi ho tro|bao mat|khong tao/.test(normalizedText);
}

function escapeTable(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

function envValue(name, fallback) {
  return process.env[name] ?? fallback;
}

function timestampForFile(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '-');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
