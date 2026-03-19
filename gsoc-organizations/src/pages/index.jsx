import React, { useEffect, useMemo } from "react"
import Fuse from "fuse.js"
import { graphql } from "gatsby"
import { useBreakpoint } from "gatsby-plugin-breakpoints"
import { useLocation } from "@reach/router"

import "./index.css"

import Layout from "../layouts/layout"
import OrgCard from "../components/org-card"
import Seo from "../components/seo"
import Notification from "../components/notification"
import { Grid, Dropdown, Button, Icon } from "semantic-ui-react"
import AiSearch from "../components/ai-search"

import { useAppSelector, useAppDispatch } from "../store"
import { getSearch } from "../store/search"
import { getFilters, getFiltersFromSearchUrl } from "../store/filters"
import { getSort, setSort } from "../store/sort"
import { getSearchParam } from "../utils/searchParams"
import { EventBus } from "../utils/events"
import { urlChanged } from "../store/actions"

const getOrganizations = data => {
  return data.allOrganization.edges.map(orgNode => {
    let org = orgNode.node
    for (const yearKey of Object.keys(org.years)) {
      if (yearKey[0] === "_") {
        if (org.years[yearKey] !== null) {
          let year = yearKey.slice(1)
          org.years[year] = org.years[yearKey]
        }
        delete org.years[yearKey]
      }
    }
    return org
  })
}

const getFuseSearch = organizations => {
  const options = {
    threshold: 0.3,
    keys: ["name"],
  }

  return new Fuse(organizations, options)
}

const getFilteredOrganizations = (
  organizations,
  searchQuery,
  filters,
  sort
) => {
  let filteredOrganizations = organizations

  if (searchQuery !== "") {
    const fuse = getFuseSearch(organizations)
    filteredOrganizations = fuse.search(searchQuery).map(res => res.item)
  }

  // NOTE: YEARS - intersection, REST - union.
  const {
    years,
    categories,
    technologies,
    topics,
    shortcuts,
    projectCounts,
    yearlyProjectCounts,
  } = filters

  if (years.length > 0) {
    let newFilteredOrganizations = []
    for (const organization of filteredOrganizations) {
      let matches = 0
      for (const year of years) {
        if (Object.keys(organization.years).includes(year)) {
          matches++
        }
      }
      if (matches === years.length) {
        newFilteredOrganizations.push(organization)
      }
    }
    filteredOrganizations = newFilteredOrganizations
  }

  if (categories.length > 0) {
    let newFilteredOrganizations = []
    for (const organization of filteredOrganizations) {
      for (const category of categories) {
        if (organization.category === category) {
          newFilteredOrganizations.push(organization)
          break
        }
      }
    }
    filteredOrganizations = newFilteredOrganizations
  }

  if (technologies.length > 0) {
    let newFilteredOrganizations = []
    for (const organization of filteredOrganizations) {
      for (const technology of technologies) {
        if (organization.technologies.includes(technology)) {
          newFilteredOrganizations.push(organization)
          break
        }
      }
    }
    filteredOrganizations = newFilteredOrganizations
  }

  if (topics.length > 0) {
    let newFilteredOrganizations = []
    for (const organization of filteredOrganizations) {
      for (const topic of topics) {
        if (organization.topics.includes(topic)) {
          newFilteredOrganizations.push(organization)
          break
        }
      }
    }
    filteredOrganizations = newFilteredOrganizations
  }

  if (projectCounts.length > 0) {
    let newFilteredOrganizations = []
    for (const organization of filteredOrganizations) {
      for (const range of projectCounts) {
        let min = 0
        let max = Infinity
        if (range.includes("+")) {
          min = parseInt(range)
        } else {
          const split = range.split("-")
          min = parseInt(split[0])
          max = parseInt(split[1])
        }

        if (
          organization.project_count >= min &&
          organization.project_count <= max
        ) {
          newFilteredOrganizations.push(organization)
          break
        }
      }
    }
    filteredOrganizations = newFilteredOrganizations
  }

  if (yearlyProjectCounts.length > 0) {
    let newFilteredOrganizations = []
    for (const organization of filteredOrganizations) {
      for (const range of yearlyProjectCounts) {
        let min = 0
        let max = Infinity
        if (range.includes("+")) {
          min = parseInt(range)
        } else {
          const split = range.split("-")
          min = parseInt(split[0])
          max = parseInt(split[1])
        }

        let match = false
        const yearsToCheck =
          years.length > 0 ? years : Object.keys(organization.years)
        for (const year of yearsToCheck) {
          if (!organization.years[year]) continue
          const count = organization.years[year].num_projects
          if (count >= min && count <= max) {
            match = true
            break
          }
        }

        if (match) {
          newFilteredOrganizations.push(organization)
          break
        }
      }
    }
    filteredOrganizations = newFilteredOrganizations
  }

  if (shortcuts.length > 0) {
    let newFilteredOrganizations = []
    for (const organization of filteredOrganizations) {
      let matchesShortcut = false
      for (const shortcut of shortcuts) {
        if (shortcut === "First-time organizations") {
          const orgYears = Object.keys(organization.years)
          if (orgYears.length === 1 && orgYears[0] === 2025) {
            matchesShortcut = true
            break
          }
        } else if (shortcut === "Every year at least 10") {
          const orgYears = Object.keys(organization.years)
          let allYearsMoreThan10 = true
          for (const year of orgYears) {
            if (organization.years[year].num_projects < 10) {
              allYearsMoreThan10 = false
              break
            }
          }
          if (allYearsMoreThan10) {
            matchesShortcut = true
            break
          }
        }
      }
      if (matchesShortcut) {
        newFilteredOrganizations.push(organization)
      }
    }
    filteredOrganizations = newFilteredOrganizations
  }

  if (sort === "name_asc") {
    filteredOrganizations = [...filteredOrganizations].sort((a, b) =>
      a.name.localeCompare(b.name)
    )
  } else if (sort === "name_desc") {
    filteredOrganizations = [...filteredOrganizations].sort((a, b) =>
      b.name.localeCompare(a.name)
    )
  } else if (sort === "projects_desc") {
    filteredOrganizations = [...filteredOrganizations].sort(
      (a, b) => b.project_count - a.project_count
    )
  } else if (sort === "projects_asc") {
    filteredOrganizations = [...filteredOrganizations].sort(
      (a, b) => a.project_count - b.project_count
    )
  } else if (sort === "ema_desc") {
    filteredOrganizations = [...filteredOrganizations].sort(
      (a, b) => (b.ema_project_count || 0) - (a.ema_project_count || 0)
    )
  }

  return filteredOrganizations
}

