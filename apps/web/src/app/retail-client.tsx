'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';

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

const initialQuickReplies = ['Máy lọc phòng 25m2 dưới 4 triệu', 'So sánh sản phẩm đang có', 'Chính sách đổi trả thế nào?'];
const progressSteps = ['Phân tích', 'Catalog', 'Embedding', 'Rerank', 'Trả lời'];

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

  async function submitChat(message: string) {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isChatBusy) return;

    const assistantMessageId = crypto.randomUUID();
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

    try {
      await streamChat(`${apiBaseUrl}/api/v1/chat/stream`, { message: trimmedMessage }, (event) => {
        if (event.type === 'status') {
          setStatusText(event.message);
          setActiveStep((current) => Math.min(current + 1, progressSteps.length - 1));
          return;
        }

        if (event.type === 'token') {
          setMessages((current) => current.map((item) => (
            item.id === assistantMessageId ? { ...item, content: item.content + event.content } : item
          )));
          return;
        }

        if (event.type === 'final') {
          const textBlock = event.response.blocks.find((block) => block.type === 'text');
          const productBlock = event.response.blocks.find((block) => block.type === 'product_list');
          const policyBlock = event.response.blocks.find((block) => block.type === 'policy_answer');
          const cartBlock = event.response.blocks.find((block) => block.type === 'cart_summary');
          const quickReplyBlock = event.response.blocks.find((block) => block.type === 'quick_replies');

          if (productBlock?.items.length) setProducts((current) => mergeProducts(current, productBlock.items));
          if (cartBlock) onCartChange(cartBlock.cart);
          setMessages((current) => current.map((item) => (
            item.id === assistantMessageId
              ? {
                ...item,
                content: textBlock?.content ?? item.content,
                products: productBlock?.items.slice(0, 3),
                policies: policyBlock?.items,
                quickReplies: quickReplyBlock?.items,
                isStreaming: false,
              }
              : item
          )));
          setActiveStep(progressSteps.length);
          setStatusText(cartBlock ? `Đã cập nhật giỏ · ${cartBlock.cart.items.length} dòng` : 'Đã có câu trả lời');
          return;
        }

        setMessages((current) => current.map((item) => (
          item.id === assistantMessageId ? { ...item, content: event.message, isStreaming: false } : item
        )));
        setActiveStep(-1);
        setStatusText(event.message);
      });
    } catch (error) {
      setActiveStep(-1);
      setMessages((current) => current.map((item) => (
        item.id === assistantMessageId
          ? { ...item, content: error instanceof Error ? error.message : 'Yêu cầu chat thất bại', isStreaming: false }
          : item
      )));
      setStatusText(error instanceof Error ? error.message : 'Yêu cầu chat thất bại');
    } finally {
      setIsChatBusy(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitChat(input.trim() || initialQuickReplies[0]);
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
      onRequireLogin('Đăng nhập để thêm sản phẩm vào giỏ hàng thật');
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: 'assistant', content: 'Bạn cần đăng nhập hoặc đăng ký trước, sau đó mình sẽ thêm sản phẩm vào đúng giỏ hàng theo account của bạn.', quickReplies: ['Đăng nhập / Đăng ký'] },
      ]);
      return;
    }
    setIsActionBusy(true);
    setStatusText('Đang thêm sản phẩm vào giỏ...');
    try {
      const nextCart = await postJson<Cart>(`${apiBaseUrl}/api/v1/cart/current/items`, { productId, quantity: 1 });
      onCartChange(nextCart);
      window.dispatchEvent(new CustomEvent('retail-cart-changed', { detail: nextCart }));
      setStatusText(`Đã thêm vào giỏ thật · ${nextCart.items.length} dòng`);
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
          {authUser ? <button type="button" className="chat-clear-history" aria-label="Xoá lịch sử chat" disabled={isActionBusy} onClick={() => void handleClearHistory()}>Clear lịch sử</button> : null}
          <button type="button" aria-label="Thu nhỏ chat" onClick={() => setChatMode(chatMode === 'minimized' ? 'open' : 'minimized')}>{chatMode === 'minimized' ? 'Mở' : 'Thu nhỏ'}</button>
          <button type="button" aria-label="Đóng chat" onClick={() => setChatMode('closed')}>Đóng</button>
        </div>
      </div>
      <div className="progress-line" aria-label="Tiến trình xử lý chat">
        {progressSteps.map((step, index) => <span className={index <= activeStep ? 'active' : ''} title={step} key={step} />)}
      </div>
      <div className="chat-messages" ref={chatMessagesRef}>
        {messages.map((message) => (
          <article className={`chat-bubble ${message.role}`} key={message.id}>
            <p>{message.content}{message.isStreaming ? <span className="stream-cursor" /> : null}</p>
            {message.products?.length ? <ProductRecommendationRail products={message.products} onAddToCart={handleAddToCart} /> : null}
            {message.policies?.map((policy) => (
              <div className="policy-card" key={policy.id}>
                <strong>{policy.title}</strong>
                <p>{policy.content}</p>
              </div>
            ))}
            {message.quickReplies ? (
              <div className="quick-replies">
                {message.quickReplies.map((reply) => (
                  <button key={reply} type="button" disabled={isChatBusy} onClick={() => reply === 'Đăng nhập / Đăng ký' ? window.location.assign('/account') : void submitChat(reply)}>{reply}</button>
                ))}
              </div>
            ) : null}
          </article>
        ))}
        {isChatBusy ? <div className="typing"><span /><span /><span /></div> : null}
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
  if (visibleProducts.length === 0) return null;
  const safeActiveIndex = Math.min(activeIndex, visibleProducts.length - 1);

  function moveRail(direction: -1 | 1) {
    setActiveIndex((current) => Math.min(Math.max(current + direction, 0), visibleProducts.length - 1));
  }

  return (
    <div className="chat-product-rail" aria-label="Sản phẩm đề xuất">
      <div className="chat-product-rail-header">
        <span>Gợi ý phù hợp</span>
        {visibleProducts.length > 1 ? <small>{safeActiveIndex + 1}/{visibleProducts.length}</small> : null}
      </div>
      <div className={visibleProducts.length > 1 ? 'chat-product-rail-body' : 'chat-product-rail-body single'}>
        {visibleProducts.length > 1 ? <button className="rail-nav previous" type="button" aria-label="Xem sản phẩm trước" disabled={safeActiveIndex === 0} onClick={() => moveRail(-1)}>‹</button> : null}
        <div className="chat-product-rail-track">
          <div className="chat-product-rail-track-inner" style={{ transform: `translateX(-${safeActiveIndex * 100}%)` }}>
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
      <div className="product-visual compact">{product.brand.slice(0, 2).toUpperCase()}</div>
      <div className="chat-product-card-copy">
        <strong>{product.title}</strong>
        <span>{formatPrice(product.price)}</span>
        <small>{product.category} · {product.brand}</small>
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
