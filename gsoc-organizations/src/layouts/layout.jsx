import React from "react"
import PropTypes from "prop-types"
import { useBreakpoint } from "gatsby-plugin-breakpoints"
import { useLocation } from "@reach/router"

import "semantic-ui-css/semantic.css"
import "./layout.css"

import DesktopLayout from "./desktop/layout"
import MobileLayout from "./mobile/layout"

const Layout = ({ children }) => {
  const location = useLocation()
  const breakpoints = useBreakpoint()
  const [darkMode, setDarkMode] = React.useState(false)

  React.useEffect(() => {
    const savedMode = localStorage.getItem("darkMode") === "true"
    setDarkMode(savedMode)
    if (savedMode) {
      document.body.classList.add("dark-mode")
    }
  }, [])

  const toggleDarkMode = () => {
    const newMode = !darkMode
    setDarkMode(newMode)
    localStorage.setItem("darkMode", newMode)
    if (newMode) {
      document.body.classList.add("dark-mode")
    } else {
      document.body.classList.remove("dark-mode")
    }
  }

  const showFiltersAndSearch = location.pathname === "/"

  if (!breakpoints.md) {
    return (
      <DesktopLayout
        showFiltersAndSearch={showFiltersAndSearch}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
      >
        {children}
      </DesktopLayout>
    )
  } else {
    return (
      <MobileLayout
        showFiltersAndSearch={showFiltersAndSearch}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
      >
        {children}
      </MobileLayout>
    )
  }
}

Layout.propTypes = {
  children: PropTypes.node.isRequired,
}

export default Layout
