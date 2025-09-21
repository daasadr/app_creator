// Typ pro stylování bloků
export interface BlockStyle {
  padding?: number;
  margin?: number;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | 'lighter' | 'bolder' | number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  boxShadow?: string;
  autoProportions?: boolean;
  plasticEffect?: boolean;
}

// Typ pro kombinované bloky
export interface MixedBlockContent {
  text?: string;
  image?: {
    url: string;
    alt?: string;
    align?: 'left'|'center'|'right'|'full';
    width?: number;
  };
  button?: {
    text: string;
    url?: string;
    action?: string;
  };
  table?: {
    data: string[][];
  };
}

// Typ pro bloky v editoru
export type Block =
  | { type: 'text', content: string, style?: BlockStyle }
  | { type: 'table', data: string[][], style?: BlockStyle }
  | { type: 'image', url: string, alt?: string, align?: 'left'|'center'|'right'|'full', width?: number, style?: BlockStyle }
  | { type: 'button', text: string, url?: string, action?: string, style?: BlockStyle }
  | { type: 'mixed', content: MixedBlockContent, style?: BlockStyle }

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
  id?: string;
  title: string;
  type: 'content' | 'webview';
  url?: string;
  content?: string;
  richContent?: string;
  hiddenSelectors?: string[];
  imageUrl?: string;
  images?: PageImage[];
  // Offline obsah pro webview stránky
  offlineContent?: string;
  offlineTitle?: string;
}

// Typ pro aplikaci
export interface App {
  id?: string;
  name: string;
  description?: string;
  packageName?: string;
  menu?: AppPage[];
  settings?: any;
  createdAt?: string;
  lastUpdated?: string;
}

// Props pro PageEditModal
export interface PageEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageEdit: AppPage & { blocks?: Block[] } | null;
  setPageEdit: (page: AppPage & { blocks?: Block[] } | null) => void;
  onSave: () => void;
  pickerActive: boolean;
  setPickerActive: (active: boolean) => void;
}

// Props pro PagePreview
export interface PagePreviewProps {
  page: AppPage & { blocks?: Block[] };
  style?: React.CSSProperties;
  className?: string;
}

// Props pro PageListItem
export interface PageListItemProps {
  page: AppPage;
  idx: number;
  onChange: (idx: number, field: string, value: string) => void;
  onEdit: (idx: number) => void;
  onMoveUp: (idx: number) => void;
  onMoveDown: (idx: number) => void;
  onDelete: (idx: number) => void;
  isFirst: boolean;
  isLast: boolean;
}

// Props pro AppMenuEditor
export interface AppMenuEditorProps {
  pages: AppPage[];
  onChange: (pages: AppPage[]) => void;
  onEdit: (idx: number) => void;
}

// Props pro RichTextToolbar
export interface RichTextToolbarProps {
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  alignment: 'left' | 'center' | 'right' | 'justify';
  fontSize: number;
  fontColor: string;
  backgroundColor: string;
  onCommand: (command: string, value?: string) => void;
  onInsertTable: () => void;
  onInsertTableNoBorder: () => void;
  onInsertLink: () => void;
  onInsertImage: () => void;
  onInsertHorizontalRule: () => void;
  onInsertList: (ordered: boolean) => void;
  onClearFormatting: () => void;
  onAddTableRow: () => void;
  onAddTableColumn: () => void;
  tableRows: number;
  setTableRows: (val: number) => void;
  tableCols: number;
  setTableCols: (val: number) => void;
  showTableOptions: boolean;
  setShowTableOptions: (show: boolean) => void;
  showColorPicker: boolean;
  setShowColorPicker: (show: boolean) => void;
  showBgColorPicker: boolean;
  setShowBgColorPicker: (show: boolean) => void;
}

// Props pro TableWidget
export interface TableWidgetProps {
  data: string[][];
  onChange: (data: string[][]) => void;
}

// Props pro ImageBlock
export interface ImageBlockProps {
  block: Extract<Block, {type: 'image'}>;
  onChange: (b: Block) => void;
  onDelete: () => void;
}