const stemmer = require("stemmer")

class BM25Index {
  constructor(options = {}) {
    this.k1 = options.k1 || 1.5
    this.b = options.b || 0.75
    this.documents = []
    this.documentLengths = []
    this.averageDocumentLength = 0
    this.invertedIndex = new Map()
    this.documentFrequency = new Map()
    this.stopWords = new Set([
      "a",
      "an",
      "and",
      "are",
      "as",
      "at",
      "be",
      "by",
      "for",
      "from",
      "has",
      "he",
      "in",
      "is",
      "it",
      "its",
      "of",
      "on",
      "that",
      "the",
      "to",
      "was",
      "were",
      "will",
      "with",
      "the",
      "this",
      "but",
      "they",
      "have",
      "had",
      "what",
      "when",
      "where",
      "who",
      "which",
      "why",
      "how",
      "all",
      "each",
      "every",
      "both",
      "few",
      "more",
      "most",
      "other",
      "some",
      "such",
      "no",
      "nor",
      "not",
      "only",
      "own",
      "same",
      "so",
      "than",
      "too",
      "very",
      "just",
      "can",
      "will",
      "should",
      "now",
    ])
  }

  indexDocuments(documents) {
    console.log(`Building BM25 index for ${documents.length} documents...`)

    this.documents = documents
    this.invertedIndex.clear()
    this.documentFrequency.clear()

    documents.forEach((doc, docId) => {
      const text = this.buildSearchableText(doc)
      const tokens = this.tokenize(text)

      this.documentLengths[docId] = tokens.length

      const uniqueTokens = new Set(tokens)
      uniqueTokens.forEach(token => {
        this.documentFrequency.set(
          token,
          (this.documentFrequency.get(token) || 0) + 1
        )

        if (!this.invertedIndex.has(token)) {
          this.invertedIndex.set(token, [])
        }

        this.invertedIndex.get(token).push(docId)
      })
    })

    const totalLength = this.documentLengths.reduce((sum, len) => sum + len, 0)
    this.averageDocumentLength = totalLength / documents.length

    console.log(`✓ BM25 index built`)
    console.log(`  - Unique terms: ${this.invertedIndex.size}`)
    console.log(`  - Avg doc length: ${this.averageDocumentLength.toFixed(2)}`)
  }

  buildSearchableText(doc) {
    const parts = []

    if (doc.title) parts.push(doc.title)
    if (doc.description) parts.push(doc.description)
    if (doc.tech_stack) parts.push(doc.tech_stack.join(" "))
    if (doc.topics) parts.push(doc.topics.join(" "))
    if (doc.org) parts.push(doc.org)

    return parts.join(" ").toLowerCase()
  }

  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, " ")
      .replace(/\s+/g, " ")
      .split(" ")
      .filter(token => token.length > 1 && !this.stopWords.has(token))
      .map(token => stemmer(token))
  }

  search(query, topK = 10) {
    const tokens = this.tokenize(query)

    if (tokens.length === 0) {
      return []
    }

    const scores = new Map()

    tokens.forEach(token => {
      const postings = this.invertedIndex.get(token)
      if (!postings) return

      const idf = this.calculateIDF(token)

      postings.forEach(docId => {
        const score = scores.get(docId) || 0
        scores.set(docId, score + idf)
      })
    })

    const results = Array.from(scores.entries())
      .map(([docId, score]) => ({
        documentId: docId,
        document: this.documents[docId],
        score,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)

    return results
  }

  searchWithFilters(query, filters, topK = 10) {
    let results = this.search(query, topK * 3)

    if (filters) {
      results = results.filter(result =>
        this.matchesFilters(result.document, filters)
      )
    }

    return results.slice(0, topK)
  }

  matchesFilters(document, filters) {
    if (filters.org && document.org !== filters.org) return false
    if (filters.year && document.year !== parseInt(filters.year)) return false
    if (
      filters.tech_stack &&
      !this.arrayMatches(document.tech_stack, filters.tech_stack)
    )
      return false
    if (filters.topics && !this.arrayMatches(document.topics, filters.topics))
      return false
    if (filters.difficulty && document.difficulty !== filters.difficulty)
      return false
    if (filters.status && document.status !== filters.status) return false
    if (filters.language && document.language !== filters.language) return false

    return true
  }

  arrayMatches(documentArray, filterArray) {
    const filters = Array.isArray(filterArray) ? filterArray : [filterArray]
    return filters.some(
      filter => Array.isArray(documentArray) && documentArray.includes(filter)
    )
  }

  calculateIDF(term) {
    const n = this.documents.length
    const df = this.documentFrequency.get(term) || 0

    return Math.log((n - df + 0.5) / (df + 0.5) + 1)
  }

  calculateScore(docId, token) {
    const tf = this.calculateTermFrequency(docId, token)
    const idf = this.calculateIDF(token)
    const docLength = this.documentLengths[docId]
    const avgDocLength = this.averageDocumentLength

    const numerator = tf * (this.k1 + 1)
    const denominator =
      tf + this.k1 * (1 - this.b + this.b * (docLength / avgDocLength))

    return idf * (numerator / denominator)
  }

  calculateTermFrequency(docId, token) {
    const document = this.documents[docId]
    const text = this.buildSearchableText(document)
    const tokens = this.tokenize(text)

    let count = 0
    tokens.forEach(t => {
      if (t === token) count++
    })

    return count
  }

  getStats() {
    return {
      totalDocuments: this.documents.length,
      uniqueTerms: this.invertedIndex.size,
      averageDocumentLength: this.averageDocumentLength,
      vocabularySize: this.invertedIndex.size,
    }
  }

  saveIndex(filePath) {
    const indexData = {
      documents: this.documents,
      documentLengths: this.documentLengths,
      averageDocumentLength: this.averageDocumentLength,
      invertedIndex: Object.fromEntries(this.invertedIndex),
      documentFrequency: Object.fromEntries(this.documentFrequency),
    }

    require("fs").writeFileSync(filePath, JSON.stringify(indexData, null, 2))
    console.log(`✓ BM25 index saved to ${filePath}`)
  }

  loadIndex(filePath) {
    try {
      const data = require("fs").readFileSync(filePath, "utf-8")
      const indexData = JSON.parse(data)

      this.documents = indexData.documents
      this.documentLengths = indexData.documentLengths
      this.averageDocumentLength = indexData.averageDocumentLength
      this.invertedIndex = new Map(Object.entries(indexData.invertedIndex))
      this.documentFrequency = new Map(
        Object.entries(indexData.documentFrequency)
      )

      console.log(`✓ BM25 index loaded from ${filePath}`)
      console.log(`  - Documents: ${this.documents.length}`)
      console.log(`  - Unique terms: ${this.invertedIndex.size}`)
    } catch (error) {
      console.error(`Failed to load BM25 index: ${error.message}`)
    }
  }
}

module.exports = BM25Index
