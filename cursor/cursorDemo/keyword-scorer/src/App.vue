<script setup>
import * as echarts from 'echarts'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { parseUploadedFiles } from './utils/excel'

const analysis = ref(null)
const loading = ref(true)
const uploadLoading = ref(false)
const error = ref('')
const keywordFile = ref(null)
const searchFile = ref(null)

const radarRef = ref(null)
const top10Ref = ref(null)
const brandRef = ref(null)
let radarChart
let top10Chart
let brandChart

const scorePercent = computed(() => {
  if (!analysis.value) return 0
  return Math.min(100, Math.max(0, analysis.value.totalScore))
})

async function loadDefaultData() {
  loading.value = true
  error.value = ''
  try {
    const response = await fetch('/data/default-analysis.json')
    if (!response.ok) throw new Error('无法加载默认分析数据')
    analysis.value = await response.json()
  } catch (err) {
    error.value = err.message || '加载默认数据失败'
  } finally {
    loading.value = false
  }
}

function onFileChange(event, type) {
  const file = event.target.files?.[0]
  if (type === 'keyword') keywordFile.value = file
  if (type === 'search') searchFile.value = file
}

async function handleUpload() {
  disposeCharts()
  analysis.value = null
  loading.value = true
  uploadLoading.value = true
  error.value = ''
  try {
    const nextAnalysis = await parseUploadedFiles(keywordFile.value, searchFile.value)
    // 先完成所有维度和总分的计算，再挂载到界面上
    analysis.value = nextAnalysis
  } catch (err) {
    error.value = err.message || '解析上传文件失败'
  } finally {
    uploadLoading.value = false
    loading.value = false
  }
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString()
}

function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function disposeCharts() {
  radarChart?.dispose()
  top10Chart?.dispose()
  brandChart?.dispose()
  radarChart = undefined
  top10Chart = undefined
  brandChart = undefined
}

function getOrCreateChart(existingChart, element) {
  if (!element) return null
  if (existingChart) {
    const dom = existingChart.getDom?.()
    if (dom === element) return existingChart
    existingChart.dispose()
  }
  return echarts.init(element)
}

async function renderCharts() {
  if (!analysis.value || loading.value) return
  await nextTick()

  radarChart = getOrCreateChart(radarChart, radarRef.value)
  top10Chart = getOrCreateChart(top10Chart, top10Ref.value)
  brandChart = getOrCreateChart(brandChart, brandRef.value)

  if (!radarChart || !top10Chart || !brandChart) return

  const normalizedScores = analysis.value.dimensions.map((dimension) =>
    Number(((dimension.score / dimension.max) * 100).toFixed(1)),
  )

  radarChart.setOption({
    tooltip: { trigger: 'item' },
    radar: {
      indicator: analysis.value.dimensions.map((dimension) => ({ name: dimension.name, max: 100 })),
      radius: '64%',
      axisName: { color: '#475569' },
      splitLine: { lineStyle: { color: '#dbeafe' } },
      splitArea: { areaStyle: { color: ['#f8fafc', '#eef2ff'] } },
    },
    series: [
      {
        type: 'radar',
        data: [{ value: normalizedScores, name: '维度得分' }],
        areaStyle: { color: 'rgba(37, 99, 235, 0.18)' },
        lineStyle: { color: '#2563eb', width: 3 },
        itemStyle: { color: '#2563eb' },
      },
    ],
  })

  top10Chart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 48, right: 20, top: 24, bottom: 72 },
    xAxis: {
      type: 'category',
      data: analysis.value.top10.map((product) => product.asin),
      axisLabel: { rotate: 35, color: '#475569' },
    },
    yAxis: { type: 'value', name: '月销量', axisLabel: { color: '#475569' } },
    series: [
      {
        type: 'bar',
        data: analysis.value.top10.map((product) => product.sales),
        itemStyle: { color: '#0ea5e9', borderRadius: [6, 6, 0, 0] },
      },
    ],
  })

  brandChart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: '{b}<br/>销量占比：{d}%',
    },
    legend: { bottom: 0, type: 'scroll' },
    series: [
      {
        type: 'pie',
        radius: ['42%', '70%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
        data: analysis.value.brandShare.map((brand) => ({
          name: brand.brand,
          value: brand.sales,
        })),
      },
    ],
  })
}

