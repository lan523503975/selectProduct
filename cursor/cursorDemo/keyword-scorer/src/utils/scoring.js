export function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const cleaned = String(value).replace(/[$,%]/g, '').trim()
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

export function median(values) {
  const nums = values.map(toNumber).filter((value) => Number.isFinite(value)).sort((a, b) => a - b)
  if (!nums.length) return 0
  const mid = Math.floor(nums.length / 2)
  return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2
}

export function average(values) {
  const nums = values.map(toNumber).filter((value) => Number.isFinite(value))
  if (!nums.length) return 0
  return nums.reduce((sum, value) => sum + value, 0) / nums.length
}

function toPercentRate(value) {
  const num = toNumber(value)
  return num <= 1 ? num * 100 : num
}

function pickTier(value, tiers) {
  for (const tier of tiers) {
    if (tier.test(value)) return tier
  }
  return tiers[tiers.length - 1]
}

function scaleSectionScore(rawScore, rawMax, sectionMax) {
  if (!rawMax) return 0
  return Number(((rawScore / rawMax) * sectionMax).toFixed(1))
}

export function scoreMonthlySearch(volume) {
  const tier = pickTier(volume, [
    { label: '优秀', test: (v) => v >= 20000, score: 5 },
    { label: '良好', test: (v) => v >= 10000, score: 4 },
    { label: '一般', test: (v) => v >= 5000, score: 3 },
    { label: '较差', test: (v) => v >= 2000, score: 2 },
    { label: '很差', test: () => true, score: 0 },
  ])
  return tier
}

export function scoreMonthlyPurchase(volume) {
  return pickTier(volume, [
    { label: '优秀', test: (v) => v >= 3000, score: 6 },
    { label: '良好', test: (v) => v >= 1500, score: 5 },
    { label: '一般', test: (v) => v >= 800, score: 4 },
    { label: '较差', test: (v) => v >= 300, score: 2 },
    { label: '很差', test: () => true, score: 0 },
  ])
}

export function scorePurchaseRate(rate) {
  const pct = toPercentRate(rate)
  return pickTier(pct, [
    { label: '优秀', test: (v) => v >= 20, score: 5 },
    { label: '良好', test: (v) => v >= 15, score: 4 },
    { label: '一般', test: (v) => v >= 10, score: 3 },
    { label: '较差', test: (v) => v >= 5, score: 2 },
    { label: '很差', test: () => true, score: 0 },
  ])
}

export function scoreAbaTrend(abaMonth, abaWeek) {
  if (!abaMonth || !abaWeek) {
    return { label: '稳定', score: 2, detail: 'ABA 数据不足，按稳定处理' }
  }
  const improvement = (abaMonth - abaWeek) / abaMonth
  const tier = pickTier(improvement, [
    { label: '持续上涨', test: (v) => v > 0.05, score: 4 },
    { label: '缓慢上涨', test: (v) => v > 0.01, score: 3 },
    { label: '稳定', test: (v) => v >= -0.01, score: 2 },
    { label: '略下降', test: (v) => v >= -0.05, score: 1 },
    { label: '持续下降', test: () => true, score: 0 },
  ])
  return {
    ...tier,
    detail: `ABA 月排名 ${abaMonth.toLocaleString()} → 周排名 ${abaWeek.toLocaleString()}`,
  }
}

export function scoreSupplyDemandRatio(ratio) {
  return pickTier(ratio, [
    { label: '优秀', test: (v) => v >= 3, score: 8 },
    { label: '良好', test: (v) => v >= 2, score: 7 },
    { label: '一般', test: (v) => v >= 1, score: 5 },
    { label: '较差', test: (v) => v >= 0.5, score: 2 },
    { label: '很差', test: () => true, score: 0 },
  ])
}

export function scoreProductCount(count) {
  return pickTier(count, [
    { label: '优秀', test: (v) => v < 2000, score: 3 },
    { label: '良好', test: (v) => v < 5000, score: 2 },
    { label: '一般', test: (v) => v < 10000, score: 1 },
    { label: '较差', test: (v) => v <= 20000, score: 0.5 },
    { label: '很差', test: () => true, score: 0 },
  ])
}

export function scoreTop10SalesShare(pct) {
  return pickTier(pct, [
    { label: '优秀', test: (v) => v < 20, score: 7 },
    { label: '良好', test: (v) => v <= 35, score: 6 },
    { label: '一般', test: (v) => v <= 50, score: 4 },
    { label: '较差', test: (v) => v <= 70, score: 2 },
    { label: '很差', test: () => true, score: 0 },
  ])
}

