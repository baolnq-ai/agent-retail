'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { productImageUrl, productSpec } from './product-media.js';

export interface Product {
  id: string;
  title: string;
  brand: string;
  category: string;
  price: number;
  currency: 'VND';
  inventory: number;
  attributes: Record<string, string>;
  description: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Cart {
  id: string;
  version: number;
  items: CartItem[];
  subtotal: number;
  grandTotal: number;
  status: 'active' | 'ordered';
}

export interface AuthUser {
  id: string;
  name: string;
}

interface KnowledgeDocument {
  id: string;
  type: 'policy' | 'faq';
  title: string;
  content: string;
  trustLevel: 'official';
}

interface AgentChatResponse {
  messageId: string;
  model: string;
  blocks: Array<
    | { type: 'text'; version: 1; content: string }
    | { type: 'product_list'; version: 1; items: Product[] }
    | { type: 'cart_summary'; version: 1; cart: Cart }
    | { type: 'policy_answer'; version: 1; items: KnowledgeDocument[] }
    | { type: 'quick_replies'; version: 1; items: string[] }
  >;
  diagnostics: {
    embeddingDimensions: number;
    rerankTopScore: number;
    contextDocuments: number;
  };
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  products?: Product[];
  policies?: KnowledgeDocument[];
  quickReplies?: string[];
  isStreaming?: boolean;
  isError?: boolean;
}

type StreamEvent =
  | { type: 'status'; message: string }
  | { type: 'token'; content: string }
  | { type: 'final'; response: AgentChatResponse }
  | { type: 'error'; message: string };

interface RetailChatWidgetProps {
  apiBaseUrl: string;
  initialProducts: Product[];
  authUser?: AuthUser;
  cart: Cart;
  onCartChange: (cart: Cart) => void;
  onRequireLogin: (message?: string) => void;
}

const initialQuickReplies = ['Máy lọc phòng 25m2 dưới 4 triệu', 'So sánh các lựa chọn phù hợp', 'Chính sách đổi trả thế nào?'];
const progressSteps = ['Phân tích', 'Ngữ cảnh', 'Xử lý', 'Trả lời'];

export function RetailChatWidget({ apiBaseUrl, initialProducts, authUser, cart, onCartChange, onRequireLogin }: RetailChatWidgetProps) {
  const [products, setProducts] = useState(initialProducts);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-assistant',
      role: 'assistant',
      content: 'Chào bạn, mình là trợ lý mua sắm RetailHome. Mình có thể tư vấn sản phẩm, chính sách và thao tác giỏ hàng khi bạn đã đăng nhập.',
      products: initialProducts.slice(0, 1),
      quickReplies: initialQuickReplies,
    },
  ]);
  const [input, setInput] = useState('');
  const [isChatBusy, setIsChatBusy] = useState(false);
  const [isActionBusy, setIsActionBusy] = useState(false);
  const [statusText, setStatusText] = useState(authUser ? 'Chat sẵn sàng' : 'Đăng nhập để thao tác giỏ');
  const [activeStep, setActiveStep] = useState(-1);
  const [chatMode, setChatMode] = useState<'open' | 'minimized' | 'closed'>('closed');
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const tokenQueueRef = useRef('');
  const tokenTimerRef = useRef<number | undefined>(undefined);
  const streamedContentRef = useRef('');
  const pendingFinalRef = useRef<{ messageId: string; response: AgentChatResponse } | undefined>(undefined);

  useEffect(() => {
    setProducts((current) => mergeProducts(current, initialProducts));
  }, [initialProducts]);

  useEffect(() => {
    setStatusText(authUser ? `Chat sẵn sàng · giỏ ${cart.items.length}` : 'Đăng nhập để thao tác giỏ');
  }, [authUser, cart.items.length]);

  useEffect(() => {
    if (chatMode !== 'open') return;
    const scrollFrame = window.requestAnimationFrame(() => {
      const container = chatMessagesRef.current;
      if (!container) return;
      container.scrollTop = container.scrollHeight;
    });
    return () => window.cancelAnimationFrame(scrollFrame);
  }, [messages, chatMode]);

  useEffect(() => () => {
    resetTokenBuffer();
  }, []);

  async function submitChat(message: string) {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isChatBusy) return;

    const assistantMessageId = crypto.randomUUID();
    resetTokenBuffer();
    setChatMode('open');
    setInput('');
    setIsChatBusy(true);
    setActiveStep(0);
    setStatusText('Đang phân tích nhu cầu...');
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: 'user', content: trimmedMessage },
      { id: assistantMessageId, role: 'assistant', content: '', isStreaming: true },
    ]);

    let isFinalQueued = false;
    try {
      await streamChat(`${apiBaseUrl}/api/v1/chat/stream`, { message: trimmedMessage }, (event) => {
        if (event.type === 'status') {
          setStatusText(event.message);
          setActiveStep(resolveStatusStep(event.message));
          return;
        }

        if (event.type === 'token') {
          queueTokenChunk(assistantMessageId, event.content);
          return;
        }

        if (event.type === 'final') {
          isFinalQueued = true;
          queueFinalResponse(assistantMessageId, event.response);
          return;
        }

        resetTokenBuffer();
        pendingFinalRef.current = undefined;

        setMessages((current) => current.map((item) => (
          item.id === assistantMessageId ? { ...item, content: event.message, isStreaming: false, isError: true } : item
        )));
        setActiveStep(-1);
        setStatusText(event.message);
        setIsChatBusy(false);
      });
    } catch (error) {
      resetTokenBuffer();
      pendingFinalRef.current = undefined;
      setActiveStep(-1);
      setMessages((current) => current.map((item) => (
        item.id === assistantMessageId
          ? { ...item, content: error instanceof Error ? error.message : 'Yêu cầu chat thất bại', isStreaming: false, isError: true }
          : item
      )));
      setStatusText(error instanceof Error ? error.message : 'Yêu cầu chat thất bại');
      setIsChatBusy(false);
    } finally {
      if (!isFinalQueued) setIsChatBusy(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitChat(input.trim() || initialQuickReplies[0]);
  }

  function queueTokenChunk(messageId: string, content: string) {
    tokenQueueRef.current += content;
    scheduleTokenDrain(messageId);
  }

  function scheduleTokenDrain(messageId: string) {
    if (tokenTimerRef.current !== undefined) return;
    tokenTimerRef.current = window.setTimeout(() => {
      tokenTimerRef.current = undefined;
      drainTokenQueue(messageId);
    }, 24);
  }

  function drainTokenQueue(messageId: string) {
    const nextChunk = takeTypewriterChunk(tokenQueueRef.current);
    if (!nextChunk) {
      applyPendingFinalResponse();
      return;
    }

    tokenQueueRef.current = tokenQueueRef.current.slice(nextChunk.length);
    const nextContent = sanitizeAssistantContent(streamedContentRef.current + nextChunk, false);
    if (nextContent !== streamedContentRef.current) {
      streamedContentRef.current = nextContent;
      setMessages((current) => current.map((item) => (
        item.id === messageId ? { ...item, content: nextContent } : item
      )));
    }

    if (tokenQueueRef.current) {
      scheduleTokenDrain(messageId);
      return;
    }

    applyPendingFinalResponse();
  }

  function queueFinalResponse(messageId: string, response: AgentChatResponse) {
    pendingFinalRef.current = { messageId, response };
    if (!tokenQueueRef.current && tokenTimerRef.current === undefined) applyPendingFinalResponse();
  }

  function applyPendingFinalResponse() {
    const pendingFinal = pendingFinalRef.current;
    if (!pendingFinal) return;
    pendingFinalRef.current = undefined;
    applyFinalResponse(pendingFinal.messageId, pendingFinal.response);
  }

  function applyFinalResponse(messageId: string, response: AgentChatResponse) {
    const textBlock = response.blocks.find((block) => block.type === 'text');
    const productBlock = response.blocks.find((block) => block.type === 'product_list');
    const policyBlock = response.blocks.find((block) => block.type === 'policy_answer');
    const cartBlock = response.blocks.find((block) => block.type === 'cart_summary');
    const quickReplyBlock = response.blocks.find((block) => block.type === 'quick_replies');

    if (productBlock?.items.length) setProducts((current) => mergeProducts(current, productBlock.items));
    if (cartBlock) onCartChange(cartBlock.cart);
    setMessages((current) => current.map((item) => (
      item.id === messageId
        ? {
          ...item,
          content: reconcileAssistantContent(item.content, textBlock?.content ?? ''),
          products: productBlock?.items.slice(0, 4),
          policies: policyBlock?.items,
          quickReplies: quickReplyBlock?.items,
          isStreaming: false,
        }
        : item
    )));
    setActiveStep(progressSteps.length);
    setStatusText(cartBlock ? `Đã cập nhật giỏ · ${cartBlock.cart.items.length} dòng` : 'Đã có câu trả lời');
    setIsChatBusy(false);
  }

  function resetTokenBuffer() {
    tokenQueueRef.current = '';
    streamedContentRef.current = '';
    if (tokenTimerRef.current !== undefined) {
      window.clearTimeout(tokenTimerRef.current);
      tokenTimerRef.current = undefined;
    }
  }

  async function handleClearHistory() {
    if (isActionBusy || !authUser) return;
    const confirmed = window.confirm('Xoá toàn bộ lịch sử chat và dữ liệu cá nhân hoá? Việc này sẽ làm mất các đề xuất tối ưu theo thói quen của bạn.');
    if (!confirmed) return;
    setIsActionBusy(true);
    setStatusText('Đang xoá lịch sử chat...');
    try {
      await deleteJson(`${apiBaseUrl}/api/v1/account/memory`);
      setMessages([{
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Mình đã xoá lịch sử chat và dữ liệu cá nhân hoá của account này. Từ lượt tiếp theo mình sẽ tư vấn như một account mới.',
        quickReplies: initialQuickReplies,
      }]);
      setStatusText('Đã xoá lịch sử chat');
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : 'Không xoá được lịch sử');
    } finally {
      setIsActionBusy(false);
    }
  }

  async function handleAddToCart(productId: string) {
    if (isActionBusy) return;
    if (!authUser) {
      setChatMode('open');
      onRequireLogin('Đăng nhập để thêm sản phẩm vào giỏ hàng');
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: 'assistant', content: 'Bạn cần đăng nhập hoặc đăng ký trước, sau đó mình sẽ thêm sản phẩm vào giỏ hàng của bạn.', quickReplies: ['Đăng nhập / Đăng ký'] },
      ]);
      return;
    }
    setIsActionBusy(true);
    setStatusText('Đang thêm sản phẩm vào giỏ...');
    try {
      const nextCart = await postJson<Cart>(`${apiBaseUrl}/api/v1/cart/current/items`, { productId, quantity: 1 });
      onCartChange(nextCart);
      window.dispatchEvent(new CustomEvent('retail-cart-changed', { detail: nextCart }));
      setStatusText(`Đã thêm vào giỏ hàng · ${nextCart.items.length} dòng`);
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : 'Không thêm được sản phẩm');
    } finally {
      setIsActionBusy(false);
    }
  }

  if (chatMode === 'closed') {
    return <button type="button" className="chat-launcher" onClick={() => setChatMode('open')}>Trợ lý mua sắm</button>;
  }

  return (
    <aside className={chatMode === 'minimized' ? 'chat-widget minimized' : 'chat-widget'} aria-label="Khung chat tư vấn mua hàng">
      <div className="chat-header">
        <div>
          <strong>Trợ lý mua sắm</strong>
          <span>{statusText}</span>
        </div>
        <div className="chat-window-actions">
          <a href="/agent-dashboard" target="_blank" rel="noreferrer">Dashboard</a>
          {authUser ? <button type="button" className="chat-clear-history" disabled={isActionBusy} onClick={() => void handleClearHistory()}>Xoá</button> : null}
          <button type="button" onClick={() => setChatMode(chatMode === 'minimized' ? 'open' : 'minimized')}>{chatMode === 'minimized' ? 'Mở' : 'Thu nhỏ'}</button>
          <button type="button" onClick={() => setChatMode('closed')}>Đóng</button>
        </div>
      </div>
      <div className="progress-line" aria-label="Tiến trình xử lý chat">
        {progressSteps.map((step, index) => <span className={index <= activeStep ? 'active' : ''} title={step} key={step} />)}
      </div>
      {isChatBusy ? (
        <div className="chat-run-status" role="status" aria-live="polite">
          <span className="assistant-pulse" aria-hidden="true"><i /><i /><i /></span>
          <div>
            <strong>{statusText}</strong>
            <small>{activeStep >= 0 && activeStep < progressSteps.length ? progressSteps[activeStep] : 'Hoàn tất'}</small>
          </div>
        </div>
      ) : null}
      <div className="chat-messages" ref={chatMessagesRef}>
        {messages.map((message) => (
          <article className={`chat-bubble ${message.role}${message.isError ? ' error' : ''}`} key={message.id}>
            {message.content ? <p>{message.content}{message.isStreaming ? <span className="stream-cursor" /> : null}</p> : null}
            {message.products?.length ? <ProductRecommendationRail products={message.products} onAddToCart={handleAddToCart} /> : null}
            {message.policies?.map((policy) => (
              <div className="policy-card" key={policy.id}>
                <strong>{policy.title}</strong>
                <p>{policy.content}</p>
              </div>
            ))}
            {message.quickReplies && !message.isStreaming ? (
              <div className="quick-replies">
                {message.quickReplies.map((reply) => (
                  <button key={reply} type="button" disabled={isChatBusy} onClick={() => reply === 'Đăng nhập / Đăng ký' ? window.location.assign('/account') : void submitChat(reply)}>{reply}</button>
                ))}
              </div>
            ) : null}
          </article>
        ))}
        {isChatBusy ? (
          <div className="typing" aria-label="Trợ lý đang soạn trả lời">
            <span /><span /><span />
          </div>
        ) : null}
      </div>
      {chatMode === 'open' ? (
        <form className="chat-composer" onSubmit={handleSubmit}>
          <input aria-label="Nhập câu hỏi cho trợ lý" placeholder="Hỏi về sản phẩm, đổi trả, giá..." value={input} onChange={(event) => setInput(event.target.value)} />
          <button type="submit" disabled={isChatBusy}>Gửi</button>
        </form>
      ) : null}
    </aside>
  );
}

