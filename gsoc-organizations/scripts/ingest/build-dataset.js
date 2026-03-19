const fs = require("fs")
const path = require("path")

class IdeasDatasetBuilder {
  constructor() {
    this.stats = {
      totalIdeas: 0,
      byYear: {},
      byOrg: {},
      byStatus: {},
      byDifficulty: {},
      byTech: {},
      byTopic: {},
      byLanguage: {},
    }
  }

  async build() {
    console.log("Building complete GSoC Ideas dataset...")

    const dataPath = path.join(__dirname, "../api/data/gsoc-ideas.json")

    if (!fs.existsSync(dataPath)) {
      console.log("gsoc-ideas.json not found. Please run normalization first.")
      return null
    }

    const ideas = JSON.parse(fs.readFileSync(dataPath, "utf-8"))

    this.calculateStatistics(ideas)
    this.linkRelatedIdeas(ideas)

    const dataset = {
      meta: {
        totalIdeas: ideas.length,
        years: this.extractYears(ideas),
        organizations: this.extractOrganizations(ideas),
        technologies: this.extractTechnologies(ideas),
        topics: this.extractTopics(ideas),
        languages: this.extractLanguages(ideas),
        lastUpdated: new Date().toISOString(),
        version: "1.0.0",
      },
      ideas: ideas,
    }

    this.saveDataset(dataset)
    this.saveStatistics()

    console.log("\n=== Dataset Built Successfully ===")
    console.log(`Total ideas: ${ideas.length}`)
    console.log(`Years covered: ${this.meta.years.length}`)
    console.log(`Organizations: ${this.meta.organizations.length}`)
    console.log(`Technologies: ${this.meta.technologies.length}`)
    console.log(`Topics: ${this.meta.topics.length}`)

    return dataset
  }

  calculateStatistics(ideas) {
    for (const idea of ideas) {
      this.stats.totalIdeas++

      if (!this.stats.byYear[idea.year]) {
        this.stats.byYear[idea.year] = 0
      }
      this.stats.byYear[idea.year]++

      if (!this.stats.byOrg[idea.org]) {
        this.stats.byOrg[idea.org] = 0
      }
      this.stats.byOrg[idea.org]++

      if (!this.stats.byStatus[idea.status]) {
        this.stats.byStatus[idea.status] = 0
      }
      this.stats.byStatus[idea.status]++

      if (idea.difficulty) {
        if (!this.stats.byDifficulty[idea.difficulty]) {
          this.stats.byDifficulty[idea.difficulty] = 0
        }
        this.stats.byDifficulty[idea.difficulty]++
      }

      if (idea.tech_stack) {
        for (const tech of idea.tech_stack) {
          if (!this.stats.byTech[tech]) {
            this.stats.byTech[tech] = 0
          }
          this.stats.byTech[tech]++
        }
      }

      if (idea.topics) {
        for (const topic of idea.topics) {
          if (!this.stats.byTopic[topic]) {
            this.stats.byTopic[topic] = 0
          }
          this.stats.byTopic[topic]++
        }
      }

      if (idea.language) {
        if (!this.stats.byLanguage[idea.language]) {
          this.stats.byLanguage[idea.language] = 0
        }
        this.stats.byLanguage[idea.language]++
      }
    }
  }

  linkRelatedIdeas(ideas) {
    console.log("\nLinking related ideas...")

    const techIndex = new Map()
    const topicIndex = new Map()

    for (const idea of ideas) {
      if (idea.tech_stack) {
        for (const tech of idea.tech_stack) {
          if (!techIndex.has(tech)) {
            techIndex.set(tech, [])
          }
          techIndex.get(tech).push(idea.id)
        }
      }

      if (idea.topics) {
        for (const topic of idea.topics) {
          if (!topicIndex.has(topic)) {
            topicIndex.set(topic, [])
          }
          topicIndex.get(topic).push(idea.id)
        }
      }
    }

    for (const idea of ideas) {
      const related = new Set()

      if (idea.tech_stack) {
        for (const tech of idea.tech_stack) {
          const relatedIds = techIndex.get(tech) || []
          for (const id of relatedIds) {
            if (id !== idea.id) {
              related.add(id)
            }
          }
        }
      }

      if (idea.topics) {
        for (const topic of idea.topics) {
          const relatedIds = topicIndex.get(topic) || []
          for (const id of relatedIds) {
            if (id !== idea.id) {
              related.add(id)
            }
          }
        }
      }

      idea.related_ideas = Array.from(related).slice(0, 5)
    }

    console.log("Related ideas linked")
  }

  extractYears(ideas) {
    const years = new Set()
    for (const idea of ideas) {
      years.add(idea.year)
    }
    return Array.from(years).sort()
  }

  extractOrganizations(ideas) {
    const orgs = new Set()
    for (const idea of ideas) {
      orgs.add(idea.org)
    }
    return Array.from(orgs).sort()
  }

  extractTechnologies(ideas) {
    const techs = new Set()
    for (const idea of ideas) {
      if (idea.tech_stack) {
        for (const tech of idea.tech_stack) {
          techs.add(tech)
        }
      }
    }
    return Array.from(techs).sort()
  }

  extractTopics(ideas) {
    const topics = new Set()
    for (const idea of ideas) {
      if (idea.topics) {
        for (const topic of idea.topics) {
          topics.add(topic)
        }
      }
    }
    return Array.from(topics).sort()
  }

  extractLanguages(ideas) {
    const languages = new Set()
    for (const idea of ideas) {
      if (idea.language) {
        languages.add(idea.language)
      }
    }
    return Array.from(languages).sort()
  }

  saveDataset(dataset) {
    const outputPath = path.join(
      __dirname,
      "../api/data/gsoc-ideas-complete.json"
    )
    fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2))
    console.log(`\nComplete dataset saved to: ${outputPath}`)
  }

  saveStatistics() {
    const stats = {
      totalIdeas: this.stats.totalIdeas,
      byYear: this.stats.byYear,
      byOrg: this.stats.byOrg,
      byStatus: this.stats.byStatus,
      byDifficulty: this.stats.byDifficulty,
      topTechnologies: Object.entries(this.stats.byTech)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([tech, count]) => ({ tech, count })),
      topTopics: Object.entries(this.stats.byTopic)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([topic, count]) => ({ topic, count })),
      byLanguage: this.stats.byLanguage,
    }

    const outputPath = path.join(__dirname, "../api/data/gsoc-ideas-stats.json")
    fs.writeFileSync(outputPath, JSON.stringify(stats, null, 2))
    console.log(`Statistics saved to: ${outputPath}`)
  }
}

module.exports = IdeasDatasetBuilder

if (require.main === module) {
  const builder = new IdeasDatasetBuilder()
  builder.build().catch(console.error)
}
