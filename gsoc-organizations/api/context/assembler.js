const Citation = require("../citations/citation")
const { GoogleGenerativeAI } = require("@google/generative-ai")
require("dotenv").config()

class ContextAssembler {
  constructor(config = {}) {
    this.maxTokens = config.maxTokens || 4000
    this.maxIdeas = config.maxIdeas || 10
    this.citationStyle = config.citationStyle || "markdown"
    this.includeMetadata = config.includeMetadata || true
    this.sortByRelevance = config.sortByRelevance || true

    this.genAI = process.env.GEMINI_API_KEY
      ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      : null
    this.model = this.genAI
      ? this.genAI.getGenerativeModel({ model: "gemini-pro" })
      : null

    this.citations = new Map()
    this.nextCitationId = 1
  }

  assemble(retrievalResults, query, options = {}) {
    const {
      maxTokens = this.maxTokens,
      citationStyle = this.citationStyle,
      includeMetadata = this.includeMetadata,
      includeOrgContext = false,
      includeTechContext = false,
      customTemplate = null,
    } = options

    console.log(`\n--- Context Assembler ---`)
    console.log(`Query: "${query}"`)
    console.log(`Results: ${retrievalResults.length} ideas`)

    const relevantIdeas = this.selectRelevantIdeas(retrievalResults, query)
    console.log(`Selected: ${relevantIdeas.length} ideas`)

    const citations = this.generateCitations(relevantIdeas)
    console.log(`Generated ${citations.length} citations`)

    const context = this.buildContext(relevantIdeas, citations, {
      citationStyle,
      includeMetadata,
      includeOrgContext,
      includeTechContext,
      customTemplate,
    })

    const tokenCount = this.estimateTokens(context)
    console.log(`Estimated tokens: ${tokenCount}`)
    console.log(`Max tokens: ${maxTokens}`)

    if (tokenCount > maxTokens) {
      console.log(`Context exceeds limit, truncating...`)
      const trimmedContext = this.trimToTokenLimit(context, maxTokens)
      return {
        ...trimmedContext,
        originalTokenCount: tokenCount,
        trimmed: true,
      }
    }

    return {
      query,
      ideas: relevantIdeas,
      citations,
      context,
      tokenCount,
      withinLimit: tokenCount <= maxTokens,
      metadata: {
        totalIdeas: retrievalResults.length,
        selectedIdeas: relevantIdeas.length,
        citationCount: citations.length,
        tokenCount: tokenCount,
        queryType: retrievalResults.queryType || "auto",
        intent: retrievalResults.intent || "search",
      },
    }
  }

  selectRelevantIdeas(retrievalResults, query) {
    let ideas = retrievalResults.results || []

    if (this.sortByRelevance) {
      ideas = ideas.sort((a, b) => {
        const scoreDiff = (b.score || 0) - (a.score || 0)

        if (Math.abs(scoreDiff) < 0.01) {
          return (b.document?.year || 0) - (a.document?.year || 0)
        }

        return scoreDiff
      })
    }

    return ideas.slice(0, this.maxIdeas).map((idea, index) => ({
      ...idea,
      position: index,
      document: idea.document || idea,
    }))
  }

  generateCitations(ideas) {
    this.citations.clear()
    this.nextCitationId = 1

    const citationsList = []

    for (const idea of ideas) {
      const doc = idea.document
      const citation = new Citation(
        doc.id,
        doc.title || "Untitled",
        doc.org || "Unknown",
        doc.year || 0,
        doc.source_url || "",
        this.generateSnippet(doc),
        idea.score || 0
      )

      citation.position = this.nextCitationId++
      citationsList.push(citation)
      this.citations.set(doc.id, citation)
    }

    return citationsList
  }

  generateSnippet(doc) {
    const title = doc.title || ""
    const description = doc.description || doc.short_description || ""

    if (description.length <= 150) {
      return description
    }

    return description.substring(0, 150) + "..."
  }