export function scoreReviewMedian(reviews) {
  return pickTier(reviews, [
    { label: '优秀', test: (v) => v < 50, score: 5 },
    { label: '良好', test: (v) => v <= 100, score: 4 },
    { label: '一般', test: (v) => v <= 300, score: 3 },
    { label: '较差', test: (v) => v <= 500, score: 2 },
    { label: '很差', test: () => true, score: 0 },
  ])
}

export function scoreAverageReview(reviews) {
  return pickTier(reviews, [
    { label: '优秀', test: (v) => v < 200, score: 4 },
    { label: '良好', test: (v) => v <= 500, score: 3 },
    { label: '一般', test: (v) => v <= 1000, score: 2 },
    { label: '较差', test: (v) => v <= 2000, score: 1 },
    { label: '很差', test: () => true, score: 0 },
  ])
}

export function scoreTop3BrandShare(pct) {
  return pickTier(pct, [
    { label: '优秀', test: (v) => v < 30, score: 4 },
    { label: '良好', test: (v) => v <= 45, score: 3 },
    { label: '一般', test: (v) => v <= 60, score: 2 },
    { label: '较差', test: (v) => v <= 70, score: 1 },
    { label: '很差', test: () => true, score: 0 },
  ])
}

export function scoreTitleDensity(density) {
  return pickTier(density, [
    { label: '优秀', test: (v) => v < 10, score: 5 },
    { label: '良好', test: (v) => v <= 20, score: 4 },
    { label: '一般', test: (v) => v <= 40, score: 3 },
    { label: '较差', test: (v) => v <= 60, score: 2 },
    { label: '很差', test: () => true, score: 0 },
  ])
}

export function scoreSpr(spr) {
  return pickTier(spr, [
    { label: '优秀', test: (v) => v < 20, score: 5 },
    { label: '良好', test: (v) => v <= 40, score: 4 },
    { label: '一般', test: (v) => v <= 80, score: 3 },
    { label: '较差', test: (v) => v <= 120, score: 2 },
    { label: '很差', test: () => true, score: 0 },
  ])
}

export function scoreAveragePrice(price) {
  return pickTier(price, [
    { label: '优秀', test: (v) => v >= 25, score: 5 },
    { label: '良好', test: (v) => v >= 18, score: 4 },
    { label: '一般', test: (v) => v >= 12, score: 3 },
    { label: '较差', test: (v) => v >= 8, score: 2 },
    { label: '很差', test: () => true, score: 0 },
  ])
}

export function scorePpc(ppc) {
  return pickTier(ppc, [
    { label: '优秀', test: (v) => v < 0.5, score: 5 },
    { label: '良好', test: (v) => v < 0.8, score: 4 },
    { label: '一般', test: (v) => v < 1.2, score: 3 },
    { label: '较差', test: (v) => v < 2, score: 2 },
    { label: '很差', test: () => true, score: 0 },
  ])
}

export function scoreAverageRating(rating) {
  return pickTier(rating, [
    { label: '优秀', test: (v) => v < 4.3, score: 5 },
    { label: '良好', test: (v) => v <= 4.5, score: 4 },
    { label: '一般', test: (v) => v <= 4.7, score: 3 },
    { label: '较差', test: (v) => v <= 4.8, score: 2 },
    { label: '很差', test: () => true, score: 0 },
  ])
}

export function scoreSearchTrend90d(growthRates) {
  const positiveRatio = growthRates.length
    ? growthRates.filter((growth) => toNumber(growth) > 0).length / growthRates.length
    : 0
  const tier = pickTier(positiveRatio, [
    { label: '持续上涨', test: (v) => v >= 0.6, score: 5 },
    { label: '小幅上涨', test: (v) => v >= 0.45, score: 4 },
    { label: '稳定', test: (v) => v >= 0.3, score: 3 },
    { label: '小幅下降', test: (v) => v >= 0.15, score: 2 },
    { label: '持续下降', test: () => true, score: 0 },
  ])
  return {
    ...tier,
    detail: `${growthRates.filter((growth) => toNumber(growth) > 0).length}/${growthRates.length || 0} 个 listing 销量正增长`,
  }
}