function ProductRecommendationRail({ products, onAddToCart }: { products: Product[]; onAddToCart: (productId: string) => void }) {
  const visibleProducts = products.slice(0, 4);
  const [activeIndex, setActiveIndex] = useState(0);
  const railTrackRef = useRef<HTMLDivElement>(null);
  const safeActiveIndex = Math.min(activeIndex, Math.max(visibleProducts.length - 1, 0));

  useEffect(() => {
    const track = railTrackRef.current;
    if (!track || visibleProducts.length <= 1) return;
    track.scrollTo({ left: track.clientWidth * safeActiveIndex, behavior: 'smooth' });
  }, [safeActiveIndex, visibleProducts.length]);

  if (visibleProducts.length === 0) return null;

  function moveRail(direction: -1 | 1) {
    setActiveIndex((current) => Math.min(Math.max(current + direction, 0), visibleProducts.length - 1));
  }

  function handleRailScroll() {
    const track = railTrackRef.current;
    if (!track) return;
    const nextIndex = Math.round(track.scrollLeft / Math.max(track.clientWidth, 1));
    const boundedIndex = Math.min(Math.max(nextIndex, 0), visibleProducts.length - 1);
    if (boundedIndex !== safeActiveIndex) setActiveIndex(boundedIndex);
  }

  return (
    <div className="chat-product-rail" aria-label="Sản phẩm đề xuất">
      <div className="chat-product-rail-header">
        <span>Gợi ý phù hợp</span>
        {visibleProducts.length > 1 ? <small>{safeActiveIndex + 1}/{visibleProducts.length}</small> : null}
      </div>
      <div className={visibleProducts.length > 1 ? 'chat-product-rail-body' : 'chat-product-rail-body single'}>
        {visibleProducts.length > 1 ? <button className="rail-nav previous" type="button" aria-label="Xem sản phẩm trước" disabled={safeActiveIndex === 0} onClick={() => moveRail(-1)}>‹</button> : null}
        <div className="chat-product-rail-track" ref={railTrackRef} onScroll={handleRailScroll}>
          <div className="chat-product-rail-track-inner">
            {visibleProducts.map((product) => (
              <div className="chat-product-rail-slide" key={product.id}>
                <ProductRecommendation product={product} onAddToCart={onAddToCart} />
              </div>
            ))}
          </div>
        </div>
        {visibleProducts.length > 1 ? <button className="rail-nav next" type="button" aria-label="Xem sản phẩm tiếp theo" disabled={safeActiveIndex === visibleProducts.length - 1} onClick={() => moveRail(1)}>›</button> : null}
      </div>
    </div>
  );
}

