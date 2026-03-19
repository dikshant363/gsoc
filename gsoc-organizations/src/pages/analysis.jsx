import React, { useState, useEffect } from "react"
import {
  Container,
  Grid,
  Header,
  Segment,
  Form,
  Button,
  Icon,
  Accordion,
  Label,
  Divider,
  Card,
  Statistic,
  List,
} from "semantic-ui-react"
import Layout from "../layouts/layout"
import Seo from "../components/seo"
import apiClient from "../utils/api"
import LoadingSpinner from "../components/ui/LoadingSpinner"
import ErrorMessage from "../components/ui/ErrorMessage"

const AnalysisPage = () => {
  const [query, setQuery] = useState("")
  const [reasoningDepth, setReasoningDepth] = useState("comprehensive")
  const [contextLevel, setContextLevel] = useState("full")
  const [maxTokens, setMaxTokens] = useState(2000)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [activeAccordion, setActiveAccordion] = useState(-1)

  const reasoningOptions = [
    { key: "basic", value: "basic", text: "Basic Analysis" },
    {
      key: "comprehensive",
      value: "comprehensive",
      text: "Comprehensive Analysis (Recommended)",
    },
    { key: "deep", value: "deep", text: "Deep Analysis (Advanced)" },
  ]

  const contextOptions = [
    { key: "summary", value: "summary", text: "Summary Context" },
    { key: "full", value: "full", text: "Full Context (Recommended)" },
    { key: "minimal", value: "minimal", text: "Minimal Context" },
  ]

  const handleAnalyze = async () => {
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const analysisOptions = {
        reasoningDepth,
        context: contextLevel,
        maxTokens: parseInt(maxTokens),
        includeSources: true,
      }

      const data = await apiClient.fullAnalysis(query.trim(), analysisOptions)
      setResults(data)
    } catch (err) {
      setError(
        typeof err === "string"
          ? err
          : err.message || err.details?.message || "Analysis failed"
      )
    } finally {
      setLoading(false)
    }
  }

  const handleAccordionClick = index => {
    setActiveAccordion(activeAccordion === index ? -1 : index)
  }

  const renderAnalysisResults = () => {
    if (!results) return null

    const panels = []

    // Main Analysis
    if (results.analysis) {
      panels.push({
        key: "analysis",
        title: {
          content: (
            <span>
              <Icon name="brain" />
              Analysis Results
              {results.metadata?.confidence && (
                <Label size="tiny" color="blue" style={{ marginLeft: "10px" }}>
                  Confidence: {(results.metadata.confidence * 100).toFixed(1)}%
                </Label>
              )}
            </span>
          ),
        },
        content: {
          content: (
            <div style={{ padding: "1rem" }}>
              <div style={{ marginBottom: "1rem" }}>
                <Header as="h4">Question</Header>
                <p style={{ fontStyle: "italic", color: "gray" }}>
                  {results.query}
                </p>
              </div>

              <Divider />

              <div style={{ marginBottom: "1rem" }}>
                <Header as="h4">Answer</Header>
                <div style={{ lineHeight: "1.6" }}>
                  {results.analysis.answer || results.analysis.summary}
                </div>
              </div>

              {results.analysis.reasoning && (
                <div style={{ marginBottom: "1rem" }}>
                  <Header as="h4">Reasoning Process</Header>
                  <div
                    style={{
                      backgroundColor: "#f8f9fa",
                      padding: "1rem",
                      borderRadius: "4px",
                    }}
                  >
                    {results.analysis.reasoning}
                  </div>
                </div>
              )}

              {results.analysis.keyInsights &&
                results.analysis.keyInsights.length > 0 && (
                  <div style={{ marginBottom: "1rem" }}>
                    <Header as="h4">Key Insights</Header>
                    <List bulleted>
                      {results.analysis.keyInsights.map((insight, idx) => (
                        <List.Item key={idx}>{insight}</List.Item>
                      ))}
                    </List>
                  </div>
                )}
            </div>
          ),
        },
      })
    }

    // Sources & Citations
    if (results.sources && results.sources.length > 0) {
      panels.push({
        key: "sources",
        title: {
          content: (
            <span>
              <Icon name="book" />
              Sources & Citations ({results.sources.length})
            </span>
          ),
        },
        content: {
          content: (
            <div style={{ padding: "1rem" }}>
              <List divided relaxed>
                {results.sources.map((source, idx) => (
                  <List.Item key={idx}>
                    <List.Content>
                      <List.Header>
                        {source.title || `Source ${idx + 1}`}
                      </List.Header>
                      <List.Description>
                        <p>
                          {source.description ||
                            source.content?.substring(0, 200) + "..."}
                        </p>
                        {source.url && (
                          <Button
                            size="tiny"
                            as="a"
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ marginTop: "0.5rem" }}
                          >
                            <Icon name="external" />
                            View Source
                          </Button>
                        )}
                        {source.relevance && (
                          <Label
                            size="tiny"
                            color="green"
                            style={{ marginTop: "0.5rem" }}
                          >
                            Relevance: {(source.relevance * 100).toFixed(0)}%
                          </Label>
                        )}
                      </List.Description>
                    </List.Content>
                  </List.Item>
                ))}
              </List>
            </div>
          ),
        },
      })
    }

    // Metadata
    if (results.metadata) {
      panels.push({
        key: "metadata",
        title: {
          content: (
            <span>
              <Icon name="info circle" />
              Analysis Metadata
            </span>
          ),
        },
        content: {
          content: (
            <div style={{ padding: "1rem" }}>
              <Grid columns={2} stackable>
                <Grid.Column>
                  <Statistic size="mini">
                    <Statistic.Value>
                      {results.metadata.tokensUsed || "N/A"}
                    </Statistic.Value>
                    <Statistic.Label>Tokens Used</Statistic.Label>
                  </Statistic>
                </Grid.Column>
                <Grid.Column>
                  <Statistic size="mini">
                    <Statistic.Value>
                      {results.metadata.processingTime
                        ? `${results.metadata.processingTime.toFixed(2)}s`
                        : "N/A"}
                    </Statistic.Value>
                    <Statistic.Label>Processing Time</Statistic.Label>
                  </Statistic>
                </Grid.Column>
                {results.metadata.model && (
                  <Grid.Column width={16}>
                    <div style={{ marginTop: "1rem" }}>
                      <strong>Model:</strong> {results.metadata.model}
                    </div>
                  </Grid.Column>
                )}
                {results.metadata.reasoningSteps && (
                  <Grid.Column width={16}>
                    <div style={{ marginTop: "1rem" }}>
                      <strong>Reasoning Steps:</strong>{" "}
                      {results.metadata.reasoningSteps}
                    </div>
                  </Grid.Column>
                )}
              </Grid>
            </div>
          ),
        },
      })
    }

    return (
      <Accordion
        fluid
        styled
        panels={panels}
        activeIndex={activeAccordion}
        onTitleClick={(e, { index }) => handleAccordionClick(index)}
      />
    )
  }

  return (
    <Layout>
      <Seo title="AI Analysis" />
      <Container style={{ padding: "2rem 0" }}>
        <Grid container stackable>
          <Grid.Row>
            <Grid.Column width={16}>
              <Header
                as="h1"
                textAlign="center"
                style={{ marginBottom: "2rem" }}
              >
                <Icon name="brain" />
                AI-Powered Analysis
                <Header.Subheader>
                  Ask complex questions about GSoC projects and get detailed
                  analysis with reasoning
                </Header.Subheader>
              </Header>
            </Grid.Column>
          </Grid.Row>

          <Grid.Row>
            <Grid.Column width={16}>
              <Segment raised>
                <Form onSubmit={handleAnalyze}>
                  <Form.TextArea
                    label="Analysis Query"
                    placeholder="Ask complex questions like: 'Compare machine learning projects from 2023 vs 2024', 'What are the most challenging projects for beginners?', 'Which organizations focus on web development and what technologies do they use?', 'How have AI/ML project requirements evolved over the years?'"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    rows={4}
                    style={{ minHeight: "100px" }}
                  />

                  <Form.Group widths="equal">
                    <Form.Select
                      label="Analysis Depth"
                      placeholder="Select analysis depth"
                      options={reasoningOptions}
                      value={reasoningDepth}
                      onChange={(e, { value }) => setReasoningDepth(value)}
                    />
                    <Form.Select
                      label="Context Level"
                      placeholder="Select context level"
                      options={contextOptions}
                      value={contextLevel}
                      onChange={(e, { value }) => setContextLevel(value)}
                    />
                    <Form.Input
                      label="Max Tokens"
                      type="number"
                      placeholder="2000"
                      value={maxTokens}
                      onChange={e => setMaxTokens(e.target.value)}
                      min="500"
                      max="4000"
                    />
                  </Form.Group>

                  <Button
                    type="submit"
                    primary
                    fluid
                    size="large"
                    loading={loading}
                    disabled={!query.trim() || loading}
                  >
                    <Icon name="search" />
                    Analyze with AI
                  </Button>
                </Form>
              </Segment>
            </Grid.Column>
          </Grid.Row>

          {error && (
            <Grid.Row>
              <Grid.Column width={16}>
                <ErrorMessage
                  title="Analysis Error"
                  message={error}
                  onRetry={handleAnalyze}
                />
              </Grid.Column>
            </Grid.Row>
          )}

          {loading && (
            <Grid.Row>
              <Grid.Column width={16}>
                <LoadingSpinner text="Analyzing with AI..." />
              </Grid.Column>
            </Grid.Row>
          )}

          {results && !loading && (
            <Grid.Row>
              <Grid.Column width={16}>
                <Segment>
                  <Header as="h3">
                    <Icon name="chart bar" />
                    Analysis Complete
                  </Header>
                  {renderAnalysisResults()}
                </Segment>
              </Grid.Column>
            </Grid.Row>
          )}
        </Grid>
      </Container>
    </Layout>
  )
}

export default AnalysisPage
