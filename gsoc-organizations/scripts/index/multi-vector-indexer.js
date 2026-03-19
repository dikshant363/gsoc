const fs = require("fs")
const path = require("path")

const EmbeddingGenerator = require("./embedding-generator")
const QdrantClient = require("../../api/qdrant/client")
const BM25Index = require("./bm25-index")

class MultiVectorIndexer {
  constructor() {
    this.embeddingGenerator = new EmbeddingGenerator()
    this.qdrantClient = null
    this.bm25Index = new BM25Index()

    this.stats = {
      totalIdeas: 0,
      successfulEmbeddings: 0,
      failedEmbeddings: 0,
      uploadedToQdrant: 0,
      bm25IndexSize: 0,
    }
  }

  async initialize(qdrantConfig) {
    console.log("Initializing multi-vector indexer...")

    this.qdrantClient = new QdrantClient(qdrantConfig)

    const connected = await this.qdrantClient.testConnection()
    if (!connected) {
      throw new Error("Failed to connect to Qdrant")
    }

    console.log("✓ Indexer initialized")
  }

  async buildVectorIndex(ideasPath, schemaPath) {
    console.log("\n====================================")
    console.log("Building Multi-Vector Index")
    console.log("====================================\n")

    const ideas = this.loadIdeas(ideasPath)
    const schema = this.loadSchema(schemaPath)

    console.log(`\nLoaded ${ideas.length} ideas`)

    await this.qdrantClient.recreateCollection(schema)

    await this.qdrantClient.createAllPayloadIndexes()

    const vectorsList = await this.embeddingGenerator.generateMultiVectorsBatch(
      ideas
    )

    const points = this.convertToQdrantPoints(vectorsList)

    await this.qdrantClient.upsertPoints(points)

    const pointCount = await this.qdrantClient.getPointCount()
    console.log(`\n✓ Total points in Qdrant: ${pointCount}`)

    this.printStats()
  }

  async buildBM25Index(ideasPath, outputPath) {
    console.log("\n====================================")
    console.log("Building BM25 Index")
    console.log("====================================\n")

    const ideas = this.loadIdeas(ideasPath)

    this.bm25Index.indexDocuments(ideas)
    this.bm25Index.saveIndex(outputPath)

    const stats = this.bm25Index.getStats()
    this.stats.bm25IndexSize = stats.totalDocuments

    console.log("\n✓ BM25 index built")
    console.log(`  - Documents: ${stats.totalDocuments}`)
    console.log(`  - Unique terms: ${stats.uniqueTerms}`)
    console.log(`  - Avg doc length: ${stats.averageDocumentLength.toFixed(2)}`)
  }

  async buildAllIndexes(ideasPath, schemaPath, bm25OutputPath) {
    console.log("\n====================================")
    console.log("Building All Indexes")
    console.log("====================================\n")

    await this.buildVectorIndex(ideasPath, schemaPath)
    await this.buildBM25Index(ideasPath, bm25OutputPath)

    console.log("\n====================================")
    console.log("All Indexes Built Successfully!")
    console.log("====================================\n")

    this.printStats()
  }

  loadIdeas(ideasPath) {
    if (!fs.existsSync(ideasPath)) {
      throw new Error(`Ideas file not found: ${ideasPath}`)
    }

    const data = JSON.parse(fs.readFileSync(ideasPath, "utf-8"))

    if (data.ideas) {
      return data.ideas
    }

    return data
  }