function ProductRecommendation({ product, onAddToCart }: { product: Product; onAddToCart: (productId: string) => void }) {
  return (
    <div className="chat-product-card">
      <div className="chat-product-media"><img src={productImageUrl(product)} alt={product.title} loading="lazy" /></div>
      <div className="chat-product-card-copy">
        <strong>{product.title}</strong>
        <span>{formatPrice(product.price)}</span>
        <small>{productSpec(product)}</small>
        <button type="button" onClick={() => onAddToCart(product.id)}>Thêm giỏ</button>
      </div>
    </div>
  );
}

async function streamChat(url: string, body: unknown, onEvent: (event: StreamEvent) => void): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  if (!response.ok || !response.body) throw new Error(await response.text() || `Stream request failed ${response.status}`);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.trim()) continue;
      onEvent(JSON.parse(line) as StreamEvent);
    }
  }

  if (buffer.trim()) onEvent(JSON.parse(buffer) as StreamEvent);
}

function mergeProducts(currentProducts: Product[], nextProducts: Product[]): Product[] {
  const productById = new Map(currentProducts.map((product) => [product.id, product]));
  for (const product of nextProducts) productById.set(product.id, product);
  return Array.from(productById.values());
}

const internalResponseMarkerPattern = /Recommendation-agent|Chỉ dẫn nội bộ|shouldShowProducts=|presentationIntent=|displayReason=|mustMentionProductIds=|selectedProductIds=|handoff status=|status=/i;

