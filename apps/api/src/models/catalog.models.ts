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

export interface KnowledgeDocument {
  id: string;
  type: 'policy' | 'faq';
  title: string;
  content: string;
  trustLevel: 'official';
}
