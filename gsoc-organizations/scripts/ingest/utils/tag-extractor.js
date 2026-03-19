const { GoogleGenerativeAI } = require("@google/generative-ai")
require("dotenv").config()

const { technologyFilters, topicFilters } = require("../../../api/filters")

class TagExtractor {
  constructor() {
    this.genAI = process.env.GEMINI_API_KEY
      ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      : null
    this.model = this.genAI
      ? this.genAI.getGenerativeModel({ model: "gemini-pro" })
      : null
  }

  extractTechStack(text, existingTechs = []) {
    if (!text) return existingTechs

    const techs = new Set(existingTechs)

    const techPatterns = {
      javascript:
        /\b(?:javascript|js|node(?:\.js)?|express(?:js)?|react(?:js)?|vue(?:js)?|angular(?:js)?|next(?:js)?|nestjs|nuxt|gatsby)\b/gi,
      python:
        /\b(?:python|django|flask|fastapi|pytorch|tensorflow|pandas|numpy|scikit-learn|keras|pip)\b/gi,
      java: /\b(?:java|spring(?:boot)?|hibernate|maven|gradle)\b/gi,
      go: /\b(?:golang|go)\b/gi,
      rust: /\brust\b/gi,
      cpp: /\b(?:c\+\+|cpp|qt)\b/gi,
      csharp: /\b(?:c\s*#|csharp|\.net|asp\.net)\b/gi,
      typescript: /\b(?:typescript|ts)\b/gi,
      php: /\bphp\b/gi,
      ruby: /\b(?:ruby|rails|sinatra)\b/gi,
      swift: /\bswift\b/gi,
      kotlin: /\bkotlin\b/gi,
      sql: /\b(?:sql|postgresql|mysql|sqlite|mongodb|redis|elasticsearch|neo4j)\b/gi,
      android: /\b(?:android|kotlin|gradle)\b/gi,
      ios: /\b(?:ios|swift|objective-c)\b/gi,
      web: /\b(?:html|css|javascript|react|vue|angular|typescript)\b/gi,
      machineLearning:
        /\b(?:machine learning|ml|deep learning|ai|artificial intelligence|neural network|nlp|computer vision)\b/gi,
      devops: /\b(?:docker|kubernetes|ci\/cd|jenkins|terraform|ansible)\b/gi,
      cloud: /\b(?:aws|azure|gcp|google cloud|amazon web services)\b/gi,
      blockchain: /\b(?:blockchain|ethereum|smart contract|web3)\b/gi,
      game: /\b(?:game|unity|unreal|gaming)\b/gi,
    }

    for (const [tech, pattern] of Object.entries(techPatterns)) {
      const matches = text.match(pattern)
      if (matches) {
        techs.add(tech)
      }
    }

    return Array.from(techs)
  }

  extractTopics(text, existingTopics = []) {
    if (!text) return existingTopics

    const topics = new Set(existingTopics)

    const topicPatterns = {
      robotics: /\brobotics?\b/gi,
      security: /\b(?:security|cybersecurity|cryptography|encryption)\b/gi,
      data: /\b(?:data science|analytics|visualization|big data)\b/gi,
      mobile: /\b(?:mobile|android|ios|app)\b/gi,
      web: /\b(?:web|frontend|backend|full[- ]stack)\b/gi,
      database: /\b(?:database|dbms|storage|persistence)\b/gi,
      networking: /\b(?:network|protocol|tcp\/ip|http|api)\b/gi,
      devops: /\b(?:devops|infrastructure|deployment|scaling)\b/gi,
      testing: /\b(?:testing|qa|quality assurance|tdd)\b/gi,
      documentation: /\b(?:documentation|docs|technical writing)\b/gi,
      ui: /\b(?:ui|ux|user interface|user experience|design)\b/gi,
      ml: /\b(?:machine learning|ml|deep learning|ai)\b/gi,
      nlp: /\b(?:nlp|natural language processing|text processing)\b/gi,
      cv: /\b(?:computer vision|image processing|opencv)\b/gi,
      iot: /\b(?:iot|internet of things|embedded)\b/gi,
      blockchain: /\b(?:blockchain|decentralized|crypto)\b/gi,
      gaming: /\b(?:game|gaming|esports)\b/gi,
      education: /\b(?:education|learning|teaching|e[- ]learning)\b/gi,
      health: /\b(?:health|medical|biotech|bioinformatics)\b/gi,
      science: /\b(?:science|research|scientific|research)\b/gi,
    }

    for (const [topic, pattern] of Object.entries(topicPatterns)) {
      const matches = text.match(pattern)
      if (matches) {
        topics.add(topic)
      }
    }

    return Array.from(topics)
  }

  async extractTagsWithAI(text, context = {}) {
    if (!this.model || !text) {
      return {
        tags: [],
        confidence: 0,
      }
    }

    try {
      const prompt = `Extract relevant tags from this project description:

${text}

Return only a comma-separated list of 5-10 most relevant tags (technologies, topics, domains). Do not include explanations.`

      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const tagsText = response.text()

      const tags = tagsText
        .split(",")
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 2)

      return {
        tags,
        confidence: 0.7,
      }
    } catch (error) {
      console.error("AI tag extraction failed:", error.message)
      return {
        tags: [],
        confidence: 0,
      }
    }
  }

  normalizeTags(tags, type = "tech") {
    if (!Array.isArray(tags)) return []

    const normalized = new Set()

    for (const tag of tags) {
      const tagLower = tag.toLowerCase().trim()

      if (type === "tech") {
        const filtered = technologyFilters.filter(tagLower)
        for (const tech of filtered) {
          normalized.add(tech)
        }
      } else if (type === "topic") {
        const filtered = topicFilters.filter(tagLower)
        for (const topic of filtered) {
          normalized.add(topic)
        }
      } else {
        normalized.add(tagLower)
      }
    }

    return Array.from(normalized)
  }

  async extractAndNormalize(text, existingTechs, existingTopics) {
    const techs = this.extractTechStack(text, existingTechs)
    const topics = this.extractTopics(text, existingTopics)

    const { tags: aiTags } = await this.extractTagsWithAI(text)
    const normalizedAITags = this.normalizeTags(aiTags)

    const allTechs = [
      ...new Set([
        ...techs,
        ...normalizedAITags.filter(t => this.isTechTag(t)),
      ]),
    ]
    const allTopics = [
      ...new Set([
        ...topics,
        ...normalizedAITags.filter(t => !this.isTechTag(t)),
      ]),
    ]

    return {
      tech_stack: this.normalizeTags(allTechs, "tech"),
      topics: this.normalizeTags(allTopics, "topic"),
      tags: normalizedAITags,
    }
  }

  isTechTag(tag) {
    const techKeywords = [
      "javascript",
      "python",
      "java",
      "go",
      "rust",
      "cpp",
      "c++",
      "c#",
      "typescript",
      "php",
      "ruby",
      "sql",
      "api",
      "web",
      "mobile",
    ]
    return techKeywords.some(keyword => tag.includes(keyword))
  }
}

module.exports = TagExtractor
