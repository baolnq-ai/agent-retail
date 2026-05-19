import { Module } from '@nestjs/common';
import { AccountMemoryController } from './controllers/account-memory.controller.js';
import { AgentController } from './controllers/agent.controller.js';
import { AgentObservabilityController } from './controllers/agent-observability.controller.js';
import { AuthController } from './controllers/auth.controller.js';
import { CatalogController } from './controllers/catalog.controller.js';
import { CommerceController } from './controllers/commerce.controller.js';
import { HealthController } from './controllers/health.controller.js';
import { KnowledgeController } from './controllers/knowledge.controller.js';
import { ModelGatewayController } from './controllers/model-gateway.controller.js';
import { ModelSettingsController } from './controllers/model-settings.controller.js';
import { AgentHistoryService } from './services/agent-history.service.js';
import { AgentOrchestratorService } from './services/agent-orchestrator.service.js';
import { AgentTraceService } from './services/agent-trace.service.js';
import { AgentQualityGateService } from './services/agents/agent-quality-gate.service.js';
import { CartManagerAgentService } from './services/agents/cart-manager-agent.service.js';
import { MemoryAgentService } from './services/agents/memory-agent.service.js';
import { ProductManagerAgentService } from './services/agents/product-manager-agent.service.js';
import { RecommendationAgentService } from './services/agents/recommendation-agent.service.js';
import { SalesEvaluatorAgentService } from './services/agents/sales-evaluator-agent.service.js';
import { UserAnalysisAgentService } from './services/agents/user-analysis-agent.service.js';
import { AgentService } from './services/agent.service.js';
import { AuthService } from './services/auth.service.js';
import { CatalogService } from './services/catalog.service.js';
import { ChatMemoryService } from './services/chat-memory.service.js';
import { CommerceService } from './services/commerce.service.js';
import { HealthService } from './services/health.service.js';
import { KnowledgeService } from './services/knowledge.service.js';
import { ModelGatewayService } from './services/model-gateway.service.js';
import { ModelSettingsService } from './services/model-settings.service.js';
import { PrismaService } from './services/prisma.service.js';

@Module({
  controllers: [HealthController, ModelGatewayController, ModelSettingsController, CatalogController, KnowledgeController, CommerceController, AccountMemoryController, AgentController, AgentObservabilityController, AuthController],
  providers: [PrismaService, HealthService, ModelSettingsService, ModelGatewayService, CatalogService, KnowledgeService, CommerceService, AgentHistoryService, AgentOrchestratorService, AgentTraceService, AgentQualityGateService, CartManagerAgentService, MemoryAgentService, ProductManagerAgentService, RecommendationAgentService, SalesEvaluatorAgentService, UserAnalysisAgentService, AgentService, AuthService, ChatMemoryService],
})
export class AppModule {}
