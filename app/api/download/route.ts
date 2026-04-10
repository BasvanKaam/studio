}



// ── Answer shuffler — guarantees random correct answer placement ──────────────
function shuffleAnswers(content: string): string {
  const lines = content.split('\n')
  const result: string[] = []
  let i = 0

  // Track answer distribution for balancing
  const answerCounts: Record<string, number> = { a: 0, b: 0, c: 0, d: 0 }

  while (i < lines.length) {
    const line = lines[i]
    const qMatch = line.match(/^\*\*Q(\d+)\./)

    if (qMatch) {
      // Collect this question block
      const block: string[] = [line]
      i++

      // Collect everything until next --- or **Q
      while (i < lines.length && !lines[i].match(/^\*\*Q\d+\./) ) {
        block.push(lines[i])
        i++
      }

      // Find options and correct answer in block
      const optionLines: { idx: number; letter: string; text: string }[] = []
      let correctIdx = -1
      let correctText = ''

      for (let j = 0; j < block.length; j++) {
        const optMatch = block[j].match(/^([a-d])\. (.+)/)
        if (optMatch) {
          optionLines.push({ idx: j, letter: optMatch[1], text: optMatch[2] })
        }
        const corrMatch = block[j].match(/^Correct: ([a-d])\) (.+)/)
        if (corrMatch) {
          correctIdx = j
          correctText = corrMatch[2]
        }
      }

      // Only shuffle if we have exactly 4 options and a correct answer
      if (optionLines.length === 4 && correctIdx >= 0) {
        // Find which letter currently holds the correct answer
        const currentCorrectLetter = optionLines.find(o => o.text === correctText)?.letter || 'a'

        // Pick target letter — choose least used, avoiding same as last 2 if possible
        const sorted = Object.entries(answerCounts).sort((a, b) => a[1] - b[1])
        let targetLetter = sorted[0][0]

        // Shuffle: swap correct answer to target position
        const currentCorrectOpt = optionLines.find(o => o.letter === currentCorrectLetter)!
        const targetOpt = optionLines.find(o => o.letter === targetLetter)!

        if (currentCorrectLetter !== targetLetter && currentCorrectOpt && targetOpt) {
          // Swap their texts
          const tmp = currentCorrectOpt.text
          currentCorrectOpt.text = targetOpt.text
          targetOpt.text = tmp

          // Update block lines
          for (const opt of optionLines) {
            block[opt.idx] = `${opt.letter}. ${opt.text}`
          }

          // Update correct answer line
          block[correctIdx] = `Correct: ${targetLetter}) ${correctText}`
        }

        answerCounts[targetLetter] = (answerCounts[targetLetter] || 0) + 1
      }

      result.push(...block)
    } else {
      result.push(line)
      i++
    }
  }

  return result.join('\n')
}

// ══════════════════════════════════════════════════════════════════════════════
// QUESTION POOL BUILDER
// ══════════════════════════════════════════════════════════════════════════════
@@ -1162,7 +1245,7 @@ function buildQuestionPoolDoc(content: string, fields: Record<string, string>):
new Paragraph({ children: [], spacing: { before: 240, after: 0 } }),
]

  const lines = stripAudit(content).split('\n')
  const lines = stripAudit(shuffleAnswers(content)).split('\n')
let i = 0
while (i < lines.length) {
const line = lines[i]
