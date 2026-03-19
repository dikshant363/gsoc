const { GoogleGenerativeAI } = require("@google/generative-ai")
require("dotenv").config()

class QueryIntelligenceAgent {
  constructor() {
    this.genAI = process.env.GEMINI_API_KEY
      ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      : null
    this.model = this.genAI
      ? this.genAI.getGenerativeModel({ model: "gemini-pro" })
      : null
  }

  async analyze(query) {
    const analysis = {
      originalQuery: query,
      queryType: "semantic",
      intent: "search",
      filters: {},
      language: "en",
      complexity: "simple",
      entities: [],
      needsMultiHop: false,
      confidence: 0.5,
    }

    if (!query || query.trim().length === 0) {
      return analysis
    }

    if (this.model) {
      return await this.analyzeWithAI(query)
    }

    return this.analyzeWithRules(query)
  }

  async analyzeWithAI(query) {
    const prompt = `Analyze this search query for GSoC ideas/projects and return a JSON response.

Query: "${query}"

Analyze and extract:
1. query_type: One of "semantic", "exact", "hybrid" (default: hybrid)
2. intent: One of "search", "recommend", "compare", "analyze", "summarize"
3. filters: Extract these if mentioned:
   - org: organization name(s)
   - year: year(s) (2016-2025)
   - tech_stack: technology names
   - topics: domain topics
   - difficulty: easy/medium/hard/expert
   - status: proposed/in-progress/completed/abandoned
   - language: content language
4. language: Query language code (en, es, fr, etc.)
5. complexity: simple, moderate, or complex
6. entities: Named entities (org names, tech, people, etc.)
7. needs_multi_hop: true if query requires combining multiple searches (e.g., "compare X and Y")
8. confidence: 0.0-1.0 confidence in analysis

Return ONLY valid JSON, no markdown or explanation.`

    try {
      const result = await this.model.generateContent(prompt)
      const text = result.response.text()

      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0])
        return this.validateAndNormalize(analysis, query)
      }

      return this.analyzeWithRules(query)
    } catch (error) {
      console.error("AI analysis failed, using rules:", error.message)
      return this.analyzeWithRules(query)
    }
  }

  analyzeWithRules(query) {
    const queryLower = query.toLowerCase()
    const analysis = {
      originalQuery: query,
      queryType: "hybrid",
      intent: "search",
      filters: {},
      language: "en",
      complexity: "simple",
      entities: [],
      needsMultiHop: false,
      confidence: 0.6,
    }

    analysis.queryType = this.detectQueryType(queryLower)
    analysis.intent = this.detectIntent(queryLower)
    analysis.filters = this.extractFilters(queryLower)
    analysis.complexity = this.detectComplexity(queryLower)
    analysis.needsMultiHop = this.detectMultiHop(queryLower)
    analysis.entities = this.extractEntities(queryLower)

    return analysis
  }

  detectQueryType(query) {
    const exactPatterns = [
      /\bprojects?\s+by\s+/i,
      /\bfind\s+all\s+projects?\s+using\s+/i,
      /\bexact\s+match\s+for\s+/i,
      /\bprojects?\s+with\s+exactly\s+/i,
    ]

    const semanticPatterns = [
      /\bsimilar\s+to\s+/i,
      /\blike\s+/i,
      /\brelated\s+to\s+/i,
      /\bconceptually\s+similar\s+/i,
    ]

    for (const pattern of exactPatterns) {
      if (pattern.test(query)) {
        return "exact"
      }
    }

    for (const pattern of semanticPatterns) {
      if (pattern.test(query)) {
        return "semantic"
      }
    }

    return "hybrid"
  }

  detectIntent(query) {
    const intents = {
      recommend: [
        /\brecommend\s+/i,
        /\bsuggest\s+/i,
        /\bwhat\s+should\s+i\s+do\s+/i,
        /\bgood\s+for\s+beginner/i,
        /\bbest\s+project\s+for\s+/i,
      ],
      compare: [
        /\bcompare\s+/i,
        /\bvs\b|\bversus\b/i,
        /\bdifference\s+between\s+/i,
        /\bwhich\s+is\s+better/i,
      ],
      analyze: [
        /\banalyze\s+/i,
        /\bstatistics?\s+for\s+/i,
        /\btrends?\s+in\s+/i,
        /\bhistor(y|ies)\s+of\s+/i,
      ],
      summarize: [
        /\bsummarize\s+/i,
        /\boverview\s+of\s+/i,
        /\bwhat\s+are\s+all\s+/i,
        /\blist\s+all\s+/i,
      ],
    }

    for (const [intent, patterns] of Object.entries(intents)) {
      for (const pattern of patterns) {
        if (pattern.test(query)) {
          return intent
        }
      }
    }

    return "search"
  }

  extractFilters(query) {
    const filters = {}

    const orgPattern = /\b(?:organization|org):\s*["']?([^"'\s,]+)["']?/i
    const orgMatch = query.match(orgPattern)
    if (orgMatch) {
      filters.org = orgMatch[1].trim()
    }

    const yearPattern = /\b(?:year):\s*(\d{4})\b/i
    const yearMatch = query.match(yearPattern)
    if (yearMatch) {
      filters.year = parseInt(yearMatch[1])
    }

    const techPatterns = [
      /\b(?:tech|technology|stack):\s*["']?([^"'\[\]]+)["']?/i,
      /\b(?:using|with|in)\s+(\w+(?:\s*\+\s*\w+)*)/i,
    ]

    for (const pattern of techPatterns) {
      const match = query.match(pattern)
      if (match) {
        const techs = match[1]
          .split(/[,+]/)
          .map(t => t.trim())
          .filter(t => t.length > 0)
        if (techs.length > 0) {
          filters.tech_stack = techs
          break
        }
      }
    }

    const difficultyPattern = /\b(?:difficulty):\s*(easy|medium|hard|expert)/i
    const difficultyMatch = query.match(difficultyPattern)
    if (difficultyMatch) {
      filters.difficulty = difficultyMatch[1].toLowerCase()
    }

    const statusPattern =
      /\b(?:status):\s*(proposed|in-progress|completed|abandoned)/i
    const statusMatch = query.match(statusPattern)
    if (statusMatch) {
      filters.status = statusMatch[1].toLowerCase().replace("-", "-")
    }

    return filters
  }

  detectComplexity(query) {
    const complexityIndicators = {
      complex: [
        /\band\b.*\band\b/i,
        /\bor\b.*\bor\b/i,
        /\bcompare\b/i,
        /\bvs\b/i,
        /\bdifference\b/i,
        /\bbetween\b/i,
        /\bwhich\s+is\s+better\b/i,
        /\brecommend\s+for\s+multiple\s+criteria\b/i,
      ],
      moderate: [
        /\bwith\s+filter/i,
        /\b(?:year|org|tech|topic):\s*\w+/i,
        /\b(?:easy|medium|hard|expert)\b/i,
        /\bproposed|in-progress|completed|abandoned\b/i,
      ],
    }

    for (const pattern of complexityIndicators.complex) {
      if (pattern.test(query)) {
        return "complex"
      }
    }

    for (const pattern of complexityIndicators.moderate) {
      if (pattern.test(query)) {
        return "moderate"
      }
    }

    return "simple"
  }

  detectMultiHop(query) {
    const multiHopPatterns = [
      /\bcompare\b/i,
      /\bvs\b|\bversus\b/i,
      /\bdifference\s+between\b/i,
      /\bwhich\s+is\s+better\b/i,
      /\b(?:both|and|or)\s+organizations?\b/i,
      /\b(?:similar|related)\s+projects?\s+in\s+different\s+orgs\b/i,
    ]

    for (const pattern of multiHopPatterns) {
      if (pattern.test(query)) {
        return true
      }
    }

    return false
  }

  extractEntities(query) {
    const entities = []

    const techEntities = [
      "python",
      "javascript",
      "java",
      "go",
      "rust",
      "c++",
      "c#",
      "react",
      "vue",
      "angular",
      "django",
      "flask",
      "spring",
      "postgresql",
      "mysql",
      "mongodb",
      "redis",
      "elasticsearch",
      "tensorflow",
      "pytorch",
      "keras",
      "scikit-learn",
      "docker",
      "kubernetes",
      "aws",
      "azure",
      "gcp",
      "graphql",
      "grpc",
      "rest",
      "websocket",
      "blockchain",
      "ethereum",
      "smart contract",
      "machine learning",
      "deep learning",
      "ai",
      "nlp",
      "computer vision",
      "iot",
      "mobile",
      "web",
      "database",
      "android",
      "ios",
      "windows",
      "linux",
      "macos",
    ]

    for (const tech of techEntities) {
      const regex = new RegExp(`\\b${tech}\\b`, "i")
      if (regex.test(query)) {
        entities.push({ type: "technology", value: tech })
      }
    }

    const numbers = query.match(/\b\d{4}\b/g)
    if (numbers) {
      numbers.forEach(year => {
        const numYear = parseInt(year)
        if (numYear >= 2016 && numYear <= 2025) {
          entities.push({ type: "year", value: numYear })
        }
      })
    }

    const orgPattern = /\b(?:organization|org):\s*["']?([^"'\s,]+)["']?/i
    const orgMatch = query.match(orgPattern)
    if (orgMatch) {
      entities.push({ type: "organization", value: orgMatch[1].trim() })
    }

    return entities
  }

  validateAndNormalize(analysis, originalQuery) {
    const validQueryTypes = ["semantic", "exact", "hybrid"]
    const validIntents = [
      "search",
      "recommend",
      "compare",
      "analyze",
      "summarize",
    ]
    const validComplexities = ["simple", "moderate", "complex"]
    const validLanguages = [
      "en",
      "es",
      "fr",
      "de",
      "pt",
      "ru",
      "zh",
      "ja",
      "ko",
    ]

    analysis.queryType = validQueryTypes.includes(analysis.query_type)
      ? analysis.query_type
      : "hybrid"
    analysis.intent = validIntents.includes(analysis.intent)
      ? analysis.intent
      : "search"
    analysis.complexity = validComplexities.includes(analysis.complexity)
      ? analysis.complexity
      : "simple"
    analysis.language = validLanguages.includes(analysis.language)
      ? analysis.language
      : "en"
    analysis.originalQuery = originalQuery
    analysis.confidence = Math.max(0, Math.min(1, analysis.confidence || 0.5))

    return {
      originalQuery: analysis.originalQuery,
      queryType: analysis.query_type,
      intent: analysis.intent,
      filters: analysis.filters || {},
      language: analysis.language,
      complexity: analysis.complexity,
      entities: analysis.entities || [],
      needsMultiHop: analysis.needs_multi_hop || false,
      confidence: analysis.confidence,
    }
  }

  async analyzeBatch(queries) {
    return await Promise.all(queries.map(query => this.analyze(query)))
  }
}

module.exports = QueryIntelligenceAgent
