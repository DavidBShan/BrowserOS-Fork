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
import type {
  ExecutorFactory,
  ExecutorResult,
  OrchestratorBootstrap,
  OrchestratorRecentDelegation,
} from './types'
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

## Runtime Guardrails

The runtime will hard-reject impossible or unsafe executor instructions, including:
- refreshing or reloading the page (for example F5, reload, hard refresh)
- interacting with the browser chrome (address bar, tabs, browser back/forward/refresh buttons)
- clicking on browser error surfaces or error-message text itself

If one of your delegate calls is rejected, treat it as a real blocked result and choose a different in-page strategy.

## When to Finish
When the task is complete, respond with a plain text message summarizing the result. Do NOT call delegate — just write your final answer as text. The system will capture your text as the answer.

Do this ONLY when the latest executor result provides concrete proof that the task is complete. Do not stop just because you think a click probably worked.

If the task cannot be completed, respond with text explaining what went wrong and why.

## Rules

1. You CANNOT see the browser. The executor can — but only through page-content screenshots and tool outputs. The executor has no access to the browser chrome (address bar, back/forward buttons, refresh button, tabs, etc.) and can only interact with what appears inside the page viewport. You plan WHAT, the executor handles HOW.

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

## Recovery and Adaptation (CRITICAL)

The executor is a visual model that clicks on screen coordinates. It can and will fail — misclick, miss a target, get stuck in loops, or encounter unexpected UI states. You MUST adapt:

- NEVER repeat the same instruction verbatim if it failed or returned status "blocked". The executor already tried and it did not work.
- If the executor reports "blocked", use the latest observation to infer why (element missing, modal blocking, wrong page, field not focused, option off-screen). Then craft a new instruction: smaller step, different description, scroll, dismiss overlay, or click-to-focus before type.
- Avoid delegation spam on one sub-goal. If several phrasings of the same action keep failing, switch approach instead of issuing another near-duplicate.
- If the executor returned done after only end() or after a vague "already handled" claim, assume the sub-goal is still unverified unless the latest result explicitly confirms the target state.
- Do not accept stale-history completions. Phrases like "the previous click likely worked", "the field should already be focused", or "the dropdown was already opened earlier" are not evidence. Use only the latest executor result and screenshot-backed description as proof.
- Do not treat intermediate states as final success. A focused field, open dropdown, spinner, loading state, or partially updated page is only valid when that exact state was the delegated goal.
- Escalate specificity when a vague instruction fails. If "Click the search button" fails, try "Click the magnifying glass icon in the top-right corner" or "Press Enter to submit the search".
- After 2 consecutive failed delegations on the same sub-goal, step back and try a genuinely different strategy instead of another rephrase.
- If a typing attempt fails because the field is not clearly active, do not rephrase the same "type X" goal. First delegate a precise focus/open instruction, then ask for text entry once the field is active.
- Do not use observational-only delegations such as "verify", "check whether", "look for", or "scroll to see" unless they end in a concrete visible target state.
- NEVER tell the executor to refresh the page, click the browser address bar, use browser back/forward/refresh buttons, or interact with other browser chrome controls. Those are outside the page.
- If the page shows an application or JavaScript error, do not click on the error text itself. Prefer in-page recovery actions like clicking the site logo, Home link, breadcrumb, or another in-page navigation control.

## Handling Field Input and Corruption

Text input fields can accumulate wrong or repeated values after failed attempts:

- Make sure the field is actually active before asking for replacement text. If the latest result does not clearly indicate the target input is focused, delegate a focus/open step first.
- Instruct the executor to clear the field before typing by describing the desired outcome, not the keystrokes. Prefer "Clear the field and type X" over enumerating Ctrl+A/backspace steps.
- If the field already visibly contains the exact desired value, stop editing it and move on.
- If a field keeps corrupting after 2 attempts, abandon that approach and reach the same goal through a different UI path or control when possible.

## Handling Calendar and Date Pickers

- Tell the executor the target month and year to reach, not how many arrow clicks to make.
- If the calendar controls are not responding, try clicking the month/year header directly or look for a text-input alternative.

## Handling Error States

- Do NOT click on error-message text itself or try to dismiss error pages by randomly scrolling or pressing escape.
- Instead, use in-page recovery controls such as the site logo, Home link, Back button, breadcrumb, or another visible navigation element.

## Reading Executor Results

