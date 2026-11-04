/**
 * 画布存储数据结构（与客户端 src/views/Canvas/types.ts 保持一致）
 * 服务端不解释内部语义，仅用于存储、同步与校验
 */

/** 画布元素类型 */
export enum CanvasElementTypeEnum {
  /** div 容器 */
  DIV,
  /** 超链接 */
  LINK,
  /** 图片 */
  IMAGE,
  /** 按钮 */
  BUTTON,
  /** 段落 */
  PARAGRAPH,
  /** 根元素 */
  ROOT,
  /** 单行文本框 */
  INPUT,
  /** 多行文本框 */
  TEXTAREA,
  /** 单选框 */
  RADIO,
  /** 多选框 */
  CHECKBOX,
  /** 视频 */
  VIDEO,
  /** 音频 */
  AUDIO,
  /** 标签 */
  LABEL,
  /** 表单 */
  FORM,
  /** 行内容器 */
  SPAN,
  /** 纯文本 */
  TEXT,
  /** 无序列表 */
  UNORDERED_LIST,
  /** 有序列表 */
  ORDERED_LIST,
  /** 列表项 */
  LIST_ITEM,
  /** 表格 */
  TABLE,
  /** 表头 */
  TABLE_HEAD,
  /** 表体 */
  TABLE_BODY,
  /** 表脚 */
  TABLE_FOOT,
  /** 表格行 */
  TABLE_ROW,
  /** 表格单元格 */
  TABLE_DATA,
  /** 表头单元格 */
  TABLE_HEADER_CELL,
  /** 表格标题 */
  TABLE_CAPTION,
  /** 表格列组 */
  TABLE_COL_GROUP,
  /** 表格列 */
  TABLE_COL,
  /** 页头 */
  HEADER,
  /** 页脚 */
  FOOTER,
  /** 文章 */
  ARTICLE,
  /** 章节 */
  SECTION,
  /** 侧边栏 */
  ASIDE,
  /** 标题 */
  HEADING,
  /** 通用元素（未在组件定义范围内的任意 HTML 标签） */
  GENERAL,
}

/** 按钮类型 */
export enum ButtonTypeEnum {
  /** 按钮 */
  BUTTON = 'button',
  /** 重置 */
  RESET = 'reset',
  /** 提交 */
  SUBMIT = 'submit',
}

/** 超链接打开方式 */
export enum LinkTargetEnum {
  /** 当前窗口 */
  SELF = 1,
  /** 新窗口 */
  BLANK = 2,
}

/** 表单提交方式 */
export enum FormMethodEnum {
  /** GET */
  GET = 'get',
  /** POST */
  POST = 'post',
}

/** 表头单元格 scope 属性枚举 */
export enum TableScopeEnum {
  /** 行 */
  ROW = 1,
  /** 列 */
  COL = 2,
  /** 行组 */
  ROWGROUP = 3,
  /** 列组 */
  COLGROUP = 4,
}

/** 标题级别枚举 */
export enum HeadingLevelEnum {
  /** 未定义 */
  UNDEFINED = 0,
  /** 一级标题 */
  H1 = 1,
  /** 二级标题 */
  H2 = 2,
  /** 三级标题 */
  H3 = 3,
  /** 四级标题 */
  H4 = 4,
  /** 五级标题 */
  H5 = 5,
  /** 六级标题 */
  H6 = 6,
}

/** 样式规则类型枚举 */
export enum StyleRuleTypeEnum {
  /** 未定义 */
  UNDEFINED = 0,
  /** 可编辑的规则（id或单一class选择器，支持可视化编辑） */
  EDITABLE = 1,
  /** 原样透传的声明规则（其他选择器，不支持可视化编辑） */
  RAW = 2,
  /** 原样透传的 at-rule */
  AT_RULE = 3,
}

/** 画布样式规则项 */
export interface CanvasStyleRule {
  /** 规则类型 */
  type: StyleRuleTypeEnum;
  /** 选择器文本（atRuleCssText 规则为空字符串） */
  selector: string;
  /** 样式声明原始内容键值对（kebab-case 键名，含 !important） */
  style: Record<string, string>;
  /** 完整 at-rule 文本（AT_RULE 时使用） */
  atRuleCssText?: string;
}

/** 元素 class 项 */
export interface ElementClass {
  /** class 名称 */
  name: string;
  /** 是否启用（应用到 DOM） */
  enabled: boolean;
}

