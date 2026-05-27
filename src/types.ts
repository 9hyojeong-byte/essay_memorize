export interface EssaySentence {
  ko: string;
  en: string;
  confidence: number; // Sentence-level confidence (e.g. -1, 0, 1)
}

export interface Essay {
  id: string;
  title: string;
  createdAt: string; // ISO dates (YYYY-MM-DD or ISO datetime)
  updatedAt: string; // ISO datetime
  sentences: EssaySentence[];
  memo: string;
  isFavorite: boolean;
  confidence: number; // Essay-level confidence (-2, -1, 0, 1, 2...)
}

export interface SyncConfig {
  gasUrl: string;       // Google Apps Script Web App URL
  useCloudDb: boolean;  // Whether to sync/use cloud DB instead of pure localStorage
}
