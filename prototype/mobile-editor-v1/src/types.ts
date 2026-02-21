export type SheetSnap = 'collapsed' | 'expanded';
export type SheetPage = 'add' | 'imageStyle' | 'textStyle';

export type PrintAreaNorm = {
  nx: number;
  ny: number;
  nw: number;
  nh: number;
};

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SnapLines = {
  vertical?: number;
  horizontal?: number;
};

export type ElementBase = {
  id: string;
  type: 'image' | 'text';
  x: number;
  y: number;
  scale: number;
  rotation: number;
  zIndex: number;
};

export type ImageSizePreset = 'S' | 'M' | 'L';

export type ImageElement = ElementBase & {
  type: 'image';
  src: string;
  naturalW: number;
  naturalH: number;
  baseWidthRatio: number;
  sizePreset: ImageSizePreset;
  opacity: number;
};

export type TextElement = ElementBase & {
  type: 'text';
  text: string;
  fontSize: number;
  color: string;
  align: 'left' | 'center' | 'right';
  fontWeight: 400 | 700;
};

export type EditorElement = ImageElement | TextElement;

export type EditorSnapshot = {
  elements: EditorElement[];
  selectedId: string | null;
};

export type CoachStepId = 'add' | 'gesture' | 'style' | 'done';

export type GestureSignal =
  | 'add_clicked'
  | 'gesture_used'
  | 'style_open'
  | 'done_tapped';

export type StageMetrics = {
  stageRect: Rect;
  shirtRect: Rect;
  printAreaRect: Rect;
};
