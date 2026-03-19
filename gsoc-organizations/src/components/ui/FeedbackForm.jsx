import React, { useState } from "react"
import {
  Form,
  Button,
  Rating,
  TextArea,
  Message,
  Icon,
} from "semantic-ui-react"

const FeedbackForm = ({
  onSubmit,
  loading = false,
  submitted = false,
  title = "Your Feedback",
  showRating = true,
  showComments = true,
  submitButtonText = "Submit Feedback",
}) => {
  const [rating, setRating] = useState(0)
  const [comments, setComments] = useState("")

  const handleSubmit = () => {
    if (showRating && rating === 0) return

    onSubmit({
      rating: showRating ? rating : null,
      comments: showComments ? comments.trim() : null,
    })

    // Reset form after successful submission
    if (submitted) {
      setRating(0)
      setComments("")
    }
  }

  if (submitted) {
    return (
      <Message success>
        <Icon name="check" />
        Thank you for your feedback! It helps us improve our system.
      </Message>
    )
  }

  return (
    <div>
      <h4>{title}</h4>
      <Form onSubmit={handleSubmit}>
        {showRating && (
          <Form.Field required>
            <label>Rate your experience (1-5 stars)</label>
            <Rating
              icon="star"
              rating={rating}
              maxRating={5}
              onRate={(e, { rating: newRating }) => setRating(newRating)}
              size="large"
            />
            {rating === 0 && (
              <small
                style={{ color: "red", marginTop: "0.25rem", display: "block" }}
              >
                Please select a rating
              </small>
            )}
          </Form.Field>
        )}

        {showComments && (
          <Form.Field>
            <label>Comments (Optional)</label>
            <TextArea
              placeholder="Share your thoughts..."
              value={comments}
              onChange={e => setComments(e.target.value)}
              rows={3}
            />
          </Form.Field>
        )}

        <Button
          primary
          loading={loading}
          disabled={loading || (showRating && rating === 0)}
          type="submit"
        >
          <Icon name="send" />
          {submitButtonText}
        </Button>
      </Form>
    </div>
  )
}

export default FeedbackForm
