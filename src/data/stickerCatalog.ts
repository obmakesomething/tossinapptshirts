export type StickerEngine = 'single' | 'sheet';
export type Line = 'A' | 'E';
export type CutType = 'kiss' | 'die';
export type Shape =
  | 'rect'
  | 'roundedRect'
  | 'circle'
  | 'oval'
  | 'custom'
  | 'squareKiss';
export type MaterialId =
  | 'paper_artlabel'
  | 'paper_kraft'
  | 'yupo'
  | 'transparent_vinyl'
  | 'transparent_fuji'
  | 'hologram';
export type FinishId = 'none' | 'gloss' | 'matte';

export type ProductionRules = {
  bleedMm?: number;
  safeMm?: number;
  minCornerRadiusMm?: number;
  minFeatureMm?: number;
  maxCutPoints?: number;
  minGapMm?: number;
};

export type Warning = {
  code: string;
  title: string;
  body: string;
  severity: 'info' | 'warning' | 'block';
};

export type SizePreset = {
  label: string;
  widthMm: number;
  heightMm: number;
};

export type StickerSku = {
  id: string;
  line: Line;
  engine: StickerEngine;
  title: string;
  description?: string;
  shape?: Shape;
  shapeMode?: 'standard' | 'custom';
  standardShapes?: Shape[];
  sheetMode?: 'template' | 'free';
  templateId?: string;
  materials: MaterialId[];
  finishes: FinishId[];
  cutTypes?: CutType[];
  supportsWhiteInk?: boolean;
  supportsHologramCoating?: boolean;
  sizePresets?: SizePreset[];
  longSidePresetsMm?: number[];
  rules: ProductionRules;
  warnings: Warning[];
  mockups?: {
    thumbnail: string;
    preview?: string;
  };
};

export const defaultProductionRules: ProductionRules = {
  bleedMm: 3,
  safeMm: 3,
};

const warningKissOnly: Warning = {
  code: 'KISS_ONLY',
  title: '반칼 전용',
  body: '사각반칼은 반칼(kiss) 방식만 가능합니다.',
  severity: 'info',
};

const warningCutComplexity: Warning = {
  code: 'CUT_COMPLEXITY',
  title: '칼선 복잡도 제한',
  body: '너무 뾰족하거나 복잡한 칼선은 제작이 제한될 수 있어요.',
  severity: 'warning',
};

const warningMinFeature: Warning = {
  code: 'MIN_FEATURE',
  title: '미세 디테일 제한',
  body: '1mm 이하의 얇은 선/구멍은 뭉개질 수 있어요.',
  severity: 'info',
};

const warningTransparentMatte: Warning = {
  code: 'TRANSPARENT_MATTE',
  title: '투명 + 무광 코팅 주의',
  body: '투명 용지에 무광 코팅을 하면 반투명/차폐 느낌이 날 수 있어요.',
  severity: 'info',
};

const warningTransparentGloss: Warning = {
  code: 'TRANSPARENT_GLOSS',
  title: '투명 + 유광 코팅 주의',
  body: '투명 용지에 유광 코팅을 하면 더 투명해 보이지만 점착이 미세하게 보일 수 있어요.',
  severity: 'info',
};

const warningFujiBackground: Warning = {
  code: 'FUJI_BACKGROUND',
  title: '배경 투명 노출',
  body: '배경까지 투명 후지가 그대로 보여요.',
  severity: 'info',
};

const warningFujiStatic: Warning = {
  code: 'FUJI_STATIC',
  title: '정전기 주의',
  body: '투명 후지는 정전기로 먼지가 달라붙을 수 있어요.',
  severity: 'warning',
};

const warningFujiNoCoating: Warning = {
  code: 'FUJI_NO_COATING',
  title: '코팅 불가',
  body: '정전기 이슈로 코팅 선택이 불가합니다.',
  severity: 'block',
};

const warningNameBulkEdit: Warning = {
  code: 'NAME_BULK_EDIT',
  title: '문구 일괄 변경',
  body: '한 번 입력으로 전체 문구를 변경할 수 있어요.',
  severity: 'info',
};

