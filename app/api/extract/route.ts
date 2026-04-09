import { NextRequest, NextResponse } from 'next/server'

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

// Extract docx using JSZip-compatible approach — no unzip binary needed
async function extractDocx(buffer: Buffer): Promise<string> {
  try {
    // docx files are zip archives — find PK signature and parse manually
    // Use a simple approach: send to Anthropic as base64 for text extraction
    const base64 = buffer.toString('base64')
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                data: base64,
              },
            },
            {
              type: 'text',
              text: 'Extract all text content from this Word document. Return plain text only, preserving paragraph structure with line breaks. No commentary, no formatting, no markdown.',
            },
          ],
        }],
      }),
    })
    const data = await response.json()
    if (data.error) {
      // Fallback: try parsing the zip manually
      return await extractDocxZip(buffer)
    }
    return data.content?.[0]?.text || ''
  } catch {
    return await extractDocxZip(buffer)
  }
}

// Fallback: parse docx zip structure to extract XML text
async function extractDocxZip(buffer: Buffer): Promise<string> {
  try {
    // Find document.xml inside the zip using binary search
    const bufStr = buffer.toString('binary')
    
    // Look for document.xml content between zip local file headers
    const xmlMarker = 'word/document.xml'
    const markerIdx = bufStr.indexOf(xmlMarker)
    if (markerIdx === -1) return 'Could not read document content.'

    // Find the data start (after the local file header)
    // PK\x03\x04 is local file header signature
    // Skip: 4 (sig) + 2 (version) + 2 (flags) + 2 (compression) + 2 (mod time) + 2 (mod date) + 4 (crc) + 4 (compressed) + 4 (uncompressed) + 2 (name len) + 2 (extra len) + name
    const headerStart = bufStr.lastIndexOf('\x50\x4b\x03\x04', markerIdx)
    if (headerStart === -1) return 'Could not parse document structure.'

    const nameLen = buffer.readUInt16LE(headerStart + 26)
    const extraLen = buffer.readUInt16LE(headerStart + 28)
    const dataStart = headerStart + 30 + nameLen + extraLen

    // Read compressed size
    const compressedSize = buffer.readUInt32LE(headerStart + 18)
    const compressionMethod = buffer.readUInt16LE(headerStart + 8)

    let xmlData: Buffer
    if (compressionMethod === 0) {
      // Stored (no compression)
      xmlData = buffer.slice(dataStart, dataStart + compressedSize)
    } else {
      // Deflate compressed
      const zlib = await import('zlib')
      const compressed = buffer.slice(dataStart, dataStart + compressedSize)
      xmlData = await new Promise((resolve, reject) => {
        zlib.inflateRaw(compressed, (err, result) => {
          if (err) reject(err)
          else resolve(result)
        })
      })
    }

    const xml = xmlData.toString('utf-8')
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
  } catch {
    return 'Could not extract text from this document.'
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
