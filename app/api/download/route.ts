import { NextRequest, NextResponse } from 'next/server'
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, PageBreak,
  BorderStyle, WidthType, ShadingType, VerticalAlign,
} from 'docx'

// ══════════════════════════════════════════════════════════════════════════════
// BRAND COLORS
// ══════════════════════════════════════════════════════════════════════════════
const NAVY        = '042838'
const NAVY_DARK   = '1a2a3a'
const TEAL        = '1E9DB8'
const TEAL_PALE   = 'E0F3F8'
const TEAL_MID    = 'B8DDE8'
const WHITE       = 'FFFFFF'
const OFF_WHITE   = 'F7FAFB'
const LIGHT_GRAY  = 'FAFBFC'
const MID_GRAY    = '8C96A0'
const DARK_TEXT   = '162229'
const BORDER_GRAY = 'C5D2D8'
const AMBER       = 'B7590A'
const AMBER_PALE  = 'FDF6ED'
const AMBER_MID   = 'F0D5B0'
const TEAL_IN_BG  = '1E9BB8'
const TEAL_IN_PALE = 'E6F4F7'
const BLUE_PALE   = 'EEF4FB'
const BLUE_MID    = 'B8D0E8'
const BLUE_BORDER = '4A7FB5'
const PURPLE      = 'A795C7'
const PURPLE_PALE = 'F2EFF8'
const PURPLE_MID  = 'C4B7DB'
const GREEN_PHASE = '8ecf6e'
const GREEN_PALE  = 'EEF9E6'
const GREEN_MID   = 'BBDFA0'
const EX_COLOR    = '4A5259'

const CW        = 9360
const PAD_H     = 280
const PAD_V     = 200
const PAD_TABLE = 160

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════
const bdr  = (color: string, sz = 4) => ({ style: BorderStyle.SINGLE, size: sz, color })
const noB  = () => ({
  top:    { style: BorderStyle.NONE, size: 0, color: WHITE },
  bottom: { style: BorderStyle.NONE, size: 0, color: WHITE },
  left:   { style: BorderStyle.NONE, size: 0, color: WHITE },
  right:  { style: BorderStyle.NONE, size: 0, color: WHITE },
})
const allB = (color = BORDER_GRAY, sz = 3) =>
  ({ top: bdr(color, sz), bottom: bdr(color, sz), left: bdr(color, sz), right: bdr(color, sz) })

const LINE_SPACING = { line: 264, lineRule: 'auto' as const }

const tx  = (text: string, opts: Record<string, unknown> = {}) =>
  new TextRun({ text, font: 'Arial', size: 22, color: DARK_TEXT, ...opts })
const ex  = (text: string) =>
  new TextRun({ text, font: 'Arial', size: 21, color: EX_COLOR })
const bld = (text: string, sz = 22, color = DARK_TEXT) =>
  new TextRun({ text, font: 'Arial', size: sz, bold: true, color })

const p = (children: TextRun[], opts: Record<string, unknown> = {}) =>
  new Paragraph({
    children,
    spacing: { ...LINE_SPACING, ...((opts.spacing as Record<string, unknown>) || {}) },
    ...opts,
  })

const sp = (before = 80) =>
  new Paragraph({ children: [tx('')], spacing: { before, after: 0 } })

const pb = () =>
  new Paragraph({ children: [new PageBreak()] })

// ══════════════════════════════════════════════════════════════════════════════
// SHARED ELEMENTS
// ══════════════════════════════════════════════════════════════════════════════

const h2 = (text: string) => p(
  [bld(text, 26, NAVY)],
  {
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: TEAL_MID } },
    spacing: { before: 320, after: 100, ...LINE_SPACING },
  }
)

const h3 = (text: string) => p(
  [bld(text, 23, NAVY)],
  { spacing: { before: 200, after: 80, ...LINE_SPACING } }
)

const sectionDiv = (text: string) => p(
  [bld(text, 22, NAVY)],
  { border: { bottom: bdr(TEAL_MID, 8) }, spacing: { before: 300, after: 100 } }
)

function calloutBox(label: string, body: string, labelColor: string, bgColor: string, borderColor: string): Table {
  const LW = 900
  const VW = CW - LW
  return new Table({
    width: { size: CW, type: WidthType.DXA },
    columnWidths: [LW, VW],
    rows: [new TableRow({
      children: [
        new TableCell({
          borders: { top: bdr(borderColor, 6), bottom: bdr(borderColor, 6), left: bdr(borderColor, 16), right: noB().right },
          width: { size: LW, type: WidthType.DXA },
          shading: { fill: bgColor, type: ShadingType.CLEAR },
          margins: { top: PAD_V, bottom: PAD_V, left: PAD_H, right: 80 },
          verticalAlign: VerticalAlign.TOP,
          children: [p([bld(label, 20, labelColor)])],
        }),
        new TableCell({
          borders: { top: bdr(borderColor, 6), bottom: bdr(borderColor, 6), right: bdr(borderColor, 6), left: noB().left },
          width: { size: VW, type: WidthType.DXA },
          shading: { fill: bgColor, type: ShadingType.CLEAR },
          margins: { top: PAD_V, bottom: PAD_V, left: 120, right: PAD_H },
          children: [p([tx(body)])],
        }),
      ],
    })],
  })
}

const noteCallout     = (body: string) => calloutBox('Note:',               body, AMBER,       AMBER_PALE,  AMBER)
const practiceCallout = (body: string) => calloutBox('In practice:',        body, TEAL_IN_BG,  TEAL_IN_PALE, TEAL_IN_BG)
const analogyCallout  = (body: string) => calloutBox('Think of it this way:', body, BLUE_BORDER, BLUE_PALE,   BLUE_MID)

function makeHeader(title: string): Header {
  return new Header({
    children: [p([
      bld('Nerdio', 18, TEAL),
      new TextRun({ text: `   Learning & Development   \u2014   ${title}`, font: 'Arial', size: 18, color: MID_GRAY }),
    ], {
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: TEAL } },
      spacing: { after: 0 },
    })],
  })
}

function makeFooter(title: string): Footer {
  return new Footer({
    children: [p([
      new TextRun({ text: `Nerdio L&D  \u2022  ${title}  \u2022  v1.0`, font: 'Arial', size: 18, color: MID_GRAY }),
    ], {
      border: { top: { style: BorderStyle.SINGLE, size: 6, color: TEAL } },
      spacing: { before: 60 },
    })],
  })
}

