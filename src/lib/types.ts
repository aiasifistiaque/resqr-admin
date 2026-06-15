export interface Category {
  _id: string;
  name: string;
  image?: string;
  description?: string;
  displayInMenu: boolean;
  isActive: boolean;
  priority: number;
  createdAt: string;
}

export interface Item {
  _id: string;
  name: string;
  image?: string;
  description?: string;
  price: number;
  categories: string[] | Category[];
  status: 'draft' | 'published' | 'archived';
  sizes?: string[];
  colors?: string[];
  ingredients?: string[];
  priority?: number;
  createdAt: string;
}

export interface Feedback {
  _id: string;
  orderRef?: string;
  name?: string;
  email?: string;
  phone?: string;
  ratingFood?: number;
  ratingService?: number;
  ratingAmbiance?: number;
  ratingValue?: number;
  ratingOverall?: number;
  comment?: string;
  wantsUpdatesPhone: boolean;
  wantsUpdatesEmail: boolean;
  createdAt: string;
  voiceUrl?: string;
  voiceTranscript?: string;
  voiceAiSentiment?: string;
  voiceAiEmotion?: string;
  voiceAiInsight?: string;
  aiSentiment?: 'Positive' | 'Neutral' | 'Negative';
  aiEmotion?: 'Excited' | 'Satisfied' | 'Neutral' | 'Disappointed' | 'Angry';
  aiInsight?: string;
}

export interface Collection {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  priority: number;
  isActive: boolean;
  displayInMenu: boolean;
  items: string[];
  createdAt: string;
}

export interface Faq {
  _id: string;
  item: string | Item;
  question: string;
  answer: string;
  order: number;
  isActive: boolean;
  createdAt: string;
}

export interface ListResponse<T> {
  doc: T[];
  totalDocs: number;
  docsInPage: number;
  totalPages: number;
}
