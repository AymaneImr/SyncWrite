
import mammoth from 'mammoth';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

export type TipTapNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{
    type: string;
    attrs?: Record<string, unknown>;
  }>;
  content?: TipTapNode[];
};

export type TipTapDocument = {
  type: 'doc';
  content: TipTapNode[];
};

type PdfTextItem = {
  str?: string;
  transform?: number[];
  width?: number;
  height?: number;
  fontName?: string;
};

type PdfLineSegment = {
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  marks?: TipTapNode['marks'];
};

type PdfLine = {
  text: string;
  segments: PdfLineSegment[];
  y: number;
  x: number;
  right: number;
  fontSize: number;
};

export function fileNameToTitle(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '').trim() || 'Untitled';
}

function textToTipTapDocument(text: string): TipTapDocument {
  const normalized = text.replace(/\r\n/g, '\n').trim();

  if (!normalized) {
    return {
      type: 'doc',
      content: [{ type: 'paragraph' }],
    };
  }

  return {
    type: 'doc',
    content: normalized.split(/\n{2,}/).map((paragraph) => {
      const lines = paragraph.split('\n');
      const content: TipTapNode[] = [];

      lines.forEach((line, index) => {
        if (line.length > 0) {
          content.push({ type: 'text', text: line });
        }

        if (index < lines.length - 1) {
          content.push({ type: 'hardBreak' });
        }
      });

      return {
        type: 'paragraph',
        content: content.length > 0 ? content : undefined,
      };
    }),
  };
}

function nodesToParagraphs(nodes: TipTapNode[]): TipTapNode[] {
  return nodes.length > 0 ? nodes : [{ type: 'paragraph' }];
}

function inlineNodesFromText(text: string, marks: TipTapNode['marks'] = []): TipTapNode[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const content: TipTapNode[] = [];

  lines.forEach((line, index) => {
    if (line.length > 0) {
      content.push({
        type: 'text',
        text: line,
        ...(marks.length > 0 ? { marks } : {}),
      });
    }

    if (index < lines.length - 1) {
      content.push({ type: 'hardBreak' });
    }
  });

  return content;
}

function htmlToTipTapDocument(html: string): TipTapDocument {
  const parser = new DOMParser();
  const parsed = parser.parseFromString(html, 'text/html');
  const blockNodes: TipTapNode[] = [];

  const appendParagraph = (content: TipTapNode[]) => {
    blockNodes.push({
      type: 'paragraph',
      ...(content.length > 0 ? { content } : {}),
    });
  };

  const parseChildren = (node: Node, marks: TipTapNode['marks'] = []): TipTapNode[] => {
    if (node.nodeType === Node.TEXT_NODE) {
      const value = node.textContent ?? '';
      return value.trim().length === 0 ? [] : inlineNodesFromText(value, marks);
    }

    if (!(node instanceof HTMLElement)) {
      return [];
    }

    if (node.tagName === 'BR') {
      return [{ type: 'hardBreak' }];
    }

    const nextMarks = [...marks];

    if (['STRONG', 'B'].includes(node.tagName)) nextMarks.push({ type: 'bold' });
    if (['EM', 'I'].includes(node.tagName)) nextMarks.push({ type: 'italic' });
    if (['S', 'STRIKE', 'DEL'].includes(node.tagName)) nextMarks.push({ type: 'strike' });

    if (node.tagName === 'A') {
      const href = node.getAttribute('href');
      if (href) nextMarks.push({ type: 'link', attrs: { href } });
    }

    return Array.from(node.childNodes).flatMap((child) => parseChildren(child, nextMarks));
  };

  const parseBlock = (element: Element) => {
    const tag = element.tagName.toUpperCase();

    if (tag === 'P') {
      appendParagraph(parseChildren(element));
      return;
    }

    if (/^H[1-6]$/.test(tag)) {
      blockNodes.push({
        type: 'heading',
        attrs: { level: Number(tag.slice(1)) },
        content: parseChildren(element),
      });
      return;
    }

    if (tag === 'UL' || tag === 'OL') {
      const listType = tag === 'UL' ? 'bulletList' : 'orderedList';
      const items = Array.from(element.children)
        .filter((child) => child.tagName.toUpperCase() === 'LI')
        .map((child) => ({
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: parseChildren(child),
            },
          ],
        }));

      if (items.length > 0) {
        blockNodes.push({ type: listType, content: items });
      }
      return;
    }

    if (tag === 'BLOCKQUOTE') {
      blockNodes.push({
        type: 'blockquote',
        content: [{ type: 'paragraph', content: parseChildren(element) }],
      });
      return;
    }

    const content = parseChildren(element);
    if (content.length > 0) appendParagraph(content);
  };

  Array.from(parsed.body.children).forEach(parseBlock);

  if (blockNodes.length === 0) {
    const fallback = parseChildren(parsed.body);
    return {
      type: 'doc',
      content: nodesToParagraphs([
        {
          type: 'paragraph',
          ...(fallback.length > 0 ? { content: fallback } : {}),
        },
      ]),
    };
  }

  return { type: 'doc', content: nodesToParagraphs(blockNodes) };
}