const warningSheetMargin: Warning = {
  code: 'SHEET_MARGIN',
  title: '여백/간격 기준',
  body: '시트 가장자리 10mm 이상, 스티커 간격 3mm 이상을 권장해요.',
  severity: 'info',
};

const warningBlankOnly: Warning = {
  code: 'BLANK_ONLY',
  title: '무지 전용',
  body: '이 템플릿은 문구 없이 무지로만 제작합니다.',
  severity: 'info',
};

const sizePresetsSquareKiss: SizePreset[] = [
  { label: '30 x 30 mm', widthMm: 30, heightMm: 30 },
  { label: '50 x 50 mm', widthMm: 50, heightMm: 50 },
  { label: '70 x 70 mm', widthMm: 70, heightMm: 70 },
  { label: '100 x 100 mm', widthMm: 100, heightMm: 100 },
];

const sizePresetsCircle: SizePreset[] = [
  { label: '30 mm', widthMm: 30, heightMm: 30 },
  { label: '50 mm', widthMm: 50, heightMm: 50 },
  { label: '70 mm', widthMm: 70, heightMm: 70 },
  { label: '100 mm', widthMm: 100, heightMm: 100 },
];

const sizePresetsOval: SizePreset[] = [
  { label: '40 x 25 mm', widthMm: 40, heightMm: 25 },
  { label: '60 x 40 mm', widthMm: 60, heightMm: 40 },
  { label: '80 x 50 mm', widthMm: 80, heightMm: 50 },
];

const sizePresetsRoundedRect: SizePreset[] = [
  { label: '40 x 25 mm', widthMm: 40, heightMm: 25 },
  { label: '60 x 40 mm', widthMm: 60, heightMm: 40 },
  { label: '80 x 50 mm', widthMm: 80, heightMm: 50 },
  { label: '100 x 60 mm', widthMm: 100, heightMm: 60 },
];

const customLongSidePresetsMm = [30, 50, 70, 100, 150];

