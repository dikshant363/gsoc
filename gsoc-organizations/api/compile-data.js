const fs = require("fs")
const {
  technologyFilters,
  topicFilters,
  categoryFilters,
  nameFilters,
} = require("./filters")

const YEARS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]

const getDataPath = year => {
  return `api/data/${year}.json`
}

class DisjointSet {
  _parents = new Map()

  add(obj) {
    if (!this._parents.has(obj)) {
      this._parents.set(obj, obj)
    }
  }

  find(obj) {
    if (this._parents.get(obj) === obj) {
      return obj
    }
    const root = this.find(this._parents.get(obj))
    this._parents.set(obj, root)
    return root
  }

  union(obj1, obj2) {
    const root1 = this.find(obj1)
    const root2 = this.find(obj2)
    if (root1 !== root2) {
      this._parents.set(root1, root2)
    }
  }

  extract() {
    const sets = new Map()
    for (const obj of this._parents.keys()) {
      const root = this.find(obj)
      if (!sets.has(root)) {
        sets.set(root, [])
      }
      sets.get(root).push(obj)
    }
    return Array.from(sets.values())
  }
}

const updateYears = (
  combinedJson,
  year,
  projects_url,
  num_projects,
  projects
) => {
  combinedJson.years[year] = {
    projects_url: projects_url,
    num_projects: num_projects,
    projects: projects,
  }
}

const updateTopics = (combinedJson, topics) => {
  for (const topic of topics) {
    if (!combinedJson.topics.includes(topic)) {
      combinedJson.topics.push(topic)
    }
  }
}

const updateTechnologies = (combinedJson, technologies) => {
  for (const technology of technologies) {
    if (!combinedJson.technologies.includes(technology)) {
      combinedJson.technologies.push(technology)
    }
  }
}

const updateOrg = (combinedJson, orgJson) => {
  const { projects_url, topics, technologies, num_projects, projects, year } =
    orgJson

  const basic_properties = [
    "name",
    "image_url",
    "image_background_color",
    "description",
    "url",
    "irc_channel",
    "contact_email",
    "mailing_list",
    "twitter_url",
    "blog_url",
    "category",
    "ideas_url",
    "guide_url",
    "logo_url",
  ]
  for (const prop of basic_properties) {
    combinedJson[prop] = orgJson[prop] || combinedJson[prop]
  }

  updateYears(combinedJson, year, projects_url, num_projects, projects)
  updateTopics(combinedJson, topics)
  updateTechnologies(combinedJson, technologies)
  combinedJson.project_count += num_projects || 0
}

const applyFilters = orgJson => {
  orgJson.name = nameFilters.filter(orgJson.name)
  orgJson.category = categoryFilters.filter(orgJson.category)

  const topics = []
  for (const topic of orgJson.topics) {
    const filteredTopics = topicFilters.filter(topic)
    for (const filteredTopic of filteredTopics) {
      if (!topics.includes(filteredTopic)) {
        topics.push(filteredTopic)
      }
    }
  }
  orgJson.topics = topics

  const technologies = []
  for (const technology of orgJson.technologies) {
    const filteredTechnologies = technologyFilters.filter(technology)
    for (const filteredTechnology of filteredTechnologies) {
      if (!technologies.includes(filteredTechnologies)) {
        technologies.push(filteredTechnology)
      }
    }
  }
  orgJson.technologies = technologies
}

const getCombinedOrgJson = orgList => {
  const combinedJson = {
    name: "",
    url: "",
    image_url: "",
    image_background_color: "",
    description: "",
    category: "",
    topics: [],
    technologies: [],
    project_count: 0,
    years: {},
    irc_channel: "",
    contact_email: "",
    mailing_list: "",
    ideas_url: "",
    guide_url: "",
    logo_url: "",
  }

  orgList = orgList.sort((a, b) => {
    return a.year > b.year ? 1 : -1
  })

  for (const orgJson of orgList) {
    updateOrg(combinedJson, orgJson)
  }

  return combinedJson
}

const normalizeUrlHost = host => {
  return host.startsWith("www.") ? host.slice(4) : host
}

const getUrlKey = (urlStr) => {
  if (!urlStr) return null;
  try {
    const url = new URL(urlStr)
    return normalizeUrlHost(url.host) + url.pathname
  } catch (e) {
    return null
  }
}

const compileData = () => {
  const organizationSet = new DisjointSet()
  const nameMap = new Map() // Normalized Name -> Org
  const urlMap = new Map() // Normalized URL Key -> Org

  for (const year of YEARS) {
    const data = JSON.parse(fs.readFileSync(getDataPath(year)))

    for (const currentOrg of data.organizations) {
      applyFilters(currentOrg)
      currentOrg.year = Number.parseInt(data.year)

      organizationSet.add(currentOrg)

      // Merge by Name
      const nameKey = currentOrg.name.toUpperCase()
      if (nameMap.has(nameKey)) {
        organizationSet.union(currentOrg, nameMap.get(nameKey))
      } else {
        nameMap.set(nameKey, currentOrg)
      }

      // Merge by URL
      const urlKey = getUrlKey(currentOrg.url)
      if (urlKey) {
        if (urlMap.has(urlKey)) {
          organizationSet.union(currentOrg, urlMap.get(urlKey))
        } else {
          urlMap.set(urlKey, currentOrg)
        }
      }
    }
  }

  const distinctOrganizations = organizationSet.extract()
  const gsocOrganizations = []
  distinctOrganizations.forEach(orgList => {
    gsocOrganizations.push(getCombinedOrgJson(orgList))
  })

  // Filter out organizations with no projects (optional, but good practice if data is messy)
  // But original code didn't do it explicitly, so we keep it as is.

  const sortedOrganizations = gsocOrganizations.sort((a, b) => {
    if (a.name === b.name) {
      return 0
    }

    return a.name > b.name ? 1 : -1
  })

  return sortedOrganizations
}

module.exports = { compileData }
