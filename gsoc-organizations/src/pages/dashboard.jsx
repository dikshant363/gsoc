import React, { useState, useEffect } from "react"
import {
  Container,
  Grid,
  Header,
  Segment,
  Card,
  Statistic,
  Icon,
  Button,
  Dropdown,
  Tab,
  Message,
} from "semantic-ui-react"
import { Bar, Line, Doughnut } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js"
import Layout from "../layouts/layout"
import Seo from "../components/seo"
import apiClient from "../utils/api"
import LoadingSpinner from "../components/ui/LoadingSpinner"
import ErrorMessage from "../components/ui/ErrorMessage"
import ChartContainer from "../components/ui/ChartContainer"

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

const DashboardPage = () => {
  const [insights, setInsights] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [timeRange, setTimeRange] = useState("7d")

  const timeRangeOptions = [
    { key: "1d", value: "1d", text: "Last 24 Hours" },
    { key: "7d", value: "7d", text: "Last 7 Days" },
    { key: "30d", value: "30d", text: "Last 30 Days" },
    { key: "90d", value: "90d", text: "Last 90 Days" },
  ]

  useEffect(() => {
    loadDashboardData()
  }, [timeRange])

  const loadDashboardData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [insightsData, statsData] = await Promise.all([
        apiClient.getInsights(timeRange),
        apiClient.getStats({ timeRange }),
      ])

      setInsights(insightsData)
      setStats(statsData)
    } catch (err) {
      setError(
        typeof err === "string"
          ? err
          : err.message || "Failed to load dashboard data"
      )
    } finally {
      setLoading(false)
    }
  }

  const refreshData = () => {
    loadDashboardData()
  }

  const renderOverviewTab = () => {
    if (!stats) return null

    return (
      <div>
        {/* Key Metrics */}
        <Grid columns={4} stackable style={{ marginBottom: "2rem" }}>
          <Grid.Column>
            <Card>
              <Card.Content>
                <Statistic>
                  <Statistic.Value>{stats.totalQueries || 0}</Statistic.Value>
                  <Statistic.Label>Total Queries</Statistic.Label>
                </Statistic>
              </Card.Content>
            </Card>
          </Grid.Column>
          <Grid.Column>
            <Card>
              <Card.Content>
                <Statistic color="green">
                  <Statistic.Value>
                    {stats.averageQuality
                      ? (stats.averageQuality * 100).toFixed(1) + "%"
                      : "N/A"}
                  </Statistic.Value>
                  <Statistic.Label>Avg Quality Score</Statistic.Label>
                </Statistic>
              </Card.Content>
            </Card>
          </Grid.Column>
          <Grid.Column>
            <Card>
              <Card.Content>
                <Statistic color="blue">
                  <Statistic.Value>{stats.uniqueUsers || 0}</Statistic.Value>
                  <Statistic.Label>Unique Users</Statistic.Label>
                </Statistic>
              </Card.Content>
            </Card>
          </Grid.Column>
          <Grid.Column>
            <Card>
              <Card.Content>
                <Statistic color="purple">
                  <Statistic.Value>{stats.feedbackCount || 0}</Statistic.Value>
                  <Statistic.Label>Feedback Items</Statistic.Label>
                </Statistic>
              </Card.Content>
            </Card>
          </Grid.Column>
        </Grid>

        {/* Charts */}
        <Grid columns={2} stackable>
          <Grid.Column>
            <ChartContainer
              title="Query Types Distribution"
              icon="pie chart"
              loading={!stats.queryTypesChart}
              error={!stats.queryTypesChart ? "No chart data available" : null}
            >
              {stats.queryTypesChart && (
                <Doughnut
                  data={{
                    labels: stats.queryTypesChart.labels,
                    datasets: [
                      {
                        data: stats.queryTypesChart.data,
                        backgroundColor: [
                          "#2185d0",
                          "#21ba45",
                          "#f2711c",
                          "#db2828",
                          "#a333c8",
                        ],
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { position: "bottom" },
                    },
                  }}
                />
              )}
            </ChartContainer>
          </Grid.Column>
          <Grid.Column>
            <ChartContainer
              title="Quality Score Trends"
              icon="line chart"
              loading={!stats.qualityTrendChart}
              error={
                !stats.qualityTrendChart ? "No trend data available" : null
              }
            >
              {stats.qualityTrendChart && (
                <Line
                  data={{
                    labels: stats.qualityTrendChart.labels,
                    datasets: [
                      {
                        label: "Average Quality Score",
                        data: stats.qualityTrendChart.data,
                        borderColor: "#21ba45",
                        backgroundColor: "rgba(33, 186, 69, 0.1)",
                        tension: 0.4,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 1,
                        ticks: {
                          callback: value => `${(value * 100).toFixed(0)}%`,
                        },
                      },
                    },
                  }}
                />
              )}
            </ChartContainer>
          </Grid.Column>
        </Grid>
      </div>
    )
  }

  const renderQueriesTab = () => {
    if (!insights) return null

    return (
      <div>
        <Grid columns={2} stackable>
          <Grid.Column width={10}>
            <Segment>
              <Header as="h3">Popular Query Topics</Header>
              {insights.popularTopics && insights.popularTopics.length > 0 ? (
                <Bar
                  data={{
                    labels: insights.popularTopics.map(topic => topic.topic),
                    datasets: [
                      {
                        label: "Query Count",
                        data: insights.popularTopics.map(topic => topic.count),
                        backgroundColor: "#2185d0",
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { display: false },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: { precision: 0 },
                      },
                    },
                  }}
                />
              ) : (
                <Message info>No topic data available</Message>
              )}
            </Segment>
          </Grid.Column>
          <Grid.Column width={6}>
            <Segment>
              <Header as="h3">Top Queries</Header>
              {insights.topQueries && insights.topQueries.length > 0 ? (
                insights.topQueries.slice(0, 10).map((query, idx) => (
                  <Card key={idx} fluid style={{ marginBottom: "0.5rem" }}>
                    <Card.Content style={{ padding: "0.8rem" }}>
                      <Card.Description style={{ fontSize: "0.9em" }}>
                        "{query.query}"
                      </Card.Description>
                      <Card.Meta style={{ fontSize: "0.8em" }}>
                        {query.count} times • Avg Quality:{" "}
                        {(query.avgQuality * 100).toFixed(1)}%
                      </Card.Meta>
                    </Card.Content>
                  </Card>
                ))
              ) : (
                <Message info>No query data available</Message>
              )}
            </Segment>
          </Grid.Column>
        </Grid>
      </div>
    )
  }

  const renderFeedbackTab = () => {
    if (!insights) return null

    return (
      <div>
        <Grid columns={2} stackable>
          <Grid.Column>
            <Segment>
              <Header as="h3">User Ratings Distribution</Header>
              {insights.feedbackRatings && (
                <Bar
                  data={{
                    labels: [
                      "1 Star",
                      "2 Stars",
                      "3 Stars",
                      "4 Stars",
                      "5 Stars",
                    ],
                    datasets: [
                      {
                        label: "Number of Ratings",
                        data: insights.feedbackRatings,
                        backgroundColor: "#f2711c",
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { display: false },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: { precision: 0 },
                      },
                    },
                  }}
                />
              )}
            </Segment>
          </Grid.Column>
          <Grid.Column>
            <Segment>
              <Header as="h3">Recent Feedback</Header>
              {insights.recentFeedback && insights.recentFeedback.length > 0 ? (
                insights.recentFeedback.slice(0, 5).map((feedback, idx) => (
                  <Card key={idx} fluid style={{ marginBottom: "0.5rem" }}>
                    <Card.Content style={{ padding: "0.8rem" }}>
                      <Card.Description style={{ fontSize: "0.9em" }}>
                        "{feedback.comment || "No comment provided"}"
                      </Card.Description>
                      <Card.Meta style={{ fontSize: "0.8em" }}>
                        Rating: {feedback.rating}/5 •{" "}
                        {new Date(feedback.timestamp).toLocaleDateString()}
                      </Card.Meta>
                    </Card.Content>
                  </Card>
                ))
              ) : (
                <Message info>No recent feedback available</Message>
              )}
            </Segment>
          </Grid.Column>
        </Grid>
      </div>
    )
  }

  const panes = [
    {
      menuItem: "Overview",
      render: () => <Tab.Pane>{renderOverviewTab()}</Tab.Pane>,
    },
    {
      menuItem: "Queries",
      render: () => <Tab.Pane>{renderQueriesTab()}</Tab.Pane>,
    },
    {
      menuItem: "Feedback",
      render: () => <Tab.Pane>{renderFeedbackTab()}</Tab.Pane>,
    },
  ]

  if (loading) {
    return (
      <Layout>
        <Container style={{ padding: "4rem 0", textAlign: "center" }}>
          <LoadingSpinner text="Loading Dashboard..." size="large" />
        </Container>
      </Layout>
    )
  }

  return (
    <Layout>
      <Seo title="Dashboard" />
      <Container style={{ padding: "2rem 0" }}>
        <Grid container stackable>
          <Grid.Row>
            <Grid.Column width={16}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "2rem",
                }}
              >
                <Header as="h1">
                  <Icon name="dashboard" />
                  System Dashboard
                  <Header.Subheader>
                    Analytics and insights from the GSoC AI system
                  </Header.Subheader>
                </Header>

                <div
                  style={{ display: "flex", gap: "1rem", alignItems: "center" }}
                >
                  <Dropdown
                    placeholder="Time Range"
                    selection
                    options={timeRangeOptions}
                    value={timeRange}
                    onChange={(e, { value }) => setTimeRange(value)}
                  />
                  <Button primary onClick={refreshData}>
                    <Icon name="refresh" />
                    Refresh
                  </Button>
                </div>
              </div>
            </Grid.Column>
          </Grid.Row>

          {error && (
            <Grid.Row>
              <Grid.Column width={16}>
                <ErrorMessage
                  title="Dashboard Error"
                  message={error}
                  onRetry={refreshData}
                  retryText="Try Again"
                />
              </Grid.Column>
            </Grid.Row>
          )}

          {!error && (
            <Grid.Row>
              <Grid.Column width={16}>
                <Tab panes={panes} />
              </Grid.Column>
            </Grid.Row>
          )}
        </Grid>
      </Container>
    </Layout>
  )
}

export default DashboardPage