function coverPage(title: string, subtitle: string, metadata: [string, string][]): (Table | Paragraph)[] {
  const LW = 2640
  const VW = CW - LW

  const navyBlock = new Table({
    width: { size: CW, type: WidthType.DXA },
    columnWidths: [CW],
    rows: [
      new TableRow({
        children: [new TableCell({
          borders: noB(),
          width: { size: CW, type: WidthType.DXA },
          shading: { fill: NAVY, type: ShadingType.CLEAR },
          margins: { top: 520, bottom: 440, left: 600, right: 600 },
          children: [
            p([bld('Nerdio', 56, WHITE)], { alignment: AlignmentType.CENTER, spacing: { before: 0, after: 60 } }),
            p([new TextRun({ text: 'Learning & Development', font: 'Arial', size: 26, color: TEAL })], { alignment: AlignmentType.CENTER, spacing: { before: 0, after: 320 } }),
            p([bld(title, 40, WHITE)], { alignment: AlignmentType.CENTER, spacing: { before: 0, after: 100 } }),
            p([new TextRun({ text: subtitle, font: 'Arial', size: 28, color: TEAL })], { alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0 } }),
          ],
        })],
      }),
      new TableRow({
        children: [new TableCell({
          borders: noB(),
          width: { size: CW, type: WidthType.DXA },
          shading: { fill: TEAL, type: ShadingType.CLEAR },
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
          children: [new Paragraph({ children: [tx('')], spacing: { before: 0, after: 0 } })],
        })],
      }),
    ],
  })

  const metaTable = new Table({
    width: { size: CW, type: WidthType.DXA },
    columnWidths: [LW, VW],
    rows: metadata.map(([label, val], i) => new TableRow({
      height: { value: 380, rule: 'atLeast' },
      children: [
        new TableCell({
          borders: allB(BORDER_GRAY, 3),
          width: { size: LW, type: WidthType.DXA },
          shading: { fill: i % 2 === 0 ? TEAL_PALE : 'E8F5FA', type: ShadingType.CLEAR },
          margins: { top: 120, bottom: 120, left: PAD_TABLE, right: PAD_TABLE },
          verticalAlign: VerticalAlign.CENTER,
          children: [p([bld(label, 21, NAVY)])],
        }),
        new TableCell({
          borders: allB(BORDER_GRAY, 3),
          width: { size: VW, type: WidthType.DXA },
          shading: { fill: i % 2 === 0 ? WHITE : OFF_WHITE, type: ShadingType.CLEAR },
          margins: { top: 120, bottom: 120, left: PAD_TABLE, right: PAD_TABLE },
          children: [p([tx(val)])],
        }),
      ],
    })),
  })

  return [navyBlock, sp(340), metaTable]
}

// ══════════════════════════════════════════════════════════════════════════════
// MARKDOWN PARSER
// ══════════════════════════════════════════════════════════════════════════════
function parseMarkdown(markdown: string): (Paragraph | Table)[] {
  const lines  = markdown.split('\n')
  const result: (Paragraph | Table)[] = []

  for (const line of lines) {
    if (line.startsWith('# '))  { result.push(p([bld(line.slice(2), 34, NAVY)], { spacing: { before: 0, after: 100, ...LINE_SPACING } })); continue }
    if (line.startsWith('## ')) { result.push(h2(line.slice(3))); continue }
    if (line.startsWith('### ')) { result.push(h3(line.slice(4))); continue }
    if (line.trim() === '---') {
      result.push(new Paragraph({ children: [], border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: TEAL_MID } }, spacing: { before: 200, after: 200 } }))
      continue
    }
    if (line.startsWith('- ')) {
      result.push(new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: inlineRuns(line.slice(2)), spacing: { before: 40, after: 40, ...LINE_SPACING } }))
      continue
    }
    if (/^\d+\. /.test(line)) {
      result.push(new Paragraph({ numbering: { reference: 'numbers', level: 0 }, children: inlineRuns(line.replace(/^\d+\. /, '')), spacing: { before: 40, after: 40, ...LINE_SPACING } }))
      continue
    }
    const noteM     = line.match(/^\*?\*?Note:\*?\*?\s*(.+)/)
    const practiceM = line.match(/^\*?\*?In practice:\*?\*?\s*(.+)/)
    const analogyM  = line.match(/^\*?\*?Think of it this way:\*?\*?\s*(.+)/)
    if (noteM)     { result.push(sp(80)); result.push(noteCallout(noteM[1]));     result.push(sp(80)); continue }
    if (practiceM) { result.push(sp(80)); result.push(practiceCallout(practiceM[1])); result.push(sp(80)); continue }
    if (analogyM)  { result.push(sp(80)); result.push(analogyCallout(analogyM[1]));  result.push(sp(80)); continue }
    if (line.trim() === '') { result.push(new Paragraph({ children: [tx('')], spacing: { before: 60, after: 0 } })); continue }
    result.push(p(inlineRuns(line), { spacing: { before: 80, after: 80, ...LINE_SPACING } }))
  }

  return result
}

function inlineRuns(text: string): TextRun[] {
  const runs: TextRun[] = []
  const regex = /(\*\*.*?\*\*|\*[^*]+\*|`[^`]+`)/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) runs.push(tx(text.slice(lastIndex, match.index)))
    const raw = match[0]
    if (raw.startsWith('**'))     runs.push(bld(raw.slice(2, -2)))
    else if (raw.startsWith('`')) runs.push(new TextRun({ text: raw.slice(1, -1), font: 'Courier New', size: 20, color: DARK_TEXT }))
    else                          runs.push(new TextRun({ text: raw.slice(1, -1), font: 'Arial', size: 22, color: DARK_TEXT, italics: true }))
    lastIndex = regex.lastIndex
  }
  if (lastIndex < text.length) runs.push(tx(text.slice(lastIndex)))
  return runs.length > 0 ? runs : [tx(text)]
}

