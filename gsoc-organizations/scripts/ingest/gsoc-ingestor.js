const fs = require("fs")
const path = require("path")
const cheerio = require("cheerio")
const axios = require("axios")

const RateLimiter = require("./utils/rate-limiter")
const TextNormalizer = require("./utils/normalizer")
const IDGenerator = require("./utils/id-generator")
const TagExtractor = require("./utils/tag-extractor")
const DifficultyEstimator = require("./difficulty-estimator")
const LanguageDetector = require("./multi-language-detector")
const GitHubAnalyzer = require("./github-repo-fetcher")

const YEARS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]

class GSoCIngestor {
  constructor() {
    this.rateLimiter = new RateLimiter({ ratePerSecond: 1, maxConcurrent: 2 })
    this.normalizer = new TextNormalizer()
    this.idGenerator = new IDGenerator()
    this.tagExtractor = new TagExtractor()
    this.difficultyEstimator = new DifficultyEstimator()
    this.languageDetector = new LanguageDetector()
    this.githubAnalyzer = new GitHubAnalyzer()

    this.stats = {
      organizationsProcessed: 0,
      projectsExtracted: 0,
      ideasExtracted: 0,
      reposAnalyzed: 0,
      errors: [],
    }
  }

  async ingestAllYears() {
    console.log("Starting GSoC data ingestion for all years...")

    for (const year of YEARS) {
      await this.ingestYear(year)
    }

    console.log("Ingestion complete!")
    this.printStats()
  }

  async ingestYear(year) {
    console.log(`\n=== Processing year ${year} ===`)

    const dataPath = path.join(__dirname, `../api/data/${year}.json`)
    if (!fs.existsSync(dataPath)) {
      console.log(`No data file found for year ${year}, skipping...`)
      return
    }

    const yearData = JSON.parse(fs.readFileSync(dataPath, "utf-8"))
    const organizations = yearData.organizations || []

    console.log(`Found ${organizations.length} organizations for ${year}`)

    const allIdeas = []

    for (const org of organizations) {
      try {
        const ideas = await this.processOrganization(org, year)
        allIdeas.push(...ideas)
        this.stats.organizationsProcessed++

        if (this.stats.organizationsProcessed % 10 === 0) {
          console.log(
            `Processed ${this.stats.organizationsProcessed}/${organizations.length} organizations...`
          )
        }
      } catch (error) {
        console.error(`Error processing ${org.name}:`, error.message)
        this.stats.errors.push({ org: org.name, error: error.message })
      }
    }

    const outputPath = path.join(
      __dirname,
      `../api/data/gsoc-ideas-${year}.json`
    )
    fs.writeFileSync(outputPath, JSON.stringify(allIdeas, null, 2))
    console.log(`Saved ${allIdeas.length} ideas to ${outputPath}`)
  }

  async processOrganization(org, year) {
    const ideas = []

    const orgData = {
      name: org.name,
      url: org.url,
      category: org.category,
      technologies: org.technologies || [],
      topics: org.topics || [],
      description: org.description || "",
    }

    const projects = org.projects || []

    for (const project of projects) {
      try {
        const idea = await this.processProject(project, orgData, year)
        if (idea) {
          ideas.push(idea)
          this.stats.projectsExtracted++
        }
      } catch (error) {
        console.error(
          `Error processing project ${project.title}:`,
          error.message
        )
      }
    }

    if (org.ideas_url) {
      const extractedIdeas = await this.extractIdeasFromPage(
        org.ideas_url,
        orgData,
        year
      )
      ideas.push(...extractedIdeas)
      this.stats.ideasExtracted += extractedIdeas.length
    }

    return ideas
  }

