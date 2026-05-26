import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

export type PromptSettingKey =
  | 'sales-system';

export interface PromptSetting {
  key: PromptSettingKey;
  label: string;
  owner: string;
  description: string;
  content: string;
  updatedAt: string;
  source: 'default' | 'database';
}

const DEFAULT_PROMPTS: Array<Omit<PromptSetting, 'updatedAt' | 'source'>> = [
  {
    key: 'sales-system',
    label: 'Sales system prompt',
    owner: 'sales-agent',
    description: 'Prompt chính để sales-agent soạn câu trả lời cuối cho khách.',
    content: [
      'Bạn là nhân viên tư vấn bán hàng tiếng Việt cho website RetailHome.',
      'Chỉ dùng catalog/chính sách/giỏ hàng được cung cấp. Không bịa thông tin ngoài context.',
      'Không hiển thị mã sản phẩm nội bộ, không nhắc PRODUCT ID, không trả markdown phức tạp.',
      'Trả lời tự nhiên trong 3-5 câu ngắn. Recommendation-agent handoff là hợp đồng bắt buộc cho cả text và khung đề xuất.',
      'Chỉ nhắc đúng sản phẩm trong handoff phải nhắc; không nhắc sản phẩm nằm ngoài handoff.',
      'Nếu handoff shouldShowProducts=false, không được nói "gửi sản phẩm bên dưới" hoặc hứa có khung đề xuất.',
      'Nếu handoff presentationIntent=compare, nói rõ khung đề xuất là đúng các sản phẩm đang so sánh.',
      'Nếu không có sản phẩm được handoff, nói rõ chưa tìm thấy sản phẩm phù hợp và hỏi khách có muốn nới điều kiện không.',
      'Ưu tiên trả lời đúng nhu cầu mới nhất của khách; giỏ hàng chỉ là ngữ cảnh phụ trừ khi khách hỏi hoặc thao tác giỏ hàng.',
      'Nếu context có kết quả thao tác giỏ hàng, chỉ xác nhận đúng thao tác đã thực thi thật; không được nói đã thêm/xoá/cập nhật nếu tool result không có thao tác đó.',
    ].join(' '),
  },
];

@Injectable()
export class PromptSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<PromptSetting[]> {
    await this.ensureDefaults();
    const rows = await this.client().promptSetting.findMany({ orderBy: { key: 'asc' } });
    return rows.map((row) => ({
      key: readPromptKey(row.key),
      label: row.label,
      owner: row.owner,
      description: row.description,
      content: row.content,
      updatedAt: row.updatedAt.toISOString(),
      source: row.source === 'database' ? 'database' : 'default',
    }));
  }

  async getContent(key: PromptSettingKey): Promise<string> {
    await this.ensureDefaults();
    const prompt = await this.client().promptSetting.findUnique({ where: { key } });
    if (!prompt) return DEFAULT_PROMPTS.find((item) => item.key === key)?.content ?? '';
    return prompt.content;
  }

  async update(input: { key?: string; content?: string }): Promise<PromptSetting> {
    const key = readPromptKey(input.key);
    await this.ensureDefaults();
    const current = await this.client().promptSetting.findUnique({ where: { key } });
    if (!current) throw new Error(`Unknown prompt key: ${key}`);
    const content = readPromptContent(input.content);
    const source = content === DEFAULT_PROMPTS.find((prompt) => prompt.key === key)?.content ? 'default' : 'database';
    const row = await this.client().promptSetting.update({ where: { key }, data: { content, source } });
    return { key, label: row.label, owner: row.owner, description: row.description, content: row.content, updatedAt: row.updatedAt.toISOString(), source: row.source === 'database' ? 'database' : 'default' };
  }

  async reset(key: string): Promise<PromptSetting> {
    const promptKey = readPromptKey(key);
    const defaults = DEFAULT_PROMPTS.find((prompt) => prompt.key === promptKey);
    if (!defaults) throw new Error(`Unknown prompt key: ${promptKey}`);
    const row = await this.client().promptSetting.upsert({
      where: { key: promptKey },
      update: { ...defaults, source: 'default' },
      create: { ...defaults, source: 'default' },
    });
    return { ...defaults, updatedAt: row.updatedAt.toISOString(), source: 'default' };
  }

  private async ensureDefaults(): Promise<void> {
    for (const prompt of DEFAULT_PROMPTS) {
      await this.client().promptSetting.upsert({
        where: { key: prompt.key },
        update: { label: prompt.label, owner: prompt.owner, description: prompt.description },
        create: { ...prompt, source: 'default' },
      });
    }
  }

  private client() {
    return this.prisma.client as unknown as {
      promptSetting: {
        findMany(args: Record<string, unknown>): Promise<Array<{ key: string; label: string; owner: string; description: string; content: string; source: string; updatedAt: Date }>>;
        findUnique(args: Record<string, unknown>): Promise<{ content: string; label: string; owner: string; description: string; source: string; updatedAt: Date } | null>;
        update(args: Record<string, unknown>): Promise<{ label: string; owner: string; description: string; content: string; source: string; updatedAt: Date }>;
        upsert(args: Record<string, unknown>): Promise<{ updatedAt: Date }>;
      };
    };
  }
}

function readPromptKey(value: unknown): PromptSettingKey {
  if (typeof value !== 'string') throw new Error('prompt key is required');
  if (!DEFAULT_PROMPTS.some((prompt) => prompt.key === value)) throw new Error(`Unknown prompt key: ${value}`);
  return value as PromptSettingKey;
}

function readPromptContent(value: unknown): string {
  if (typeof value !== 'string') throw new Error('prompt content is required');
  const trimmed = value.trim();
  if (trimmed.length < 20) throw new Error('prompt content must be at least 20 characters');
  if (trimmed.length > 12000) throw new Error('prompt content must be at most 12000 characters');
  return trimmed;
}
