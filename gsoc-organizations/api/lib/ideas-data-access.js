const fs = require("fs")
const path = require("path")

const DATA_PATH = path.join(__dirname, "../data/gsoc-ideas-complete.json")
const STATS_PATH = path.join(__dirname, "../data/gsoc-ideas-stats.json")

class IdeasDataAccess {
  constructor() {
    this.dataset = null
    this.stats = null
    this.lastLoaded = 0
    this.cacheTimeout = 5 * 60 * 1000
  }

  loadDataset() {
    const now = Date.now()

    if (this.dataset && now - this.lastLoaded < this.cacheTimeout) {
      return this.dataset
    }

    try {
      if (fs.existsSync(DATA_PATH)) {
        const data = fs.readFileSync(DATA_PATH, "utf-8")
        this.dataset = JSON.parse(data)
        this.lastLoaded = now
        return this.dataset
      }
    } catch (error) {
      console.error("Failed to load dataset:", error.message)
    }

    return { ideas: [], meta: {} }
  }

  loadStats() {
    try {
      if (fs.existsSync(STATS_PATH)) {
        const data = fs.readFileSync(STATS_PATH, "utf-8")
        this.stats = JSON.parse(data)
        return this.stats
      }
    } catch (error) {
      console.error("Failed to load stats:", error.message)
    }

    return {}
  }

  getAllIdeas() {
    const dataset = this.loadDataset()
    return dataset.ideas || []
  }

  getIdeaById(id) {
    const ideas = this.getAllIdeas()
    return ideas.find(idea => idea.id === id) || null
  }

  getIdeasByOrg(org) {
    const ideas = this.getAllIdeas()
    return ideas.filter(idea => idea.org.toLowerCase() === org.toLowerCase())
  }

  getIdeasByYear(year) {
    const ideas = this.getAllIdeas()
    return ideas.filter(idea => idea.year === parseInt(year))
  }

  getIdeasByTech(tech) {
    const ideas = this.getAllIdeas()
    const techLower = tech.toLowerCase()

    return ideas.filter(
      idea =>
        idea.tech_stack &&
        idea.tech_stack.some(t => t.toLowerCase() === techLower)
    )
  }

  getIdeasByTopic(topic) {
    const ideas = this.getAllIdeas()
    const topicLower = topic.toLowerCase()

    return ideas.filter(
      idea =>
        idea.topics && idea.topics.some(t => t.toLowerCase() === topicLower)
    )
  }

  filterIdeas(filters) {
    let ideas = this.getAllIdeas()

    if (filters.org) {
      const orgs = Array.isArray(filters.org) ? filters.org : [filters.org]
      ideas = ideas.filter(idea =>
        orgs.some(org => idea.org.toLowerCase() === org.toLowerCase())
      )
    }

    if (filters.year) {
      const years = Array.isArray(filters.year) ? filters.year : [filters.year]
      ideas = ideas.filter(idea => years.includes(parseInt(idea.year)))
    }

    if (filters.tech) {
      const techs = Array.isArray(filters.tech) ? filters.tech : [filters.tech]
      ideas = ideas.filter(
        idea =>
          idea.tech_stack &&
          techs.some(tech =>
            idea.tech_stack.some(t => t.toLowerCase() === tech.toLowerCase())
          )
      )
    }

    if (filters.topic) {
      const topics = Array.isArray(filters.topic)
        ? filters.topic
        : [filters.topic]
      ideas = ideas.filter(
        idea =>
          idea.topics &&
          topics.some(topic =>
            idea.topics.some(t => t.toLowerCase() === topic.toLowerCase())
          )
      )
    }

    if (filters.difficulty) {
      const difficulties = Array.isArray(filters.difficulty)
        ? filters.difficulty
        : [filters.difficulty]
      ideas = ideas.filter(
        idea => idea.difficulty && difficulties.includes(idea.difficulty)
      )
    }

    if (filters.status) {
      const statuses = Array.isArray(filters.status)
        ? filters.status
        : [filters.status]
      ideas = ideas.filter(idea => statuses.includes(idea.status))
    }

    if (filters.language) {
      const languages = Array.isArray(filters.language)
        ? filters.language
        : [filters.language]
      ideas = ideas.filter(
        idea => idea.language && languages.includes(idea.language)
      )
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      ideas = ideas.filter(
        idea =>
          idea.title.toLowerCase().includes(searchLower) ||
          idea.description.toLowerCase().includes(searchLower)
      )
    }

    if (filters.limit) {
      const offset = filters.offset || 0
      ideas = ideas.slice(offset, offset + filters.limit)
    }

    return ideas
  }

  getStats() {
    return this.loadStats()
  }

  getMeta() {
    const dataset = this.loadDataset()
    return dataset.meta || {}
  }

  search(query, limit = 10) {
    const ideas = this.getAllIdeas()
    const queryLower = query.toLowerCase()

    const scored = ideas.map(idea => {
      let score = 0

      if (idea.title.toLowerCase().includes(queryLower)) {
        score += 10
      }

      if (idea.description.toLowerCase().includes(queryLower)) {
        score += 5
      }

      if (
        idea.tech_stack &&
        idea.tech_stack.some(t => t.toLowerCase().includes(queryLower))
      ) {
        score += 3
      }

      if (
        idea.topics &&
        idea.topics.some(t => t.toLowerCase().includes(queryLower))
      ) {
        score += 3
      }

      if (idea.org.toLowerCase().includes(queryLower)) {
        score += 2
      }

      return { idea, score }
    })

    return scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.idea)
  }

  invalidateCache() {
    this.dataset = null
    this.stats = null
    this.lastLoaded = 0
  }
}

module.exports = new IdeasDataAccess()
