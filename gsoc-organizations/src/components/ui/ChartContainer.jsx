import React from "react"
import { Segment, Header, Icon, Message } from "semantic-ui-react"

const ChartContainer = ({
  title,
  children,
  loading = false,
  error = null,
  height = "400px",
  icon = "chart bar",
}) => {
  return (
    <Segment loading={loading} style={{ minHeight: height }}>
      <Header as="h3">
        <Icon name={icon} />
        {title}
      </Header>

      {error ? (
        <Message error>
          <p>{error}</p>
        </Message>
      ) : (
        <div style={{ marginTop: "1rem" }}>{children}</div>
      )}
    </Segment>
  )
}

export default ChartContainer
