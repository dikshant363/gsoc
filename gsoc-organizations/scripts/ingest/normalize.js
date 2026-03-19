const fs = require("fs")
const path = require("path")
const { JSDOM } = require("jsdom")

const TextNormalizer = require("./utils/normalizer")
const IDGenerator = require("./utils/id-generator")
const { technologyFilters, topicFilters } = require("../../api/filters")

const YEARS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]

class DataNormalizer {
  constructor() {
    this.normalizer = new TextNormalizer()
    this.idGenerator = new IDGenerator()
    this.stats = {
      originalCount: 0,
      normalizedCount: 0,
      mergedCount: 0,
      invalidCount: 0,
    }
  }

  async normalizeAllYears() {
    console.log("Starting normalization for all years...")

    const allIdeas = []

    for (const year of YEARS) {
      const ideas = await this.normalizeYear(year)
      allIdeas.push(...ideas)
    }

    const deduplicatedIdeas = this.deduplicateIdeas(allIdeas)

    const outputPath = path.join(__dirname, "../api/data/gsoc-ideas.json")
    fs.writeFileSync(outputPath, JSON.stringify(deduplicatedIdeas, null, 2))

    console.log(`\n=== Normalization Complete ===`)
    console.log(`Total ideas: ${allIdeas.length}`)
    console.log(`After deduplication: ${deduplicatedIdeas.length}`)
    console.log(`Saved to: ${outputPath}`)

    return deduplicatedIdeas
  }

  async normalizeYear(year) {
    const dataPath = path.join(__dirname, `../api/data/gsoc-ideas-${year}.json`)

    if (!fs.existsSync(dataPath)) {
      console.log(`No ideas file found for ${year}, skipping...`)
      return []
    }

    const yearData = JSON.parse(fs.readFileSync(dataPath, "utf-8"))
    console.log(`Processing ${yearData.length} ideas from ${year}...`)

    const normalizedIdeas = yearData
      .map(idea => this.normalizeIdea(idea, year))
      .filter(idea => idea !== null)

    this.stats.originalCount += yearData.length
    this.stats.normalizedCount += normalizedIdeas.length

    return normalizedIdeas
  }

  normalizeIdea(idea, year) {
    if (!idea.title || !idea.org) {
      this.stats.invalidCount++
      return null
    }

    const normalized = {
      id: idea.id || this.idGenerator.generate(idea.org, year, idea.title),
      org: this.normalizeOrgName(idea.org),
      year: year,
      status: this.normalizeStatus(idea.status),
      title: this.normalizer.normalizeTitle(idea.title),
      short_description: this.normalizer.normalizeDescription(
        idea.short_description || ""
      ),
      description: this.normalizer.normalizeDescription(idea.description || ""),
      student_name: idea.student_name || null,
      proposal_id: idea.proposal_id || null,
      project_url: idea.project_url || null,
      code_url: idea.code_url || null,
      tags: this.normalizeTags(idea.tags || []),
      tech_stack: this.normalizeTechStack(idea.tech_stack || []),
      languages: this.normalizeLanguages(idea.languages || []),
      topics: this.normalizeTopics(idea.topics || []),
      mentors: this.normalizeMentors(idea.mentors || []),
      difficulty: this.normalizeDifficulty(idea.difficulty),
      outcome: idea.outcome || null,
      source_url: this.normalizeURL(idea.source_url),
      last_updated: idea.last_updated || new Date().toISOString(),
      language: idea.language || "en",
      related_ideas: idea.related_ideas || [],
    }

    if (idea.repo_analysis) {
      normalized.repo_analysis = idea.repo_analysis
    }

    if (idea.original_language) {
      normalized.original_language = idea.original_language
    }

    if (idea.org_url) {
      normalized.org_url = this.normalizeURL(idea.org_url)
    }

    if (idea.org_category) {
      normalized.org_category = idea.org_category
    }

    return this.validateIdea(normalized) ? normalized : null
  }

  normalizeOrgName(name) {
    return this.normalizer.normalizeTitle(name)
  }

  normalizeStatus(status) {
    const validStatuses = ["proposed", "in-progress", "completed", "abandoned"]
    return validStatuses.includes(status) ? status : "proposed"
  }

  normalizeTags(tags) {
    if (!Array.isArray(tags)) return []

    return tags
      .map(tag => tag.toLowerCase().trim())
      .filter(tag => tag.length > 2)
      .slice(0, 10)
  }

