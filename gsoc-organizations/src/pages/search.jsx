import React, { useState, useEffect } from "react"
import {
  Container,
  Grid,
  Header,
  Segment,
  Form,
  Button,
  Icon,
} from "semantic-ui-react"
import Layout from "../layouts/layout"
import Seo from "../components/seo"
import LoadingSpinner from "../components/ui/LoadingSpinner"
import ErrorMessage from "../components/ui/ErrorMessage"

const API_BASE = "http://localhost:3001/api"

const SearchPage = () => {
  const [query, setQuery] = useState("")
  const [searchType, setSearchType] = useState("auto")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({})

  const searchOptions = [
    { key: "auto", value: "auto", text: "Auto (Recommended)" },
    { key: "semantic", value: "semantic", text: "Semantic Search" },
    { key: "exact", value: "exact", text: "Exact Match" },
    { key: "hybrid", value: "hybrid", text: "Hybrid Search" },
  ]

  const handleSearch = async () => {
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const searchParams = {
        query: query.trim(),
        queryType: searchType,
        topK: 10,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        returnMetadata: true,
      }

      const response = await fetch(`${API_BASE}/retrieval/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(searchParams),
      })

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`)
      }

      const data = await response.json()
      setResults(data)
    } catch (err) {
      setError(typeof err === "string" ? err : err.message || "Search failed")
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  return (
    <Layout>
      <Seo title="AI-Powered Search" />
      <Container style={{ padding: "2rem 0" }}>
        <Grid container stackable>
          <Grid.Row>
            <Grid.Column width={16}>
              <Header
                as="h1"
                textAlign="center"
                style={{ marginBottom: "2rem" }}
              >
                <Icon name="search" />
                AI-Powered GSoC Search
                <Header.Subheader>
                  Intelligent search across 1,276+ GSoC projects using semantic
                  and keyword matching
                </Header.Subheader>
              </Header>
            </Grid.Column>
          </Grid.Row>

          <Grid.Row>
            <Grid.Column width={16}>
              <Segment raised>
                <Form onSubmit={handleSearch}>
                  <Form.Group widths="equal">
                    <Form.Input
                      fluid
                      placeholder="Search GSoC projects (e.g., 'machine learning python', 'react web development')"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      action={
                        <Button
                          type="submit"
                          primary
                          loading={loading}
                          disabled={!query.trim() || loading}
                        >
                          <Icon name="search" />
                          Search
                        </Button>
                      }
                    />
                  </Form.Group>

                  <Form.Group>
                    <Form.Select
                      width={4}
                      label="Search Type"
                      placeholder="Select search type"
                      options={searchOptions}
                      value={searchType}
                      onChange={(e, { value }) => setSearchType(value)}
                    />
                    <Form.Input
                      width={4}
                      label="Organization"
                      placeholder="e.g., PostgreSQL"
                      value={filters.org || ""}
                      onChange={e => handleFilterChange("org", e.target.value)}
                    />
                    <Form.Input
                      width={4}
                      label="Year"
                      placeholder="e.g., 2024"
                      value={filters.year || ""}
                      onChange={e =>
                        handleFilterChange(
                          "year",
                          parseInt(e.target.value) || ""
                        )
                      }
                    />
                    <Form.Input
                      width={4}
                      label="Technology"
                      placeholder="e.g., python"
                      value={filters.tech_stack || ""}
                      onChange={e =>
                        handleFilterChange("tech_stack", e.target.value)
                      }
                    />
                  </Form.Group>
                </Form>
              </Segment>
            </Grid.Column>
          </Grid.Row>

          {error && (
            <Grid.Row>
              <Grid.Column width={16}>
                <ErrorMessage
                  title="Search Error"
                  message={error}
                  onRetry={handleSearch}
                />
              </Grid.Column>
            </Grid.Row>
          )}

          {loading && (
            <Grid.Row>
              <Grid.Column width={16}>
                <LoadingSpinner text="Searching..." />
              </Grid.Column>
            </Grid.Row>
          )}

          {results && !loading && (
            <Grid.Row>
              <Grid.Column width={16}>
                <Segment>
                  <Header as="h3">
                    <Icon name="list" />
                    Search Results ({results.results?.length || 0})
                    {results.metadata && (
                      <Header.Subheader>
                        Query Type: {results.queryType} | Intent:{" "}
                        {results.intent}
                        {results.metadata.confidence && (
                          <span>
                            {" "}
                            | Confidence:{" "}
                            {(results.metadata.confidence * 100).toFixed(1)}%
                          </span>
                        )}
                      </Header.Subheader>
                    )}
                  </Header>

                  {results.results && results.results.length > 0 ? (
                    <div style={{ marginTop: "1rem" }}>
                      {results.results.map((result, index) => (
                        <Segment
                          key={result.id || index}
                          style={{ marginBottom: "1rem" }}
                        >
                          <Grid>
                            <Grid.Column width={12}>
                              <Header as="h4">
                                {result.document?.title || "Untitled Project"}
                                <Header.Subheader>
                                  {result.document?.org ||
                                    "Unknown Organization"}{" "}
                                  • {result.document?.year || "Unknown Year"}
                                </Header.Subheader>
                              </Header>

                              {result.document?.short_description && (
                                <p style={{ marginBottom: "0.5rem" }}>
                                  {result.document.short_description}
                                </p>
                              )}

                              {result.document?.tech_stack &&
                                result.document.tech_stack.length > 0 && (
                                  <div style={{ marginTop: "0.5rem" }}>
                                    <strong>Technologies:</strong>{" "}
                                    {result.document.tech_stack
                                      .slice(0, 5)
                                      .join(", ")}
                                  </div>
                                )}

                              {result.document?.topics &&
                                result.document.topics.length > 0 && (
                                  <div style={{ marginTop: "0.25rem" }}>
                                    <strong>Topics:</strong>{" "}
                                    {result.document.topics
                                      .slice(0, 3)
                                      .join(", ")}
                                  </div>
                                )}

                              {result.document?.difficulty && (
                                <div style={{ marginTop: "0.25rem" }}>
                                  <strong>Difficulty:</strong>{" "}
                                  {result.document.difficulty}
                                </div>
                              )}
                            </Grid.Column>

                            <Grid.Column width={4} textAlign="right">
                              <div style={{ marginBottom: "0.5rem" }}>
                                <strong>
                                  Score: {(result.score * 100).toFixed(1)}%
                                </strong>
                              </div>
                              <div style={{ fontSize: "0.9em", color: "gray" }}>
                                Method: {result.method || "unknown"}
                              </div>
                              {result.document?.project_url && (
                                <div style={{ marginTop: "0.5rem" }}>
                                  <Button
                                    size="tiny"
                                    as="a"
                                    href={result.document.project_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Icon name="external" />
                                    View Project
                                  </Button>
                                </div>
                              )}
                            </Grid.Column>
                          </Grid>
                        </Segment>
                      ))}
                    </div>
                  ) : (
                    <Message info>
                      <p>
                        No results found for your query. Try adjusting your
                        search terms or filters.
                      </p>
                    </Message>
                  )}
                </Segment>
              </Grid.Column>
            </Grid.Row>
          )}
        </Grid>
      </Container>
    </Layout>
  )
}

export default SearchPage
