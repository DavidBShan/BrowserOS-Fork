import { z } from 'zod'

// DFS Node structure for accessibility tree traversal
export const DFSNodeSchema: z.ZodType<DFSNode> = z.lazy(() => z.object({
  id: z.string(),  // Unique identifier from accessibility tree
  role: z.string(),  // ARIA role (button, link, textbox, etc.)
  name: z.string().optional(),  // Accessible name or text content
  value: z.string().optional(),  // Input value or selected option
  description: z.string().optional(),  // Additional descriptive text
  level: z.number().optional(),  // Heading level for hierarchical content
  depth: z.number(),  // Tree traversal depth
  bounds: z.object({  // Element positioning and size
    x: z.number(),
    y: z.number(), 
    width: z.number(),
    height: z.number()
  }).optional(),
  focusable: z.boolean().default(false),  // Whether element can receive focus
  children: z.array(DFSNodeSchema),  // Child nodes in accessibility tree
  metadata: z.record(z.unknown()).optional()  // Additional browser-specific data
}))

export interface DFSNode {
  id: string
  role: string
  name?: string
  value?: string
  description?: string
  level?: number
  depth: number
  bounds?: {
    x: number
    y: number
    width: number
    height: number
  }
  focusable?: boolean
  children: DFSNode[]
  metadata?: Record<string, unknown>
}

// Configuration options for DFS extraction targeting
export const DFSExtractionOptionsSchema = z.object({
  target: z.enum(['products', 'forms', 'navigation', 'main_content', 'semantic']),  // Extraction target type
  task: z.string(),  // Human-readable task description for context
  maxDepth: z.number().default(5),  // Maximum traversal depth to prevent infinite loops
  includeRoles: z.array(z.string()).optional(),  // Whitelist of ARIA roles to include
  excludeRoles: z.array(z.string()).default(['banner', 'contentinfo', 'complementary']),  // Blacklist of ARIA roles to exclude
  preserveHierarchy: z.boolean().default(true),  // Maintain parent-child relationships in output
  includeInteractive: z.boolean().default(true),  // Include clickable and typeable elements
  includeText: z.boolean().default(true),  // Include text content and headings
  minTextLength: z.number().default(3),  // Minimum text length to include (filters noise)
  includeHidden: z.boolean().default(false)  // Include hidden/offscreen elements
})

export type DFSExtractionOptions = z.infer<typeof DFSExtractionOptionsSchema>