// ══════════════════════════════════════════════════════════════════════════════
// CLEAN MARKDOWN PARSER — for lesson and video script (no branded boxes)
// ══════════════════════════════════════════════════════════════════════════════
function stripAudit(text: string): string {
  // Remove Quality audit section and Style compliance note
  return text
    .replace(/## Quality audit[\s\S]*/i, '')
    .replace(/\*\*Style compliance note:\*\*[\s\S]*/i, '')
    .replace(/\*\*Style compliance summary:\*\*[\s\S]*/i, '')
    .replace(/Quality audit[\s\S]*/i, (m) => m.startsWith('Quality audit') ? '' : m)
    .trim()
}

function parseClean(markdown: string): (Paragraph | Table)[] {
  const cleaned = stripAudit(markdown)
  const lines = cleaned.split('\n')
  const result: (Paragraph | Table)[] = []

  for (const line of lines) {
    // H1
    if (line.startsWith('# ')) {
      result.push(new Paragraph({
        children: [new TextRun({ text: line.slice(2).trim(), font: 'Arial', size: 28, bold: true, color: '000000' })],
        spacing: { before: 240, after: 120 },
      }))
      continue
    }
    // H2
    if (line.startsWith('## ')) {
      result.push(new Paragraph({
        children: [new TextRun({ text: line.slice(3).trim(), font: 'Arial', size: 24, bold: true, color: '000000' })],
        spacing: { before: 200, after: 80 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' } },
      }))
      continue
    }
    // H3
    if (line.startsWith('### ')) {
      result.push(new Paragraph({
        children: [new TextRun({ text: line.slice(4).trim(), font: 'Arial', size: 22, bold: true, color: '000000' })],
        spacing: { before: 160, after: 60 },
      }))
      continue
    }
    // Horizontal rule
    if (line.trim() === '---') {
      result.push(new Paragraph({
        children: [],
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' } },
        spacing: { before: 120, after: 120 },
      }))
      continue
    }
    // Bullet
    if (line.startsWith('- ') || line.startsWith('* ')) {
      result.push(new Paragraph({
        numbering: { reference: 'bullets', level: 0 },
        children: inlineRuns(line.slice(2)),
        spacing: { before: 40, after: 40, line: 276, lineRule: 'auto' },
      }))
      continue
    }
    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      result.push(new Paragraph({
        numbering: { reference: 'numbers', level: 0 },
        children: inlineRuns(line.replace(/^\d+\.\s/, '')),
        spacing: { before: 40, after: 40, line: 276, lineRule: 'auto' },
      }))
      continue
    }
    // Note / In practice / Think callouts — render as simple indented paragraph
    const noteM     = line.match(/^\*{0,2}Note:\*{0,2}\s*(.+)/i)
    const practiceM = line.match(/^\*{0,2}In practice:\*{0,2}\s*(.+)/i)
    const analogyM  = line.match(/^\*{0,2}Think of it this way:\*{0,2}\s*(.+)/i)
    if (noteM) {
      result.push(new Paragraph({
        children: [new TextRun({ text: 'Note: ', font: 'Arial', size: 22, bold: true, color: '000000' }), ...inlineRuns(noteM[1])],
        spacing: { before: 100, after: 100, line: 276, lineRule: 'auto' },
        indent: { left: 720 },
        border: { left: { style: BorderStyle.SINGLE, size: 12, color: 'AAAAAA' } },
      }))
      continue
    }
    if (practiceM) {
      result.push(new Paragraph({
        children: [new TextRun({ text: 'In practice: ', font: 'Arial', size: 22, bold: true, color: '000000' }), ...inlineRuns(practiceM[1])],
        spacing: { before: 100, after: 100, line: 276, lineRule: 'auto' },
        indent: { left: 720 },
        border: { left: { style: BorderStyle.SINGLE, size: 12, color: 'AAAAAA' } },
      }))
      continue
    }
    if (analogyM) {
      result.push(new Paragraph({
        children: [new TextRun({ text: 'Think of it this way: ', font: 'Arial', size: 22, bold: true, color: '000000' }), ...inlineRuns(analogyM[1])],
        spacing: { before: 100, after: 100, line: 276, lineRule: 'auto' },
        indent: { left: 720 },
        border: { left: { style: BorderStyle.SINGLE, size: 12, color: 'AAAAAA' } },
      }))
      continue
    }
    // Empty line
    if (line.trim() === '') {
      result.push(new Paragraph({ children: [new TextRun({ text: '', font: 'Arial', size: 22 })], spacing: { before: 40, after: 0 } }))
      continue
    }
    // Regular paragraph
    result.push(new Paragraph({
      children: inlineRuns(line),
      spacing: { before: 80, after: 80, line: 276, lineRule: 'auto' },
    }))
  }
  return result
}

// ══════════════════════════════════════════════════════════════════════════════
// LESSON BUILDER
// ══════════════════════════════════════════════════════════════════════════════
function buildLessonDoc(content: string, fields: Record<string, string>): Document {
  const topic   = fields.topic || 'Lesson'
  const product = fields.product || 'Nerdio Manager'
  const level   = fields.level || 'Intermediate'
  const lessonN = fields.lessonNumber || ''
  const kcVal   = lessonN.includes('1 —') || lessonN.includes('2 —') ? 'No' : 'Yes'
  const date    = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  // Simple meta table at top of document
  const metaTable = new Table({
    width: { size: CW, type: WidthType.DXA },
    columnWidths: [2200, CW - 2200],
    rows: [
      ['Product', product], ['Topic', topic], ['Audience level', level],
      ['Lesson', lessonN], ['KC', kcVal], ['Version', 'v1.0'],
      ['Status', 'Draft'], ['Generated', date],
    ].map(([label, value], i) => new TableRow({
      children: [
        new TableCell({
          borders: allB(BORDER_GRAY, 3),
          width: { size: 2200, type: WidthType.DXA },
          shading: { fill: i % 2 === 0 ? 'F2F2F2' : 'FFFFFF', type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 160, right: 160 },
          children: [new Paragraph({ children: [new TextRun({ text: label, font: 'Arial', size: 20, bold: true, color: '000000' })] })],
        }),
        new TableCell({
          borders: allB(BORDER_GRAY, 3),
          width: { size: CW - 2200, type: WidthType.DXA },
          shading: { fill: i % 2 === 0 ? 'F2F2F2' : 'FFFFFF', type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 160, right: 160 },
          children: [new Paragraph({ children: [new TextRun({ text: value, font: 'Arial', size: 20, color: '000000' })] })],
        }),
      ],
    })),
  })

  return new Document({
    numbering: numbering(),
    styles: styles(),
    sections: [{
      properties: pageProps(),
      children: [
        metaTable,
        new Paragraph({ children: [], spacing: { before: 240, after: 0 } }),
        ...parseClean(content),
      ],
    }],
  })
}

// ══════════════════════════════════════════════════════════════════════════════
// ADDIE TABLES
// ══════════════════════════════════════════════════════════════════════════════
type PhaseKey = 'A' | 'D' | 'V' | 'I' | 'E'
const PHASE_COLORS: Record<PhaseKey, { bg: string; letter: string; panel: string; border: string }> = {
  A: { bg: NAVY,      letter: TEAL,        panel: TEAL_PALE,   border: TEAL_MID },
  D: { bg: NAVY_DARK, letter: PURPLE,      panel: PURPLE_PALE, border: PURPLE_MID },
  V: { bg: NAVY_DARK, letter: PURPLE,      panel: PURPLE_PALE, border: PURPLE_MID },
  I: { bg: NAVY,      letter: GREEN_PHASE, panel: GREEN_PALE,  border: GREEN_MID },
  E: { bg: NAVY,      letter: TEAL,        panel: TEAL_PALE,   border: TEAL_MID },
}

function phaseBanner(letter: string, title: string, subtitle: string, key: PhaseKey): Table {
  const pc = PHASE_COLORS[key]
  const SQ = 1440
  return new Table({
    width: { size: CW, type: WidthType.DXA },
    columnWidths: [SQ, CW - SQ],
    rows: [new TableRow({
      children: [
        new TableCell({
          borders: noB(),
          width: { size: SQ, type: WidthType.DXA },
          shading: { fill: pc.bg, type: ShadingType.CLEAR },
          margins: { top: 100, bottom: 100, left: 100, right: 100 },
          verticalAlign: VerticalAlign.CENTER,
          children: [p([new TextRun({ text: letter, font: 'Arial', size: 112, bold: true, color: pc.letter })], { alignment: AlignmentType.CENTER })],
        }),
        new TableCell({
          borders: { top: bdr(pc.border, 5), bottom: bdr(pc.border, 5), right: bdr(pc.border, 5), left: noB().left },
          width: { size: CW - SQ, type: WidthType.DXA },
          shading: { fill: pc.panel, type: ShadingType.CLEAR },
          margins: { top: 140, bottom: 140, left: 280, right: 200 },
          verticalAlign: VerticalAlign.CENTER,
          children: [
            p([bld(title, 32, NAVY)], { spacing: { before: 0, after: 60 } }),
            p([new TextRun({ text: subtitle, font: 'Arial', size: 19, color: MID_GRAY, italics: true })]),
          ],
        }),
      ],
    })],
  })
}

function inputField(label: string, hint: string, exLines: string[] = [], tall = false, bullets = false, numbers = false): Table {
  const INPUT_H = tall ? 1320 : 480
  const boxChildren = exLines.length > 0
    ? bullets
      ? exLines.map(line => new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [ex(line)], spacing: { before: 20, after: 20, ...LINE_SPACING } }))
      : numbers
        ? exLines.map(line => new Paragraph({ numbering: { reference: 'numbers', level: 0 }, children: [ex(line)], spacing: { before: 20, after: 20, ...LINE_SPACING } }))
        : exLines.map(line => new Paragraph({ children: [ex(line)], spacing: { before: 0, after: 0, ...LINE_SPACING } }))
    : [new Paragraph({ children: [ex('')], spacing: { before: 0, after: 0 } })]

  const labelChildren = hint
    ? [bld(label, 20, DARK_TEXT), new TextRun({ text: '   ', font: 'Arial', size: 18 }), new TextRun({ text: hint, font: 'Arial', size: 18, color: MID_GRAY, italics: true })]
    : label ? [bld(label, 20, DARK_TEXT)] : [tx('')]

  return new Table({
    width: { size: CW, type: WidthType.DXA },
    columnWidths: [CW],
    rows: [
      new TableRow({
        children: [new TableCell({
          borders: noB(),
          width: { size: CW, type: WidthType.DXA },
          shading: { fill: WHITE, type: ShadingType.CLEAR },
          margins: { top: 160, bottom: 40, left: 0, right: 0 },
          children: [p(labelChildren)],
        })],
      }),
      new TableRow({
        height: { value: INPUT_H, rule: 'atLeast' },
        children: [new TableCell({
          borders: allB(TEAL_MID, 5),
          width: { size: CW, type: WidthType.DXA },
          shading: { fill: LIGHT_GRAY, type: ShadingType.CLEAR },
          margins: { top: PAD_V, bottom: PAD_V, left: PAD_H, right: PAD_H },
          children: boxChildren,
        })],
      }),
    ],
  })
}

