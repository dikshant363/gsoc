const slugify = require("slugify")
const { compileData } = require("./api/compile-data")

const getAllNodesData = organizations => {
  const filtersIndexes = {
    years: {},
    technologies: {},
    topics: {},
    categories: {},
    categories: {},
    projectCounts: {},
    yearlyProjectCounts: {},
    shortcuts: {},
  }

  const allYears = []
  const allTechnologies = []
  const allTopics = []
  const allCategories = []
  const allProjectCounts = []
  const allYearlyProjectCounts = []
  const allShortcuts = [
    { name: "First-time organizations", frequency: 0 },
    { name: "Every year at least 10", frequency: 0 },
  ]
  filtersIndexes.shortcuts["First-time organizations"] = 0
  filtersIndexes.shortcuts["Every year at least 10"] = 1

  for (const organization of organizations) {
    const years = Object.keys(organization.years)
    const technologies = organization.technologies
    const topics = organization.topics
    const category = organization.category

    if (!(category in filtersIndexes.categories)) {
      allCategories.push({
        name: category,
        frequency: 1,
      })
      filtersIndexes.categories[category] = allCategories.length - 1
    } else {
      allCategories[filtersIndexes.categories[category]].frequency++
    }

    for (const topic of topics) {
      if (!(topic in filtersIndexes.topics)) {
        allTopics.push({
          name: topic,
          frequency: 1,
        })
        filtersIndexes.topics[topic] = allTopics.length - 1
      } else {
        allTopics[filtersIndexes.topics[topic]].frequency++
      }
    }

    for (const technology of technologies) {
      if (!(technology in filtersIndexes.technologies)) {
        allTechnologies.push({
          name: technology,
          frequency: 1,
        })
        filtersIndexes.technologies[technology] = allTechnologies.length - 1
      } else {
        allTechnologies[filtersIndexes.technologies[technology]].frequency++
      }
    }

    for (const year of years) {
      if (!(year in filtersIndexes.years)) {
        allYears.push({
          name: year,
          frequency: 1,
        })
        filtersIndexes.years[year] = allYears.length - 1
      } else {
        allYears[filtersIndexes.years[year]].frequency++
      }
    }

    let projectCount = organization.project_count
    let range = "51+"
    if (projectCount <= 5) {
      range = "01-05"
    } else if (projectCount <= 10) {
      range = "06-10"
    } else if (projectCount <= 20) {
      range = "11-20"
    } else if (projectCount <= 50) {
      range = "21-50"
    }

    if (!(range in filtersIndexes.projectCounts)) {
      allProjectCounts.push({
        name: range,
        frequency: 1,
      })
      filtersIndexes.projectCounts[range] = allProjectCounts.length - 1
    } else {
      allProjectCounts[filtersIndexes.projectCounts[range]].frequency++
    }

    // Yearly Project Counts Logic
    const orgRanges = new Set()
    for (const year of years) {
      const count = organization.years[year].num_projects
      let yRange = "51+"
      if (count <= 5) {
        yRange = "01-05"
      } else if (count <= 10) {
        yRange = "06-10"
      } else if (count <= 20) {
        yRange = "11-20"
      } else if (count <= 50) {
        yRange = "21-50"
      }
      orgRanges.add(yRange)
    }

    for (const yRange of orgRanges) {
      if (!(yRange in filtersIndexes.yearlyProjectCounts)) {
        allYearlyProjectCounts.push({
          name: yRange,
          frequency: 1,
        })
        filtersIndexes.yearlyProjectCounts[yRange] =
          allYearlyProjectCounts.length - 1
      } else {
        allYearlyProjectCounts[
          filtersIndexes.yearlyProjectCounts[yRange]
        ].frequency++
      }
    }

    // Shortcuts Logic
    // 1. First-time organizations (Only in 2025)
    if (years.length === 1 && years[0] === "2025") {
      allShortcuts[0].frequency++
    }

    // 2. Every year at least 10
    let constantHighPerformer = true
    for (const year of years) {
      if (organization.years[year].num_projects < 10) {
        constantHighPerformer = false
        break
      }
    }
    if (constantHighPerformer) {
      allShortcuts[1].frequency++
    }

    // EMA Calculation
    const sortedYears = years.slice().sort()
    let ema = 0
    const alpha = 0.5
    if (sortedYears.length > 0) {
      ema = organization.years[sortedYears[0]].num_projects
      for (let i = 1; i < sortedYears.length; i++) {
        const count = organization.years[sortedYears[i]].num_projects
        ema = (count * alpha) + (ema * (1 - alpha))
      }
    }
    organization.ema_project_count = Math.round(ema)
  }

  return {
    Filter: {
      years: allYears,
      topics: allTopics,
      categories: allCategories,
      technologies: allTechnologies,
      projectCounts: allProjectCounts,
      yearlyProjectCounts: allYearlyProjectCounts,
      shortcuts: allShortcuts,
    },
    Organization: organizations,
  }
}

exports.sourceNodes = async ({
  actions,
  createNodeId,
  createContentDigest,
}) => {
  const { createNode } = actions

  const addNode = (nodeType, id, nodeObject) => {
    const gatsbyNode = {
      ...nodeObject,
      id: createNodeId(`${nodeType}-${id}`),
      parent: null,
      children: [],
      internal: {
        type: nodeType,
        contentDigest: createContentDigest(nodeObject),
        content: JSON.stringify(nodeObject),
      },
    }
    createNode(gatsbyNode)
  }

  const organizations = compileData()
  const nodesData = getAllNodesData(organizations)

  for (const [nodeType, nodeObjects] of Object.entries(nodesData)) {
    if (Array.isArray(nodeObjects)) {
      for (const [index, nodeObject] of Object.entries(nodeObjects)) {
        addNode(nodeType, index, nodeObject)
      }
    } else {
      addNode(nodeType, "id", nodeObjects)
    }
  }
}

exports.createPages = ({ actions: { createPage } }) => {
  const organizations = compileData()
  for (const organization of organizations) {
    for (const year of Object.keys(organization.years)) {
      organization.years[year].projects = organization.years[year].projects.map(
        project => {
          delete project["description"]
          return project
        }
      )
    }

    createPage({
      path: `organization/${slugify(organization.name, { lower: true })}/`,
      component: require.resolve("./src/templates/organization.jsx"),
      context: { organization: organization },
    })
  }
}