/** 画布元素通用属性 */
export interface CanvasElementBase {
  /** 元素id */
  id: string;
  /** 元素管理的 class 列表（含启用/禁用状态） */
  classes: ElementClass[];
  /** 元素别名 */
  alias?: string;
  /** 解析时保留的额外安全属性 */
  extraAttrs?: Record<string, string>;
}

/** 画布 div 元素 */
export interface CanvasDivElement extends CanvasElementBase {
  /** 元素类型 */
  type: CanvasElementTypeEnum.DIV;
  /** 子元素 */
  children: CanvasInnerElement[];
}

/** 画布按钮元素 */
export interface CanvasButtonElement extends CanvasElementBase {
  /** 元素类型 */
  type: CanvasElementTypeEnum.BUTTON;
  /** 按钮文本 */
  text: string;
  /** 按钮类型 */
  buttonType?: ButtonTypeEnum;
  /** 是否禁用 */
  disabled: boolean;
}

/** 画布段落元素 */
export interface CanvasParagraphElement extends CanvasElementBase {
  /** 元素类型 */
  type: CanvasElementTypeEnum.PARAGRAPH;
  /** 段落文本 */
  text: string;
}

/** 画布图片元素 */
export interface CanvasImageElement extends CanvasElementBase {
  /** 元素类型 */
  type: CanvasElementTypeEnum.IMAGE;
  /** 图片地址 */
  src: string;
  /** 图片标题 */
  title: string;
}

/** 画布超链接元素 */
export interface CanvasLinkElement extends CanvasElementBase {
  /** 元素类型 */
  type: CanvasElementTypeEnum.LINK;
  /** 连接地址 */
  href: string;
  /** 打开方式 */
  target?: LinkTargetEnum;
  /** 子元素 */
  children: CanvasInnerElement[];
}

/** 画布单行文本框元素 */
export interface CanvasInputElement extends CanvasElementBase {
  /** 元素类型 */
  type: CanvasElementTypeEnum.INPUT;
  /** 占位提示文本 */
  placeholder: string;
  /** 当前值 */
  value: string;
  /** 是否必填 */
  required: boolean;
  /** 是否禁用 */
  disabled: boolean;
}

/** 画布多行文本框元素 */
export interface CanvasTextareaElement extends CanvasElementBase {
  /** 元素类型 */
  type: CanvasElementTypeEnum.TEXTAREA;
  /** 占位提示文本 */
  placeholder: string;
  /** 当前值 */
  value: string;
  /** 行数（缺省时由浏览器默认） */
  rows?: number;
  /** 是否必填 */
  required: boolean;
  /** 是否禁用 */
  disabled: boolean;
}

/** 画布单选框元素 */
export interface CanvasRadioElement extends CanvasElementBase {
  /** 元素类型 */
  type: CanvasElementTypeEnum.RADIO;
  /** 单选组名称 */
  name: string;
  /** 选项值 */
  value: string;
  /** 是否选中 */
  checked: boolean;
  /** 是否必填 */
  required: boolean;
  /** 是否禁用 */
  disabled: boolean;
}

/** 画布多选框元素 */
export interface CanvasCheckboxElement extends CanvasElementBase {
  /** 元素类型 */
  type: CanvasElementTypeEnum.CHECKBOX;
  /** 多选组名称 */
  name: string;
  /** 选项值 */
  value: string;
  /** 是否选中 */
  checked: boolean;
  /** 是否必填 */
  required: boolean;
  /** 是否禁用 */
  disabled: boolean;
}

/** 画布视频元素 */
export interface CanvasVideoElement extends CanvasElementBase {
  /** 元素类型 */
  type: CanvasElementTypeEnum.VIDEO;
  /** 视频地址 */
  src: string;
  /** 是否显示控件 */
  controls: boolean;
  /** 是否自动播放 */
  autoplay: boolean;
  /** 是否静音 */
  muted: boolean;
  /** 是否循环播放 */
  loop: boolean;
}

/** 画布音频元素 */
export interface CanvasAudioElement extends CanvasElementBase {
  /** 元素类型 */
  type: CanvasElementTypeEnum.AUDIO;
  /** 音频地址 */
  src: string;
  /** 是否显示控件 */
  controls: boolean;
  /** 是否自动播放 */
  autoplay: boolean;
  /** 是否静音 */
  muted: boolean;
  /** 是否循环播放 */
  loop: boolean;
}