function inputRow2(cols: { label: string; hint: string; examples: string[] }[]): Table {
  const GAP   = 240
  const count = cols.length
  const each  = Math.floor((CW - GAP * (count - 1)) / count)
  const cellWidths = cols.map((_, i) => i < count - 1 ? each + GAP : CW - each * (count - 1) - GAP * (count - 1))

  const labelRow = new TableRow({
    children: cols.map((col, i) => new TableCell({
      borders: noB(),
      width: { size: cellWidths[i], type: WidthType.DXA },
      shading: { fill: WHITE, type: ShadingType.CLEAR },
      margins: { top: 160, bottom: 40, left: i === 0 ? 0 : GAP / 2, right: i === count - 1 ? 0 : GAP / 2 },
      children: [p(col.hint
        ? [bld(col.label, 20, DARK_TEXT), new TextRun({ text: '   ', font: 'Arial', size: 18 }), new TextRun({ text: col.hint, font: 'Arial', size: 18, color: MID_GRAY, italics: true })]
        : [bld(col.label, 20, DARK_TEXT)])],
    })),
  })

  const inputRow = new TableRow({
    height: { value: 480, rule: 'atLeast' },
    children: cols.map((col, i) => new TableCell({
      borders: allB(TEAL_MID, 5),
      width: { size: cellWidths[i], type: WidthType.DXA },
      shading: { fill: LIGHT_GRAY, type: ShadingType.CLEAR },
      margins: { top: PAD_V, bottom: PAD_V, left: i === 0 ? PAD_H : GAP / 2 + PAD_H / 2, right: i === count - 1 ? PAD_H : GAP / 2 + PAD_H / 2 },
      children: col.examples.length > 0
        ? col.examples.map(line => new Paragraph({ children: [ex(line)], spacing: { before: 0, after: 0, ...LINE_SPACING } }))
        : [new Paragraph({ children: [ex('')] })],
    })),
  })

  return new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: cellWidths, rows: [labelRow, inputRow] })
}