function takeTypewriterChunk(content: string): string {
  if (!content) return '';
  const maxChars = 18;
  if (content.length <= maxChars) return content;

  const readableWindow = content.slice(0, maxChars);
  const lineBreakIndex = readableWindow.indexOf('\n');
  if (lineBreakIndex >= 0) return content.slice(0, Math.max(lineBreakIndex + 1, 1));

  const punctuationMatch = readableWindow.match(/^.{6,}?[,.!?;:]\s/);
  if (punctuationMatch?.[0]) return punctuationMatch[0];

  const wordBoundary = readableWindow.lastIndexOf(' ');
  if (wordBoundary >= 6) return content.slice(0, wordBoundary + 1);

  return content.slice(0, maxChars);
}

function sanitizeAssistantContent(content: string, shouldTrim = true): string {
  const withoutInternalFences = content.replace(/```[\s\S]*?(Recommendation-agent|Chỉ dẫn nội bộ|shouldShowProducts=|presentationIntent=|displayReason=|mustMentionProductIds=|selectedProductIds=|handoff status=|status=)[\s\S]*?```/gi, '');
  const markerIndex = withoutInternalFences.search(internalResponseMarkerPattern);
  const visibleContent = markerIndex >= 0 ? withoutInternalFences.slice(0, markerIndex) : withoutInternalFences;
  const normalizedContent = visibleContent.replace(/\n{3,}/g, '\n\n');
  return shouldTrim ? normalizedContent.trim() : normalizedContent;
}

