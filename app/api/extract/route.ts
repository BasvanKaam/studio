import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import { writeFileSync, unlinkSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const filename = file.name.toLowerCase()
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    let text = ''

    if (filename.endsWith('.docx')) {
      text = await extractDocx(buffer)
    } else if (filename.endsWith('.pdf')) {
      text = await extractPdf(buffer)
    } else {
      return NextResponse.json({ error: 'Upload a .docx or .pdf file.' }, { status: 400 })
    }

    if (text.length > 14000) {
      text = text.slice(0, 14000) + '\n\n[Document truncated at 14,000 characters]'
    }

    return NextResponse.json({ text, filename: file.name })
  } catch (err) {
    console.error('Extract error:', err)
    return NextResponse.json({ error: 'Failed to read file. Make sure it is a valid .docx or .pdf.' }, { status: 500 })
  }
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const tmpFile = join(tmpdir(), `ncs_${Date.now()}.docx`)
  const tmpDir  = join(tmpdir(), `ncs_${Date.now()}`)
  try {
    writeFileSync(tmpFile, buffer)
    execSync(`mkdir -p "${tmpDir}" && unzip -q "${tmpFile}" -d "${tmpDir}"`, { timeout: 15000 })
    const xmlPath = join(tmpDir, 'word', 'document.xml')
    if (!existsSync(xmlPath)) return 'Could not read document content.'
    const xml = readFileSync(xmlPath, 'utf-8')
    return xml
      .replace(/<w:p[ >]/g, '\n<w:p>')
      .replace(/<w:br[^>]*>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x[0-9A-Fa-f]+;/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  } finally {
    try { execSync(`rm -f "${tmpFile}" && rm -rf "${tmpDir}"`) } catch { /* ignore */ }
  }
}

async function extractPdf(buffer: Buffer): Promise<string> {
  const base64 = buffer.toString('base64')
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'pdfs-2024-09-25',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
          { type: 'text', text: 'Extract all text from this document. Return plain text only, preserving paragraph structure. No commentary.' },
        ],
      }],
    }),
  })
  const data = await response.json()
  return data.content?.[0]?.text || ''
}