function navyHeaderTable(hdrs: string[], widths: number[]): TableRow {
  return new TableRow({
    tableHeader: true,
    children: hdrs.map((h, i) => new TableCell({
      borders: allB(NAVY, 4),
      width: { size: widths[i], type: WidthType.DXA },
      shading: { fill: NAVY, type: ShadingType.CLEAR },
      margins: { top: 120, bottom: 120, left: 160, right: 160 },
      children: [p([new TextRun({ text: h, font: 'Arial', size: 18, bold: true, color: WHITE, allCaps: true })])],
    })),
  })
}

function outlineTable(rows: string[][]): Table {
  const W    = [520, 2600, 4040, 1160, 1040]
  const HDRS = ['#', 'Lesson title', 'What it covers', 'Media', 'KC']
  const hdr  = navyHeaderTable(HDRS, W)
  const dataRows = rows.map((row, n) => new TableRow({
    height: { value: 560, rule: 'atLeast' },
    children: W.map((w, i) => new TableCell({
      borders: allB(BORDER_GRAY, 3),
      width: { size: w, type: WidthType.DXA },
      shading: { fill: n % 2 === 0 ? WHITE : OFF_WHITE, type: ShadingType.CLEAR },
      margins: { top: 120, bottom: 120, left: 160, right: 160 },
      children: [p([ex(row[i] || '')])],
    })),
  }))
  return new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: W, rows: [hdr, ...dataRows] })
}

function assetTable(rows: string[][]): Table {
  const W    = [2320, 1480, 4200, 1360]
  const HDRS = ['Asset / lesson', 'Type', 'Notes', 'Owner']
  const hdr  = navyHeaderTable(HDRS, W)
  const dataRows = rows.map((row, n) => new TableRow({
    height: { value: 520, rule: 'atLeast' },
    children: W.map((w, i) => new TableCell({
      borders: allB(BORDER_GRAY, 3),
      width: { size: w, type: WidthType.DXA },
      shading: { fill: n % 2 === 0 ? WHITE : OFF_WHITE, type: ShadingType.CLEAR },
      margins: { top: 120, bottom: 120, left: 160, right: 160 },
      children: [p([ex(row[i] || '')])],
    })),
  }))
  return new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: W, rows: [hdr, ...dataRows] })
}

function kvTable(rows: [string, string][]): Table {
  const LW = 2800
  const VW = CW - LW
  return new Table({
    width: { size: CW, type: WidthType.DXA },
    columnWidths: [LW, VW],
    rows: rows.map(([label, val], i) => new TableRow({
      height: { value: 440, rule: 'atLeast' },
      children: [
        new TableCell({
          borders: allB(BORDER_GRAY, 3),
          width: { size: LW, type: WidthType.DXA },
          shading: { fill: i % 2 === 0 ? TEAL_PALE : 'E8F5FA', type: ShadingType.CLEAR },
          margins: { top: 140, bottom: 140, left: PAD_TABLE, right: PAD_TABLE },
          verticalAlign: VerticalAlign.CENTER,
          children: [p([bld(label, 21, NAVY)])],
        }),
        new TableCell({
          borders: allB(BORDER_GRAY, 3),
          width: { size: VW, type: WidthType.DXA },
          shading: { fill: i % 2 === 0 ? WHITE : OFF_WHITE, type: ShadingType.CLEAR },
          margins: { top: 140, bottom: 140, left: PAD_TABLE, right: PAD_TABLE },
          children: [p([ex(val)])],
        }),
      ],
    })),
  })
}

function changelogTable(): Table {
  const W    = [1200, 1400, 6760]
  const HDRS = ['Version', 'Date', 'Changes']
  const rows = [
    ['v1.0', new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), 'Initial version.'],
    ['', '', ''],
  ]
  const hdr = navyHeaderTable(HDRS, W)
  const dataRows = rows.map((row, n) => new TableRow({
    height: { value: 440, rule: 'atLeast' },
    children: W.map((w, i) => new TableCell({
      borders: allB(BORDER_GRAY, 3),
      width: { size: w, type: WidthType.DXA },
      shading: { fill: n % 2 === 0 ? WHITE : OFF_WHITE, type: ShadingType.CLEAR },
      margins: { top: 120, bottom: 120, left: 160, right: 160 },
      children: [p(row[i] ? [ex(row[i])] : [tx('')])],
    })),
  }))
  return new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: W, rows: [hdr, ...dataRows] })
}

function extractOutlineRows(content: string): string[][] {
  const rows: string[][] = []
  const lines = content.split('\n')
  let inOutline = false
  for (const line of lines) {
    if (/course outline|lesson outline/i.test(line)) { inOutline = true; continue }
    if (inOutline && line.startsWith('## ')) { inOutline = false; continue }
    if (inOutline && /^\d+\.?\s/.test(line)) {
      const clean = line.replace(/^\d+\.?\s*/, '').trim()
      const num   = String(rows.length + 1)
      rows.push([num, clean, '', rows.length < 2 ? 'Text' : 'Text + Video', rows.length < 2 ? 'No' : 'Yes'])
    }
  }
  if (rows.length === 0) {
    for (let i = 1; i <= 6; i++) rows.push([String(i), '', '', i <= 2 ? 'Text' : 'Text + Video', i <= 2 ? 'No' : 'Yes'])
  }
  return rows
}