  buildContext(ideas, citations, options = {}) {
    const {
      citationStyle = "markdown",
      includeMetadata = true,
      includeOrgContext = false,
      includeTechContext = false,
      customTemplate = null,
    } = options

    if (customTemplate) {
      return this.buildCustomContext(ideas, citations, customTemplate)
    }

    let context = ""

    if (includeOrgContext) {
      context += this.buildOrgContext(ideas)
    }

    if (includeTechContext) {
      context += this.buildTechContext(ideas)
    }

    if (citationStyle === "markdown") {
      context += this.buildMarkdownContext(ideas, citations, includeMetadata)
    } else if (citationStyle === "inline") {
      context += this.buildInlineCitationContext(
        ideas,
        citations,
        includeMetadata
      )
    } else if (citationStyle === "detailed") {
      context += this.buildDetailedCitationContext(
        ideas,
        citations,
        includeMetadata
      )
    }

    return context
  }

  buildMarkdownContext(ideas, citations, includeMetadata) {
    let context = "## Relevant GSoC Ideas\n\n"

    for (let i = 0; i < ideas.length; i++) {
      const idea = ideas[i]
      const citation = citations[i]
      const doc = idea.document

      context += `${citation.toMarkdown()}\n\n`

      if (doc.short_description || doc.description) {
        context += `${
          doc.short_description || doc.description.substring(0, 300)
        }\n\n`
      }

      if (includeMetadata && doc.tech_stack && doc.tech_stack.length > 0) {
        context += `**Technologies**: ${doc.tech_stack
          .slice(0, 5)
          .join(", ")}\n\n`
      }

      if (includeMetadata && doc.topics && doc.topics.length > 0) {
        context += `**Topics**: ${doc.topics.slice(0, 3).join(", ")}\n\n`
      }
    }

    return context
  }

  buildInlineCitationContext(ideas, citations, includeMetadata) {
    let context = "Here are some relevant GSoC ideas:\n\n"

    for (let i = 0; i < ideas.length; i++) {
      const idea = ideas[i]
      const citation = citations[i]
      const doc = idea.document

      context += `${i + 1}. **${doc.title}** ${citation.toInlineCitation()}\n`

      if (doc.short_description) {
        context += `   ${doc.short_description}\n`
      }

      if (includeMetadata && doc.tech_stack && doc.tech_stack.length > 0) {
        context += `   Tech: ${doc.tech_stack.slice(0, 3).join(", ")}\n`
      }
    }

    return context
  }

  buildDetailedCitationContext(ideas, citations, includeMetadata) {
    let context = "## Detailed GSoC Ideas\n\n"

    for (let i = 0; i < ideas.length; i++) {
      const idea = ideas[i]
      const citation = citations[i]
      const doc = idea.document

      context += `${citation.toDetailedMarkdown()}\n\n`

      if (includeMetadata) {
        context += `**Organization**: ${doc.org}  \n`
        context += `**Year**: ${doc.year}  \n`
        context += `**Status**: ${doc.status || "unknown"}  \n`
      }

      if (doc.difficulty) {
        context += `**Difficulty**: ${doc.difficulty}  \n`
      }

      if (doc.project_url) {
        context += `**Project URL**: ${doc.project_url}  \n`
      }

      if (doc.code_url) {
        context += `**Code**: ${doc.code_url}  \n`
      }

      context += "\n"
    }

    return context
  }

