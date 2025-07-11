// Typ pro bloky v editoru
export type Block =
  | { type: 'text', content: string }
  | { type: 'table', data: string[][] }
  | { type: 'image', url: string, alt?: string, align?: 'left'|'center'|'right'|'full', width?: number }

// Typ pro obrázek stránky
export interface PageImage {
  url: string;
  alt?: string;
  position: 'left' | 'right' | 'center' | 'full';
  width?: number;
  margin?: number;
}

// Typ pro stránku aplikace
export interface AppPage {
  title: string;
  type: 'content' | 'webview';
  url?: string;
  content?: string;
  richContent?: string;
  hiddenSelectors?: string[];
  imageUrl?: string;
  images?: PageImage[];
}