function reconcileAssistantContent(streamedContent: string, finalContent: string): string {
  const cleanStreamed = sanitizeAssistantContent(streamedContent);
  const cleanFinal = sanitizeAssistantContent(finalContent);
  if (!cleanStreamed) return cleanFinal;
  if (cleanStreamed !== streamedContent.trim()) return cleanFinal || cleanStreamed;
  if (cleanFinal && Math.abs(cleanFinal.length - cleanStreamed.length) > 48) return cleanFinal;
  return cleanStreamed;
}

function resolveStatusStep(message: string): number {
  const normalized = removeVietnameseTone(message).toLocaleLowerCase('vi-VN');
  if (/phan tich|nhu cau/.test(normalized)) return 0;
  if (/lich su|ngu canh|pham vi|chinh sach|ho tro|gio hang/.test(normalized)) return 1;
  if (/tim|chon|lay|kiem tra|xac minh|xep hang|nguon|san pham|so sanh|thao tac/.test(normalized)) return 2;
  if (/soan|tra loi|gui/.test(normalized)) return 3;
  return 2;
}

function removeVietnameseTone(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd');
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
  return JSON.parse(text) as T;
}

async function deleteJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { method: 'DELETE', credentials: 'include' });
  const text = await response.text();
  if (!response.ok) throw new Error(text || `Yêu cầu thất bại ${response.status}`);
  return (text ? JSON.parse(text) : {}) as T;
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}
