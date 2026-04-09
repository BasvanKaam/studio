import { NextRequest, NextResponse } from 'next/server'
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat,
  BorderStyle, WidthType, ShadingType, VerticalAlign,
} from 'docx'

const NAVY        = '042838'
const TEAL        = '1E9DB8'
const WHITE       = 'FFFFFF'
const OFF_WHITE   = 'F7FAFB'
const MID_GRAY    = '8C96A0'
const DARK_TEXT   = '162229'
const BORDER_GRAY = 'C5D2D8'
const TEAL_PALE   = 'E0F3F8'
const TEAL_MID    = 'B8DDE8'
const AMBER       = 'B7590A'
const AMBER_PALE  = 'FDF6ED'

const CW = 9360
const LINE_SPACING = { line: 276, lineRule: 'auto' as const }

const bdr = (color: string, sz = 4) => ({ style: BorderStyle.SINGLE, size: sz, color })
const noB = () => ({
  top:    { style: BorderStyle.NONE, size: 0, color: WHITE },
  bottom: { style: BorderStyle.NONE, size: 0, color: WHITE },
  left:   { style: BorderStyle.NONE, size: 0, color: WHITE },
  right:  { style: BorderStyle.NONE, size: 0, color: WHITE },
})
const allB = (color = BORDER_GRAY, sz = 3) =>
  ({ top: bdr(color, sz), bottom: bdr(color, sz), left: bdr(color, sz), right: bdr(color, sz) })

const tx = (text: string, opts: Record<string, unknown> = {}) =>
  new TextRun({ text, font: 'Arial', size: 22, color: DARK_TEXT, ...opts })
const bld = (text: string, sz = 22, color = DARK_TEXT) =>
  new TextRun({ text, font: 'Arial', size: sz, bold: true, color })

const p = (children: TextRun[], opts: Record<string, unknown> = {}) =>
  new Paragraph({
    children,
    spacing: { ...LINE_SPACING, ...((opts.spacing as Record<string, unknown>) || {}) },
    ...opts,
  })

const sp = (before = 120) =>
  new Paragraph({ children: [tx('')], spacing: { before, after: 0 } })

function callout(label: string, body: string, labelColor = AMBER, bgColor = AMBER_PALE, borderColor = AMBER): Table {
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
          margins: { top: 140, bottom: 140, left: 200, right: 80 },
          verticalAlign: VerticalAlign.TOP,
          children: [p([bld(label, 20, labelColor)])],
        }),
        new TableCell({
          borders: { top: bdr(borderColor, 6), bottom: bdr(borderColor, 6), right: bdr(borderColor, 6), left: noB().left },
          width: { size: VW, type: WidthType.DXA },
          shading: { fill: bgColor, type: ShadingType.CLEAR },
          margins: { top: 140, bottom: 140, left: 120, right: 200 },
          children: [p([tx(body)])],
        }),
      ],
    })],
  })
}

function parseMarkdown(markdown: string): (Paragraph | Table)[] {
  const lines = markdown.split('\n')
  const result: (Paragraph | Table)[] = []
  let inKC = false

  for (const line of lines) {
    if (line.startsWith('# ')) {
      result.push(p([bld(line.slice(2), 34, NAVY)], { spacing: { before: 0, after: 100, ...LINE_SPACING } }))
      continue
    }
    if (line.startsWith('## ')) {
      const text = line.slice(3)
      inKC = text.toLowerCase().includes('knowledge check')
      result.push(p([bld(text, 26, NAVY)], {
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: TEAL_MID } },
        spacing: { before: 320, after: 100, ...LINE_SPACING },
      }))
      continue
    }
    if (line.startsWith('### ')) {
      result.push(p([bld(line.slice(4), 23, NAVY)], { spacing: { before: 200, after: 80, ...LINE_SPACING } }))
      continue
    }
    if (line.trim() === '---') {
      result.push(new Paragraph({
        children: [],
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: TEAL_MID } },
        spacing: { before: 200, after: 200 },
      }))
      continue
    }
    if (line.startsWith('- ')) {
      result.push(new Paragraph({
        numbering: { reference: 'bullets', level: 0 },
        children: inlineRuns(line.slice(2)),
        spacing: { before: 40, after: 40, ...LINE_SPACING },
      }))
      continue
    }
    if (/^\d+\. /.test(line)) {
      result.push(new Paragraph({
        numbering: { reference: 'numbers', level: 0 },
        children: inlineRuns(line.replace(/^\d+\. /, '')),
        spacing: { before: 40, after: 40, ...LINE_SPACING },
      }))
      continue
    }
    if (line.startsWith('**Note:**') || line.startsWith('Note:')) {
      const body = line.replace(/^\*?\*?Note:\*?\*?\s*/, '')
      if (body) {
        result.push(sp(80))
        result.push(callout('Note:', body, AMBER, AMBER_PALE, AMBER))
        result.push(sp(80))
      }
      continue
    }
    if (line.trim() === '') {
      result.push(new Paragraph({ children: [tx('')], spacing: { before: 60, after: 0 } }))
      continue
    }
    result.push(p(inlineRuns(line), { spacing: { before: 80, after: 80, ...LINE_SPACING } }))
    void inKC
  }

  return result
}