Each executor result includes:
- Status: done (goal achieved), blocked (stuck), timeout (ran out of time)
- Observation: what the executor saw and did
- URL: current page URL
- Actions performed: number of browser actions taken
- Screenshot: when available, the tool output includes a data URL of the current page
- Recent delegations: the last few delegated subgoals and why they ended

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
  generate(params: { prompt: unknown; abortSignal?: AbortSignal }): Promise<{
    text: string
    toolCalls?: { toolCallId: string; toolName: string }[]
  }>
}

function extractExecutorReason(observation: string): string {
  for (const line of observation.split('\n')) {
    if (line.startsWith('Reason:')) {
      return line.slice('Reason:'.length).trim()
    }
  }
  return observation.trim().split('\n')[0]?.trim() || 'No reason recorded.'
}

function formatRecentDelegations(
  recentDelegations: OrchestratorRecentDelegation[],
): string {
  if (recentDelegations.length === 0) return 'None.'

  return recentDelegations
    .slice(-3)
    .map(
      (item, idx) =>
        `${idx + 1}. Instruction: ${item.instruction}\n` +
        `   Status: ${item.status}\n` +
        `   Actions: ${item.actionsPerformed}\n` +
        `   Outcome summary: ${item.outcomeSummary}`,
    )
    .join('\n')
}

export class OrchestratorAgent {
  private constructor(
    private agent: AgentRunner,
    private state: {
      delegationCount: number
      totalExecutorSteps: number
      lastObservation: string
      recentDelegations: OrchestratorRecentDelegation[]
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
      recentDelegations: [],
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
          const reason = `Invalid instruction rejected by runtime validator: ${invalidReason}`
          const observation = `Executor Result:
- Status: blocked
- Actions: 0
- URL: unknown
- Recent delegations:
${formatRecentDelegations(state.recentDelegations)}

Observation:
Summary: Delegation was blocked before execution.
Reason: ${reason}
URL: unknown

Recent actions:
No actions were executed.

Total model actions: 0`
          state.recentDelegations.push({
            instruction,
            status: 'blocked',
            actionsPerformed: 0,
            outcomeSummary: reason,
          })
          state.recentDelegations = state.recentDelegations.slice(-3)
          state.lastObservation = observation
          return {
            status: 'blocked',
            actions: 0,
            url: 'unknown',
            observation,
            screenshotDataUrl: undefined,
          }
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
        const reason = extractExecutorReason(result.observation)
        state.recentDelegations.push({
          instruction,
          status: result.status,
          actionsPerformed: result.actionsPerformed,
          outcomeSummary: reason,
        })
        state.recentDelegations = state.recentDelegations.slice(-3)
        const observation = `Executor Result:
- Status: ${result.status}${statusNote}
- Actions: ${result.actionsPerformed}
- URL: ${result.url || 'unknown'}
- Recent delegations:
${formatRecentDelegations(state.recentDelegations)}

Observation:
${result.observation}`
        state.lastObservation = observation
        return {
          status: result.status,
          actions: result.actionsPerformed,
          url: result.url || 'unknown',
          observation,
          screenshotDataUrl: result.screenshotDataUrl,
        }
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
    taskQueryOrBootstrap: string | OrchestratorBootstrap,
    signal?: AbortSignal,
  ): Promise<OrchestratorAgentResult> {
    let answer: string | null = null
    let success = false
    let reason: string | null = null

    const bootstrap =
      typeof taskQueryOrBootstrap === 'string'
        ? undefined
        : taskQueryOrBootstrap
    const taskQuery =
      typeof taskQueryOrBootstrap === 'string'
        ? taskQueryOrBootstrap
        : taskQueryOrBootstrap.taskQuery

    const promptText = bootstrap
      ? [
          'Overall task:',
          taskQuery,
          '',
          'Recent delegations (up to 3, oldest to newest):',
          formatRecentDelegations(this.state.recentDelegations),
          '',
          'Full executor result for the most recent delegation:',
          'Executor Result:',
          '- Status: ready',
          '- Actions: 0',
          `- URL: ${bootstrap.url || 'unknown'}`,
          '- Recent delegations:',
          formatRecentDelegations(this.state.recentDelegations),
          '',
          'Observation:',
          bootstrap.observation,
          '',
          'Use only the overall task, the recent delegations above, and the most recent executor result when deciding the next delegation.',
        ].join('\n')
      : taskQuery

    const prompt =
      bootstrap?.screenshotDataUrl != null
        ? [
            { type: 'text', text: promptText },
            { type: 'image', image: bootstrap.screenshotDataUrl },
          ]
        : promptText

    try {
      const result = await this.agent.generate({
        prompt,
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