// ══════════════════════════════════════════════════════════════════════════════
// ADDIE CONTENT PARSER
// Extracts content from Claude's generated ADDIE text into structured sections
// ══════════════════════════════════════════════════════════════════════════════
function parseAddieContent(content: string): Record<string, string[]> {
  const lines = content.split('\n')
  const sections: Record<string, string[]> = {}
  let currentSection = ''
  const buffer: string[] = []

  const flush = () => {
    if (currentSection && buffer.length > 0) {
      sections[currentSection] = buffer
        .filter(l => l.trim().length > 0)
        .map(l => l.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '').trim())
    }
  }

  const sectionMap: Record<string, string> = {
    'parent goal': 'parentGoal',
    'parent goal:': 'parentGoal',
    'audience': 'audience',
    'audience —': 'audience',
    'assumed knowledge': 'assumedKnowledge',
    'in scope': 'inScope',
    'out of scope': 'outOfScope',
    'learning objectives': 'objectives',
    'core concepts': 'coreConcepts',
    'core flow': 'coreFlow',
    'flow of the training': 'coreFlow',
    'which lessons need a video': 'videosNeeded',
    'who records': 'videoRecorder',
    'knowledge check strategy': 'kcStrategy',
    'target completion': 'completionRate',
    'target assessment': 'assessmentScore',
    'additional success': 'additionalMetrics',
    'launch plan': 'launchPlan',
    'first check-in': 'firstCheckin',
    'next content review': 'nextReview',
    'planned next': 'nextReview',
    'what is working well': 'workingWell',
    'what is not working': 'notWorking',
    'what changes': 'changes',
    'to-do': 'todo',
  }

  for (const line of lines) {
    const lower = line.toLowerCase().replace(/[*#_]/g, '').trim()
    
    // Skip quality audit section
    if (/quality audit/i.test(line)) break
    
    let matched = false
    for (const [key, val] of Object.entries(sectionMap)) {
      if (lower.startsWith(key)) {
        flush()
        buffer.length = 0
        currentSection = val
        // If content is on the same line after colon
        const colonIdx = line.indexOf(':')
        if (colonIdx > -1 && line.slice(colonIdx + 1).trim().length > 0) {
          buffer.push(line.slice(colonIdx + 1).trim())
        }
        matched = true
        break
      }
    }
    
    if (!matched && currentSection) {
      // Skip phase banners and major headings
      if (/^#{1,2}\s/.test(line)) {
        // Check if this is a major section change
        const lower2 = line.replace(/^#+\s*/, '').toLowerCase()
        if (['analyze', 'design', 'develop', 'implement', 'examine', 'a —', 'd —', 'i —', 'e —'].some(s => lower2.startsWith(s))) {
          // Don't flush, just continue — section headers don't end previous content
        }
      } else if (line.trim().length > 0) {
        buffer.push(line)
      }
    }
  }
  flush()
  return sections
}

function getSection(parsed: Record<string, string[]>, key: string): string[] {
  return parsed[key] || []
}

function getSectionText(parsed: Record<string, string[]>, key: string): string {
  return getSection(parsed, key).join(' ').trim()
}

// ══════════════════════════════════════════════════════════════════════════════
// ADDIE BUILDER
// ══════════════════════════════════════════════════════════════════════════════
function buildAddieDoc(content: string, fields: Record<string, string>): Document {
  const courseTitle = fields.coursetitle || 'Course title'
  const product     = fields.product    || 'Nerdio Manager for Enterprise'
  const audience    = fields.audience   || 'IT admins / engineers'
  const author      = fields.author     || ''

  // Try to parse JSON output from Claude
  let json: Record<string, unknown> = {}
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) json = JSON.parse(jsonMatch[0])
  } catch { /* fall back to empty */ }

  const g = (key: string): string => {
    const val = json[key]
    if (typeof val === 'string') return val
    if (Array.isArray(val)) return val.join('\n')
    return ''
  }
  const ga = (key: string): string[] => {
    const val = json[key]
    if (Array.isArray(val)) return val.map(String)
    if (typeof val === 'string' && val.length > 0) return [val]
    return []
  }

  // Parse Claude's generated content into structured sections (fallback)
  const parsed = parseAddieContent(content)
  const gf = (jsonKey: string, parseKey: string): string[] => {
    const fromJson = ga(jsonKey)
    if (fromJson.length > 0) return fromJson
    return parsed[parseKey] || []
  }

  const meta: [string, string][] = [
    ['Course title',          courseTitle],
    ['Product',               product],
    ['Audience',              audience],
    ['Version',               'v1.0'],
    ['Status',                'Draft'],
    ['Author',                author],
    ['Subject matter expert', ''],
    ['Reviewer(s)',           ''],
    ['Date created',          new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })],
    ['Last updated',          new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })],
  ]

  // Use JSON outline rows if available, fall back to text parsing
  const jsonOutlineRows = Array.isArray(json['outlineRows'])
    ? (json['outlineRows'] as Array<{num: string, title: string, covers: string, media: string, kc: string}>)
        .map(r => [r.num || '', r.title || '', r.covers || '', r.media || 'Text', r.kc || 'Yes'])
    : null
  const outRows = jsonOutlineRows || extractOutlineRows(content)
  const title   = `ADDIE — ${courseTitle}`

  // Helper: wrap long text into lines for input fields
  const toLines = (text: string): string[] => {
    if (!text || text.trim().length === 0) return []
    return text.split(/\n/).map(l => l.trim()).filter(l => l.length > 0)
  }

  const structured: (Paragraph | Table)[] = [
    // A — ANALYZE
    phaseBanner('A', 'Analyze', 'Context, audience, and scope.', 'A'),
    inputField('Parent goal', 'Why does this training exist? What business problem does it solve?',
      gf('parentGoal', 'parentGoal').length > 0 ? gf('parentGoal', 'parentGoal') : (g('parentGoal') ? [g('parentGoal')] : []), true),
    inputRow2([
      { label: 'Audience — roles', hint: 'Who is this for?',
        examples: gf('audienceRoles', 'audience').length > 0 ? gf('audienceRoles', 'audience') : [audience] },
      { label: 'Assumed knowledge', hint: 'What do they already know?',
        examples: gf('assumedKnowledge', 'assumedKnowledge') },
    ]),
    p([bld('Scope', 20, DARK_TEXT), new TextRun({ text: '   Optional', font: 'Arial', size: 18, color: MID_GRAY, italics: true })], { spacing: { before: 160, after: 40 } }),
    inputRow2([
      { label: 'In scope',     hint: '', examples: gf('inScope', 'inScope') },
      { label: 'Out of scope', hint: '', examples: gf('outOfScope', 'outOfScope') },
    ]),
    sectionDiv('Learning objectives'),
    p([bld('By the end of this course, learners will be able to:', 20, DARK_TEXT)], { spacing: { before: 100, after: 40 } }),
    inputField('', '', gf('objectives', 'objectives'), true, true),
    inputField('Core concepts covered', 'Technologies, features, and terms this training introduces',
      gf('coreConcepts', 'coreConcepts'), false, true),
    sectionDiv('Course outline'),
    p([new TextRun({ text: 'Generated from course content — review and update as needed.', font: 'Arial', size: 18, color: MID_GRAY, italics: true })], { spacing: { before: 60, after: 100 } }),
    outlineTable(outRows),
    sp(200),

    // D — DESIGN
    phaseBanner('D', 'Design', 'Sequence, media strategy, and assessment.', 'D'),
    inputField('Core flow of the training', 'Why is the content in this order?',
      gf('coreFlow', 'coreFlow').length > 0 ? gf('coreFlow', 'coreFlow') : (g('coreFlow') ? [g('coreFlow')] : []), true, false, true),
    inputRow2([
      { label: 'Which lessons need a video?', hint: 'Names or notes',
        examples: gf('videosNeeded', 'videosNeeded') },
      { label: 'Who records the videos?', hint: 'Name(s) or TBD',
        examples: gf('videoRecorder', 'videoRecorder') },
    ]),
    inputRow2([
      { label: 'Final assessment — questions', hint: 'Default: 20', examples: ['20'] },
      { label: 'Pass threshold',                    hint: 'Default: 80%', examples: ['80%'] },
      { label: 'Retake attempts',                   hint: 'Default: 2',   examples: ['2'] },
    ]),
    inputField('Knowledge check strategy', 'Types per lesson, or leave blank',
      gf('kcStrategy', 'kcStrategy')),
    sectionDiv('Success measurement'),
    inputRow2([
      { label: 'Target completion rate',  hint: '', examples: gf('completionRate', 'completionRate') },
      { label: 'Target assessment score', hint: '', examples: gf('assessmentScore', 'assessmentScore') },
    ]),
    inputField('Additional success metrics', 'Leave blank if none',
      gf('additionalMetrics', 'additionalMetrics')),
    pb(),

    // D — DEVELOP
    phaseBanner('D', 'Develop', 'Assets to build and who owns each.', 'V'),
    p([new TextRun({ text: 'One row per lesson plus the final assessment.', font: 'Arial', size: 18, color: MID_GRAY, italics: true })], { spacing: { before: 120, after: 100 } }),
    assetTable([
      ...outRows.map(r => [`Lesson ${r[0]} — ${r[1] || ''}`, r[3] || 'Text module', '', author]),
      ['Final assessment — 20-question pool', 'Quiz', 'SME review before publication.', author],
    ]),
    inputRow2([
      { label: 'Reviewer(s)',         hint: 'Technical accuracy and style',  examples: [] },
      { label: 'Planning board link', hint: 'Asana / DevOps / spreadsheet', examples: [] },
    ]),
    pb(),

    // I — IMPLEMENT
    phaseBanner('I', 'Implement', 'Launch plan and Docebo configuration.', 'I'),
    inputField('Launch plan', 'Where will this be published, and how will learners be informed?',
      gf('launchPlan', 'launchPlan').length > 0 ? gf('launchPlan', 'launchPlan') : (g('launchPlan') ? [g('launchPlan')] : []), true),
    sectionDiv('Docebo configuration'),
    sp(60),
    kvTable([
      ['Course visibility',   'Public — available to all registered Nerdio University learners'],
      ['Enrollment method',   'Self-enrollment'],
      ['Certification',       `Yes — '${courseTitle}' certificate, valid for 24 months`],
      ['Completion criteria', `All ${outRows.length} lessons viewed + final assessment passed at 80% or above`],
    ]),
    inputRow2([
      { label: 'First check-in after launch',  hint: '', examples: gf('firstCheckin', 'firstCheckin') },
      { label: 'Planned next content review',  hint: '', examples: gf('nextReview', 'nextReview') },
    ]),
    pb(),

    // E — EXAMINE
    phaseBanner('E', 'Examine', 'Complete after launch. Update with each version.', 'E'),
    inputField('What is working well?',         '', [], true),
    inputField('What is not working?',          '', [], true),
    inputField('What changes need to be made?', '', []),
    sectionDiv('To-do in next version'),
    inputField('', '', []),
    sectionDiv('Changelog'),
    sp(60),
    changelogTable(),
    sp(360),
    p([new TextRun({
      text: `Nerdio L&D  •  ${courseTitle}  •  v1.0  •  Based on Nerdio L&D Style Guide v2.0 (February 2026)`,
      font: 'Arial', size: 18, color: MID_GRAY, italics: true,
    })], {
      alignment: AlignmentType.CENTER,
      border: { top: { style: BorderStyle.SINGLE, size: 6, color: TEAL } },
      spacing: { before: 180, after: 0 },
    }),
  ]

  return new Document({
    numbering: numbering(),
    styles: styles(),
    sections: [
      { properties: pageProps(), children: [...coverPage('ADDIE', 'Instructional Design Document', meta)] },
      {
        properties: pageProps(),
        headers: { default: makeHeader(title) },
        footers: { default: makeFooter(title) },
        children: structured,
      },
    ],
  })
}

