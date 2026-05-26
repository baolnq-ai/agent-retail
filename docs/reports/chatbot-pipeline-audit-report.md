# Chatbot Pipeline Audit Report

- Updated: 2026-05-21
- Scope: audit nhanh pipeline chatbot RetailHome hiện tại để chuẩn bị thiết kế lại.
- Main code reviewed:
  - `apps/api/src/services/agent.service.ts`
  - `apps/api/src/services/agent-orchestrator.service.ts`
  - `apps/api/src/services/agents/user-analysis-agent.service.ts`
  - `apps/api/src/services/agents/memory-agent.service.ts`
  - `apps/api/src/services/agents/product-manager-agent.service.ts`
  - `apps/api/src/services/agents/cart-manager-agent.service.ts`
  - `apps/api/src/services/agents/recommendation-agent.service.ts`
  - `apps/api/src/services/catalog.service.ts`
  - `apps/api/src/services/model-gateway.service.ts`

## 1. Ket luan ngan

Pipeline hiện tại chưa phải pipeline agent bán hàng chuyên nghiệp. Nó có nhiều service mang tên agent, nhưng luồng điều phối vẫn nằm chủ yếu trong `AgentService.prepareChat()`. `AgentOrchestratorService` hiện chỉ tạo danh sách agent để trace/route đơn giản, chưa đóng vai trò lead điều phối thật.

Vấn đề lớn nhất: hệ thống chưa có một lead analysis agent giữ quyền điều tra lịch sử, hiểu sâu câu hỏi, lập kế hoạch, gọi đúng agent con và kiểm soát output cuối. Các agent hiện chạy theo chuỗi cố định, nhiều bước chạy dù không cần, còn search/recommendation/cart chưa có hợp đồng dữ liệu đủ rõ để phối hợp ổn định.

## 2. Pipeline hien tai trong code

Luồng thực tế hiện nay:

```txt
User message
  -> AgentService.prepareChat()
  -> Load memory context + cart + all products song song
  -> memory-agent investigate history
  -> quality gate cho memory
  -> user-analysis-agent phân loại intent/retrieval/cartOperation
  -> quality gate cho analysis
  -> product-manager-agent resolve/search product
  -> knowledge search song song
  -> quality gate cho product manager
  -> AgentOrchestratorService.plan() tạo route/trace
  -> cart-manager-agent luôn được gọi
  -> quality gate cho cart
  -> recommendation-agent quyết định product rail
  -> quality gate cho recommendation
  -> build context documents
  -> embedding
  -> rerank
  -> sales-agent LLM viết câu trả lời
  -> sales-evaluator-agent kiểm draft
  -> response blocks cho frontend
  -> save memory + trace
```

Ghi chú quan trọng:

- `memory-agent` có chạy trước `user-analysis-agent`, đây là điểm đúng.
- `user-analysis-agent` có LLM JSON contract khi có model, nhưng fallback rule vẫn khá mạnh.
- `product-manager-agent` vừa search, vừa chọn candidate, vừa quyết định số lượng sản phẩm.
- `recommendation-agent` chủ yếu quyết định sản phẩm nào được phép hiện ở product rail, chưa phải recommendation engine chuyên sâu.
- `cart-manager-agent` xử lý tool giỏ hàng thật, nhưng nó phụ thuộc vào `UserAnalysis` và product pool đã resolve trước đó.
- `embedding` và `rerank` hiện chạy sau khi product candidates đã được chọn, nên chưa phải search engine chính.
- `AgentOrchestratorService` chưa điều phối runtime theo trạng thái; nó chỉ dựa vào detect intent đơn giản để thêm agent vào trace.

## 3. Diem lech so voi pipeline mong muon

Pipeline mong muốn của anh/chị:

```txt
Lead analysis agent
  -> gọi memory manager để điều tra lịch sử/ngữ cảnh
  -> hiểu sâu câu hỏi
  -> lập kế hoạch
  -> điều phối cart manager / product manager / recommendation-search manager
  -> tổng hợp kết quả
  -> giao sales response
```

Hiện tại chưa đạt vì:

| Mong muốn | Hiện trạng |
| --- | --- |
| 1 lead agent điều phối toàn cục | `AgentService` điều phối thủ tục; `AgentOrchestratorService` chỉ route/trace nhẹ |
| Lead agent điều tra lịch sử rồi mới phân tích sâu | Có memory trước analysis, nhưng chưa có shared context object đủ giàu |
| Memory manager quản lý tổng thể lịch sử, sở thích, hành vi | Có `ChatMemoryService` + `MemoryAgentService`, nhưng phần hành vi/sở thích còn dạng preference key đơn giản |
| Product manager chỉ quản lý catalog/product domain | Product manager đang kiêm search, select, count heuristic |
| Recommendation-search là một cụm agent riêng | `RecommendationAgentService` mới là presentation planner, chưa có subagent search/recommend/rerank/evaluator |
| Search có hard search, fallback embedding, LLM đánh giá | Search hiện là lexical DB scoring; embedding chưa dùng để vector search; rerank chỉ rerank context đã có |
| Recommendation dùng sở thích/hành vi/rerank/user evaluation | Chưa có scoring rõ từ preference/behavior; chưa có recommendation evaluator riêng |
| Cart manager tương tác chặt với các agent khác | Cart có nhận product pool, nhưng trace và contract phối hợp còn lỏng; không có plan object chung |