function resizeCharts() {
  radarChart?.resize()
  top10Chart?.resize()
  brandChart?.resize()
}

watch([analysis, loading], renderCharts, { deep: true })

onMounted(() => {
  loadDefaultData()
  window.addEventListener('resize', resizeCharts)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts)
  disposeCharts()
})
</script>

<template>
  <main class="page-shell">
    <section class="hero-card" v-if="analysis">
      <div>
        <p class="eyebrow">Amazon V3 数据评分模型</p>
        <h1>{{ analysis.keyword }}</h1>
        <p class="subtitle">
          {{ analysis.keywordMeta.translation }} · US · Last 30 days
        </p>
        <div class="hero-tags">
          <span>月搜索量 {{ formatNumber(analysis.keywordMeta.monthlySearch) }}</span>
          <span>需供比 {{ analysis.keywordMeta.supplyDemandRatio }}</span>
          <span>标题密度 {{ analysis.keywordMeta.titleDensity }}</span>
          <span>PPC ${{ analysis.keywordMeta.ppc }}</span>
          <span>SPR {{ analysis.keywordMeta.spr }}</span>
        </div>
      </div>

      <div class="score-panel">
        <div
          class="score-ring"
          :style="{ '--score': scorePercent, '--verdict-color': analysis.verdict.color }"
        >
          <strong>{{ analysis.totalScore }}</strong>
          <span>/100</span>
        </div>
        <div class="verdict" :style="{ color: analysis.verdict.color }">
          {{ analysis.verdict.label }}
        </div>
        <p>{{ analysis.verdict.summary }}</p>
      </div>
    </section>

    <section class="veto-banner" v-if="analysis?.veto?.triggered">
      <strong>高风险预警</strong>
      <p>{{ analysis.veto.message }}</p>
      <ul>
        <li v-for="reason in analysis.veto.reasons" :key="reason">{{ reason }}</li>
      </ul>
    </section>

    <section class="upload-card">
      <div>
        <h2>上传新数据重新评分</h2>
        <p>分别上传 KeywordMining 表和 Search 表，系统会按 Amazon V3 六维模型重新计算。</p>
      </div>
      <div class="upload-grid">
        <label>
          <span>KeywordMining xlsx</span>
          <input type="file" accept=".xlsx,.xls" @change="onFileChange($event, 'keyword')" />
        </label>
        <label>
          <span>Search xlsx</span>
          <input type="file" accept=".xlsx,.xls" @change="onFileChange($event, 'search')" />
        </label>
        <button :disabled="uploadLoading" @click="handleUpload">
          {{ uploadLoading ? '解析中...' : '重新评分' }}
        </button>
      </div>
      <p class="error-text" v-if="error">{{ error }}</p>
    </section>

    <div class="loading-card" v-if="loading">正在加载默认分析数据...</div>

    <template v-if="analysis && !loading">
      <section class="metric-grid">
        <article class="metric-card">
          <span>Search 样本</span>
          <strong>{{ analysis.market.productCount }}</strong>
          <small>个 ASIN</small>
        </article>
        <article class="metric-card">
          <span>总月销量</span>
          <strong>{{ formatNumber(analysis.market.totalSales) }}</strong>
          <small>Search 表估算</small>
        </article>
        <article class="metric-card">
          <span>Top10 销量占比</span>
          <strong>{{ analysis.market.top10SalesPct }}%</strong>
          <small>&lt;20% 为优秀</small>
        </article>
        <article class="metric-card">
          <span>Top3 品牌占比</span>
          <strong>{{ analysis.market.top3BrandSalesPct }}%</strong>
          <small>&lt;30% 为优秀</small>
        </article>
        <article class="metric-card">
          <span>平均售价</span>
          <strong>${{ analysis.market.averagePrice }}</strong>
          <small>盈利能力维度</small>
        </article>
        <article class="metric-card">
          <span>Review 中位数</span>
          <strong>{{ formatNumber(analysis.market.medianReviews) }}</strong>
          <small>&lt;50 为优秀</small>
        </article>
      </section>

      <section class="dashboard-grid">
        <article class="panel">
          <div class="panel-title">
            <h2>六维评分雷达</h2>
            <span>Amazon V3 模型</span>
          </div>
          <div ref="radarRef" class="chart"></div>
        </article>

        <article class="panel">
          <div class="panel-title">
            <h2>Top10 月销量</h2>
            <span>判断头部集中度</span>
          </div>
          <div ref="top10Ref" class="chart"></div>
        </article>

        <article class="panel">
          <div class="panel-title">
            <h2>品牌销量占比</h2>
            <span>观察品牌集中情况</span>
          </div>
          <div ref="brandRef" class="chart"></div>
        </article>
      </section>

      <section class="dimension-grid">
        <article class="dimension-card" v-for="dimension in analysis.dimensions" :key="dimension.key">
          <div class="dimension-head">
            <h3>{{ dimension.name }}</h3>
            <strong>{{ dimension.score }}/{{ dimension.max }}</strong>
          </div>
          <div class="progress-track">
            <div
              class="progress-bar"
              :style="{ width: `${(dimension.score / dimension.max) * 100}%` }"
            ></div>
          </div>
          <p>{{ dimension.metric }}</p>
          <small>{{ dimension.detail }}</small>
          <ul class="submetric-list" v-if="dimension.subMetrics?.length">
            <li v-for="sub in dimension.subMetrics" :key="sub.name">
              <span>{{ sub.name }} · {{ sub.value }}</span>
              <em>{{ sub.tier }} · {{ sub.score }}/{{ sub.max }}</em>
            </li>
          </ul>
        </article>
      </section>

      <section class="insight-grid">
        <article class="panel">
          <div class="panel-title">
            <h2>风险与红线</h2>
            <span>进入前重点检查</span>
          </div>
          <ul class="check-list">
            <li v-for="risk in analysis.risks" :key="risk">{{ risk }}</li>
          </ul>
        </article>

        <article class="panel">
          <div class="panel-title">
            <h2>机会与建议</h2>
            <span>基于本次数据</span>
          </div>
          <ul class="check-list positive">
            <li v-for="item in analysis.opportunities" :key="item">{{ item }}</li>
          </ul>
        </article>
      </section>

      <section class="panel verdict-guide">
        <div class="panel-title">
          <h2>评分结果解读</h2>
          <span>V3 标准</span>
        </div>
        <div class="guide-grid">
          <article>
            <strong>80–100 分 · 强烈建议做</strong>
            <p>蓝海或结构性机会，可以做品牌/爆款，适合重点投入。</p>
          </article>
          <article>
            <strong>60–80 分 · 可以做</strong>
            <p>中等竞争，需要细分切入，适合测试款。</p>
          </article>
          <article>
            <strong>40–60 分 · 谨慎</strong>
            <p>红海长尾，只能蹭流量，不适合主推。</p>
          </article>
          <article>
            <strong>&lt;40 分 · 不做</strong>
            <p>供给过剩或需求不足。</p>
          </article>
        </div>
      </section>

      <section class="panel table-panel">
        <div class="panel-title">
          <h2>Top10 商品详情</h2>
          <span>用于判断价格、销量和 Review 门槛</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>ASIN</th>
                <th>品牌</th>
                <th>标题</th>
                <th>月销量</th>
                <th>价格</th>
                <th>评分数</th>
                <th>评分</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="product in analysis.top10" :key="`${product.rank}-${product.asin}`">
                <td>{{ product.rank }}</td>
                <td class="mono">{{ product.asin }}</td>
                <td>{{ product.brand }}</td>
                <td class="title-cell">{{ product.title }}</td>
                <td>{{ formatNumber(product.sales) }}</td>
                <td>${{ product.price }}</td>
                <td>{{ formatNumber(product.reviews) }}</td>
                <td>{{ product.rating }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </main>
</template>
