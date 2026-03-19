const { QdrantClient } = require("@qdrant/js-client-rest")

class QdrantClientWrapper {
  constructor(config = {}) {
    this.host = config.host || "localhost"
    this.port = config.port || 6333
    this.apiKey = config.apiKey || null

    this.client = new QdrantClient({
      url: `http://${this.host}:${this.port}`,
      apiKey: this.apiKey,
      timeout: 30000,
      checkCompatibility: false,
    })

    this.collectionName = config.collectionName || "gsoc_ideas"
  }

  async testConnection() {
    try {
      const collections = await this.client.getCollections()
      console.log(
        `✓ Connected to Qdrant. Found ${collections.collections.length} collections`
      )
      return true
    } catch (error) {
      console.error(`✗ Failed to connect to Qdrant: ${error.message}`)
      return false
    }
  }

  async ensureCollection(schema) {
    try {
      const exists = await this.collectionExists()

      if (exists) {
        console.log(`Collection "${this.collectionName}" already exists`)
        const info = await this.getCollectionInfo()
        console.log(`Collection info:`, {
          vectors_count: info.result.points_count,
          indexed_vectors_count: info.result.indexed_vectors_count,
          status: info.result.status,
        })
        return true
      }

      console.log(`Creating collection "${this.collectionName}"...`)

      const vectorConfig = {
        size: schema.vectors.size,
        distance: schema.vectors.distance,
      }

      if (schema.vectors_config) {
        const namedVectors = {}
        for (const [name, config] of Object.entries(schema.vectors_config)) {
          namedVectors[name] = {
            size: config.size,
            distance: config.distance,
          }
        }
        const createParams = {
          vectors: namedVectors,
          optimizers_config: {
            default_segment_number: 2,
          },
          replication_factor: 1,
          write_consistency_factor: 1,
        }
        await this.client.createCollection(this.collectionName, createParams)
      } else {
        await this.client.createCollection(this.collectionName, {
          vectors: vectorConfig,
          optimizers_config: {
            default_segment_number: 2,
          },
          replication_factor: 1,
          write_consistency_factor: 1,
        })
      }

      console.log(`✓ Collection "${this.collectionName}" created successfully`)
      return true
    } catch (error) {
      console.error(`✗ Failed to create collection: ${error.message}`)
      throw error
    }
  }

  async collectionExists() {
    try {
      const response = await this.client.getCollection(this.collectionName)
      return response.result !== null
    } catch (error) {
      if (
        error.status === 404 ||
        error.response?.data?.status?.error === "Not found"
      ) {
        return false
      }
      throw error
    }
  }

  async getCollectionInfo() {
    return await this.client.getCollection(this.collectionName)
  }

  async deleteCollection() {
    try {
      await this.client.deleteCollection(this.collectionName)
      console.log(`✓ Collection "${this.collectionName}" deleted`)
      return true
    } catch (error) {
      if (
        error.status !== 404 &&
        error.response?.data?.status?.error !== "Not found"
      ) {
        console.error(`✗ Failed to delete collection: ${error.message}`)
        throw error
      }
      console.log(`Collection "${this.collectionName}" did not exist`)
      return true
    }
  }

  async recreateCollection(schema) {
    await this.deleteCollection()
    await this.ensureCollection(schema)
  }

  async upsertPoints(points) {
    try {
      const batchSize = 100
      const batches = this.chunkArray(points, batchSize)

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]
        console.log(
          `Upserting batch ${i + 1}/${batches.length} (${
            batch.length
          } points)...`
        )

        await this.client.upsert(this.collectionName, {
          wait: true,
          points: batch,
        })
      }