## 4. Van de chinh cua pipeline hien tai

### 4.1 Lead orchestration bi dat sai cho

`AgentService.prepareChat()` đang chứa quá nhiều trách nhiệm:

- load context;
- gọi memory;
- gọi analysis;
- gọi product;
- gọi cart;
- gọi recommendation;
- gọi embedding/rerank;
- build prompt;
- build trace;
- build response.

Điều này làm pipeline khó hiểu, khó debug, khó thay đổi logic điều phối. Khi một intent mới xuất hiện, nhiều nơi phải sửa cùng lúc.

### 4.2 User-analysis chua phai lead agent

`UserAnalysisAgentService` chỉ trả:

```txt
intent
cartOperation
retrievalMode
shouldShowProducts
references
constraints
confidence
```

Nó chưa trả một kế hoạch điều phối như:

```txt
requiredAgents
searchPlan
cartPlan
recommendationPlan
memoryEvidence
ambiguityLevel
answerStrategy
```

Vì vậy các agent sau vẫn phải tự đoán một phần.

### 4.3 Search pipeline chua dung nhu search engine

`CatalogService.searchProducts()` hiện là:

```txt
DB findMany
-> parse price min/max cơ bản
-> token score
-> sort score desc
```

Chưa có pipeline search chuyên nghiệp:

```txt
hard filter
-> lexical exact/alias search
-> attribute/category search
-> embedding fallback
-> rerank
-> LLM judge
-> final candidates with reasons
```

Embedding hiện chỉ dùng để lấy vector diagnostics/context rerank, chưa dùng để tìm sản phẩm trong DB.

### 4.4 Recommendation-agent chua phai recommendation engine

`RecommendationAgentService` hiện quyết định:

- có show product rail không;
- product rail gồm product nào;
- sales-agent được nhắc product nào.

Nó chưa có subagent:

- user preference evaluator;
- behavior evaluator;
- product-fit scorer;
- rerank agent;
- final recommendation judge.

Nên tên `recommendation-agent` hiện dễ gây hiểu nhầm. Thực tế nó giống `presentation-handoff-agent` hơn.

### 4.5 Cart-manager con bi phu thuoc vao ket qua truoc

Cart manager có tool thật, đây là phần tốt. Nhưng nó không tự yêu cầu product manager/search khi thiếu target. Nếu product pool rỗng hoặc analysis sai, cart agent chỉ clarify.

Pipeline đúng hơn nên cho phép:

```txt
cart-manager cần target
  -> hỏi lead agent
  -> lead gọi product manager/search nếu user có nhắc tên product
  -> cart-manager nhận target đã resolve
  -> execute tool
```

### 4.6 Trace graph dang phan anh UI hon la pipeline that

Trace có nhiều node đẹp nhưng chưa phản ánh đúng quyền điều phối. Vì route agent không xuất phát từ một plan runtime mạnh, dashboard dễ tạo cảm giác pipeline có nhiều agent phối hợp sâu hơn thực tế.

## 5. Pipeline muc tieu de lam lai

Đề xuất kiến trúc mới:

```txt
User message
  -> LeadAnalysisAgent
      -> MemoryManagerAgent
      -> build ConversationContext
      -> classify intent + ambiguity + required capabilities
      -> create ExecutionPlan
  -> PipelineExecutor
      -> CartManagerAgent nếu plan cần giỏ
      -> ProductManagerAgent nếu plan cần product facts/catalog
      -> DiscoveryAgent nếu plan cần search/recommendation
          -> HardSearchAgent
          -> EmbeddingSearchAgent
          -> RerankAgent
          -> UserPreferenceEvaluatorAgent
          -> RecommendationJudgeAgent
      -> PolicyKnowledgeAgent nếu plan cần policy
  -> LeadAnalysisAgent tổng hợp tool results
  -> SalesResponseAgent viết câu trả lời
  -> ResponseQualityAgent kiểm tra
  -> Frontend blocks
```

## 6. Hop dong du lieu nen co

### 6.1 ConversationContext

```ts
interface ConversationContext {
  userMessage: string;
  userId?: string;
  recentTurns: Array<{ role: string; content: string }>;
  rollingSummary?: string;
  preferences: UserPreferenceSnapshot;
  behaviorSignals: UserBehaviorSignal[];
  recentProductIds: string[];
  recentCartActionProductIds: string[];
  currentCart: Cart;
}
```

### 6.2 LeadAnalysisResult