const IndexPage = ({ data }) => {
  const dispatch = useAppDispatch()
  const searchQuery = useAppSelector(getSearch)
  const filters = useAppSelector(getFilters)
  const sort = useAppSelector(getSort)
  const location = useLocation()
  const allOrganizations = useMemo(() => getOrganizations(data), [data])
  const filteredOrganizations = getFilteredOrganizations(
    allOrganizations,
    searchQuery,
    filters,
    sort
  )

  useEffect(() => {
    // This executes when there's an update in the url. (Example: User pressed back)
    // This will not execute when setSearchParams is used because
    // it uses JS history api. This is the desired behaviour so that this function
    // doesn't run when the filters or search is being modified in the app itself.

    const updatedSearchQuery = getSearchParam("search") || ""
    const updatedFilters = getFiltersFromSearchUrl()
    const updatedSort = getSearchParam("sort") || "name_asc"

    dispatch(
      urlChanged({
        search: updatedSearchQuery,
        filters: updatedFilters,
        sort: updatedSort,
      })
    )
    EventBus.emit("updateSearch", updatedSearchQuery)
  }, [location, dispatch])

  const metaDescription =
    "View and analyse the info of the organizations participating in Google Summer of Code and filter them by various parameters."
  const meta = [
    {
      name: "description",
      content: metaDescription,
    },
    {
      name: "keywords",
      content:
        "gsoc, analysis, organizations, statistics, filter, years, google summer of code, technologies, topics, categories, projects",
    },
    {
      property: "og:type",
      content: "website",
    },
    {
      property: "og:title",
      content: data.site.siteMetadata.title,
    },
    {
      property: "og:description",
      content: metaDescription,
    },
    {
      property: "og:image",
      content: `${data.site.siteMetadata.siteUrl}/images/screenshot.png`,
    },
    {
      property: "og:site_name",
      content: data.site.siteMetadata.title,
    },
    {
      property: "og:url",
      content: data.site.siteMetadata.siteUrl,
    },
    {
      name: "twitter:card",
      content: "summary_large_image",
    },
    {
      name: "twitter:title",
      content: data.site.siteMetadata.title,
    },
    {
      name: "twitter:description",
      content: metaDescription,
    },
    {
      name: "twitter:image",
      content: `${data.site.siteMetadata.siteUrl}/images/screenshot.png`,
    },
  ]

  const cardColumns = useBreakpoint().l ? 3 : 4

  React.useEffect(() => {
    setTimeout(() => {
      ; (window.adsbygoogle = window.adsbygoogle || []).push({})
    }, 2000)
  }, [])

  const sortOptions = [
    { key: "name_asc", value: "name_asc", text: "Name (A-Z)" },
    { key: "name_desc", value: "name_desc", text: "Name (Z-A)" },
    {
      key: "projects_desc",
      value: "projects_desc",
      text: "Projects Completed (Descending)",
    },
    {
      key: "projects_asc",
      value: "projects_asc",
      text: "Projects Completed (Ascending)",
    },
    {
      key: "ema_desc",
      value: "ema_desc",
      text: "Recent Activity (EMA)",
    },
  ]

  const handleExport = () => {
    // Define headers
    const headers = ["Name", "Category", "Total Projects", "Recent Activity (EMA)", "Technologies", "Topics", "URL"]

    // Create CSV rows
    const csvContent = [
      headers.join(","),
      ...filteredOrganizations.map(org => {
        const row = [
          `"${(org.name || "").replace(/"/g, '""')}"`,
          `"${(org.category || "").replace(/"/g, '""')}"`,
          org.project_count,
          org.ema_project_count || 0,
          `"${(org.technologies?.join(", ") || "").replace(/"/g, '""')}"`,
          `"${(org.topics?.join(", ") || "").replace(/"/g, '""')}"`,
          `"${(org.url || "").replace(/"/g, '""')}"`
        ]
        return row.join(",")
      })
    ].join("\n")

    // Create Blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", "gsoc-organizations-filtered.csv")
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Layout>
      <Seo title={"Home"} meta={meta} />
      <Grid className="index-org-cards-grid">
        <Notification />
      </Grid>

      <div style={{ padding: "0 1rem" }}>
        <AiSearch />
      </div>

      <div
        style={{
          marginTop: "1rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "200px" }}>
            <Dropdown
              placeholder="Sort by"
              fluid
              selection
              options={sortOptions}
              value={sort}
              onChange={(e, { value }) => dispatch(setSort(value))}
            />
          </div>
          <Button
            icon
            labelPosition='left'
            color="green"
            size="small"
            onClick={handleExport}
            title="Download filtered list as Excel"
          >
            <Icon name='download' />
            Export
          </Button>
        </div>
        <div className="ui orange label" style={{ height: "fit-content" }}>
          {filteredOrganizations.length} results
        </div>
      </div>
      <Grid className="index-org-cards-grid" stackable columns={cardColumns}>
        {filteredOrganizations.map(org => (
          <Grid.Column key={org.name}>
            <OrgCard data={org} />
          </Grid.Column>
        ))}
      </Grid>
      <div style={{ padding: "1rem" }}>
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client="ca-pub-9769516184087442"
          data-ad-slot="5525920548"
          data-ad-format="auto"
          data-full-width-responsive="false"
        ></ins>
      </div>
    </Layout>
  )
}

export const query = graphql`
  query {
    site {
      siteMetadata {
        title
        siteUrl
      }
    }
    allOrganization {
      edges {
        node {
          category
          description
          name
          project_count
          ema_project_count
          technologies
          image_url
          image_background_color
          topics
          url
          years {
            _2016 {
              num_projects
              projects_url
            }
            _2017 {
              num_projects
              projects_url
            }
            _2018 {
              num_projects
              projects_url
            }
            _2019 {
              num_projects
              projects_url
            }
            _2020 {
              num_projects
              projects_url
            }
            _2021 {
              num_projects
              projects_url
            }
            _2022 {
              num_projects
              projects_url
            }
            _2023 {
              num_projects
              projects_url
            }
            _2024 {
              num_projects
              projects_url
            }
            _2025 {
              num_projects
              projects_url
            }
          }
        }
      }
    }
  }
`

export default IndexPage
