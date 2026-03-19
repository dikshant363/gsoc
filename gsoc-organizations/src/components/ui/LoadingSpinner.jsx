import React from "react"
import { Dimmer, Loader, Segment } from "semantic-ui-react"

const LoadingSpinner = ({
  active = true,
  text = "Loading...",
  size = "large",
  inline = false,
}) => {
  if (inline) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <Loader active={active} size={size} inline>
          {text}
        </Loader>
      </div>
    )
  }

  return (
    <Dimmer active={active}>
      <Loader size={size}>{text}</Loader>
    </Dimmer>
  )
}

export default LoadingSpinner