  async processProject(project, orgData, year) {
    const title = this.normalizer.normalizeTitle(project.title)
    const description = this.normalizer.normalizeDescription(
      project.description || project.short_description || ""
    )
    const shortDescription = this.normalizer.truncate(description, 300)

    if (!title) {
      return null
    }

    const id = this.idGenerator.generate(orgData.name, year, title)

    const languageInfo = this.languageDetector.detect(`${title} ${description}`)

    const extractedTech = await this.tagExtractor.extractAndNormalize(
      description,
      orgData.technologies,
      orgData.topics
    )

    const difficulty = await this.difficultyEstimator.estimate({
      title,
      description,
      tech_stack: extractedTech.tech_stack,
    })

    let repoAnalysis = null
    if (project.code_url) {
      const repos = this.githubAnalyzer.extractRepoUrls(project.code_url)
      if (repos.length > 0) {
        repoAnalysis = await this.githubAnalyzer.analyzeRepo(repos[0])
        if (repoAnalysis) {
          this.stats.reposAnalyzed++
        }
      }
    }

    const status = this.determineStatus(project, year)
    const outcome = year < 2025 ? this.determineOutcome(project) : null

    const idea = {
      id,
      org: orgData.name,
      org_url: orgData.url,
      org_category: orgData.category,
      year,
      status,
      title,
      short_description: shortDescription,
      description,
      student_name: project.student_name || null,
      proposal_id: project.proposal_id || null,
      project_url: project.project_url || orgData.projects_url,
      code_url: project.code_url || null,
      tags: extractedTech.tags,
      tech_stack: [
        ...new Set([...orgData.technologies, ...extractedTech.tech_stack]),
      ],
      languages: extractedTech.languages || [],
      topics: [...new Set([...orgData.topics, ...extractedTech.topics])],
      mentors: [],
      difficulty,
      outcome,
      source_url: orgData.ideas_url || orgData.projects_url,
      last_updated: new Date().toISOString(),
      language: languageInfo.language,
      related_ideas: [],
    }

    if (repoAnalysis) {
      idea.repo_analysis = {
        stars: repoAnalysis.stars,
        forks: repoAnalysis.forks,
        languages: repoAnalysis.languages,
        readme_techs: repoAnalysis.readmeTechs,
      }

      if (repoAnalysis.languages) {
        idea.languages = [
          ...new Set([...idea.languages, ...repoAnalysis.languages]),
        ]
      }

      if (repoAnalysis.readmeTechs) {
        idea.tech_stack = [
          ...new Set([...idea.tech_stack, ...repoAnalysis.readmeTechs]),
        ]
      }
    }

    if (languageInfo.language !== "en" && languageInfo.confidence > 0.7) {
      idea.original_language = languageInfo.code
    }

    return idea
  }

  determineStatus(project, year) {
    if (year === 2025) {
      return "in-progress"
    }

    if (project.student_name && project.code_url) {
      return "completed"
    }

    if (project.student_name) {
      return "completed"
    }

    return "abandoned"
  }

  determineOutcome(project) {
    if (project.code_url) {
      return "success"
    }

    if (project.student_name) {
      return "partial"
    }

    return "failed"
  }

  async extractIdeasFromPage(url, orgData, year) {
    const ideas = []

    try {
      const response = await this.rateLimiter.execute(() =>
        axios.get(url, {
          headers: { "User-Agent": "GSoC-Organizations-Ingestor" },
          timeout: 15000,
        })
      )

      const $ = cheerio.load(response.data)

      const patterns = [
        this.extractFromMarkdownList.bind(this),
        this.extractFromHtmlLists.bind(this),
        this.extractFromTables.bind(this),
        this.extractFromHeadings.bind(this),
      ]

      for (const pattern of patterns) {
        try {
          const extracted = pattern($, orgData, year)
          if (extracted.length > 0) {
            console.log(
              `  Extracted ${extracted.length} ideas from ${url} using pattern`
            )
            return extracted
          }
        } catch (error) {
          continue
        }
      }

      console.log(`  Could not extract ideas from ${url}`)
    } catch (error) {
      console.error(`  Failed to fetch ${url}:`, error.message)
    }

    return ideas
  }