/** 画布标签元素 */
export interface CanvasLabelElement extends CanvasElementBase {
  /** 元素类型 */
  type: CanvasElementTypeEnum.LABEL;
  /** 标签文本 */
  text: string;
  /** 关联的表单元素 id（缺省表示未绑定） */
  for?: string;
}

/** 画布表单元素 */
export interface CanvasFormElement extends CanvasElementBase {
  /** 元素类型 */
  type: CanvasElementTypeEnum.FORM;
  /** 提交地址 */
  action: string;
  /** 提交方式 */
  method?: FormMethodEnum;
  /** 子元素 */
  children: CanvasInnerElement[];
}

/** 画布行内容器元素 */
export interface CanvasSpanElement extends CanvasElementBase {
  /** 元素类型 */
  type: CanvasElementTypeEnum.SPAN;
  /** 子元素 */
  children: CanvasInnerElement[];
}

/** 画布纯文本元素 */
export interface CanvasTextElement extends CanvasElementBase {
  /** 元素类型 */
  type: CanvasElementTypeEnum.TEXT;
  /** 文本内容 */
  text: string;
}

/** 画布无序列表元素 */
export interface CanvasUnorderedListElement extends CanvasElementBase {
  /** 元素类型 */
  type: CanvasElementTypeEnum.UNORDERED_LIST;
  /** 子元素 */
  children: CanvasInnerElement[];
}

/** 画布有序列表元素 */
export interface CanvasOrderedListElement extends CanvasElementBase {
  /** 元素类型 */
  type: CanvasElementTypeEnum.ORDERED_LIST;
  /** 子元素 */
  children: CanvasInnerElement[];
}

/** 画布列表项元素 */
export interface CanvasListItemElement extends CanvasElementBase {
  /** 元素类型 */
  type: CanvasElementTypeEnum.LIST_ITEM;
  /** 子元素 */
  children: CanvasInnerElement[];
}

/** 画布表格元素 */
export interface CanvasTableElement extends CanvasElementBase {
  /** 元素类型 */
  type: CanvasElementTypeEnum.TABLE;
  /** 子元素 */
  children: CanvasInnerElement[];
}

/** 画布表头元素 */
export interface CanvasTableHeadElement extends CanvasElementBase {
  /** 元素类型 */
  type: CanvasElementTypeEnum.TABLE_HEAD;
  /** 子元素 */
  children: CanvasInnerElement[];
}

/** 画布表体元素 */
export interface CanvasTableBodyElement extends CanvasElementBase {
  /** 元素类型 */
  type: CanvasElementTypeEnum.TABLE_BODY;
  /** 子元素 */
  children: CanvasInnerElement[];
}

/** 画布表脚元素 */
export interface CanvasTableFootElement extends CanvasElementBase {
  /** 元素类型 */
  type: CanvasElementTypeEnum.TABLE_FOOT;
  /** 子元素 */
  children: CanvasInnerElement[];
}

/** 画布表格行元素 */
export interface CanvasTableRowElement extends CanvasElementBase {
  /** 元素类型 */
  type: CanvasElementTypeEnum.TABLE_ROW;
  /** 子元素 */
  children: CanvasInnerElement[];
}

/** 画布表格单元格元素 */
export interface CanvasTableDataElement extends CanvasElementBase {
  /** 元素类型 */
  type: CanvasElementTypeEnum.TABLE_DATA;
  /** 跨列数（缺省为 1） */
  colspan?: number;
  /** 跨行数（缺省为 1） */
  rowspan?: number;
  /** 子元素 */
  children: CanvasInnerElement[];
}

/** 画布表头单元格元素 */
export interface CanvasTableHeaderCellElement extends CanvasElementBase {
  /** 元素类型 */
  type: CanvasElementTypeEnum.TABLE_HEADER_CELL;
  /** 跨列数（缺省为 1） */
  colspan?: number;
  /** 跨行数（缺省为 1） */
  rowspan?: number;
  /** 表头范围 */
  scope?: TableScopeEnum;
  /** 子元素 */
  children: CanvasInnerElement[];
}

/** 画布表格标题元素 */
export interface CanvasTableCaptionElement extends CanvasElementBase {
  /** 元素类型 */
  type: CanvasElementTypeEnum.TABLE_CAPTION;
  /** 子元素 */
  children: CanvasInnerElement[];
}