export function scoreSeasonality() {
  return {
    label: '稳定',
    score: 3,
    detail: '缺少季节性数据，按稳定处理',
  }
}

export function scoreBsrVolatility(bsrGrowthRates) {
  const rates = bsrGrowthRates.map(toNumber).filter((value) => Number.isFinite(value))
  if (rates.length < 2) {
    return { label: '一般', score: 3, detail: 'BSR 样本不足，按一般处理' }
  }
  const mean = average(rates)
  const variance = rates.reduce((sum, value) => sum + (value - mean) ** 2, 0) / rates.length
  const stdDev = Math.sqrt(variance)
  const cv = mean ? Math.abs(stdDev / mean) : stdDev
  return pickTier(cv, [
    { label: '很稳定', test: (v) => v < 0.3, score: 5 },
    { label: '较稳定', test: (v) => v < 0.6, score: 4 },
    { label: '一般', test: (v) => v < 1, score: 3 },
    { label: '波动较大', test: (v) => v < 1.5, score: 2 },
    { label: '波动剧烈', test: () => true, score: 0 },
  ])
}

export function getVerdict(totalScore) {
  if (totalScore >= 80) {
    return {
      label: '强烈建议做',
      summary: '蓝海或结构性机会，适合重点投入',
      color: '#22c55e',
      level: 'high',
    }
  }
  if (totalScore >= 60) {
    return {
      label: '可以做',
      summary: '中等竞争，适合测试款与细分切入',
      color: '#3b82f6',
      level: 'medium',
    }
  }
  if (totalScore >= 40) {
    return {
      label: '谨慎',
      summary: '红海长尾，只能蹭流量，不适合主推',
      color: '#f59e0b',
      level: 'low',
    }
  }
  return {
    label: '不做',
    summary: '供给过剩或需求不足',
    color: '#ef4444',
    level: 'reject',
  }
}

export function checkVetoRedLines(metrics) {
  const redLines = []
  const purchaseRatePct = toPercentRate(metrics.purchaseRate)

  if (purchaseRatePct < 5) redLines.push(`购买率 ${purchaseRatePct.toFixed(1)}% < 5%`)
  if (metrics.supplyDemandRatio < 0.5) redLines.push(`需供比 ${metrics.supplyDemandRatio.toFixed(2)} < 0.5`)
  if (metrics.top10SalesPct > 70) redLines.push(`Top10 销量占比 ${metrics.top10SalesPct.toFixed(1)}% > 70%`)
  if (metrics.top3BrandSalesPct > 70) redLines.push(`Top3 品牌销量占比 ${metrics.top3BrandSalesPct.toFixed(1)}% > 70%`)
  if (metrics.medianReviews > 500) redLines.push(`Review 中位数 ${Math.round(metrics.medianReviews)} > 500`)
  if (metrics.ppc >= 2.5) redLines.push(`PPC $${metrics.ppc.toFixed(2)} ≥ $2.5`)

  return {
    triggered: redLines.length > 0,
    reasons: redLines,
    message: redLines.length ? '存在高风险指标，建议谨慎进入市场。' : '',
  }
}

export function applyVetoAdjustment(rawScore, veto) {
  if (!veto.triggered) {
    return {
      rawTotalScore: rawScore,
      totalScore: rawScore,
      adjusted: false,
      penalty: 0,
      cap: 100,
    }
  }

  const redLineCount = veto.reasons.length
  const penalty = redLineCount * 15
  const cap = redLineCount >= 2 ? 39 : 59
  const totalScore = Number(Math.max(0, Math.min(rawScore - penalty, cap)).toFixed(1))

  return {
    rawTotalScore: rawScore,
    totalScore,
    adjusted: true,
    penalty,
    cap,
  }
}

function buildSubMetric(name, valueText, tierResult, max) {
  return {
    name,
    value: valueText,
    tier: tierResult.label,
    score: tierResult.score,
    max,
    detail: tierResult.detail || '',
  }
}

