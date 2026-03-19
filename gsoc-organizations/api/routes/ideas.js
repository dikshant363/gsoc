const express = require("express")
const router = express.Router()
const ideasData = require("../lib/ideas-data-access")

router.get("/", (req, res) => {
  try {
    const {
      org,
      year,
      tech,
      topic,
      difficulty,
      status,
      language,
      search,
      limit,
      offset,
    } = req.query

    const filters = {}

    if (org) filters.org = Array.isArray(org) ? org : org.split(",")
    if (year) filters.year = Array.isArray(year) ? year : year.split(",")
    if (tech) filters.tech = Array.isArray(tech) ? tech : tech.split(",")
    if (topic) filters.topic = Array.isArray(topic) ? topic : topic.split(",")
    if (difficulty)
      filters.difficulty = Array.isArray(difficulty)
        ? difficulty
        : difficulty.split(",")
    if (status)
      filters.status = Array.isArray(status) ? status : status.split(",")
    if (language)
      filters.language = Array.isArray(language)
        ? language
        : language.split(",")
    if (search) filters.search = search
    if (limit) filters.limit = parseInt(limit)
    if (offset) filters.offset = parseInt(offset)

    const ideas = ideasData.filterIdeas(filters)

    res.json({
      count: ideas.length,
      filters: Object.keys(filters),
      data: ideas,
    })
  } catch (error) {
    console.error("Error fetching ideas:", error)
    res.status(500).json({ error: "Failed to fetch ideas" })
  }
})

router.get("/:id", (req, res) => {
  try {
    const { id } = req.params
    const idea = ideasData.getIdeaById(id)

    if (!idea) {
      return res.status(404).json({ error: "Idea not found" })
    }

    res.json(idea)
  } catch (error) {
    console.error("Error fetching idea:", error)
    res.status(500).json({ error: "Failed to fetch idea" })
  }
})

router.get("/organizations/:org", (req, res) => {
  try {
    const { org } = req.params
    const ideas = ideasData.getIdeasByOrg(org)

    res.json({
      organization: org,
      count: ideas.length,
      data: ideas,
    })
  } catch (error) {
    console.error("Error fetching org ideas:", error)
    res.status(500).json({ error: "Failed to fetch organization ideas" })
  }
})

router.get("/years/:year", (req, res) => {
  try {
    const { year } = req.params
    const ideas = ideasData.getIdeasByYear(year)

    res.json({
      year: parseInt(year),
      count: ideas.length,
      data: ideas,
    })
  } catch (error) {
    console.error("Error fetching year ideas:", error)
    res.status(500).json({ error: "Failed to fetch year ideas" })
  }
})

router.get("/techs/:tech", (req, res) => {
  try {
    const { tech } = req.params
    const ideas = ideasData.getIdeasByTech(tech)

    res.json({
      technology: tech,
      count: ideas.length,
      data: ideas,
    })
  } catch (error) {
    console.error("Error fetching tech ideas:", error)
    res.status(500).json({ error: "Failed to fetch technology ideas" })
  }
})

router.get("/topics/:topic", (req, res) => {
  try {
    const { topic } = req.params
    const ideas = ideasData.getIdeasByTopic(topic)

    res.json({
      topic,
      count: ideas.length,
      data: ideas,
    })
  } catch (error) {
    console.error("Error fetching topic ideas:", error)
    res.status(500).json({ error: "Failed to fetch topic ideas" })
  }
})

router.get("/stats", (req, res) => {
  try {
    const stats = ideasData.getStats()
    res.json(stats)
  } catch (error) {
    console.error("Error fetching stats:", error)
    res.status(500).json({ error: "Failed to fetch statistics" })
  }
})

router.get("/meta", (req, res) => {
  try {
    const meta = ideasData.getMeta()
    res.json(meta)
  } catch (error) {
    console.error("Error fetching meta:", error)
    res.status(500).json({ error: "Failed to fetch metadata" })
  }
})

router.post("/search", (req, res) => {
  try {
    const { query, limit = 10 } = req.body

    if (!query) {
      return res.status(400).json({ error: "Query is required" })
    }

    const results = ideasData.search(query, limit)

    res.json({
      query,
      count: results.length,
      data: results,
    })
  } catch (error) {
    console.error("Error searching ideas:", error)
    res.status(500).json({ error: "Failed to search ideas" })
  }
})

module.exports = router
