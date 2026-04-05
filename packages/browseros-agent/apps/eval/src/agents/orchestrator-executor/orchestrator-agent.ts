/**
 * OrchestratorAgent - ToolLoopAgent with a single delegate tool
 *
 * The orchestrator delegates goals to an executor and produces a final text answer.
 * Uses AI SDK ToolLoopAgent — the SDK handles the turn loop automatically.
 */

import { createLanguageModel } from '@browseros/server/agent/tool-loop/provider-factory'
import type { ResolvedAgentConfig } from '@browseros/server/agent/types'
import { stepCountIs, ToolLoopAgent, tool } from 'ai'
import { z } from 'zod'
import type { ExecutorFactory, ExecutorResult } from './types'
import { LIMITS, ORCHESTRATOR_DEFAULTS } from './types'

function sanitizeInstruction(instruction: string): string {
  return instruction.replace(/\s+/g, ' ').trim()
}

function validateInstruction(instruction: string): string | null {
  const text = sanitizeInstruction(instruction).toLowerCase()
  const checks: Array<[boolean, string]> = [
    [
      /\b(refresh|reload|hard refresh|f5|ctrl\+r|cmd\+r|control\+r)\b/.test(
        text,
      ),
      'refresh/reload instructions are forbidden',
    ],
    [
      /\b(address bar|omnibox|browser chrome|tab bar|ctrl\+l|alt\+d|f6)\b/.test(
        text,
      ),
      'browser chrome instructions are forbidden',
    ],
    [
      /\b(browser back|browser forward|browser refresh button|back button in the browser|forward button in the browser)\b/.test(
        text,
      ),
      'browser-level navigation controls are forbidden',
    ],
    [
      /\b(https?:\/\/|www\.)/.test(text) ||
        /(?<!@)\b[a-z0-9.-]+\.(com|org|net|io|ai|co|gov|edu|app|dev|info)\b/.test(
          text,
        ),
      'URL typing/crafting instructions are forbidden',
    ],
    [
      /\b(error message|javascript error|stack trace|exception text|error text)\b/.test(
        text,
      ) && text.includes('click'),
      'clicking error-message text is forbidden',
    ],
    [
      /\b(devtools|developer tools|console panel|browser console)\b/.test(text),
      'developer-tools/browser-console instructions are forbidden',
    ],
  ]

  for (const [matched, reason] of checks) {
    if (matched) return reason
  }

  return null
}

const ORCHESTRATOR_SYSTEM_PROMPT = `You are a task orchestrator for browser automation. You break a user's task into goal-level steps, delegate each to an executor, and report the final result.

## Your Tool
- delegate(instruction): Send a goal-level instruction to a browser executor

## When to Finish
When the task is complete, respond with a plain text message summarizing the result. Do NOT call delegate — just write your final answer as text. The system will capture your text as the answer.

Do this ONLY when the latest executor result provides concrete proof that the task is complete. Do not stop just because you think a click probably worked.

If the task cannot be completed, respond with text explaining what went wrong and why.

## Rules

1. You CANNOT see the browser. The executor can. You plan WHAT, the executor handles HOW.

2. One goal per delegation. Be specific and goal-oriented. Prefer one clear UI outcome per call:
   - Good: "Navigate to news.ycombinator.com/best and stop when the Hacker News Best page is visible"
   - Good: "Click the comments link for the 2nd story so the comments page loads"
   - Good: "Type 'browser automation' in the search box so the field shows that exact value"
   - Bad: "Go to HN and find posts and click things"
   - Bad: "Open the site, search for a topic, click a result, then summarize it"
   - Bad: "Scroll around and see if anything useful appears"

3. Ground every delegation in the latest executor result. Do NOT treat prior attempted clicks, typing, scrolls, or earlier plans as proof that the page state changed. The latest observation is the source of truth.

4. Every delegation should name an observable success cue when possible:
   - Good: "Click Search so results load"
   - Good: "Click Continue so the checkout form appears"
   - Good: "Open the date picker so the calendar is visible"
   - Bad: "Click the button if needed"
   - Bad: "Prepare the field for typing"
   - Bad: "Verify the page looks right"

5. Do not trust weak completion stories. "Already done", "probably worked", "already focused", "already selected", or a vague success claim is not enough unless the latest executor result explicitly confirms the target state.

6. Intermediate states are not completion unless they were the exact delegated goal. A focused field, open dropdown, spinner, loading state, or partially updated page is not the same as a finished task.

7. If text entry is flaky, treat focus as its own sub-goal. After a blocked typing attempt, delegate a precise focus/open instruction before asking for text entry again.

8. If the executor returns blocked or timeout, do not repeat the same instruction verbatim. Infer why it failed and try a narrower or different approach.

9. After each delegation, read the executor's result and decide:
   - Task accomplished with concrete proof? → Respond with your final answer text (no tool call)
   - Need more steps? → Call delegate() with the next instruction
   - Stuck? → Try a different approach or respond with failure text

10. Every delegation uses a fresh executor with clean context. Write each instruction so it can be executed independently.

## Reading Executor Results

Each executor result includes:
- Status: done (goal achieved), blocked (stuck), timeout (ran out of time)
- Observation: what the executor saw and did
- URL: current page URL
- Actions performed: number of browser actions taken
- Total executor steps used so far
- Executor steps remaining in the episode budget

Pay close attention to the status field. A blocked result means the executor got stuck. A done result with weak evidence should not be trusted as real completion.

Use the observation to understand the current browser state and plan your next step.`

