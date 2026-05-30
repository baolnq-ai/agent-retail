import { Injectable } from '@nestjs/common';
import type { KnowledgeDocument } from '../../models/catalog.models.js';
import type { AgentPipelineEvent, UserAnalysis } from '../../models/agent-execution.models.js';
import { KnowledgeService, type KnowledgeSearchResult } from '../knowledge.service.js';

export interface BusinessRagAgentResult {
  documents: KnowledgeDocument[];
  diagnostics: KnowledgeSearchResult['diagnostics'];
  pipeline: AgentPipelineEvent[];
  evidence: string[];
}

@Injectable()
export class BusinessRagAgentService {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  async retrieve(params: { message: string; analysis: UserAnalysis; enabled: boolean }): Promise<BusinessRagAgentResult> {
    if (!params.enabled) {
      return {
        documents: [],
        diagnostics: { embeddingDimensions: 0, rerankTopScore: 0, vectorCandidateCount: 0 },
        pipeline: [event('skipped', 'Business RAG skipped because this request does not need store or policy grounding.')],
        evidence: [],
      };
    }

    const query = buildBusinessRagQuery(params.message, params.analysis);
    const result = await this.knowledgeService.retrieveKnowledge(query);
    const recoverySummary = result.diagnostics.recoveryMode === 'keyword'
      ? ` Vector/rerank recovery used Knowledge DB keyword ranking (${result.diagnostics.recoveryReason ?? 'no reason'}).`
      : '';
    return {
      documents: result.documents,
      diagnostics: result.diagnostics,
      pipeline: [
        event(result.documents.length ? 'completed' : 'skipped', `Business RAG checked internal policy documents, searched ${result.diagnostics.vectorCandidateCount} candidates and selected ${result.documents.length} documents.${recoverySummary}`),
      ],
      evidence: result.documents.map((document) => `knowledge:${document.id}:${document.type}`),
    };
  }
}

function buildBusinessRagQuery(message: string, analysis: UserAnalysis): string {
  return [
    message,
    analysis.cartOperation ? `cart:${analysis.cartOperation}` : '',
    analysis.constraints?.category ? `category:${analysis.constraints.category}` : '',
    analysis.constraints?.brand ? `brand:${analysis.constraints.brand}` : '',
  ].filter(Boolean).join('\n');
}

function event(status: AgentPipelineEvent['status'], summary: string): AgentPipelineEvent {
  return { timestamp: new Date().toISOString(), agent: 'rag-agent', stage: 'lookup', status, summary };
}
