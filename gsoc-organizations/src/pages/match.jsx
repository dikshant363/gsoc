import React, { useState, useMemo } from "react"
import { graphql } from "gatsby"
import { Grid, Header, Segment, Form, Button, Icon, Message } from "semantic-ui-react"
import Layout from "../layouts/layout"
import Seo from "../components/seo"
import OrgCard from "../components/org-card"
import { useBreakpoint } from "gatsby-plugin-breakpoints"

const MatchPage = ({ data }) => {
    const [selectedTechs, setSelectedTechs] = useState([])
    const [selectedTopics, setSelectedTopics] = useState([])
    const [isMatching, setIsMatching] = useState(false)
    const [results, setResults] = useState(null)

    const breakpoints = useBreakpoint()

    // Extract all unique technologies and topics for the dropdowns
    const { allTechs, allTopics, organizations } = useMemo(() => {
        const orgs = data.allOrganization.edges.map(e => e.node)
        const techs = new Set()
        const topics = new Set()

        orgs.forEach(org => {
            org.technologies?.forEach(t => techs.add(t))
            org.topics?.forEach(t => topics.add(t))

            // Normalize years for the card component
            for (const yearKey of Object.keys(org.years)) {
                if (yearKey[0] === "_") {
                    if (org.years[yearKey] !== null) {
                        org.years[yearKey.slice(1)] = org.years[yearKey]
                    }
                    delete org.years[yearKey]
                }
            }
        })

        const techOptions = Array.from(techs).sort().map(t => ({ key: t, text: t, value: t }))
        const topicOptions = Array.from(topics).sort().map(t => ({ key: t, text: t, value: t }))

        return { allTechs: techOptions, allTopics: topicOptions, organizations: orgs }
    }, [data])

    const handleMatch = () => {
        setIsMatching(true)

        // Simulate thinking/processing time for "AI" feel
        setTimeout(() => {
            const scoredOrgs = organizations.map(org => {
                let score = 0
                let matches = []

                // Scoring Algorithm
                // Technologies are weighted higher (e.g., 5 points) because they are hard skills
                org.technologies?.forEach(tech => {
                    if (selectedTechs.includes(tech)) {
                        score += 5
                        matches.push(tech)
                    }
                })

                // Topics are weighted slightly lower (e.g., 3 points) as interests
                org.topics?.forEach(topic => {
                    if (selectedTopics.includes(topic)) {
                        score += 3
                        matches.push(topic)
                    }
                })

                return { ...org, matchScore: score, matchDetails: matches }
            })

            // Filter out zero scores and sort by highest score
            const topMatches = scoredOrgs
                .filter(org => org.matchScore > 0)
                .sort((a, b) => b.matchScore - a.matchScore)
                .slice(0, 6) // Top 6 results

            setResults(topMatches)
            setIsMatching(false)
        }, 800)
    }

    const cardColumns = breakpoints.l ? 3 : 4

    return (
        <Layout>
            <Seo title="AI Matcher" />
            <Grid container style={{ padding: "2rem 1rem" }}>
                <Grid.Row centered>
                    <Grid.Column width={16} textAlign="center">
                        <Header as="h1" style={{ fontSize: "3rem", marginBottom: "0.5rem", color: "var(--text-primary)" }}>
                            <span role="img" aria-label="robot">🤖</span> AI Organization Matcher
                        </Header>
                        <p style={{ fontSize: "1.2rem", color: "var(--text-secondary)", maxWidth: "600px", margin: "0 auto" }}>
                            Tell us your skills and interests, and our algorithm will find the perfect Google Summer of Code organizations for you.
                        </p>
                    </Grid.Column>
                </Grid.Row>

                <Grid.Row centered>
                    <Grid.Column width={breakpoints.xs ? 16 : 10}>
                        <Segment raised style={{ padding: "2rem", borderRadius: "12px", border: "1px solid var(--border-color)", background: "var(--bg-card)" }}>
                            <Form size="large">
                                <Form.Field>
                                    <label htmlFor="skills-dropdown" style={{ color: "var(--text-primary)" }}>My Skills (Technologies)</label>
                                    <Form.Dropdown
                                        id="skills-dropdown"
                                        placeholder='Select skills (e.g. Python, React, Rust)...'
                                        fluid
                                        multiple
                                        search
                                        selection
                                        options={allTechs}
                                        value={selectedTechs}
                                        onChange={(e, { value }) => setSelectedTechs(value)}
                                    />
                                </Form.Field>
                                <Form.Field>
                                    <label htmlFor="interests-dropdown" style={{ color: "var(--text-primary)" }}>My Interests (Topics)</label>
                                    <Form.Dropdown
                                        id="interests-dropdown"
                                        placeholder='Select interests (e.g. Robotics, Web, Science)...'
                                        fluid
                                        multiple
                                        search
                                        selection
                                        options={allTopics}
                                        value={selectedTopics}
                                        onChange={(e, { value }) => setSelectedTopics(value)}
                                    />
                                </Form.Field>

                                <Button
                                    fluid
                                    size="huge"
                                    primary
                                    onClick={handleMatch}
                                    loading={isMatching}
                                    disabled={selectedTechs.length === 0 && selectedTopics.length === 0}
                                    style={{ backgroundColor: "var(--accent-color)", marginTop: "1.5rem" }}
                                    aria-label="Find Matching Organizations"
                                >
                                    <Icon name="lightning" /> Find My Match
                                </Button>
                            </Form>
                        </Segment>
                    </Grid.Column>
                </Grid.Row>

                {results && (
                    <Grid.Row>
                        <Grid.Column width={16}>
                            <Header as="h2" dividing style={{ color: "var(--text-primary)", marginTop: "2rem" }}>
                                Top Matches ({results.length})
                            </Header>

                            {results.length === 0 ? (
                                <Message info>
                                    <Icon name="info" />
                                    No direct matches found. Try adding more general skills or topics!
                                </Message>
                            ) : (
                                <Grid stackable columns={cardColumns} className="index-org-cards-grid">
                                    {results.map(org => (
                                        <Grid.Column key={org.name}>
                                            {/* Wrap card to show match score */}
                                            <div style={{ position: "relative", height: "100%" }}>
                                                <div style={{
                                                    position: "absolute",
                                                    top: "-10px",
                                                    right: "-10px",
                                                    zIndex: 5,
                                                    background: "var(--accent-color)",
                                                    color: "white",
                                                    padding: "5px 10px",
                                                    borderRadius: "20px",
                                                    fontWeight: "bold",
                                                    boxShadow: "0 2px 5px rgba(0,0,0,0.2)"
                                                }}>
                                                    {Math.min(100, org.matchScore * 5)}% Match
                                                </div>
                                                <OrgCard data={org} />
                                            </div>
                                        </Grid.Column>
                                    ))}
                                </Grid>
                            )}
                        </Grid.Column>
                    </Grid.Row>
                )}
            </Grid>
        </Layout>
    )
}

export const query = graphql`
  query {
    allOrganization {
      edges {
        node {
          category
          description
          name
          project_count
          technologies
          image_url
          image_background_color
          topics
          url
          years {
            _2016 { num_projects, projects_url }
            _2017 { num_projects, projects_url }
            _2018 { num_projects, projects_url }
            _2019 { num_projects, projects_url }
            _2020 { num_projects, projects_url }
            _2021 { num_projects, projects_url }
            _2022 { num_projects, projects_url }
            _2023 { num_projects, projects_url }
            _2024 { num_projects, projects_url }
            _2025 { num_projects, projects_url }
          }
        }
      }
    }
  }
`

export default MatchPage