  buildOrgContext(ideas) {
    const orgCounts = new Map()

    for (const idea of ideas) {
      const org = idea.document?.org || "Unknown"
      orgCounts.set(org, (orgCounts.get(org) || 0) + 1)
    }

    let context = "## Organizations\n\n"
    const sortedOrgs = Array.from(orgCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    for (const [org, count] of sortedOrgs) {
      context += `- **${org}**: ${count} ideas\n`
    }

    return context + "\n"
  }

  buildTechContext(ideas) {
    const techCounts = new Map()

    for (const idea of ideas) {
      const techs = idea.document?.tech_stack || []
      for (const tech of techs) {
        techCounts.set(tech, (techCounts.get(tech) || 0) + 1)
      }
    }

    let context = "## Technologies\n\n"
    const sortedTechs = Array.from(techCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    for (const [tech, count] of sortedTechs) {
      context += `- **${tech}**: ${count} ideas\n`
    }

    return context + "\n"
  }

  buildCustomContext(ideas, citations, template) {
    let context = template

    for (let i = 0; i < ideas.length; i++) {
      const idea = ideas[i]
      const doc = idea.document
      const citation = citations[i]

      let ideaContext = template
        .replace(/\{id\}/g, doc.id)
        .replace(/\{title\}/g, doc.title)
        .replace(/\{org\}/g, doc.org)
        .replace(/\{year\}/g, doc.year)
        .replace(
          /\{description\}/g,
          doc.short_description || doc.description?.substring(0, 300)
        )
        .replace(/\{tech_stack\}/g, doc.tech_stack?.join(", ") || "")
        .replace(/\{topics\}/g, doc.topics?.join(", ") || "")
        .replace(/\{difficulty\}/g, doc.difficulty || "N/A")
        .replace(/\{status\}/g, doc.status || "N/A")
        .replace(/\{source_url\}/g, doc.source_url || doc.project_url || "")
        .replace(/\{score\}/g, (idea.score || 0).toFixed(2))
        .replace(/\{position\}/g, i + 1)
        .replace(/\{citation\}/g, citation.toInlineCitation())

      context += ideaContext + "\n\n"
    }

    return context
  }

  estimateTokens(text) {
    const words = text.split(/\s+/).filter(w => w.length > 0)
    const characters = text.length
    return Math.max(words.length, Math.ceil(characters / 4))
  }

  trimToTokenLimit(context, maxTokens) {
    const lines = context.split("\n")
    let trimmedContext = ""
    let currentTokens = 0

    for (const line of lines) {
      const lineTokens = this.estimateTokens(line)

      if (currentTokens + lineTokens > maxTokens) {
        const remainingTokens = maxTokens - currentTokens
        const trimmedLine = this.trimLineToTokens(line, remainingTokens)
        trimmedContext += trimmedLine + "\n\n... (truncated)"
        break
      }

      trimmedContext += line + "\n"
      currentTokens += lineTokens
    }

    return trimmedContext
  }

  trimLineToTokens(line, maxTokens) {
    const words = line.split(/\s+/)
    let trimmedLine = ""
    let currentTokens = 0

    for (const word of words) {
      const wordTokens = this.estimateTokens(word)

      if (currentTokens + wordTokens > maxTokens) {
        break
      }

      trimmedLine += word + " "
      currentTokens += wordTokens
    }

    return trimmedLine.trim()
  }

  getCitation(id) {
    return this.citations.get(id)
  }

  getAllCitations() {
    return Array.from(this.citations.values())
  }

  clearCitations() {
    this.citations.clear()
    this.nextCitationId = 1
  }

  async summarizeIdeas(ideas) {
    if (!this.model) {
      return this.buildSimpleSummary(ideas)
    }

    const ideasList = ideas
      .map(idea => {
        const doc = idea.document || idea
        return `- ${doc.title} (${doc.org}, ${doc.year}): ${
          doc.short_description || ""
        }`
      })
      .join("\n")

    const prompt = `Summarize these GSoC ideas in a brief paragraph (max 200 words):

${ideasList}

Focus on:
- Main themes and topics
- Technology trends
- Organization patterns

Return only the summary.`

    try {
      const result = await this.model.generateContent(prompt)
      return result.response.text()
    } catch (error) {
      console.error("AI summary failed, using simple summary:", error.message)
      return this.buildSimpleSummary(ideas)
    }
  }

  buildSimpleSummary(ideas) {
    if (ideas.length === 0) {
      return "No relevant ideas found."
    }

    const orgs = [...new Set(ideas.map(i => i.document?.org))]
    const years = [...new Set(ideas.map(i => i.document?.year))]
    const techs = new Set()
    const topics = new Set()

    for (const idea of ideas) {
      const doc = idea.document || idea
      doc.tech_stack?.forEach(t => techs.add(t))
      doc.topics?.forEach(t => topics.add(t))
    }

    const topTechs = Array.from(techs).slice(0, 5)
    const topTopics = Array.from(topics).slice(0, 5)

    return (
      `Found ${ideas.length} relevant ideas from ${orgs.length} organizations spanning ${years.length} years. ` +
      `Common technologies include: ${topTechs.join(", ")}. ` +
      `Key topics: ${topTopics.join(", ")}.`
    )
  }

  getContextStatistics(context) {
    const lines = context.split("\n")
    const words = context.split(/\s+/).filter(w => w.length > 0)
    const chars = context.length

    return {
      lineCount: lines.length,
      wordCount: words.length,
      charCount: chars,
      estimatedTokens: this.estimateTokens(context),
    }
  }
}

module.exports = ContextAssembler