  extractFromMarkdownList($, orgData, year) {
    const ideas = []
    const markdownLists = $("ul, ol")

    markdownLists.each((_, list) => {
      const $list = $(list)
      const items = $list.find("li")

      items.each((_, item) => {
        const $item = $(item)
        const text = $item.text().trim()

        if (text.length < 20 || text.length > 1000) return

        const link = $item.find("a").first()
        const href = link.attr("href")

        const title = this.normalizer.normalizeTitle(
          link.text() || text.split(":")[0]
        )
        const description = this.normalizer.normalizeDescription(text)

        if (title) {
          const id = this.idGenerator.generate(orgData.name, year, title)
          ideas.push(
            this.createBasicIdea(id, orgData, year, title, description, href)
          )
        }
      })
    })

    return ideas
  }

  extractFromHtmlLists($, orgData, year) {
    const ideas = []
    const lists = $("ul, ol")

    lists.each((_, list) => {
      const $list = $(list)
      const items = $list.find("li")

      items.each((_, item) => {
        const $item = $(item)
        const text = $item.text().trim()

        if (text.length < 20 || text.length > 1000) return

        const parts = text.split(/[:\-–—]/)
        const title = parts[0].trim()
        const description = parts.slice(1).join(" ").trim() || text

        if (title.length > 3) {
          const id = this.idGenerator.generate(orgData.name, year, title)
          ideas.push(
            this.createBasicIdea(id, orgData, year, title, description, null)
          )
        }
      })
    })

    return ideas
  }

  extractFromTables($, orgData, year) {
    const ideas = []
    const tables = $("table")

    tables.each((_, table) => {
      const $table = $(table)
      const rows = $table.find("tr")

      rows.each((_, row) => {
        const $row = $(row)
        const cells = $row.find("td, th")

        if (cells.length < 1) return

        const title = this.normalizer.normalizeTitle($(cells[0]).text())
        const description =
          cells.length > 1
            ? this.normalizer.normalizeDescription($(cells[1]).text())
            : ""

        if (title && title.length > 3) {
          const id = this.idGenerator.generate(orgData.name, year, title)
          ideas.push(
            this.createBasicIdea(id, orgData, year, title, description, null)
          )
        }
      })
    })

    return ideas
  }

  extractFromHeadings($, orgData, year) {
    const ideas = []
    const headings = $("h1, h2, h3, h4")

    headings.each((_, heading) => {
      const $heading = $(heading)
      const title = this.normalizer.normalizeTitle($heading.text())

      if (title.length < 5 || title.length > 200) return

      let description = ""
      const $nextElement = $heading.next()

      if ($nextElement.length > 0) {
        description = this.normalizer.normalizeDescription($nextElement.text())
      }

      if (title) {
        const id = this.idGenerator.generate(orgData.name, year, title)
        ideas.push(
          this.createBasicIdea(id, orgData, year, title, description, null)
        )
      }
    })

    return ideas
  }

  createBasicIdea(id, orgData, year, title, description, href) {
    return {
      id,
      org: orgData.name,
      org_url: orgData.url,
      org_category: orgData.category,
      year,
      status: "proposed",
      title,
      short_description: this.normalizer.truncate(description, 300),
      description,
      student_name: null,
      proposal_id: null,
      project_url: href,
      code_url: null,
      tags: orgData.technologies || [],
      tech_stack: orgData.technologies || [],
      languages: [],
      topics: orgData.topics || [],
      mentors: [],
      difficulty: null,
      outcome: null,
      source_url: orgData.ideas_url || href,
      last_updated: new Date().toISOString(),
      language: "en",
      related_ideas: [],
    }
  }

  printStats() {
    console.log("\n=== Ingestion Statistics ===")
    console.log(`Organizations processed: ${this.stats.organizationsProcessed}`)
    console.log(`Projects extracted: ${this.stats.projectsExtracted}`)
    console.log(`Ideas extracted from pages: ${this.stats.ideasExtracted}`)
    console.log(`Repos analyzed: ${this.stats.reposAnalyzed}`)
    console.log(`Errors: ${this.stats.errors.length}`)

    if (this.stats.errors.length > 0) {
      console.log("\nErrors:")
      this.stats.errors.slice(0, 10).forEach(err => {
        console.log(`  - ${err.org}: ${err.error}`)
      })
    }
  }
}

module.exports = GSoCIngestor

if (require.main === module) {
  const ingestor = new GSoCIngestor()
  ingestor.ingestAllYears().catch(console.error)
}