async function readTxtFile(file: File) {
  return textToTipTapDocument(await file.text());
}

async function readDocxFile(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const { value } = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Heading 4'] => h4:fresh",
        "p[style-name='Heading 5'] => h5:fresh",
        "p[style-name='Heading 6'] => h6:fresh",
      ],
    }
  );

  return htmlToTipTapDocument(value);
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function marksFromPdfFont(fontName?: string): TipTapNode['marks'] {
  if (!fontName) return undefined;

  const normalized = fontName.toLowerCase();
  const marks: NonNullable<TipTapNode['marks']> = [];

  if (/(bold|black|heavy|demi|semi)/.test(normalized)) marks.push({ type: 'bold' });
  if (/(italic|oblique)/.test(normalized)) marks.push({ type: 'italic' });

  return marks.length > 0 ? marks : undefined;
}

function buildInlineContentFromPdfLine(line: PdfLine, bodyFontSize?: number): TipTapNode[] {
  const content: TipTapNode[] = [];
  let previousRightEdge: number | null = null;

  line.segments.forEach((segment) => {
    const averageCharacterWidth = segment.text.length > 0 ? segment.width / segment.text.length : 0;
    const gap = previousRightEdge === null ? 0 : segment.x - previousRightEdge;
    const marks = [...(segment.marks ?? [])];
    const relativeFontSize = bodyFontSize ? segment.fontSize / bodyFontSize : 1;

    if (bodyFontSize && Math.abs(relativeFontSize - 1) >= 0.12) {
      marks.push({
        type: 'textStyle',
        attrs: { fontSize: `${Math.max(12, Math.round(segment.fontSize))}px` },
      });
    }

    if (previousRightEdge !== null && gap > Math.max(2.5, averageCharacterWidth * 0.35)) {
      content.push({ type: 'text', text: ' ' });
    }

    content.push({
      type: 'text',
      text: segment.text,
      ...(marks.length > 0 ? { marks } : {}),
    });

    previousRightEdge = segment.x + segment.width;
  });

  return content;
}

function inferTextAlign(line: PdfLine, pageWidth: number): 'left' | 'center' | 'right' {
  const leftMargin = line.x;
  const rightMargin = Math.max(0, pageWidth - line.right);
  const centerDelta = Math.abs(leftMargin - rightMargin);

  if (centerDelta <= Math.max(18, pageWidth * 0.035)) return 'center';
  if (rightMargin < Math.max(40, leftMargin * 0.55) && leftMargin > pageWidth * 0.25) return 'right';
  return 'left';
}

function isMostlyUppercase(text: string) {
  const letters = text.replace(/[^A-Za-z]/g, '');
  if (letters.length < 4) return false;
  return letters.replace(/[^A-Z]/g, '').length / letters.length >= 0.75;
}

function isBoldLine(line: PdfLine) {
  return line.segments.some((segment) => segment.marks?.some((mark) => mark.type === 'bold'));
}

function isLikelyHeading(line: PdfLine, bodyFontSize: number, pageWidth: number) {
  const sizeRatio = line.fontSize / bodyFontSize;
  const align = inferTextAlign(line, pageWidth);
  const shortLine = line.text.length <= 140;

  if (sizeRatio >= 1.18 && shortLine) return true;
  if (shortLine && isBoldLine(line) && (align !== 'left' || sizeRatio >= 1.05)) return true;
  if (shortLine && isMostlyUppercase(line.text) && sizeRatio >= 0.98) return true;
  return false;
}

function shouldKeepLineBreak(line: PdfLine, fullWidth: number) {
  const widthRatio = (line.right - line.x) / Math.max(fullWidth, 1);
  return widthRatio < 0.72 || /[:;]$/.test(line.text);
}

