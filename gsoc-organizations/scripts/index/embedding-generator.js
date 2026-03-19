const { GoogleGenerativeAI } = require("@google/generative-ai")
require("dotenv").config()

class EmbeddingGenerator {
  constructor() {
    this.genAI = process.env.GEMINI_API_KEY
      ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      : null

    this.model = this.genAI
      ? this.genAI.getGenerativeModel({ model: "embedding-001" })
      : null
    this.cache = new Map()
    this.mockMode = !this.genAI
  }

  async generate(text) {
    if (!text || text.trim().length === 0) {
      return this.getMockEmbedding()
    }

    const cacheKey = text.substring(0, 200)
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }

    if (this.mockMode) {
      console.warn("⚠ Using mock embeddings (GEMINI_API_KEY not set)")
      const mock = this.getMockEmbedding()
      this.cache.set(cacheKey, mock)
      return mock
    }

    try {
      const result = await this.model.embedContent(text)
      const embedding = result.embedding.values

      this.cache.set(cacheKey, embedding)
      return embedding
    } catch (error) {
      console.error(`Embedding generation failed: ${error.message}`)
      return this.getMockEmbedding()
    }
  }

  async generateBatch(texts) {
    const embeddings = []

    for (let i = 0; i < texts.length; i++) {
      const text = texts[i]
      const embedding = await this.generate(text)
      embeddings.push(embedding)

      if ((i + 1) % 10 === 0) {
        console.log(`Generated ${i + 1}/${texts.length} embeddings...`)
      }
    }

    return embeddings
  }

  async generateMultiVectors(idea) {
    const titleText = idea.title || ""
    const descriptionText = idea.description || idea.short_description || ""
    const techStackText = idea.tech_stack ? idea.tech_stack.join(", ") : ""

    const combinedText = `
Title: ${titleText}
Description: ${descriptionText}
Technologies: ${techStackText}
Topics: ${idea.topics ? idea.topics.join(", ") : ""}
Organization: ${idea.org}
`.trim()

    const [
      titleEmbedding,
      descriptionEmbedding,
      techStackEmbedding,
      combinedEmbedding,
    ] = await Promise.all([
      this.generate(titleText),
      this.generate(descriptionText),
      this.generate(techStackText),
      this.generate(combinedText),
    ])

    return {
      title: titleEmbedding,
      description: descriptionEmbedding,
      tech_stack: techStackEmbedding,
      combined: combinedEmbedding,
    }
  }

  async generateMultiVectorsBatch(ideas) {
    const vectorsList = []

    console.log(
      `\nGenerating multi-vector embeddings for ${ideas.length} ideas...`
    )

    for (let i = 0; i < ideas.length; i++) {
      const idea = ideas[i]

      try {
        const vectors = await this.generateMultiVectors(idea)
        vectorsList.push({ idea, vectors })

        if ((i + 1) % 50 === 0) {
          console.log(`Processed ${i + 1}/${ideas.length} ideas...`)
        }
      } catch (error) {
        console.error(
          `Failed to generate embeddings for idea ${idea.id}: ${error.message}`
        )
        vectorsList.push({ idea, vectors: null })
      }
    }

    return vectorsList
  }

  getMockEmbedding() {
    const dimensions = 768
    const embedding = []

    for (let i = 0; i < dimensions; i++) {
      embedding.push(Math.random() * 2 - 1)
    }

    return embedding
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      mode: this.mockMode ? "mock" : "real",
    }
  }

  clearCache() {
    this.cache.clear()
  }
}

module.exports = EmbeddingGenerator
