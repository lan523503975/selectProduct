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

export async function parseUploadedFiles(keywordFile, searchFile, historyFile) {
  if (!keywordFile || !searchFile || !historyFile) {
    throw new Error('请同时上传 KeywordMining、Search 和 KeywordHistory 三份表格')
  }

  const [keywordWorkbook, searchWorkbook, historyWorkbook] = await Promise.all([
    readWorkbook(keywordFile),
    readWorkbook(searchFile),
    readWorkbook(historyFile),
  ])

  const keywordRows = firstSheetRows(keywordWorkbook)
  const searchRows = firstSheetRows(searchWorkbook)
  const historyRows = firstSheetRows(historyWorkbook)
  const keywordRow = keywordRows[0]

  if (!keywordRow?.关键词 || !searchRows.length) {
    throw new Error('Excel 格式不匹配，请确认上传的是卖家精灵 KeywordMining 和 Search 导出表')
  }

  if (!historyRows.length || !historyRows[0]?.周 || historyRows[0]?.周搜索量 === undefined) {
    throw new Error('KeywordHistory 格式不匹配，请确认包含「周」和「周搜索量」字段')
  }

  return buildAnalysis(keywordRow, searchRows, historyRows)
}
