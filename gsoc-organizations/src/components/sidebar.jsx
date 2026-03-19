import React, { useCallback, useMemo, memo } from "react"
import PropTypes from "prop-types"
import { useStaticQuery, graphql } from "gatsby"

import "./sidebar.css"
import Filter from "./filters/filter"

import GitHubButton from "react-github-btn"
import { OutboundLink } from "gatsby-plugin-google-gtag"
import { Link } from "gatsby"
import { Container, Divider, Button, Icon } from "semantic-ui-react"
import { useAppDispatch, useAppSelector } from "../store"
import { clearFilters } from "../store/filters"
import { getBookmarks } from "../store/bookmarks" // Import selector
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faXTwitter } from "@fortawesome/free-brands-svg-icons"
import { faDatabase, faMoon, faSun } from "@fortawesome/free-solid-svg-icons"

const getSidebarStyles = config => {
  if (config.mode === "desktop") {
    return {
      width: "inherit",
    }
  }

  if (config.mode === "mobile") {
    const mobileCss = {
      width: "400px",
      maxWidth: "70%",
    }

    if (config.visible) {
      return {
        ...mobileCss,
        transform: "translateX(0%)",
      }
    } else {
      return {
        ...mobileCss,
        transform: "translateX(-100%)",
      }
    }
  }
}

