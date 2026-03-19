class Citation {
  constructor(id, title, org, year, sourceUrl, snippet, relevanceScore = 0) {
    this.id = id
    this.title = title
    this.org = org
    this.year = year
    this.sourceUrl = sourceUrl
    this.snippet = snippet
    this.relevanceScore = relevanceScore
    this.position = 0
  }

  toMarkdown() {
    const yearTag = this.year ? `[${this.year}]` : ""
    const orgTag = this.org ? `[${this.org}]` : ""
    const scoreTag =
      this.relevanceScore > 0
        ? ` (relevance: ${this.relevanceScore.toFixed(2)})`
        : ""

    return `[${this.id}]: **${this.title}** ${yearTag}${orgTag}${scoreTag}`
  }

  toInlineCitation() {
    return `(Source: ${this.id})`
  }

  toDetailedMarkdown() {
    return `### ${this.title} ${this.toInlineCitation()}

**Organization**: ${this.org}
**Year**: ${this.year}
**Source**: ${this.sourceUrl}

${this.snippet}

---
`
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      org: this.org,
      year: this.year,
      sourceUrl: this.sourceUrl,
      snippet: this.snippet,
      relevanceScore: this.relevanceScore,
      position: this.position,
    }
  }

  getEstimatedTokens() {
    const words = this.snippet ? this.snippet.split(/\s+/).length : 0
    const titleWords = this.title.split(/\s+/).length
    return Math.ceil((words + titleWords) * 1.3)
  }
}

module.exports = Citation