function inlineRuns(text: string): TextRun[] {
  const runs: TextRun[] = []
  const regex = /(\*\*.*?\*\*|\*[^*]+\*)/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) runs.push(tx(text.slice(lastIndex, match.index)))
    const raw = match[0]
    if (raw.startsWith('**')) {
      runs.push(bld(raw.slice(2, -2)))
    } else {
      runs.push(new TextRun({ text: raw.slice(1, -1), font: 'Arial', size: 22, color: DARK_TEXT, italics: true }))
    }
    lastIndex = regex.lastIndex
  }
  if (lastIndex < text.length) runs.push(tx(text.slice(lastIndex)))
  return runs.length > 0 ? runs : [tx(text)]
}

function coverBlock(workflowTitle: string, subtitle: string, metadata: [string, string][]): Table[] {
  const LW = 2640
  const VW = CW - LW
  const headerTable = new Table({
    width: { size: CW, type: WidthType.DXA },
    columnWidths: [CW],
    rows: [
      new TableRow({
        children: [new TableCell({
          borders: noB(),
          width: { size: CW, type: WidthType.DXA },
          shading: { fill: NAVY, type: ShadingType.CLEAR },
          margins: { top: 440, bottom: 360, left: 600, right: 600 },
          children: [
            p([bld('Nerdio', 52, WHITE)], { alignment: AlignmentType.CENTER, spacing: { before: 0, after: 40 } }),
            p([new TextRun({ text: 'Learning & Development', font: 'Arial', size: 24, color: TEAL })], { alignment: AlignmentType.CENTER, spacing: { before: 0, after: 200 } }),
            p([bld(workflowTitle, 36, WHITE)], { alignment: AlignmentType.CENTER, spacing: { before: 0, after: 80 } }),
            p([new TextRun({ text: subtitle, font: 'Arial', size: 22, color: TEAL })], { alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0 } }),
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
          margins: { top: 120, bottom: 120, left: 160, right: 160 },
          verticalAlign: VerticalAlign.CENTER,
          children: [p([bld(label, 21, NAVY)])],
        }),
        new TableCell({
          borders: allB(BORDER_GRAY, 3),
          width: { size: VW, type: WidthType.DXA },
          shading: { fill: i % 2 === 0 ? WHITE : OFF_WHITE, type: ShadingType.CLEAR },
          margins: { top: 120, bottom: 120, left: 160, right: 160 },
          children: [p([tx(val)])],
        }),
      ],
    })),
  })
  return [headerTable, metaTable]
}

function buildDocument(content: string, workflowTitle: string, subtitle: string, metadata: [string, string][]): Document {
  const cover = coverBlock(workflowTitle, subtitle, metadata)
  const bodyChildren: (Paragraph | Table)[] = parseMarkdown(content)

  return new Document({
    numbering: {
      config: [
        { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
        { reference: 'numbers', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      ],
    },
    styles: { default: { document: { run: { font: 'Arial', size: 22, color: DARK_TEXT } } } },
    sections: [
      {
        properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, right: 1440, bottom: 1080, left: 1440 } } },
        children: [...cover, sp(320)],
      },
      {
        properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, right: 1440, bottom: 1080, left: 1440 } } },
        headers: {
          default: new Header({
            children: [p([
              bld('Nerdio', 18, TEAL),
              new TextRun({ text: `   Learning & Development   \u2014   ${workflowTitle}`, font: 'Arial', size: 18, color: MID_GRAY }),
            ], { border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: TEAL } }, spacing: { after: 0 } })],
          }),
        },
        footers: {
          default: new Footer({
            children: [p([
              new TextRun({ text: `Nerdio L&D  \u2022  ${workflowTitle}  \u2022  v1.0`, font: 'Arial', size: 18, color: MID_GRAY }),
            ], { border: { top: { style: BorderStyle.SINGLE, size: 6, color: TEAL } }, spacing: { before: 60 } })],
          }),
        },
        children: bodyChildren,
      },
    ],
  })
}

export async function POST(req: NextRequest) {
  try {
    const { content, workflowId, fields, filename } = await req.json()
    if (!content) return NextResponse.json({ error: 'No content provided' }, { status: 400 })

    const workflowTitles: Record<string, string> = {
      lesson: 'Lesson',
      addie: 'ADDIE Instructional Design Document',
      videoscript: 'Video Script',
    }

    const workflowTitle = workflowTitles[workflowId] || 'Nerdio Content'
    const subtitle = fields?.topic || fields?.coursetitle || ''

    const metadata: [string, string][] = [
      ['Product', fields?.product || ''],
      ['Topic / title', subtitle],
      ['Author', fields?.author || 'Nerdio L&D'],
      ['Version', 'v1.0'],
      ['Status', 'Draft'],
      ['Generated', new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })],
    ]
    if (fields?.level) metadata.splice(2, 0, ['Audience level', fields.level])

    const doc = buildDocument(content, workflowTitle, subtitle, metadata)
    const buffer = await Packer.toBuffer(doc)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename || 'nerdio-content'}.docx"`,
      },
    })
  } catch (err) {
    console.error('Download error:', err)
    return NextResponse.json({ error: 'Download failed' }, { status: 500 })
  }
}