const Sidebar = ({ config, showFilters, darkMode, toggleDarkMode }) => {
  const dispatch = useAppDispatch()
  const bookmarks = useAppSelector(getBookmarks) // Get count
  const sidebarStyle = useMemo(() => getSidebarStyles(config), [config])
  const filterStyle = showFilters ? {} : { display: "none" }

  const {
    filter: {
      topics,
      technologies,
      years,
      categories,
      projectCounts,
      yearlyProjectCounts,
      shortcuts,
    },
  } = useStaticQuery(graphql`
    {
      filter {
        topics {
          name
          frequency
        }
        technologies {
          name
          frequency
        }
        years {
          name
          frequency
        }
        categories {
          name
          frequency
        }
        projectCounts {
          name
          frequency
        }
        yearlyProjectCounts {
          name
          frequency
        }
        shortcuts {
          name
          frequency
        }
      }
    }
  `)

  const clearAllFilters = useCallback(() => {
    dispatch(clearFilters())
  }, [dispatch])

  return (
    <div className="sidebar-sidebar" style={sidebarStyle}>
      <div className="sidebar-div">
        <div className="sidebar-logo-description">
          <div className="sidebar-description">
            {showFilters ? (
              <Container>GSoC Organizations</Container>
            ) : (
              <Link to="/">
                <Container>GSoC Organizations</Container>
              </Link>
            )}
          </div>
        </div>
        <div className="sidebar-content" style={filterStyle}>
          <div className="sidebar-content-ai-features">
            <div style={{ marginBottom: "1rem" }}>
              <strong style={{ color: "var(--text-color)" }}>
                AI Features
              </strong>
            </div>
            <Link to="/search">
              <Button
                fluid
                style={{
                  backgroundColor: "#2185d0",
                  color: "white",
                  marginBottom: "8px",
                }}
              >
                <Icon name="search" /> AI Search
              </Button>
            </Link>
            <Link to="/analysis">
              <Button
                fluid
                style={{
                  backgroundColor: "#21ba45",
                  color: "white",
                  marginBottom: "8px",
                }}
              >
                <Icon name="brain" /> AI Analysis
              </Button>
            </Link>
            <Link to="/evaluate">
              <Button
                fluid
                style={{
                  backgroundColor: "#f2711c",
                  color: "white",
                  marginBottom: "8px",
                }}
              >
                <Icon name="star" /> Evaluate
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button
                fluid
                style={{
                  backgroundColor: "#a333c8",
                  color: "white",
                  marginBottom: "8px",
                }}
              >
                <Icon name="dashboard" /> Dashboard
              </Button>
            </Link>
            <Link to="/match">
              <Button
                fluid
                style={{
                  backgroundColor: "var(--accent-color)",
                  color: "white",
                  marginBottom: "8px",
                  boxShadow: "0 4px 6px rgba(219, 100, 0, 0.2)",
                }}
              >
                <Icon name="lightning" /> AI Matcher
              </Button>
            </Link>
            <Link to="/bookmarks">
              <Button
                fluid
                style={{
                  backgroundColor: "var(--code-text)",
                  color: "white",
                  marginBottom: "10px",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                }}
              >
                <Icon name="heart" /> My Bookmarks ({bookmarks.length})
              </Button>
            </Link>
            <Button size="tiny" basic color="orange" onClick={clearAllFilters}>
              Clear all filters
            </Button>
          </div>
          <Divider className="sidebar-divider" />
          <div className="sidebar-content-filters">
            <Filter name="shortcuts" choices={shortcuts} sortBy="frequency" />
            <Filter name="years" choices={years} sortBy="name" order="desc" />
            <Filter
              name="yearlyProjectCounts"
              choices={yearlyProjectCounts}
              sortBy="name"
            />
            <Filter
              name="projectCounts"
              choices={projectCounts}
              sortBy="name"
            />
            <Filter name="categories" choices={categories} sortBy="name" />
            <Filter
              name="technologies"
              choices={technologies}
              sortBy="frequency"
            />
            <Filter
              name="topics"
              choices={topics}
              showDivider={false}
              sortBy="frequency"
            />
          </div>
        </div>
        <div className="sidebar-footer">
          <Divider className="sidebar-divider" />
          <div>
            <center>
              <table>
                <tbody>
                  <tr>
                    <td>
                      <GitHubButton
                        data-size="large"
                        href="https://github.com/nishantwrp/gsoc-organizations"
                        data-icon="octicon-star"
                        data-show-count="true"
                        aria-label="Star nishantwrp/gsoc-organizations-site on GitHub"
                      >
                        Star
                      </GitHubButton>
                    </td>
                    <td>
                      <OutboundLink
                        href="https://api.gsocorganizations.dev/"
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Button
                          className="sidebar-footer-icon-link"
                          icon
                          compact={true}
                          aria-label="API Documentation"
                        >
                          <Icon>
                            <FontAwesomeIcon icon={faDatabase} />
                          </Icon>
                        </Button>
                      </OutboundLink>
                    </td>
                    <td>
                      <OutboundLink
                        href="https://x.com/nishantwrp"
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Button
                          className="sidebar-footer-icon-link"
                          icon
                          compact={true}
                          aria-label="Twitter Profile"
                        >
                          <Icon>
                            <FontAwesomeIcon icon={faXTwitter} />
                          </Icon>
                        </Button>
                      </OutboundLink>
                    </td>
                    <td>
                      <Button
                        className="sidebar-footer-icon-link"
                        icon
                        compact={true}
                        onClick={toggleDarkMode}
                        aria-label="Toggle Dark Mode"
                      >
                        <Icon>
                          <FontAwesomeIcon icon={darkMode ? faSun : faMoon} />
                        </Icon>
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="sidebar-footer-text-container">
                <span className="sidebar-footer-text">
                  Made with{" "}
                  <span className="sidebar-footer-icon">
                    <Icon name="heart"></Icon>
                  </span>{" "}
                  by{" "}
                  <OutboundLink
                    href="https://www.github.com/nishantwrp"
                    className="sidebar-footer-text"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <u>nishantwrp</u>
                  </OutboundLink>
                </span>
              </div>
            </center>
          </div>
        </div>
      </div>
    </div>
  )
}

Sidebar.propTypes = {
  config: PropTypes.object,
  showFilters: PropTypes.bool,
}

Sidebar.defaultProps = {
  config: {
    mode: "desktop",
  },
  showFilters: true,
}

export default memo(Sidebar)