  loadSchema(schemaPath) {
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found: ${schemaPath}`)
    }

    return JSON.parse(fs.readFileSync(schemaPath, "utf-8"))
  }

  convertToQdrantPoints(vectorsList) {
    const points = []

    for (const { idea, vectors } of vectorsList) {
      if (!vectors) {
        this.stats.failedEmbeddings++
        continue
      }

      this.stats.successfulEmbeddings++

      const point = {
        id: this.hashId(idea.id),
        vector: vectors.combined,
        payload: {
          id: idea.id,
          org: idea.org,
          year: idea.year,
          status: idea.status,
          title: idea.title,
          description: idea.description.substring(0, 1000),
          tech_stack: idea.tech_stack || [],
          languages: idea.languages || [],
          topics: idea.topics || [],
          difficulty: idea.difficulty,
          language: idea.language,
          category: idea.org_category,
        },
        vectors: {
          title: vectors.title,
          description: vectors.description,
          tech_stack: vectors.tech_stack,
          combined: vectors.combined,
        },
      }

      points.push(point)
    }

    this.stats.totalIdeas = vectorsList.length
    this.stats.uploadedToQdrant = points.length

    return points
  }

  hashId(id) {
    let hash = 0
    const str = String(id)

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }

    return Math.abs(hash)
  }

  async search(params) {
    const {
      query,
      vector,
      topK = 10,
      filters = null,
      useHybrid = false,
      vectorWeights = null,
    } = params

    if (useHybrid) {
      return this.hybridSearch(params)
    }

    if (vector) {
      return this.vectorSearch({ vector, topK, filters })
    }

    if (query) {
      const embedding = await this.embeddingGenerator.generate(query)
      return this.vectorSearch({ vector: embedding, topK, filters })
    }

    return []
  }

  async vectorSearch(params) {
    const { vector, vectorName = null, topK, filters } = params

    const results = await this.qdrantClient.search({
      vector,
      vectorName,
      limit: topK,
      filter: filters,
    })

    return results.map(result => ({
      id: result.payload.id,
      score: result.score,
      document: result.payload,
    }))
  }

  async multiVectorSearch(params) {
    const { vectors, topK, filters, weights } = params

    const results = await this.qdrantClient.searchMulti({
      vectors,
      limit: topK,
      filter: filters,
      weights,
    })

    return results.map(result => ({
      id: result.payload.id,
      score: result.score,
      document: result.payload,
    }))
  }

  async hybridSearch(params) {
    const { query, topK = 10, filters = null, weights = null } = params

    const [embedding, bm25Results] = await Promise.all([
      this.embeddingGenerator.generate(query),
      Promise.resolve(
        this.bm25Index.searchWithFilters(query, filters, topK * 2)
      ),
    ])

    const vectorResults = await this.qdrantClient.search({
      vector: embedding,
      limit: topK * 2,
      filter: filters,
    })

    return this.reciprocalRankFusion(vectorResults, bm25Results, topK)
  }

  reciprocalRankFusion(vectorResults, bm25Results, k = 60) {
    const scores = new Map()

    vectorResults.forEach((result, index) => {
      const score = 1 / (k + index + 1)
      const id = result.payload.id

      const existing = scores.get(id) || { score: 0, result: null }
      scores.set(id, {
        score: existing.score + score,
        result: result.payload,
      })
    })

    bm25Results.forEach((result, index) => {
      const score = 1 / (k + index + 1)
      const id = result.document.id

      const existing = scores.get(id) || { score: 0, result: null }
      scores.set(id, {
        score: existing.score + score,
        result: result.document,
      })
    })

    return Array.from(scores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
      .map(item => ({
        id: item.result.id,
        score: item.score,
        document: item.result,
      }))
  }

  printStats() {
    console.log("\n=== Indexing Statistics ===")
    console.log(`Total ideas: ${this.stats.totalIdeas}`)
    console.log(`Successful embeddings: ${this.stats.successfulEmbeddings}`)
    console.log(`Failed embeddings: ${this.stats.failedEmbeddings}`)
    console.log(`Uploaded to Qdrant: ${this.stats.uploadedToQdrant}`)
    console.log(`BM25 index size: ${this.stats.bm25IndexSize}`)

    const embeddingStats = this.embeddingGenerator.getCacheStats()
    console.log(
      `\nEmbedding cache: ${embeddingStats.size} entries (${embeddingStats.mode} mode)`
    )
  }

  getStats() {
    return { ...this.stats }
  }
}

module.exports = MultiVectorIndexer