/** 画布表格列组元素 */
export interface CanvasTableColGroupElement extends CanvasElementBase {
  /** 元素类型 */
  type: CanvasElementTypeEnum.TABLE_COL_GROUP;
  /** 跨列数（缺省为 1） */
  span?: number;
  /** 子元素 */
  children: CanvasInnerElement[];
}

/** 画布表格列元素 */
export interface CanvasTableColElement extends CanvasElementBase {
  /** 元素类型 */
  type: CanvasElementTypeEnum.TABLE_COL;
  /** 跨列数（缺省为 1） */
  span?: number;
}

/** 画布页头元素 */
export interface CanvasHeaderElement extends CanvasElementBase {
  /** 元素类型 */
  type: CanvasElementTypeEnum.HEADER;
  /** 子元素 */
  children: CanvasInnerElement[];
}

/** 画布页脚元素 */
export interface CanvasFooterElement extends CanvasElementBase {
  /** 元素类型 */
  type: CanvasElementTypeEnum.FOOTER;
  /** 子元素 */
  children: CanvasInnerElement[];
}

/** 画布文章元素 */
export interface CanvasArticleElement extends CanvasElementBase {
  /** 元素类型 */
  type: CanvasElementTypeEnum.ARTICLE;
  /** 子元素 */
  children: CanvasInnerElement[];
}

/** 画布章节元素 */
export interface CanvasSectionElement extends CanvasElementBase {
  /** 元素类型 */
  type: CanvasElementTypeEnum.SECTION;
  /** 子元素 */
  children: CanvasInnerElement[];
}

/** 画布侧边栏元素 */
export interface CanvasAsideElement extends CanvasElementBase {
  /** 元素类型 */
  type: CanvasElementTypeEnum.ASIDE;
  /** 子元素 */
  children: CanvasInnerElement[];
}

/** 画布标题元素 */
export interface CanvasHeadingElement extends CanvasElementBase {
  /** 元素类型 */
  type: CanvasElementTypeEnum.HEADING;
  /** 标题级别 */
  level: HeadingLevelEnum;
  /** 标题文本 */
  text: string;
}

/** 画布根元素 */
export interface CanvasRootElement extends CanvasElementBase {
  /** 元素类型 */
  type: CanvasElementTypeEnum.ROOT;
  /** 子元素列表 */
  children: CanvasInnerElement[];
}

/** 画布通用元素（未在组件定义范围内的任意 HTML 标签，解析时保留原始标签与属性） */
export interface CanvasGeneralElement extends CanvasElementBase {
  /** 元素类型 */
  type: CanvasElementTypeEnum.GENERAL;
  /** 原始 HTML 标签名（小写） */
  tagName: string;
  /** 子元素 */
  children: CanvasInnerElement[];
}

/** 画布内部元素 */
export type CanvasInnerElement =
  | CanvasDivElement
  | CanvasButtonElement
  | CanvasParagraphElement
  | CanvasLinkElement
  | CanvasImageElement
  | CanvasInputElement
  | CanvasTextareaElement
  | CanvasRadioElement
  | CanvasCheckboxElement
  | CanvasVideoElement
  | CanvasAudioElement
  | CanvasLabelElement
  | CanvasFormElement
  | CanvasSpanElement
  | CanvasTextElement
  | CanvasUnorderedListElement
  | CanvasOrderedListElement
  | CanvasListItemElement
  | CanvasTableElement
  | CanvasTableHeadElement
  | CanvasTableBodyElement
  | CanvasTableFootElement
  | CanvasTableRowElement
  | CanvasTableDataElement
  | CanvasTableHeaderCellElement
  | CanvasTableCaptionElement
  | CanvasTableColGroupElement
  | CanvasTableColElement
  | CanvasHeaderElement
  | CanvasFooterElement
  | CanvasArticleElement
  | CanvasSectionElement
  | CanvasAsideElement
  | CanvasHeadingElement
  | CanvasGeneralElement;

/** 画布元素 */
export type CanvasElement = CanvasInnerElement | CanvasRootElement;

/** 服务端持久化的画布数据结构 */
export interface CanvasStorageData {
  /** 根元素（含整棵子元素树，与普通元素一样参与协作同步） */
  root: CanvasRootElement;
  /** 样式规则清单 */
  styleRules?: CanvasStyleRule[];
}
