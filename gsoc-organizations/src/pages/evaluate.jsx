import React, { useState } from "react"
import {
  Container,
  Grid,
  Header,
  Segment,
  Form,
  Button,
  Icon,
  Message,
  Card,
  Statistic,
  Divider,
  List,
  Progress,
} from "semantic-ui-react"
import Layout from "../layouts/layout"
import Seo from "../components/seo"
import apiClient from "../utils/api"
import LoadingSpinner from "../components/ui/LoadingSpinner"
import ErrorMessage from "../components/ui/ErrorMessage"
import FeedbackForm from "../components/ui/FeedbackForm"

const EvaluatePage = () => {
  const [query, setQuery] = useState("")
  const [response, setResponse] = useState("")
  const [evaluation, setEvaluation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [feedbackLoading, setFeedbackLoading] = useState(false)

  const getScoreColor = score => {
    if (score >= 0.8) return "#21ba45"
    if (score >= 0.6) return "#fbbf24"
    if (score >= 0.4) return "#f2711c"
    return "#db2828"
  }

  const getScoreLabel = score => {
    if (score >= 0.8) return "Excellent"
    if (score >= 0.6) return "Good"
    if (score >= 0.4) return "Fair"
    return "Poor"
  }

  const handleEvaluate = async () => {
    if (!query.trim() || !response.trim()) return

    setLoading(true)
    setError(null)
    setEvaluation(null)

    try {
      const result = await apiClient.evaluateResponse(
        query.trim(),
        response.trim(),
        {
          criteria: [
            "accuracy",
            "relevance",
            "completeness",
            "clarity",
            "helpfulness",
          ],
          returnDetailedFeedback: true,
        }
      )
      setEvaluation(result)
    } catch (err) {
      setError(
        typeof err === "string"
          ? err
          : err.message || err.details?.message || "Evaluation failed"
      )
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitFeedback = async feedbackData => {
    if (!evaluation) return

    setFeedbackLoading(true)

    try {
      await apiClient.submitFeedback({
        query,
        response,
        evaluation: evaluation,
        userRating: feedbackData.rating,
        userFeedback: feedbackData.comments,
        responseType: "analysis",
        evaluationId: evaluation.evaluationId,
      })

      setFeedbackSubmitted(true)
    } catch (err) {
      setError(
        "Failed to submit feedback: " + (err.message || err.details?.message)
      )
    } finally {
      setFeedbackLoading(false)
    }
  }

  const renderEvaluationResults = () => {
    if (!evaluation) return null

    const { scores, feedback, overallScore } = evaluation

    return (
      <div>
        {/* Overall Score */}
        <Card fluid>
          <Card.Content>
            <Card.Header>
              <Icon name="star" />
              Overall Evaluation
            </Card.Header>
            <Card.Meta>Response Quality Assessment</Card.Meta>
            <Card.Description>
              <Statistic size="small">
                <Statistic.Value
                  style={{
                    color: getScoreColor(overallScore),
                  }}
                >
                  {(overallScore * 100).toFixed(1)}%
                </Statistic.Value>
                <Statistic.Label>{getScoreLabel(overallScore)}</Statistic.Label>
              </Statistic>
              <Progress
                percent={overallScore * 100}
                color={
                  overallScore >= 0.8
                    ? "green"
                    : overallScore >= 0.6
                    ? "yellow"
                    : overallScore >= 0.4
                    ? "orange"
                    : "red"
                }
                size="medium"
                style={{ marginTop: "1rem" }}
              />
            </Card.Description>
          </Card.Content>
        </Card>

        <Divider />

        {/* Detailed Scores */}
        <Header as="h3">
          <Icon name="chart bar" />
          Detailed Criteria Scores
        </Header>

        <Grid columns={2} stackable>
          {scores &&
            Object.entries(scores).map(([criterion, score]) => (
              <Grid.Column key={criterion}>
                <Card>
                  <Card.Content>
                    <Card.Header style={{ textTransform: "capitalize" }}>
                      {criterion}
                    </Card.Header>
                    <Card.Description>
                      <Statistic size="tiny">
                        <Statistic.Value
                          style={{
                            color: getScoreColor(score),
                          }}
                        >
                          {(score * 100).toFixed(1)}%
                        </Statistic.Value>
                        <Statistic.Label>
                          {getScoreLabel(score)}
                        </Statistic.Label>
                      </Statistic>
                      <Progress
                        percent={score * 100}
                        color={
                          score >= 0.8
                            ? "green"
                            : score >= 0.6
                            ? "yellow"
                            : score >= 0.4
                            ? "orange"
                            : "red"
                        }
                        size="small"
                        style={{ marginTop: "0.5rem" }}
                      />
                    </Card.Description>
                  </Card.Content>
                </Card>
              </Grid.Column>
            ))}
        </Grid>

        <Divider />

        {/* Detailed Feedback */}
        {feedback && (
          <div>
            <Header as="h3">
              <Icon name="comment" />
              Detailed Feedback
            </Header>

            {feedback.overall && (
              <Message info>
                <Message.Header>Overall Assessment</Message.Header>
                <p>{feedback.overall}</p>
              </Message>
            )}

            {feedback.strengths && feedback.strengths.length > 0 && (
              <Message positive>
                <Message.Header>Strengths</Message.Header>
                <List bulleted>
                  {feedback.strengths.map((strength, idx) => (
                    <List.Item key={idx}>{strength}</List.Item>
                  ))}
                </List>
              </Message>
            )}

            {feedback.weaknesses && feedback.weaknesses.length > 0 && (
              <Message warning>
                <Message.Header>Areas for Improvement</Message.Header>
                <List bulleted>
                  {feedback.weaknesses.map((weakness, idx) => (
                    <List.Item key={idx}>{weakness}</List.Item>
                  ))}
                </List>
              </Message>
            )}

            {feedback.suggestions && feedback.suggestions.length > 0 && (
              <Message>
                <Message.Header>Suggestions</Message.Header>
                <List ordered>
                  {feedback.suggestions.map((suggestion, idx) => (
                    <List.Item key={idx}>{suggestion}</List.Item>
                  ))}
                </List>
              </Message>
            )}
          </div>
        )}

        <Divider />

        {/* User Feedback Form */}
        <Header as="h3">
          <Icon name="user" />
          Your Feedback
        </Header>

        <FeedbackForm
          onSubmit={handleSubmitFeedback}
          loading={feedbackLoading}
          submitted={feedbackSubmitted}
          title=""
        />
      </div>
    )
  }

  return (
    <Layout>
      <Seo title="Evaluate Response" />
      <Container style={{ padding: "2rem 0" }}>
        <Grid container stackable>
          <Grid.Row>
            <Grid.Column width={16}>
              <Header
                as="h1"
                textAlign="center"
                style={{ marginBottom: "2rem" }}
              >
                <Icon name="star" />
                Response Evaluation
                <Header.Subheader>
                  Evaluate AI responses and provide feedback to help improve our
                  system
                </Header.Subheader>
              </Header>
            </Grid.Column>
          </Grid.Row>

          <Grid.Row>
            <Grid.Column width={16}>
              <Segment raised>
                <Form onSubmit={handleEvaluate}>
                  <Form.TextArea
                    label="Query"
                    placeholder="Enter the original question or query..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    rows={2}
                    required
                  />

                  <Form.TextArea
                    label="Response to Evaluate"
                    placeholder="Paste the AI response you want to evaluate..."
                    value={response}
                    onChange={e => setResponse(e.target.value)}
                    rows={6}
                    required
                  />

                  <Button
                    type="submit"
                    primary
                    fluid
                    size="large"
                    loading={loading}
                    disabled={!query.trim() || !response.trim() || loading}
                  >
                    <Icon name="star" />
                    Evaluate Response
                  </Button>
                </Form>
              </Segment>
            </Grid.Column>
          </Grid.Row>

          {error && (
            <Grid.Row>
              <Grid.Column width={16}>
                <ErrorMessage
                  title="Evaluation Error"
                  message={error}
                  onRetry={handleEvaluate}
                />
              </Grid.Column>
            </Grid.Row>
          )}

          {loading && (
            <Grid.Row>
              <Grid.Column width={16}>
                <LoadingSpinner text="Evaluating response..." />
              </Grid.Column>
            </Grid.Row>
          )}

          {evaluation && !loading && (
            <Grid.Row>
              <Grid.Column width={16}>
                <Segment>
                  <Header as="h3">
                    <Icon name="chart line" />
                    Evaluation Results
                  </Header>
                  {renderEvaluationResults()}
                </Segment>
              </Grid.Column>
            </Grid.Row>
          )}
        </Grid>
      </Container>
    </Layout>
  )
}

export default EvaluatePage