  normalizeTechStack(techStack) {
    if (!Array.isArray(techStack)) return []

    const normalized = new Set()

    for (const tech of techStack) {
      const techLower = tech.toLowerCase().trim()

      const filtered = technologyFilters.filter(techLower)
      for (const t of filtered) {
        normalized.add(t)
      }
    }

    return Array.from(normalized)
  }

  normalizeLanguages(languages) {
    if (!Array.isArray(languages)) return []

    const normalized = new Set()

    const languageMap = {
      javascript: "JavaScript",
      typescript: "TypeScript",
      python: "Python",
      java: "Java",
      go: "Go",
      rust: "Rust",
      "c++": "C++",
      "c#": "C#",
      php: "PHP",
      ruby: "Ruby",
      swift: "Swift",
      kotlin: "Kotlin",
      scala: "Scala",
      haskell: "Haskell",
      r: "R",
      matlab: "MATLAB",
      sql: "SQL",
    }

    for (const lang of languages) {
      const langLower = lang.toLowerCase().trim()
      const mapped =
        languageMap[langLower] || lang.charAt(0).toUpperCase() + lang.slice(1)
      normalized.add(mapped)
    }

    return Array.from(normalized).slice(0, 10)
  }

  normalizeTopics(topics) {
    if (!Array.isArray(topics)) return []

    const normalized = new Set()

    for (const topic of topics) {
      const topicLower = topic.toLowerCase().trim()

      const filtered = topicFilters.filter(topicLower)
      for (const t of filtered) {
        normalized.add(t)
      }
    }

    return Array.from(normalized)
  }

  normalizeMentors(mentors) {
    if (!Array.isArray(mentors)) return []

    return mentors
      .map(mentor => {
        if (typeof mentor === "string") {
          return mentor.trim()
        }
        return mentor.name || mentor.email || ""
      })
      .filter(mentor => mentor.length > 3)
      .slice(0, 10)
  }

  normalizeDifficulty(difficulty) {
    const validDifficulties = ["easy", "medium", "hard", "expert"]
    if (!difficulty) return null
    return validDifficulties.includes(difficulty) ? difficulty : null
  }

  normalizeURL(url) {
    if (!url || typeof url !== "string") return null
    return url.trim()
  }

  validateIdea(idea) {
    if (!idea.id || !idea.title || !idea.org) return false
    if (!IDGenerator.validate(idea.id)) return false

    if (idea.year < 2016 || idea.year > 2025) return false

    const validStatuses = ["proposed", "in-progress", "completed", "abandoned"]
    if (!validStatuses.includes(idea.status)) return false

    return true
  }

  deduplicateIdeas(ideas) {
    console.log("\n=== Starting deduplication ===")

    const seen = new Map()
    const duplicates = []

    for (const idea of ideas) {
      const key = `${idea.org.toLowerCase()}-${
        idea.year
      }-${idea.title.toLowerCase()}`

      if (seen.has(key)) {
        const existing = seen.get(key)
        this.mergeIdeas(existing, idea)
        duplicates.push({ id: idea.id, duplicateOf: existing.id })
        this.stats.mergedCount++
      } else {
        seen.set(key, idea)
      }
    }

    console.log(`Found ${duplicates.length} duplicates`)
    console.log(`Merged into ${seen.size} unique ideas`)

    return Array.from(seen.values())
  }

  mergeIdeas(target, source) {
    if (source.student_name && !target.student_name) {
      target.student_name = source.student_name
    }

    if (source.code_url && !target.code_url) {
      target.code_url = source.code_url
    }

    if (source.repo_analysis && !target.repo_analysis) {
      target.repo_analysis = source.repo_analysis
    }

    target.tags = [...new Set([...target.tags, ...source.tags])]
    target.tech_stack = [
      ...new Set([...target.tech_stack, ...source.tech_stack]),
    ]
    target.languages = [...new Set([...target.languages, ...source.languages])]
    target.topics = [...new Set([...target.topics, ...source.topics])]

    if (source.difficulty && !target.difficulty) {
      target.difficulty = source.difficulty
    }
  }
}

module.exports = DataNormalizer

if (require.main === module) {
  const normalizer = new DataNormalizer()
  normalizer.normalizeAllYears().catch(console.error)
}
