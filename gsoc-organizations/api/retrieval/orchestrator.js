const QdrantClientWrapper = require("../qdrant/client")
const BM25Index = require("../../scripts/index/bm25-index")
const QueryIntelligenceAgent = require("../agents/query-intelligence")
const EmbeddingGenerator = require("../../scripts/index/embedding-generator")

class RetrievalOrchestrator {
  constructor(config = {}) {
    this.qdrantClient = new QdrantClientWrapper(config.qdrant)
    this.queryAgent = new QueryIntelligenceAgent()
    this.embeddingGenerator = new EmbeddingGenerator()

    this.bm25Index = new BM25Index()
    this.bm25Loaded = false

    this.stats = {
      totalQueries: 0,
      vectorSearches: 0,
      bm25Searches: 0,
      hybridSearches: 0,
      multiHopSearches: 0,
      averageResponseTime: 0,
    }
  }

  async initialize() {
    console.log("Initializing Retrieval Orchestrator...")

    await this.qdrantClient.testConnection()

    const pointCount = await this.qdrantClient.getPointCount()
    console.log(`  ✓ Connected to Qdrant (${pointCount} points)`)

    this.loadBM25Index()

    console.log("✓ Retrieval Orchestrator initialized\n")
  }

  loadBM25Index() {
    const fs = require("fs")
    const path = require("path")
    const bm25Path = path.join(__dirname, "../../api/data/bm25-index.json")

    if (fs.existsSync(bm25Path)) {
      this.bm25Index.loadIndex(bm25Path)
      this.bm25Loaded = true
      console.log("  ✓ BM25 index loaded")
    } else {
      console.log("  ⚠ BM25 index not found (keyword search unavailable)")
    }
  }

  async retrieve(params) {
    const startTime = Date.now()

    this.stats.totalQueries++

    const {
      query,
      queryType = "auto",
      topK = 10,
      filters = null,
      useHybrid = "auto",
      returnScores = true,
      returnMetadata = true,
    } = params

    let analysis
    if (queryType === "auto") {
      analysis = await this.queryAgent.analyze(query)
    } else {
      analysis = {
        originalQuery: query,
        queryType,
        intent: "search",
        filters: filters || {},
        complexity: "moderate",
        needsMultiHop: false,
        confidence: 1.0,
      }
    }

    console.log(`\n--- Retrieval ---`)
    console.log(`Query: "${query}"`)
    console.log(`Type: ${analysis.queryType}, Intent: ${analysis.intent}`)
    console.log(
      `Filters:`,
      Object.keys(analysis.filters).length > 0 ? analysis.filters : "none"
    )

    let results

    try {
      if (analysis.needsMultiHop) {
        this.stats.multiHopSearches++
        results = await this.multiHopRetrieve(analysis, topK)
      } else {
        const effectiveQueryType =
          queryType === "auto" ? analysis.queryType : queryType
        const effectiveUseHybrid =
          useHybrid === "auto"
            ? effectiveQueryType === "hybrid" ||
              analysis.complexity === "moderate"
            : useHybrid

        if (effectiveUseHybrid) {
          this.stats.hybridSearches++
          results = await this.hybridRetrieve(analysis, topK)
        } else if (
          effectiveQueryType === "exact" ||
          effectiveQueryType === "bm25"
        ) {
          this.stats.bm25Searches++
          results = await this.bm25Retrieve(analysis, topK)
        } else {
          this.stats.vectorSearches++
          results = await this.vectorRetrieve(analysis, topK)
        }
      }

      const endTime = Date.now()
      const responseTime = endTime - startTime
      this.updateAverageResponseTime(responseTime)

      console.log(`Results: ${results.length} (${responseTime}ms)`)

      return {
        query: analysis.originalQuery,
        results,
        queryType: analysis.queryType,
        intent: analysis.intent,
        filters: analysis.filters,
        responseTime,
        metadata: returnMetadata
          ? {
              analysis,
              retrievalMethod: analysis.needsMultiHop
                ? "multi-hop"
                : effectiveUseHybrid
                ? "hybrid"
                : effectiveQueryType,
              confidence: analysis.confidence,
            }
          : null,
      }
    } catch (error) {
      console.error("Retrieval failed:", error.message)
      throw error
    }
  }

  async vectorRetrieve(analysis, topK) {
    if (!this.qdrantClient) {
      throw new Error("Qdrant client not available")
    }

    const embedding = await this.embeddingGenerator.generate(
      analysis.originalQuery
    )

    const filters = this.buildFilters(analysis.filters)

    const results = await this.qdrantClient.search({
      vector: embedding,
      vectorName: "combined",
      limit: topK * 2,
      filter: filters,
      scoreThreshold: 0.3,
    })

    return results.slice(0, topK).map(result => ({
      id: result.payload.id,
      document: result.payload,
      score: result.score,
      method: "vector",
    }))
  }

  async bm25Retrieve(analysis, topK) {
    if (!this.bm25Loaded) {
      throw new Error("BM25 index not loaded")
    }

    const filters = analysis.filters || {}

    const results = this.bm25Index.searchWithFilters(
      analysis.originalQuery,
      filters,
      topK * 2
    )

    return results.slice(0, topK).map(result => ({
      id: result.document.id,
      document: result.document,
      score:
        result.score /
        Math.max(1, this.bm25Index.getStats().totalDocuments / 100),
      method: "bm25",
    }))
  }

