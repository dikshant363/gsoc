import React, { useMemo } from "react"
import { graphql, Link } from "gatsby"
import { Grid, Header, Message, Icon, Button } from "semantic-ui-react"
import Layout from "../layouts/layout"
import Seo from "../components/seo"
import OrgCard from "../components/org-card"
import { useBreakpoint } from "gatsby-plugin-breakpoints"
import { useAppSelector, useAppDispatch } from "../store"
import { getBookmarks, clearBookmarks } from "../store/bookmarks"

const BookmarksPage = ({ data }) => {
    const bookmarks = useAppSelector(getBookmarks)
    const dispatch = useAppDispatch()
    const breakpoints = useBreakpoint()

    const { allOrganizations } = useMemo(() => {
        const orgs = data.allOrganization.edges.map(e => e.node)

        // Normalize years for the card component, same as index/match page
        orgs.forEach(org => {
            for (const yearKey of Object.keys(org.years)) {
                if (yearKey[0] === "_") {
                    if (org.years[yearKey] !== null) {
                        org.years[yearKey.slice(1)] = org.years[yearKey]
                    }
                    delete org.years[yearKey]
                }
            }
        })

        return { allOrganizations: orgs }
    }, [data])

    // Filter organizations to show only bookmarked ones
    const bookmarkedOrgs = useMemo(() => {
        return allOrganizations.filter(org => bookmarks.includes(org.name))
    }, [allOrganizations, bookmarks])

    const cardColumns = breakpoints.l ? 3 : 4

    return (
        <Layout>
            <Seo title="My Bookmarks" />
            <Grid container style={{ padding: "2rem 1rem", minHeight: "80vh" }}>

                <Grid.Row>
                    <Grid.Column width={16}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <Header as="h1" style={{ color: "var(--text-primary)", margin: 0 }}>
                                <Icon name="heart" color="red" /> My Shortlist
                            </Header>
                            {bookmarkedOrgs.length > 0 && (
                                <Button negative onClick={() => dispatch(clearBookmarks())}>
                                    <Icon name="trash" /> Clear All
                                </Button>
                            )}
                        </div>
                    </Grid.Column>
                </Grid.Row>

                <Grid.Row>
                    <Grid.Column width={16}>
                        {bookmarkedOrgs.length === 0 ? (
                            <Message info size="large">
                                <Message.Header>Your bookmark list is empty.</Message.Header>
                                <p>
                                    Go back to the <Link to="/"><u>Home Page</u></Link> and click the heart icon on any organization card to save it here.
                                </p>
                            </Message>
                        ) : (
                            <Grid stackable columns={cardColumns} className="index-org-cards-grid">
                                {bookmarkedOrgs.map(org => (
                                    <Grid.Column key={org.name}>
                                        <OrgCard data={org} />
                                    </Grid.Column>
                                ))}
                            </Grid>
                        )}
                    </Grid.Column>
                </Grid.Row>
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
          ema_project_count
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

export default BookmarksPage