// ══════════════════════════════════════════════════════════════════════════════
// VIDEO SCRIPT BUILDER
// ══════════════════════════════════════════════════════════════════════════════
function topicBlock(topicTitle: string, keyPoints: string[], notes?: string): (Paragraph | Table)[] {
  const result: (Paragraph | Table)[] = []

  result.push(new Table({
    width: { size: CW, type: WidthType.DXA },
    columnWidths: [CW],
    rows: [new TableRow({
      children: [new TableCell({
        borders: allB(NAVY, 4),
        width: { size: CW, type: WidthType.DXA },
        shading: { fill: NAVY, type: ShadingType.CLEAR },
        margins: { top: 120, bottom: 120, left: 200, right: 200 },
        children: [
          p([new TextRun({ text: 'TOPIC', font: 'Arial', size: 18, bold: true, color: TEAL, allCaps: true })], { spacing: { before: 0, after: 40 } }),
          p([bld(topicTitle, 24, WHITE)]),
        ],
      })],
    })],
  }))

  if (keyPoints.length > 0) {
    result.push(new Table({
      width: { size: CW, type: WidthType.DXA },
      columnWidths: [CW],
      rows: [new TableRow({
        children: [new TableCell({
          borders: { top: noB().top, bottom: noB().bottom, right: bdr(TEAL_MID, 3), left: bdr(TEAL, 12) },
          width: { size: CW, type: WidthType.DXA },
          shading: { fill: OFF_WHITE, type: ShadingType.CLEAR },
          margins: { top: PAD_V, bottom: PAD_V, left: 240, right: PAD_H },
          children: keyPoints.map(pt => new Paragraph({
            numbering: { reference: 'bullets', level: 0 },
            children: [tx(pt)],
            spacing: { before: 40, after: 40, ...LINE_SPACING },
          })),
        })],
      })],
    }))
  }

  if (notes) {
    result.push(new Table({
      width: { size: CW, type: WidthType.DXA },
      columnWidths: [CW],
      rows: [new TableRow({
        children: [new TableCell({
          borders: allB(AMBER_MID, 3),
          width: { size: CW, type: WidthType.DXA },
          shading: { fill: AMBER_PALE, type: ShadingType.CLEAR },
          margins: { top: 140, bottom: 140, left: 200, right: PAD_H },
          children: [p([bld('Presenter note: ', 20, AMBER), new TextRun({ text: notes, font: 'Arial', size: 20, color: DARK_TEXT, italics: true })])],
        })],
      })],
    }))
  }

  result.push(sp(160))
  return result
}

