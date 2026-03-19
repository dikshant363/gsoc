import React from "react"
import { Message, Button, Icon } from "semantic-ui-react"

const ErrorMessage = ({
  title = "Error",
  message,
  onRetry,
  retryText = "Try Again",
  compact = false,
}) => {
  if (!message) return null

  return (
    <Message error size={compact ? "small" : "large"}>
      <Message.Header>
        <Icon name="exclamation triangle" />
        {title}
      </Message.Header>
      <p>{message}</p>
      {onRetry && (
        <Button size="small" onClick={onRetry} style={{ marginTop: "0.5rem" }}>
          <Icon name="refresh" />
          {retryText}
        </Button>
      )}
    </Message>
  )
}

export default ErrorMessage