      console.log(`✓ Upserted ${points.length} points`)
      return true
    } catch (error) {
      console.error(`✗ Failed to upsert points: ${error.message}`)
      throw error
    }
  }

  async search(params) {
    const {
      vector,
      vectorName = null,
      limit = 10,
      filter = null,
      scoreThreshold = 0.5,
      withPayload = true,
      withVectors = false,
    } = params

    try {
      const searchParams = {
        limit,
        with_payload: withPayload,
        with_vectors: withVectors,
      }

      if (vectorName) {
        searchParams.vector = {
          name: vectorName,
          vector: vector,
        }
      } else {
        searchParams.vector = vector
      }

      if (scoreThreshold) {
        searchParams.score_threshold = scoreThreshold
      }

      if (filter) {
        searchParams.filter = this.buildFilter(filter)
      }

      const response = await this.client.search(
        this.collectionName,
        searchParams
      )
      return response.result
    } catch (error) {
      console.error(`✗ Search failed: ${error.message}`)
      throw error
    }
  }

  async getPoint(id) {
    try {
      const response = await this.client.retrieve(this.collectionName, {
        ids: [id],
        with_payload: true,
        with_vectors: false,
      })

      return response.result[0] || null
    } catch (error) {
      console.error(`✗ Failed to get point: ${error.message}`)
      return null
    }
  }

  async getPointCount() {
    try {
      const info = await this.getCollectionInfo()
      return info.result.points_count
    } catch (error) {
      console.error(`✗ Failed to get point count: ${error.message}`)
      return 0
    }
  }

  buildFilter(filter) {
    if (!filter) return null

    const conditions = []

    if (filter.org) {
      const orgs = Array.isArray(filter.org) ? filter.org : [filter.org]
      conditions.push({
        key: "org",
        match: { any: orgs },
      })
    }

    if (filter.year) {
      const years = Array.isArray(filter.year) ? filter.year : [filter.year]
      conditions.push({
        key: "year",
        match: { any: years },
      })
    }

    if (filter.tech_stack) {
      const techs = Array.isArray(filter.tech_stack)
        ? filter.tech_stack
        : [filter.tech_stack]
      conditions.push({
        key: "tech_stack",
        match: { any: techs },
      })
    }

    if (filter.topics) {
      const topics = Array.isArray(filter.topics)
        ? filter.topics
        : [filter.topics]
      conditions.push({
        key: "topics",
        match: { any: topics },
      })
    }

    if (filter.difficulty) {
      const difficulties = Array.isArray(filter.difficulty)
        ? filter.difficulty
        : [filter.difficulty]
      conditions.push({
        key: "difficulty",
        match: { any: difficulties },
      })
    }

    if (filter.status) {
      const statuses = Array.isArray(filter.status)
        ? filter.status
        : [filter.status]
      conditions.push({
        key: "status",
        match: { any: statuses },
      })
    }

    if (filter.language) {
      const languages = Array.isArray(filter.language)
        ? filter.language
        : [filter.language]
      conditions.push({
        key: "language",
        match: { any: languages },
      })
    }

    if (conditions.length === 0) return null

    return {
      must: conditions,
    }
  }

  chunkArray(array, chunkSize) {
    const chunks = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }

  async deletePoints(ids) {
    try {
      await this.client.delete(this.collectionName, {
        wait: true,
        points: ids,
      })
      console.log(`✓ Deleted ${ids.length} points`)
      return true
    } catch (error) {
      console.error(`✗ Failed to delete points: ${error.message}`)
      throw error
    }
  }

  async createPayloadIndex(fieldName) {
    try {
      await this.client.createPayloadIndex(this.collectionName, {
        field_name: fieldName,
        field_schema: "keyword",
      })
      console.log(`✓ Created payload index for "${fieldName}"`)
      return true
    } catch (error) {
      if (error.response?.data?.status?.error?.includes("already exists")) {
        console.log(`Payload index for "${fieldName}" already exists`)
        return true
      }
      console.error(`✗ Failed to create payload index: ${error.message}`)
      throw error
    }
  }

  async createAllPayloadIndexes() {
    const fields = [
      "id",
      "org",
      "year",
      "status",
      "difficulty",
      "language",
      "category",
    ]

    for (const field of fields) {
      await this.createPayloadIndex(field)
    }
  }
}

module.exports = QdrantClientWrapper