function productionNotesTable(rows: [string, string][]): Table {
  const LW = 2400
  const VW = CW - LW
  return new Table({
    width: { size: CW, type: WidthType.DXA },
    columnWidths: [LW, VW],
    rows: rows.map(([label, val], i) => new TableRow({
      height: { value: 440, rule: 'atLeast' },
      children: [
        new TableCell({
          borders: allB(BORDER_GRAY, 3),
          width: { size: LW, type: WidthType.DXA },
          shading: { fill: i % 2 === 0 ? TEAL_PALE : 'E8F5FA', type: ShadingType.CLEAR },
          margins: { top: 140, bottom: 140, left: PAD_TABLE, right: PAD_TABLE },
          verticalAlign: VerticalAlign.CENTER,
          children: [p([bld(label, 21, NAVY)])],
        }),
        new TableCell({
          borders: allB(BORDER_GRAY, 3),
          width: { size: VW, type: WidthType.DXA },
          shading: { fill: i % 2 === 0 ? WHITE : OFF_WHITE, type: ShadingType.CLEAR },
          margins: { top: 140, bottom: 140, left: PAD_TABLE, right: PAD_TABLE },
          children: [p([tx(val)])],
        }),
      ],
    })),
  })
}

function extractTopics(content: string): { title: string; points: string[]; notes?: string }[] {
  const topics: { title: string; points: string[]; notes?: string }[] = []
  const lines = content.split('\n')
  let current: { title: string; points: string[]; notes?: string } | null = null

  for (const line of lines) {
    if (/^##\s*(Topic|Part 2)/i.test(line) || /^###\s*Topic/i.test(line) || /^##\s*\d+\./.test(line)) {
      if (current) topics.push(current)
      current = { title: line.replace(/^#+\s*(Topic\s*\d*:?\s*|\d+\.\s*|Part 2[^:]*:\s*)/i, '').trim(), points: [] }
      continue
    }
    if (current && line.startsWith('- ')) { current.points.push(line.slice(2)); continue }
    if (current && /presenter note|production note/i.test(line)) {
      current.notes = line.replace(/.*note[s]?:?\s*/i, '').trim()
      continue
    }
  }
  if (current) topics.push(current)
  return topics
}

function buildVideoScriptDoc(content: string, fields: Record<string, string>): Document {
  const topic    = fields.topic    || 'Video topic'
  const product  = fields.product  || 'Nerdio Manager'
  const format   = fields.format   || 'Voice-over intro + screen recording'
  const level    = fields.level    || 'Intermediate'
  const duration = fields.duration || '5–8 minutes'
  const date     = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  // Simple meta table
  const metaTable = new Table({
    width: { size: CW, type: WidthType.DXA },
    columnWidths: [2200, CW - 2200],
    rows: [
      ['Product', product], ['Topic', topic], ['Format', format],
      ['Audience', level], ['Duration', duration], ['Version', 'v1.0'],
      ['Status', 'Draft'], ['Generated', date],
    ].map(([label, value], i) => new TableRow({
      children: [
        new TableCell({
          borders: allB(BORDER_GRAY, 3),
          width: { size: 2200, type: WidthType.DXA },
          shading: { fill: i % 2 === 0 ? 'F2F2F2' : 'FFFFFF', type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 160, right: 160 },
          children: [new Paragraph({ children: [new TextRun({ text: label, font: 'Arial', size: 20, bold: true, color: '000000' })] })],
        }),
        new TableCell({
          borders: allB(BORDER_GRAY, 3),
          width: { size: CW - 2200, type: WidthType.DXA },
          shading: { fill: i % 2 === 0 ? 'F2F2F2' : 'FFFFFF', type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 160, right: 160 },
          children: [new Paragraph({ children: [new TextRun({ text: value, font: 'Arial', size: 20, color: '000000' })] })],
        }),
      ],
    })),
  })

  return new Document({
    numbering: numbering(),
    styles: styles(),
    sections: [{
      properties: pageProps(),
      children: [
        metaTable,
        new Paragraph({ children: [], spacing: { before: 240, after: 0 } }),
        ...parseClean(content),
      ],
    }],
  })
}

// ══════════════════════════════════════════════════════════════════════════════
// SHARED CONFIG
// ══════════════════════════════════════════════════════════════════════════════
function numbering() {
  return {
    config: [
      { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: 'numbers', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  }
}

function styles() {
  return { default: { document: { run: { font: 'Arial', size: 22, color: DARK_TEXT } } } }
}

function pageProps() {
  return {
    page: {
      size:   { width: 12240, height: 15840 },
      margin: { top: 1080, right: 1440, bottom: 1080, left: 1440 },
    },
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// API HANDLER
// ══════════════════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  try {
    const { content, workflowId, fields, filename } = await req.json()

    if (!content) {
      return NextResponse.json({ error: 'No content provided' }, { status: 400 })
    }

    let doc: Document
    switch (workflowId) {
      case 'addie':
        doc = buildAddieDoc(content, fields || {})
        break
      case 'videoscript':
        doc = buildVideoScriptDoc(content, fields || {})
        break
      default:
        doc = buildLessonDoc(content, fields || {})
    }

    const buffer   = await Packer.toBuffer(doc)
    const safeName = (filename || 'nerdio-content').replace(/[^a-zA-Z0-9_\-]/g, '_')

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${safeName}.docx"`,
      },
    })
  } catch (err) {
    console.error('Download error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