export interface OrchestratorAgentOptions {
  executorFactory: ExecutorFactory
}

export interface OrchestratorAgentResult {
  success: boolean
  answer: string | null
  reason: string | null
  delegationCount: number
  totalExecutorSteps: number
  turns: number
}

interface AgentRunner {
  generate(params: { prompt: string; abortSignal?: AbortSignal }): Promise<{
    text: string
    toolCalls?: { toolCallId: string; toolName: string }[]
  }>
}

export class OrchestratorAgent {
  private constructor(
    private agent: AgentRunner,
    private state: {
      delegationCount: number
      totalExecutorSteps: number
      lastObservation: string
    },
    private maxTurns: number,
  ) {}

  static create(
    resolvedConfig: ResolvedAgentConfig & { maxTurns?: number },
    options: OrchestratorAgentOptions,
  ): OrchestratorAgent {
    const model = createLanguageModel(resolvedConfig)
    const state = {
      delegationCount: 0,
      totalExecutorSteps: 0,
      lastObservation: '',
    }
    const maxTurns = resolvedConfig.maxTurns ?? ORCHESTRATOR_DEFAULTS.maxTurns

    const delegate = tool({
      description:
        'Delegate a goal-level instruction to a browser executor. The executor will perform browser actions to achieve the goal and report back an observation.',
      inputSchema: z.object({
        instruction: z
          .string()
          .describe(
            'A clear, goal-level instruction for the executor. One goal per delegation.',
          ),
      }),
      execute: async ({ instruction }, { abortSignal }) => {
        if (state.totalExecutorSteps >= LIMITS.maxTotalSteps) {
          return `Step budget exhausted (${LIMITS.maxTotalSteps} steps used). Cannot delegate further.`
        }
        instruction = sanitizeInstruction(instruction)
        state.delegationCount++

        const invalidReason = validateInstruction(instruction)
        if (invalidReason) {
          const stepsRemaining = Math.max(
            0,
            LIMITS.maxTotalSteps - state.totalExecutorSteps,
          )
          const observation = `Executor Result:
- Status: blocked
- Actions: 0
- URL: unknown
- Total executor steps used so far: ${state.totalExecutorSteps}
- Executor steps remaining: ${stepsRemaining}

Observation:
Delegation was rejected before execution: ${invalidReason}. Choose a different in-page strategy.`
          state.lastObservation = observation
          return observation
        }

        const delegationController = new AbortController()
        const timeoutId = setTimeout(
          () => delegationController.abort(),
          LIMITS.delegationTimeoutMs,
        )

        const onParentAbort = () => delegationController.abort()
        abortSignal?.addEventListener('abort', onParentAbort, { once: true })

        let result: ExecutorResult
        try {
          result = await options.executorFactory(
            instruction,
            delegationController.signal,
          )
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          result = {
            observation: `Delegation failed: ${msg}`,
            status: 'timeout',
            url: '',
            actionsPerformed: 0,
            toolsUsed: [],
          }
        } finally {
          clearTimeout(timeoutId)
          abortSignal?.removeEventListener('abort', onParentAbort)
        }

        state.totalExecutorSteps += result.actionsPerformed

        const statusNote = result.status === 'timeout' ? ' (TIMED OUT)' : ''
        const stepsRemaining = Math.max(
          0,
          LIMITS.maxTotalSteps - state.totalExecutorSteps,
        )
        const observation = `Executor Result:
- Status: ${result.status}${statusNote}
- Actions: ${result.actionsPerformed}
- URL: ${result.url || 'unknown'}
- Total executor steps used so far: ${state.totalExecutorSteps}
- Executor steps remaining: ${stepsRemaining}

Observation:
${result.observation}`
        state.lastObservation = observation
        return observation
      },
    })

    const agent = new ToolLoopAgent({
      model,
      instructions: ORCHESTRATOR_SYSTEM_PROMPT,
      tools: { delegate },
      stopWhen: [stepCountIs(maxTurns)],
    })

    return new OrchestratorAgent(agent, state, maxTurns)
  }

  async run(
    taskQuery: string,
    signal?: AbortSignal,
  ): Promise<OrchestratorAgentResult> {
    let answer: string | null = null
    let success = false
    let reason: string | null = null

    try {
      const result = await this.agent.generate({
        prompt: taskQuery,
        abortSignal: signal,
      })

      answer = result.text || null
      const usedFallback = !answer && !!this.state.lastObservation
      if (usedFallback) {
        answer = this.state.lastObservation
      }
      success = answer !== null && !usedFallback
    } catch (err) {
      if (signal?.aborted) {
        reason = 'Aborted by eval timeout'
      } else {
        reason = err instanceof Error ? err.message : String(err)
      }
    }

    if (!success && !reason) {
      if (this.state.totalExecutorSteps >= LIMITS.maxTotalSteps) {
        reason = `Exceeded maximum total steps (${LIMITS.maxTotalSteps})`
      } else {
        reason = `Exceeded maximum orchestrator turns (${this.maxTurns})`
      }
    }

    return {
      success,
      answer,
      reason,
      delegationCount: this.state.delegationCount,
      totalExecutorSteps: this.state.totalExecutorSteps,
      turns: this.state.delegationCount,
    }
  }
}
