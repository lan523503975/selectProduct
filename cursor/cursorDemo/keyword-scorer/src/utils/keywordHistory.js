function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const cleaned = String(value).replace(/[$,%]/g, '').trim()
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

function average(values) {
  const nums = values.map(toNumber).filter((value) => Number.isFinite(value))
  if (!nums.length) return 0
  return nums.reduce((sum, value) => sum + value, 0) / nums.length
}

function pickTier(value, tiers) {
  for (const tier of tiers) {
    if (tier.test(value)) return tier
  }
  return tiers[tiers.length - 1]
}

function parseHistoryRows(historyRows) {
  return historyRows
    .map((row) => ({
      week: row['周'] || '',
      volume: toNumber(row['周搜索量']),
      abaRank: toNumber(row['ABA周排名']),
    }))
    .filter((row) => row.week && row.volume > 0)
    .sort((a, b) => new Date(b.week) - new Date(a.week))
}

export function analyzeSearchTrendFromHistory(historyRows) {
  const sorted = parseHistoryRows(historyRows)
  const recent13 = sorted.slice(0, 13)

  if (recent13.length < 8) return null

  const recent4 = average(recent13.slice(0, 4).map((row) => row.volume))
  const prior9 = average(recent13.slice(4).map((row) => row.volume))
  const change = prior9 ? (recent4 - prior9) / prior9 : 0

  const tier = pickTier(change, [
    { label: '持续上涨', test: (value) => value > 0.08, score: 5 },
    { label: '小幅上涨', test: (value) => value > 0.02, score: 4 },
    { label: '稳定', test: (value) => value >= -0.02, score: 3 },
    { label: '小幅下降', test: (value) => value >= -0.08, score: 2 },
    { label: '持续下降', test: () => true, score: 0 },
  ])

  return {
    ...tier,
    source: 'history',
    detail: `近4周均搜索量 ${Math.round(recent4).toLocaleString()} vs 前9周 ${Math.round(prior9).toLocaleString()}（变化 ${(change * 100).toFixed(1)}%）`,
  }
}

export function analyzeSeasonalityFromHistory(historyRows) {
  const sorted = parseHistoryRows(historyRows)
  if (sorted.length < 26) return null

  const byMonth = new Map()
  sorted.forEach((row) => {
    const month = new Date(row.week).getUTCMonth() + 1
    if (!byMonth.has(month)) byMonth.set(month, [])
    byMonth.get(month).push(row.volume)
  })

  const monthlyAvgs = [...byMonth.values()].map((volumes) => average(volumes))
  if (monthlyAvgs.length < 6) return null

  const mean = average(monthlyAvgs)
  const std = Math.sqrt(average(monthlyAvgs.map((value) => (value - mean) ** 2)))
  const cv = mean ? std / mean : 0
  const peakRatio = Math.min(...monthlyAvgs) ? Math.max(...monthlyAvgs) / Math.min(...monthlyAvgs) : 1

  const tier = pickTier(cv, [
    { label: '全年稳定', test: (value) => value < 0.15, score: 5 },
    { label: '轻微波动', test: (value) => value < 0.28, score: 4 },
    { label: '中等', test: (value) => value < 0.42, score: 3 },
    { label: '明显旺淡季', test: (value) => value < 0.6, score: 2 },
    { label: '极端季节性', test: () => true, score: 0 },
  ])

  return {
    ...tier,
    source: 'history',
    detail: `月际波动系数 ${cv.toFixed(2)}，峰谷比 ${peakRatio.toFixed(1)}x（${sorted.length} 周 KeywordHistory）`,
  }
}
