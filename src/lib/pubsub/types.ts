import { z } from 'zod'

// Message envelope for upsert-based updates
export const MessageSchema = z.object({
  msgId: z.string(),  // Stable ID for message (e.g., "msg_think_1", "msg_tool_result_2")
  content: z.string(),  // Full markdown content
  role: z.enum(['assistant', 'system', 'user']),  // Message role
  ts: z.number(),  // Timestamp in milliseconds
})

export type Message = z.infer<typeof MessageSchema>

// Pub-sub event types
export const PubSubEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('message'),
    payload: MessageSchema
  }),
])

export type PubSubEvent = z.infer<typeof PubSubEventSchema>

// Subscription callback
export type SubscriptionCallback = (event: PubSubEvent) => void

// Subscription handle for unsubscribing
export interface Subscription {
  unsubscribe: () => void
}
