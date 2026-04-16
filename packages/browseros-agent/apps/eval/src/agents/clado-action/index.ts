/**
 * Direct Clado Action evaluator.
 *
 * Runs the visual action model directly against the full task instruction,
 * without an LLM orchestrator in front of it.
 */

import { Browser } from '@browseros/server/browser'
import { CdpBackend } from '@browseros/server/browser/backends/cdp'
import { CaptchaWaiter } from '../../capture/captcha-waiter'
import { DEFAULT_TIMEOUT_MS } from '../../constants'
import type { CladoActionConfig, EvalConfig, TaskMetadata } from '../../types'
import type { UIMessageStreamEvent } from '../../types/message'
import { resolveEnvValue } from '../../utils/resolve-env'
import { withEvalTimeout } from '../../utils/with-eval-timeout'
import { CladoActionExecutor } from '../orchestrator-executor/clado-action-executor'
import type { ExecutorCallbacks } from '../orchestrator-executor/executor'
import type { AgentContext, AgentEvaluator, AgentResult } from '../types'

function extractCdpPort(config: EvalConfig): number {
  const serverUrl = config.browseros.server_url
  const match = serverUrl.match(/:(\d+)$/)
  if (!match) return config.browseros.base_cdp_port
  const serverPort = Number.parseInt(match[1], 10)
  const workerOffset = serverPort - config.browseros.base_server_port
  return config.browseros.base_cdp_port + workerOffset
}

export class CladoActionEvaluator implements AgentEvaluator {
  constructor(private ctx: AgentContext) {}

  async execute(): Promise<AgentResult> {
    const { config, task, capture } = this.ctx
    const startTime = Date.now()
    const timeoutMs = config.timeout_ms ?? DEFAULT_TIMEOUT_MS

    await capture.messageLogger.logUser(task.query)

    if (config.agent.type !== 'clado-action') {
      throw new Error('CladoActionEvaluator requires clado-action config')
    }

    const agentConfig = config.agent as CladoActionConfig
    const cdpPort = extractCdpPort(config)
    const cdp = new CdpBackend({ port: cdpPort })
    await cdp.connect()
    const browser = new Browser(cdp)
    capture.screenshot.setBrowser(browser)

    const captchaWaiter = config.captcha
      ? new CaptchaWaiter({
          waitTimeoutMs: config.captcha.wait_timeout_ms,
          pollIntervalMs: config.captcha.poll_interval_ms,
        })
      : null

    const callbacks: ExecutorCallbacks = {
      onToolCallStart: ({ input }) => {
        const args = input as Record<string, unknown> | undefined
        if (args && typeof args.page === 'number') {
          capture.setActivePageId(args.page)
        }
      },
      onToolCallFinish: async () => {
        try {
          if (captchaWaiter) {
            await captchaWaiter.waitIfCaptchaPresent(
              browser,
              capture.getActivePageId(),
            )
          }
          const screenshotNum = await capture.screenshot.capture(
            capture.getActivePageId(),
          )
          capture.emitEvent(task.query_id, {
            type: 'screenshot-captured',
            screenshot: screenshotNum,
          })
        } catch {
          // Screenshot failures are non-fatal.
        }
      },
      onStepFinish: async ({ toolCalls, toolResults, text }) => {
        if (toolCalls) {
          for (const tc of toolCalls) {
            const inputEvent: UIMessageStreamEvent = {
              type: 'tool-input-available',
              toolCallId: tc.toolCallId,
              toolName: tc.toolName,
              input: tc.input,
            }
            await capture.messageLogger.logStreamEvent(inputEvent)
            capture.emitEvent(task.query_id, inputEvent)
          }
        }
        if (toolResults) {
          for (const tr of toolResults) {
            const outputEvent: UIMessageStreamEvent = {
              type: 'tool-output-available',
              toolCallId: tr.toolCallId,
              output: tr.output,
            }
            await capture.messageLogger.logStreamEvent(outputEvent)
            capture.emitEvent(task.query_id, outputEvent)
          }
        }
        if (text) {
          const textId = crypto.randomUUID()
          const startEvent: UIMessageStreamEvent = {
            type: 'text-start',
            id: textId,
          }
          const deltaEvent: UIMessageStreamEvent = {
            type: 'text-delta',
            id: textId,
            delta: text,
          }
          const endEvent: UIMessageStreamEvent = {
            type: 'text-end',
            id: textId,
          }
          await capture.messageLogger.logStreamEvent(startEvent)
          await capture.messageLogger.logStreamEvent(deltaEvent)
          await capture.messageLogger.logStreamEvent(endEvent)
          capture.emitEvent(task.query_id, deltaEvent)
        }
      },
    }

    const executor = new CladoActionExecutor(
      {
        provider: agentConfig.provider,
        model: agentConfig.model,
        apiKey: resolveEnvValue(agentConfig.apiKey) ?? '',
        baseUrl: agentConfig.baseUrl,
      },
      config.browseros.server_url,
      undefined,
      undefined,
      this.ctx.initialPageId,
    )
    executor.setCallbacks(callbacks)

    try {
      let finalAnswer: string | null = null
      let totalSteps = 0

      const { terminationReason, result } = await withEvalTimeout(
        timeoutMs,
        capture,
        async (signal) => {
          const execution = await executor.execute(task.query, signal)
          finalAnswer = execution.observation
          totalSteps = execution.actionsPerformed

          if (execution.status !== 'done' && execution.status !== 'timeout') {
            capture.addError('agent_execution', execution.observation)
          }

          return execution
        },
      )

      const endTime = Date.now()
      const metadata: TaskMetadata = {
        query_id: task.query_id,
        dataset: task.dataset,
        query: task.query,
        started_at: new Date(startTime).toISOString(),
        completed_at: new Date(endTime).toISOString(),
        total_duration_ms: endTime - startTime,
        total_steps: result?.actionsPerformed ?? totalSteps,
        termination_reason: terminationReason,
        final_answer: finalAnswer,
        errors: capture.getErrors(),
        warnings: capture.getWarnings(),
        device_pixel_ratio: capture.screenshot.getDevicePixelRatio(),
        agent_config: {
          type: 'clado-action',
          model: agentConfig.model,
        },
        grader_results: {},
      }

      await capture.trajectorySaver.saveMetadata(metadata)

      return {
        metadata,
        messages: capture.getMessages(),
        finalAnswer,
      }
    } finally {
      await executor.close().catch(() => {})
      await cdp.disconnect().catch(() => {})
    }
  }
}