export const stickerCatalog: StickerSku[] = [
  {
    id: 'A_STD_SQUARE_KISS',
    line: 'A',
    engine: 'single',
    title: '사각반칼',
    description:
      '모서리가 깔끔한 반칼 전용 스티커로 작업 안정성이 높습니다.',
    shape: 'squareKiss',
    shapeMode: 'standard',
    cutTypes: ['kiss'],
    materials: ['paper_artlabel', 'paper_kraft', 'yupo'],
    finishes: ['gloss', 'matte'],
    sizePresets: sizePresetsSquareKiss,
    rules: {
      ...defaultProductionRules,
    },
    warnings: [warningKissOnly],
    mockups: {
      thumbnail: '/mockups/stickers/a_square_kiss_thumb.png',
      preview: '/mockups/stickers/a_square_kiss_preview.png',
    },
  },
  {
    id: 'A_STD_CIRCLE',
    line: 'A',
    engine: 'single',
    title: '원형',
    description: '가장 기본적인 원형 스티커로 다양한 용지에 대응합니다.',
    shape: 'circle',
    shapeMode: 'standard',
    cutTypes: ['kiss', 'die'],
    materials: ['paper_artlabel', 'paper_kraft', 'yupo'],
    finishes: ['gloss', 'matte'],
    sizePresets: sizePresetsCircle,
    rules: {
      ...defaultProductionRules,
    },
    warnings: [],
    mockups: {
      thumbnail: '/mockups/stickers/a_circle_thumb.png',
      preview: '/mockups/stickers/a_circle_preview.png',
    },
  },
  {
    id: 'A_STD_OVAL',
    line: 'A',
    engine: 'single',
    title: '타원',
    description: '가로형/세로형 모두 어울리는 타원 스티커입니다.',
    shape: 'oval',
    shapeMode: 'standard',
    cutTypes: ['kiss', 'die'],
    materials: ['paper_artlabel', 'paper_kraft', 'yupo'],
    finishes: ['gloss', 'matte'],
    sizePresets: sizePresetsOval,
    rules: {
      ...defaultProductionRules,
    },
    warnings: [],
    mockups: {
      thumbnail: '/mockups/stickers/a_oval_thumb.png',
      preview: '/mockups/stickers/a_oval_preview.png',
    },
  },
  {
    id: 'A_STD_ROUNDED_RECT',
    line: 'A',
    engine: 'single',
    title: '사각라운드',
    description:
      '가장 안정적인 라운드 사각형. 다양한 용지/화이트 인쇄/홀로그램 코팅 옵션을 지원합니다.',
    shape: 'roundedRect',
    shapeMode: 'standard',
    cutTypes: ['kiss', 'die'],
    materials: ['paper_artlabel', 'paper_kraft', 'yupo'],
    finishes: ['gloss', 'matte'],
    supportsWhiteInk: true,
    supportsHologramCoating: true,
    sizePresets: sizePresetsRoundedRect,
    rules: {
      ...defaultProductionRules,
      minCornerRadiusMm: 2,
    },
    warnings: [],
    mockups: {
      thumbnail: '/mockups/stickers/a_rounded_rect_thumb.png',
      preview: '/mockups/stickers/a_rounded_rect_preview.png',
    },
  },
  {
    id: 'A_STD_ROUNDED_RECT_HOLO',
    line: 'A',
    engine: 'single',
    title: '사각라운드 홀로그램',
    description: '홀로그램 필름 위에 제작하는 라운드 사각 스티커입니다.',
    shape: 'roundedRect',
    shapeMode: 'standard',
    cutTypes: ['kiss', 'die'],
    materials: ['hologram'],
    finishes: ['gloss', 'matte'],
    supportsWhiteInk: true,
    supportsHologramCoating: true,
    sizePresets: sizePresetsRoundedRect,
    rules: {
      ...defaultProductionRules,
      minCornerRadiusMm: 2,
    },
    warnings: [],
    mockups: {
      thumbnail: '/mockups/stickers/a_rounded_rect_holo_thumb.png',
      preview: '/mockups/stickers/a_rounded_rect_holo_preview.png',
    },
  },
  {
    id: 'A_STD_ROUNDED_RECT_CLEAR',
    line: 'A',
    engine: 'single',
    title: '사각라운드 투명',
    description: '투명 용지 기반의 라운드 사각 스티커입니다.',
    shape: 'roundedRect',
    shapeMode: 'standard',
    cutTypes: ['kiss', 'die'],
    materials: ['transparent_vinyl'],
    finishes: ['gloss', 'matte'],
    supportsWhiteInk: true,
    sizePresets: sizePresetsRoundedRect,
    rules: {
      ...defaultProductionRules,
      minCornerRadiusMm: 2,
    },
    warnings: [warningTransparentMatte, warningTransparentGloss],
    mockups: {
      thumbnail: '/mockups/stickers/a_rounded_rect_clear_thumb.png',
      preview: '/mockups/stickers/a_rounded_rect_clear_preview.png',
    },
  },
  {
    id: 'A_CUSTOM_DIECUT',
    line: 'A',
    engine: 'single',
    title: '자유형/조각',
    description: '원하는 모양대로 칼선을 넣는 커스텀 스티커입니다.',
    shape: 'custom',
    shapeMode: 'custom',
    cutTypes: ['die'],
    materials: ['paper_artlabel', 'paper_kraft', 'yupo', 'transparent_vinyl'],
    finishes: ['gloss', 'matte'],
    longSidePresetsMm: customLongSidePresetsMm,
    rules: {
      ...defaultProductionRules,
      minFeatureMm: 1.2,
      minCornerRadiusMm: 1,
      maxCutPoints: 60,
    },
    warnings: [
      warningCutComplexity,
      warningMinFeature,
      warningTransparentMatte,
      warningTransparentGloss,
    ],
    mockups: {
      thumbnail: '/mockups/stickers/a_custom_diecut_thumb.png',
      preview: '/mockups/stickers/a_custom_diecut_preview.png',
    },
  },
  {
    id: 'A_CUSTOM_DIECUT_CLEAR_FUJI',
    line: 'A',
    engine: 'single',
    title: '자유형 투명후지 정가',
    description:
      '배경까지 투명 후지가 보이는 정가형 커스텀 스티커입니다.',
    shape: 'custom',
    shapeMode: 'custom',
    cutTypes: ['die'],
    materials: ['transparent_fuji'],
    finishes: ['none'],
    supportsWhiteInk: true,
    longSidePresetsMm: customLongSidePresetsMm,
    rules: {
      ...defaultProductionRules,
      minFeatureMm: 1.5,
      minCornerRadiusMm: 1.5,
      maxCutPoints: 50,
    },
    warnings: [warningFujiBackground, warningFujiStatic, warningFujiNoCoating],
    mockups: {
      thumbnail: '/mockups/stickers/a_custom_diecut_clear_fuji_thumb.png',
      preview: '/mockups/stickers/a_custom_diecut_clear_fuji_preview.png',
    },
  },
  {
    id: 'E_NAME_STICKER_BASIC',
    line: 'E',
    engine: 'sheet',
    title: '네임스티커 기본',
    description:
      '그리드 반복 템플릿으로 빠르게 제작합니다. 한 번 입력으로 전체 문구 변경 가능하며 무지로도 제작할 수 있어요.',
    sheetMode: 'template',
    templateId: 'name_sticker_basic_round',
    materials: ['paper_artlabel', 'yupo'],
    finishes: ['gloss', 'matte'],
    rules: {
      ...defaultProductionRules,
      minGapMm: 2,
    },
    warnings: [warningNameBulkEdit],
    mockups: {
      thumbnail: '/mockups/stickers/e_name_basic_thumb.png',
      preview: '/mockups/stickers/e_name_basic_preview.png',
    },
  },
  {
    id: 'E_NAME_STICKER_THEME',
    line: 'E',
    engine: 'sheet',
    title: '네임스티커 테마',
    description:
      '테마 컬러/아이콘이 포함된 네임스티커. 한 번 입력으로 전체 문구 변경이 가능합니다.',
    sheetMode: 'template',
    templateId: 'name_sticker_basic_round',
    materials: ['paper_artlabel', 'yupo'],
    finishes: ['gloss', 'matte'],
    rules: {
      ...defaultProductionRules,
      minGapMm: 2,
    },
    warnings: [warningNameBulkEdit],
    mockups: {
      thumbnail: '/mockups/stickers/e_name_theme_thumb.png',
      preview: '/mockups/stickers/e_name_theme_preview.png',
    },
  },
  {
    id: 'E_PACKAGE_SHEET_A3_FREE',
    line: 'E',
    engine: 'sheet',
    title: '패키지스티커 A3 한판짜기',
    description: 'A3 시트에 여러 스티커를 자유롭게 배치합니다.',
    sheetMode: 'free',
    templateId: 'package_sheet_a3_free',
    materials: ['paper_artlabel', 'yupo', 'transparent_vinyl'],
    finishes: ['gloss', 'matte'],
    rules: {
      ...defaultProductionRules,
      minGapMm: 3,
    },
    warnings: [
      warningSheetMargin,
      warningTransparentMatte,
      warningTransparentGloss,
    ],
    mockups: {
      thumbnail: '/mockups/stickers/e_package_a3_thumb.png',
      preview: '/mockups/stickers/e_package_a3_preview.png',
    },
  },
  {
    id: 'E_BLANK_SHAPES_SHEET',
    line: 'E',
    engine: 'sheet',
    title: '다양한 모양 무지',
    description: '다양한 모양을 무지로 제작할 수 있는 템플릿입니다.',
    sheetMode: 'template',
    templateId: 'blank_shapes_sheet',
    materials: ['paper_artlabel', 'paper_kraft', 'yupo'],
    finishes: ['gloss', 'matte'],
    rules: {
      ...defaultProductionRules,
      minGapMm: 2,
    },
    warnings: [warningBlankOnly],
    mockups: {
      thumbnail: '/mockups/stickers/e_blank_shapes_thumb.png',
      preview: '/mockups/stickers/e_blank_shapes_preview.png',
    },
  },
];