export function buildAnalysis(keywordRow, searchRows) {
  const keywordMeta = {
    keyword: keywordRow['关键词'] || '',
    translation: keywordRow['关键词翻译'] || '',
    relevance: toNumber(keywordRow['相关度']),
    abaMonth: toNumber(keywordRow['ABA月排名']),
    abaWeek: toNumber(keywordRow['ABA周排名']),
    monthlySearch: toNumber(keywordRow['月搜索量']),
    monthlyPurchase: toNumber(keywordRow['月购买量']),
    purchaseRate: toNumber(keywordRow['购买率']),
    supplyDemandRatio: toNumber(keywordRow['需供比']),
    productCount: toNumber(keywordRow['商品数']),
    titleDensity: toNumber(keywordRow['标题密度']),
    spr: toNumber(keywordRow['SPR']),
    ppc: toNumber(keywordRow['PPC竞价']),
    avgPrice: toNumber(keywordRow['均价']),
    clickShareTop3:
      toNumber(keywordRow['#1 点击共享']) +
      toNumber(keywordRow['#2 点击共享']) +
      toNumber(keywordRow['#3 点击共享']),
    convShareTop3:
      toNumber(keywordRow['#1转化共享']) +
      toNumber(keywordRow['#2 转化共享']) +
      toNumber(keywordRow['#3 转化共享']),
  }

  const products = searchRows
    .map((row) => ({
      rank: toNumber(row['#']),
      asin: row.ASIN || '',
      brand: row['品牌'] || 'Unknown',
      title: row['商品标题'] || '',
      sales: toNumber(row['月销量']),
      revenue: toNumber(row['月销售额($)']),
      price: toNumber(row['价格($)']),
      reviews: toNumber(row['评分数']),
      rating: toNumber(row['评分']),
      margin: toNumber(row['毛利率']),
      salesGrowth: toNumber(row['月销量增长率']),
      bsrGrowth: toNumber(row['大类BSR增长率']),
      daysListed: toNumber(row['上架天数']),
    }))
    .filter((product) => product.asin || product.title)
    .sort((a, b) => (a.rank || 999) - (b.rank || 999))

  const totalSales = products.reduce((sum, product) => sum + product.sales, 0)
  const totalRevenue = products.reduce((sum, product) => sum + product.revenue, 0)
  const top10 = products.slice(0, 10)
  const top10Sales = top10.reduce((sum, product) => sum + product.sales, 0)
  const top10Revenue = top10.reduce((sum, product) => sum + product.revenue, 0)
  const top10SalesPct = totalSales ? (top10Sales / totalSales) * 100 : 0
  const top10RevenuePct = totalRevenue ? (top10Revenue / totalRevenue) * 100 : 0

  const prices = products.map((product) => product.price).filter((price) => price > 0)
  const reviews = products.map((product) => product.reviews)
  const ratings = products.map((product) => product.rating).filter((rating) => rating > 0)
  const margins = products.map((product) => product.margin).filter((margin) => margin > 0)
  const growthRates = products.map((product) => product.salesGrowth)
  const bsrGrowthRates = top10.map((product) => product.bsrGrowth).filter((value) => Number.isFinite(value))

  const medianPrice = median(prices)
  const averagePrice = average(prices)
  const medianReviews = median(reviews)
  const averageReviews = average(top10.map((product) => product.reviews))
  const averageRating = average(ratings)
  const medianMargin = median(margins) * 100

  const brandMap = new Map()
  products.forEach((product) => {
    brandMap.set(product.brand, (brandMap.get(product.brand) || 0) + product.sales)
  })
  const brandShare = [...brandMap.entries()]
    .map(([brand, sales]) => ({
      brand,
      sales,
      pct: totalSales ? Number(((sales / totalSales) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.sales - a.sales)

  const top3BrandSales = brandShare.slice(0, 3).reduce((sum, brand) => sum + brand.sales, 0)
  const top3BrandSalesPct = totalSales ? (top3BrandSales / totalSales) * 100 : 0

  const monthlySearchTier = scoreMonthlySearch(keywordMeta.monthlySearch)
  const monthlyPurchaseTier = scoreMonthlyPurchase(keywordMeta.monthlyPurchase)
  const purchaseRateTier = scorePurchaseRate(keywordMeta.purchaseRate)
  const abaTrendTier = scoreAbaTrend(keywordMeta.abaMonth, keywordMeta.abaWeek)
  const demandRaw =
    monthlySearchTier.score +
    monthlyPurchaseTier.score +
    purchaseRateTier.score +
    abaTrendTier.score

  const supplyDemandTier = scoreSupplyDemandRatio(keywordMeta.supplyDemandRatio)
  const productCountTier = scoreProductCount(keywordMeta.productCount)
  const supplyRaw = supplyDemandTier.score + productCountTier.score

  const top10ShareTier = scoreTop10SalesShare(top10SalesPct)
  const reviewMedianTier = scoreReviewMedian(medianReviews)
  const averageReviewTier = scoreAverageReview(averageReviews)
  const top3BrandTier = scoreTop3BrandShare(top3BrandSalesPct)
  const competitionRaw =
    top10ShareTier.score +
    reviewMedianTier.score +
    averageReviewTier.score +
    top3BrandTier.score

  const titleDensityTier = scoreTitleDensity(keywordMeta.titleDensity)
  const sprTier = scoreSpr(keywordMeta.spr)
  const seoRaw = titleDensityTier.score + sprTier.score

  const averagePriceTier = scoreAveragePrice(averagePrice)
  const ppcTier = scorePpc(keywordMeta.ppc)
  const averageRatingTier = scoreAverageRating(averageRating)
  const profitRaw = averagePriceTier.score + ppcTier.score + averageRatingTier.score

  const searchTrendTier = scoreSearchTrend90d(growthRates)
  const seasonalityTier = scoreSeasonality()
  const bsrVolatilityTier = scoreBsrVolatility(bsrGrowthRates)
  const stabilityRaw = searchTrendTier.score + seasonalityTier.score + bsrVolatilityTier.score

  const dimensions = [
    {
      key: 'marketDemand',
      name: '市场需求',
      score: demandRaw,
      max: 20,
      metric: `月搜索量 ${keywordMeta.monthlySearch.toLocaleString()}`,
      detail: `月购买量 ${keywordMeta.monthlyPurchase.toLocaleString()}，购买率 ${toPercentRate(keywordMeta.purchaseRate).toFixed(1)}%`,
      subMetrics: [
        buildSubMetric('月搜索量', keywordMeta.monthlySearch.toLocaleString(), monthlySearchTier, 5),
        buildSubMetric('月购买量', keywordMeta.monthlyPurchase.toLocaleString(), monthlyPurchaseTier, 6),
        buildSubMetric('购买率', `${toPercentRate(keywordMeta.purchaseRate).toFixed(1)}%`, purchaseRateTier, 5),
        buildSubMetric('ABA趋势', abaTrendTier.detail || `${keywordMeta.abaMonth}→${keywordMeta.abaWeek}`, abaTrendTier, 4),
      ],
    },
    {
      key: 'marketSupply',
      name: '市场供需',
      score: scaleSectionScore(supplyRaw, 11, 20),
      max: 20,
      metric: `需供比 ${keywordMeta.supplyDemandRatio.toFixed(2)}`,
      detail: `商品数 ${keywordMeta.productCount.toLocaleString()}`,
      subMetrics: [
        buildSubMetric('需供比', keywordMeta.supplyDemandRatio.toFixed(2), supplyDemandTier, 8),
        buildSubMetric('商品数', keywordMeta.productCount.toLocaleString(), productCountTier, 3),
      ],
      rawScore: supplyRaw,
      rawMax: 11,
    },
    {
      key: 'marketCompetition',
      name: '市场竞争',
      score: competitionRaw,
      max: 20,
      metric: `Top10 销量占比 ${top10SalesPct.toFixed(1)}%`,
      detail: `Top3 品牌销量占比 ${top3BrandSalesPct.toFixed(1)}%`,
      subMetrics: [
        buildSubMetric('Top10销量占比', `${top10SalesPct.toFixed(1)}%`, top10ShareTier, 7),
        buildSubMetric('Review中位数', Math.round(medianReviews).toLocaleString(), reviewMedianTier, 5),
        buildSubMetric('平均Review', Math.round(averageReviews).toLocaleString(), averageReviewTier, 4),
        buildSubMetric('Top3品牌销量占比', `${top3BrandSalesPct.toFixed(1)}%`, top3BrandTier, 4),
      ],
    },
    {
      key: 'seoCompetition',
      name: 'SEO竞争',
      score: seoRaw,
      max: 10,
      metric: `标题密度 ${keywordMeta.titleDensity}`,
      detail: `SPR ${keywordMeta.spr}`,
      subMetrics: [
        buildSubMetric('标题密度', String(keywordMeta.titleDensity), titleDensityTier, 5),
        buildSubMetric('SPR', String(keywordMeta.spr), sprTier, 5),
      ],
    },
    {
      key: 'profitability',
      name: '盈利能力',
      score: profitRaw,
      max: 15,
      metric: `平均售价 $${averagePrice.toFixed(2)}`,
      detail: `PPC $${keywordMeta.ppc.toFixed(2)}，平均评分 ${averageRating.toFixed(2)}`,
      subMetrics: [
        buildSubMetric('平均售价', `$${averagePrice.toFixed(2)}`, averagePriceTier, 5),
        buildSubMetric('PPC', `$${keywordMeta.ppc.toFixed(2)}`, ppcTier, 5),
        buildSubMetric('平均评分', averageRating.toFixed(2), averageRatingTier, 5),
      ],
    },
    {
      key: 'marketStability',
      name: '市场稳定性',
      score: stabilityRaw,
      max: 15,
      metric: searchTrendTier.detail || '搜索趋势',
      detail: `${seasonalityTier.detail}；BSR ${bsrVolatilityTier.label}`,
      subMetrics: [
        buildSubMetric('搜索趋势90天', searchTrendTier.detail || '—', searchTrendTier, 5),
        buildSubMetric('季节性', seasonalityTier.detail || seasonalityTier.label, seasonalityTier, 5),
        buildSubMetric('BSR波动', bsrVolatilityTier.label, bsrVolatilityTier, 5),
      ],
    },
  ]

  const rawTotalScore = Number(dimensions.reduce((sum, dimension) => sum + dimension.score, 0).toFixed(1))

  const veto = checkVetoRedLines({
    purchaseRate: keywordMeta.purchaseRate,
    supplyDemandRatio: keywordMeta.supplyDemandRatio,
    top10SalesPct,
    top3BrandSalesPct,
    medianReviews,
    ppc: keywordMeta.ppc,
  })

  const scoreAdjustment = applyVetoAdjustment(rawTotalScore, veto)
  const totalScore = scoreAdjustment.totalScore
  const verdict = getVerdict(totalScore)
  if (veto.triggered) {
    verdict.summary = `${verdict.summary}（已触发 ${veto.reasons.length} 条红线，综合分由 ${rawTotalScore} 下调至 ${totalScore}）`
  }

  const risks = [...veto.reasons]
  if (veto.triggered) risks.unshift(veto.message)
  if (medianPrice < 12) risks.push(`中位客单价 $${medianPrice.toFixed(2)} 偏低，利润空间有限`)
  if (keywordMeta.clickShareTop3 > 0.4) {
    risks.push(`Top3 点击共享 ${(keywordMeta.clickShareTop3 * 100).toFixed(1)}% 偏高，广告竞争激烈`)
  }

  const zeroReviewWithSales = products.filter((product) => product.reviews === 0 && product.sales > 0).length
  const opportunities = []
  if (zeroReviewWithSales) {
    opportunities.push(`${zeroReviewWithSales} 个有销量但 Review=0 的 listing，说明新链接仍有进入窗口`)
  }
  if (top10SalesPct < 35) opportunities.push('头部销量分散，适合通过细分定位切入')
  if (keywordMeta.supplyDemandRatio >= 2) opportunities.push('需供比健康，搜索需求相对充足')
  if (keywordMeta.titleDensity < 20) opportunities.push('标题密度较低，SEO 进入难度相对可控')
  if (!opportunities.length) opportunities.push('建议结合供应链与差异化策略，小预算测试后再放量')

  return {
    keyword: keywordMeta.keyword,
    modelVersion: 'Amazon V3',
    keywordMeta,
    market: {
      productCount: products.length,
      totalSales,
      totalRevenue,
      top10SalesPct: Number(top10SalesPct.toFixed(1)),
      top10RevenuePct: Number(top10RevenuePct.toFixed(1)),
      top3BrandSalesPct: Number(top3BrandSalesPct.toFixed(1)),
      medianPrice: Number(medianPrice.toFixed(2)),
      averagePrice: Number(averagePrice.toFixed(2)),
      medianReviews,
      averageReviews: Number(averageReviews.toFixed(0)),
      averageRating: Number(averageRating.toFixed(2)),
      medianMargin: Number(medianMargin.toFixed(1)),
      zeroReviewWithSales,
      positiveGrowthCount: products.filter((product) => product.salesGrowth > 0).length,
    },
    totalScore,
    rawTotalScore: scoreAdjustment.rawTotalScore,
    scoreAdjustment,
    verdict,
    veto,
    dimensions,
    risks,
    opportunities,
    top10,
    brandShare: brandShare.slice(0, 10),
    products,
  }
}