  async hybridRetrieve(analysis, topK) {
    const [vectorResults, bm25Results] = await Promise.all([
      this.vectorRetrieve(analysis, topK * 2).catch(() => []),
      this.bm25Retrieve(analysis, topK * 2).catch(() => []),
    ])

    const fused = this.reciprocalRankFusion(vectorResults, bm25Results, topK)

    return fused.map(item => ({
      ...item,
      method: "hybrid",
    }))
  }

  async multiHopRetrieve(analysis, topK) {
    const hopResults = await Promise.all([
      this.hybridRetrieve(analysis, topK / 2),
      this.compareRetrieve(analysis, topK / 2),
    ])

    const combined = []

    hopResults.forEach(hop => {
      hop.results.forEach(result => {
        if (!combined.find(r => r.id === result.id)) {
          combined.push(result)
        }
      })
    })

    return combined.slice(0, topK)
  }

  async compareRetrieve(analysis, topK) {
    const filters = analysis.filters || {}

    const embeddings = await this.embeddingGenerator.generate(
      analysis.originalQuery
    )

    const filter = this.qdrantClient.buildFilter(filters)

    const results = await this.qdrantClient.search({
      vector: embeddings,
      limit: topK,
      filter,
    })

    return results.map(result => ({
      id: result.payload.id,
      document: result.payload,
      score: result.score,
      method: "vector",
    }))
  }

  reciprocalRankFusion(vectorResults, bm25Results, k = 60) {
    const scores = new Map()

    vectorResults.forEach((result, index) => {
      const id = result.id
      const score = 1 / (k + index + 1)

      const existing = scores.get(id) || { score: 0, result: null, methods: [] }
      scores.set(id, {
        score: existing.score + score,
        result: result,
        methods: [...existing.methods, "vector"],
      })
    })

    bm25Results.forEach((result, index) => {
      const id = result.id
      const score = 1 / (k + index + 1)

      const existing = scores.get(id) || { score: 0, result: null, methods: [] }
      scores.set(id, {
        score: existing.score + score,
        result: result,
        methods: [...existing.methods, "bm25"],
      })
    })

    return Array.from(scores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
  }

  buildFilters(filters) {
    if (!filters || Object.keys(filters).length === 0) {
      return null
    }

    return this.qdrantClient.buildFilter(filters)
  }

  updateAverageResponseTime(responseTime) {
    const n = this.stats.totalQueries
    this.stats.averageResponseTime =
      (this.stats.averageResponseTime * (n - 1) + responseTime) / n
  }

  async perOrgAnalysis(orgName, params = {}) {
    const { limit = 50, sort = "year", sortOrder = "desc" } = params

    console.log(`\n--- Per-Organization Analysis ---`)
    console.log(`Organization: ${orgName}`)

    const orgResults = await this.retrieve({
      query: orgName,
      queryType: "bm25",
      topK: limit,
      filters: { org: orgName },
      returnMetadata: false,
    })

    const results = orgResults.results || []

    const analysis = this.analyzeOrgIdeas(results)

    return {
      org: orgName,
      totalIdeas: results.length,
      ideas: results,
      analysis,
    }
  }

  analyzeOrgIdeas(ideas) {
    const analysis = {
      byYear: {},
      byStatus: {},
      byDifficulty: {},
      byTechStack: {},
      byTopic: {},
      averageProjectsPerIdea: 0,
      mostCommonTech: [],
      mostCommonTopic: [],
      recentActivity: null,
      oldestActivity: null,
    }

    ideas.forEach(idea => {
      const year = idea.year
      analysis.byYear[year] = (analysis.byYear[year] || 0) + 1

      const status = idea.status
      analysis.byStatus[status] = (analysis.byStatus[status] || 0) + 1

      const difficulty = idea.difficulty || "unknown"
      analysis.byDifficulty[difficulty] =
        (analysis.byDifficulty[difficulty] || 0) + 1

      if (idea.tech_stack) {
        idea.tech_stack.forEach(tech => {
          analysis.byTechStack[tech] = (analysis.byTechStack[tech] || 0) + 1
        })
      }

      if (idea.topics) {
        idea.topics.forEach(topic => {
          analysis.byTopic[topic] = (analysis.byTopic[topic] || 0) + 1
        })
      }
    })

    const techEntries = Object.entries(analysis.byTechStack)
    techEntries.sort((a, b) => b[1] - a[1])
    analysis.mostCommonTech = techEntries.slice(0, 5)

    const topicEntries = Object.entries(analysis.byTopic)
    topicEntries.sort((a, b) => b[1] - a[1])
    analysis.mostCommonTopic = topicEntries.slice(0, 5)

    return analysis
  }

  getStats() {
    return {
      ...this.stats,
      qdrantPoints: this.qdrantClient.getPointCount(),
      bm25Loaded: this.bm25Loaded,
      bm25Stats: this.bm25Loaded ? this.bm25Index.getStats() : null,
    }
  }

  resetStats() {
    this.stats = {
      totalQueries: 0,
      vectorSearches: 0,
      bm25Searches: 0,
      hybridSearches: 0,
      multiHopSearches: 0,
      averageResponseTime: 0,
    }
  }
}

module.exports = RetrievalOrchestrator
