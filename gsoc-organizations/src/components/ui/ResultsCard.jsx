import React from "react"
import {
  Card,
  Label,
  Button,
  Icon,
  List,
  Header as SemanticHeader,
} from "semantic-ui-react"

const ResultsCard = ({
  title,
  subtitle,
  description,
  metadata = [],
  score,
  scoreLabel = "Score",
  tags = [],
  actions = [],
  url,
  urlText = "View Details",
  compact = false,
  color = "blue",
}) => {
  return (
    <Card fluid={compact} style={{ marginBottom: "1rem" }}>
      <Card.Content>
        <Card.Header style={{ fontSize: compact ? "1em" : "1.1em" }}>
          {title}
        </Card.Header>

        {subtitle && <Card.Meta>{subtitle}</Card.Meta>}

        {description && (
          <Card.Description style={{ marginTop: "0.5rem" }}>
            {description}
          </Card.Description>
        )}

        {metadata.length > 0 && (
          <div style={{ marginTop: "0.75rem" }}>
            <List horizontal size="small">
              {metadata.map((item, idx) => (
                <List.Item key={idx}>
                  <strong>{item.label}:</strong> {item.value}
                </List.Item>
              ))}
            </List>
          </div>
        )}

        {tags.length > 0 && (
          <div style={{ marginTop: "0.5rem" }}>
            {tags.map((tag, idx) => (
              <Label
                key={idx}
                size="tiny"
                color={color}
                style={{ marginRight: "0.25rem" }}
              >
                {tag}
              </Label>
            ))}
          </div>
        )}
      </Card.Content>

      {(score !== undefined || actions.length > 0 || url) && (
        <Card.Content extra>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              {score !== undefined && (
                <span>
                  <strong>{scoreLabel}:</strong> {(score * 100).toFixed(1)}%
                </span>
              )}
            </div>

            <div>
              {actions.map((action, idx) => (
                <Button
                  key={idx}
                  size="tiny"
                  {...action}
                  style={{ marginLeft: "0.25rem" }}
                >
                  {action.icon && <Icon name={action.icon} />}
                  {action.text}
                </Button>
              ))}

              {url && (
                <Button
                  size="tiny"
                  as="a"
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  primary
                  style={{ marginLeft: actions.length > 0 ? "0.25rem" : 0 }}
                >
                  <Icon name="external" />
                  {urlText}
                </Button>
              )}
            </div>
          </div>
        </Card.Content>
      )}
    </Card>
  )
}

export default ResultsCard
