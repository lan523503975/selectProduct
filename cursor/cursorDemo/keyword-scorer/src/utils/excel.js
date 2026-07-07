import * as XLSX from 'xlsx'
import { buildAnalysis } from './scoring'

async function readWorkbook(file) {
  const buffer = await file.arrayBuffer()
  return XLSX.read(buffer, { type: 'array' })
}

function firstSheetRows(workbook) {
  const firstSheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[firstSheetName]
  return XLSX.utils.sheet_to_json(sheet, { defval: '' })
}

export async function parseUploadedFiles(keywordFile, searchFile) {
  if (!keywordFile || !searchFile) {
    throw new Error('请同时上传 KeywordMining 表和 Search 表')
  }

  const [keywordWorkbook, searchWorkbook] = await Promise.all([
    readWorkbook(keywordFile),
    readWorkbook(searchFile),
  ])

  const keywordRows = firstSheetRows(keywordWorkbook)
  const searchRows = firstSheetRows(searchWorkbook)
  const keywordRow = keywordRows[0]

  if (!keywordRow?.关键词 || !searchRows.length) {
    throw new Error('Excel 格式不匹配，请确认上传的是卖家精灵 KeywordMining 和 Search 导出表')
  }

  return buildAnalysis(keywordRow, searchRows)
}
