import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as XLSX from 'xlsx'
import { buildAnalysis } from '../src/utils/scoring.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '../..')

function readSheetRows(filePath) {
  const buffer = readFileSync(filePath)
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  return XLSX.utils.sheet_to_json(sheet, { defval: '' })
}

const keywordPath = join(
  projectRoot,
  'KeywordMining-US-catholic-prayer-cards-Last-30-days-113680(1).xlsx',
)
const searchPath = join(projectRoot, 'Search(catholic-prayer-cards)-59-US-20260704.xlsx')
const historyPath = join(projectRoot, 'KeywordHistory-catholic prayer cards-US-20260707.xlsx')

const keywordRows = readSheetRows(keywordPath)
const searchRows = readSheetRows(searchPath)
const historyRows = readSheetRows(historyPath)
const result = buildAnalysis(keywordRows[0], searchRows, historyRows)

const outPath = join(__dirname, '../public/data/default-analysis.json')
writeFileSync(outPath, JSON.stringify(result, null, 2))

console.log(`Written to ${outPath}`)
console.log(`Total score: ${result.totalScore} · ${result.verdict.label}`)
console.log('Data sources:', result.dataSourceSummary.map((g) => `${g.label}(${g.metrics.length})`).join(', '))