```ts
interface LeadAnalysisResult {
  intent: 'recommend' | 'search' | 'compare' | 'product_detail' | 'cart_action' | 'cart_status' | 'policy' | 'smalltalk';
  confidence: number;
  ambiguityLevel: 'none' | 'low' | 'medium' | 'high';
  shouldAskClarification: boolean;
  constraints: ProductConstraints;
  references: ProductReference[];
  requiredAgents: AgentName[];
  executionPlan: ExecutionPlanStep[];
}
```

### 6.3 SearchResult

```ts
interface SearchResult {
  query: string;
  hardFilters: ProductConstraints;
  exactMatches: ProductCandidate[];
  lexicalMatches: ProductCandidate[];
  embeddingMatches: ProductCandidate[];
  reranked: ProductCandidate[];
  rejected: Array<{ productId: string; reason: string }>;
}
```

### 6.4 RecommendationResult

```ts
interface RecommendationResult {
  products: Array<{
    product: Product;
    score: number;
    reasons: string[];
    matchedPreferences: string[];
    matchedConstraints: string[];
  }>;
  explanationForSalesAgent: string;
  shouldShowProductRail: boolean;
}
```

## 7. Agent roles nen dat lai

| Agent | Vai trò nên có |
| --- | --- |
| `LeadAnalysisAgent` | Lead điều phối, phân tích sâu câu hỏi, lập plan, gọi agent con |
| `MemoryManagerAgent` | Điều tra lịch sử, sở thích, hành vi, sản phẩm gần đây, pending actions |
| `CartManagerAgent` | Quản lý cart thật, execute tool, verify result |
| `ProductManagerAgent` | Quản lý product facts, inventory, exact product resolution |
| `DiscoveryAgent` | Điều phối search/recommendation |
| `HardSearchAgent` | Search cứng theo title, alias, category, price, inventory, attributes |
| `EmbeddingSearchAgent` | Search semantic khi hard search thiếu hoặc query mơ hồ |
| `RerankAgent` | Rerank candidates đã pass hard filters |
| `PreferenceEvaluatorAgent` | Chấm theo sở thích/hành vi/user history |
| `RecommendationJudgeAgent` | Chọn sản phẩm cuối và reason |
| `SalesResponseAgent` | Viết câu trả lời tự nhiên từ kết quả đã khóa |
| `ResponseQualityAgent` | Kiểm tra không bịa, không leak internal, không claim tool sai |

## 8. Uu tien lam lai

### P0 - Thay xương sống pipeline

1. Tạo `LeadAnalysisAgent` trả `LeadAnalysisResult`.
2. Tạo `ConversationContext` dùng chung cho toàn pipeline.
3. Tách `PipelineExecutor` khỏi `AgentService`.
4. Đổi `AgentService` thành lớp adapter HTTP/stream/response, không ôm logic điều phối.

### P1 - Search/recommendation chuyên nghiệp

1. Tách `DiscoveryAgent`.
2. Tách hard search và embedding search.
3. Rerank chỉ chạy sau hard filters.
4. Recommendation phải trả score/reason/matched constraints.
5. Product rail lấy từ `RecommendationResult`, không phụ thuộc text LLM.

### P2 - Cart/product phối hợp rõ

1. Cart action thiếu target phải trả request về lead, không tự đoán.
2. Lead quyết định gọi product manager/search để resolve target.
3. Cart manager chỉ execute khi target đủ rõ.
4. Tool result là nguồn duy nhất để sales-agent được nói đã thêm/xóa/cập nhật.

### P3 - Trace đúng bản chất

1. Dashboard hiển thị `ExecutionPlan`.
2. Mỗi edge phải đến từ plan/tool result thật.
3. Tách rõ node agent, node tool, node data, node evaluator.
4. Không hiển thị agent như đã phối hợp nếu nó chỉ được add vào trace bằng route heuristic.

## 9. De xuat buoc tiep theo

Nên làm lại theo thứ tự:

```txt
1. Viết schema mới: ConversationContext, LeadAnalysisResult, ExecutionPlan, SearchResult, RecommendationResult.
2. Implement LeadAnalysisAgent + PipelineExecutor.
3. Refactor product/search thành DiscoveryAgent.
4. Refactor cart action để đi qua plan target rõ ràng.
5. Refactor trace dashboard theo ExecutionPlan.
6. Chạy regression cho các luồng: recommend, search, add cart, cart status, policy, compare.
```

## 10. Danh gia ngan gon

Pipeline hiện tại không phải bỏ hết, vì có một số mảnh tốt:

- cart tool thật;
- memory có lưu recent turns/preferences/recent recommendations;
- LLM JSON contract đã xuất hiện ở analysis/recommendation;
- quality gate/evaluator đã có nền;
- response blocks frontend đã tương đối rõ.

Nhưng phần điều phối lõi đang đặt sai tầng. Cần chuyển từ pipeline kiểu service tuần tự sang pipeline kiểu lead-agent lập kế hoạch và executor chạy tool/subagent theo plan. Đây là việc nên làm trước khi tiếp tục vá UI hoặc vá prompt nhỏ lẻ.
