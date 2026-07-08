export const DATA_SOURCES = {
  direct: {
    key: 'direct',
    label: '直接数据',
    description: '来自 KeywordMining / Search 原始字段',
  },
  calculated: {
    key: 'calculated',
    label: '样本计算',
    description: '基于 Search 表样本聚合计算，不代表全市场',
  },
  history: {
    key: 'history',
    label: '历史推算',
    description: '基于 KeywordHistory 周搜索量历史数据计算',
  },
  inferred: {
    key: 'inferred',
    label: '间接推算',
    description: '由多个关联字段推算，非直接观测值',
  },
  estimated: {
    key: 'estimated',
    label: '估算替代',
    description: '缺少对应数据时的替代估算逻辑',
  },
}

export function getSourceMeta(sourceKey) {
  return DATA_SOURCES[sourceKey] || DATA_SOURCES.estimated
}

export function buildDataSourceSummary(subMetrics) {
  const groups = {
    direct: [],
    calculated: [],
    history: [],
    inferred: [],
    estimated: [],
  }

  subMetrics.forEach((metric) => {
    groups[metric.source]?.push(metric.name)
  })

  return Object.entries(groups)
    .filter(([, names]) => names.length)
    .map(([source, names]) => ({
      source,
      ...getSourceMeta(source),
      metrics: names,
    }))
}