function pushListItem(
  blocks: TipTapNode[],
  listType: 'bulletList' | 'orderedList',
  itemContent: TipTapNode[] | undefined,
  attrs?: Record<string, unknown>
) {
  const lastBlock = blocks[blocks.length - 1];

  if (lastBlock?.type === listType && Array.isArray(lastBlock.content)) {
    lastBlock.content.push({
      type: 'listItem',
      content: [
        {
          type: 'paragraph',
          ...(itemContent && itemContent.length > 0 ? { content: itemContent } : {}),
          ...(attrs ? { attrs } : {}),
        },
      ],
    });
    return;
  }

  blocks.push({
    type: listType,
    content: [
      {
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            ...(itemContent && itemContent.length > 0 ? { content: itemContent } : {}),
            ...(attrs ? { attrs } : {}),
          },
        ],
      },
    ],
  });
}

function pdfItemsToStructuredBlocks(items: PdfTextItem[], pageWidth: number): TipTapNode[] {
  const segments = items
    .map<PdfLineSegment | null>((item) => {
      const text = (item.str ?? '').replace(/\s+/g, ' ').trim();
      const transform = item.transform ?? [];
      const x = typeof transform[4] === 'number' ? transform[4] : 0;
      const y = typeof transform[5] === 'number' ? transform[5] : 0;
      const fontSize = Math.max(
        Math.abs(transform[0] ?? 0),
        Math.abs(transform[3] ?? 0),
        Math.abs(item.height ?? 0)
      );

      if (!text) return null;

      return {
        text,
        x,
        y,
        width: Math.abs(item.width ?? text.length * Math.max(fontSize * 0.45, 5)),
        fontSize: fontSize || 12,
        marks: marksFromPdfFont(item.fontName),
      };
    })
    .filter((segment): segment is PdfLineSegment => segment !== null)
    .sort((a, b) => {
      const yDiff = b.y - a.y;
      return Math.abs(yDiff) > 1.5 ? yDiff : a.x - b.x;
    });

  const groupedLines: PdfLine[] = [];

  segments.forEach((segment) => {
    const existingLine = groupedLines.find(
      (line) => Math.abs(line.y - segment.y) <= Math.max(2.5, segment.fontSize * 0.35)
    );

    if (existingLine) {
      existingLine.segments.push(segment);
      existingLine.x = Math.min(existingLine.x, segment.x);
      existingLine.right = Math.max(existingLine.right, segment.x + segment.width);
      existingLine.fontSize = Math.max(existingLine.fontSize, segment.fontSize);
      return;
    }

    groupedLines.push({
      text: '',
      segments: [segment],
      y: segment.y,
      x: segment.x,
      right: segment.x + segment.width,
      fontSize: segment.fontSize,
    });
  });

  const lines = groupedLines
    .map<PdfLine>((line) => {
      const orderedSegments = [...line.segments].sort((a, b) => a.x - b.x);
      const content = buildInlineContentFromPdfLine({ ...line, segments: orderedSegments });
      const text = content
        .map((node) => node.text ?? '')
        .join('')
        .replace(/\s+/g, ' ')
        .trim();

      return { ...line, text, segments: orderedSegments };
    })
    .filter((line) => line.text.length > 0)
    .sort((a, b) => {
      const yDiff = b.y - a.y;
      return Math.abs(yDiff) > 1.5 ? yDiff : a.x - b.x;
    });

  const bodyFontSize = median(lines.map((line) => line.fontSize)) || 12;
  const lineGaps = lines.slice(1).map((line, index) => Math.abs(lines[index].y - line.y));
  const bodyLineGap = median(lineGaps) || bodyFontSize * 1.2;
  const dominantLeftIndent = median(lines.map((line) => line.x));
  const averageLineWidth = average(lines.map((line) => line.right - line.x)) || pageWidth * 0.7;
  const blocks: TipTapNode[] = [];
  let currentParagraphLines: PdfLine[] = [];

  const flushParagraph = () => {
    if (currentParagraphLines.length === 0) return;

    const paragraphContent: TipTapNode[] = [];
    const firstLine = currentParagraphLines[0];
    const align = inferTextAlign(firstLine, pageWidth);
    const isIndentedBlock =
      firstLine.x - dominantLeftIndent > Math.max(24, pageWidth * 0.04) &&
      currentParagraphLines.every((line) => line.x >= firstLine.x - 8) &&
      average(currentParagraphLines.map((line) => line.right - line.x)) < averageLineWidth * 0.9;

    currentParagraphLines.forEach((line, index) => {
      if (index > 0) {
        if (shouldKeepLineBreak(currentParagraphLines[index - 1], averageLineWidth)) {
          paragraphContent.push({ type: 'hardBreak' });
        } else {
          paragraphContent.push({ type: 'text', text: ' ' });
        }
      }

      paragraphContent.push(...buildInlineContentFromPdfLine(line, bodyFontSize));
    });

    const paragraphNode: TipTapNode = {
      type: 'paragraph',
      ...(align !== 'left' ? { attrs: { textAlign: align } } : {}),
      ...(paragraphContent.length > 0 ? { content: paragraphContent } : {}),
    };

    if (isIndentedBlock) {
      blocks.push({ type: 'blockquote', content: [paragraphNode] });
    } else {
      blocks.push(paragraphNode);
    }

    currentParagraphLines = [];
  };

  lines.forEach((line, index) => {
    const previousLine = lines[index - 1];
    const lineGap = previousLine ? Math.abs(previousLine.y - line.y) : bodyLineGap;
    const isHeading = isLikelyHeading(line, bodyFontSize, pageWidth);
    const isListItem = /^([•●▪◦■\-*]|(\d+|[A-Za-z])[.)])\s+/.test(line.text);
    const textWithoutMarker = line.text.replace(/^([•●▪◦■\-*]|(\d+|[A-Za-z])[.)])\s+/, '');
    const startsNewParagraph =
      !previousLine ||
      lineGap > bodyLineGap * 1.45 ||
      Math.abs(line.x - previousLine.x) > 18 ||
      previousLine.text.endsWith(':') ||
      (line.fontSize / bodyFontSize > 1.1 && previousLine.fontSize / bodyFontSize <= 1.05);

    if (isHeading) {
      flushParagraph();

      const sizeRatio = line.fontSize / bodyFontSize;
      const level = sizeRatio >= 1.9 ? 1 : sizeRatio >= 1.55 ? 2 : sizeRatio >= 1.3 ? 3 : 4;
      const align = inferTextAlign(line, pageWidth);

      blocks.push({
        type: 'heading',
        attrs: {
          level,
          ...(align !== 'left' ? { textAlign: align } : {}),
        },
        content: buildInlineContentFromPdfLine(line, bodyFontSize),
      });
      return;
    }

    if (isListItem) {
      flushParagraph();

      const align = inferTextAlign(line, pageWidth);

      pushListItem(
        blocks,
        /^\d+[.)]\s+/.test(line.text) ? 'orderedList' : 'bulletList',
        textWithoutMarker
          ? [
            {
              type: 'text',
              text: textWithoutMarker,
              ...(Math.abs(line.fontSize / bodyFontSize - 1) >= 0.12
                ? {
                  marks: [
                    {
                      type: 'textStyle',
                      attrs: { fontSize: `${Math.max(12, Math.round(line.fontSize))}px` },
                    },
                  ],
                }
                : {}),
            },
          ]
          : undefined,
        align !== 'left' ? { textAlign: align } : undefined
      );
      return;
    }

    if (startsNewParagraph) flushParagraph();
    currentParagraphLines.push(line);
  });

  flushParagraph();
  return blocks;
}

async function readPdfFile(file: File) {
  GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

  const loadingTask = getDocument({ data: await file.arrayBuffer() });
  const pdf = await loadingTask.promise;
  const content: TipTapNode[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();
    const pageContent = pdfItemsToStructuredBlocks(
      textContent.items as PdfTextItem[],
      viewport.width
    );

    if (pageContent.length > 0) content.push(...pageContent);
  }

  return {
    type: 'doc',
    content: nodesToParagraphs(content),
  };
}

export async function parseUploadedTextDocument(file: File) {
  const lowerName = file.name.toLowerCase();

  if (file.type === 'text/plain' || lowerName.endsWith('.txt')) {
    return await readTxtFile(file);
  }

  if (
    lowerName.endsWith('.docx') ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return await readDocxFile(file);
  }

  if (lowerName.endsWith('.doc')) {
    throw new Error('Legacy .doc files are not supported yet. Please save the file as .docx and upload that.');
  }

  if (file.type === 'application/pdf' || lowerName.endsWith('.pdf')) {
    return await readPdfFile(file);
  }

  throw new Error('Unsupported file type. Please upload a .txt, .pdf, or .docx file.');
}
