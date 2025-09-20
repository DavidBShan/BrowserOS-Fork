import { z } from 'zod'

// Feedback type enum
export const FeedbackTypeSchema = z.enum(['thumbs_up', 'thumbs_down'])
export type FeedbackType = z.infer<typeof FeedbackTypeSchema>

// Individual feedback submission schema
export const FeedbackSubmissionSchema = z.object({
  feedbackId: z.string(),  // Unique feedback identifier
  messageId: z.string(),  // Reference to the message being rated
  sessionId: z.string(),  // Current chat session identifier
  type: FeedbackTypeSchema,  // thumbs_up or thumbs_down
  textFeedback: z.string().optional(),  // Additional text for thumbs_down
  timestamp: z.date(),  // When feedback was submitted
  agentResponse: z.string().optional(),  // The agent response being rated
  userQuery: z.string().optional()  // The user query that triggered the agent response
})

export type FeedbackSubmission = z.infer<typeof FeedbackSubmissionSchema>

// Feedback UI state schema
export const FeedbackUIStateSchema = z.object({
  isSubmitting: z.boolean(),  // Loading state during submission
  showThankYou: z.boolean(),  // Show thank you message
  showModal: z.boolean(),  // Show text input modal
  error: z.string().nullable()  // Error message if submission fails
})

export type FeedbackUIState = z.infer<typeof FeedbackUIStateSchema>
