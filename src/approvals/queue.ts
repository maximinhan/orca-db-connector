// Agent writes that wait for the person. The gateway request stays open until the panel decides
// or the request times out; the panel lists and decides through approvals.list / approvals.decide.
import { randomBytes } from 'node:crypto'
import type { ApprovalRequest } from '../protocol.ts'

export type ApprovalDecision = 'approved' | 'denied' | 'timeout'

type Pending = {
  request: ApprovalRequest
  resolve(decision: ApprovalDecision): void
  timer: ReturnType<typeof setTimeout>
}

export type ApprovalQueueOptions = {
  timeoutMs: number
  onChange?(requests: ApprovalRequest[]): void
  onRequest?(request: ApprovalRequest): void
}

export class ApprovalQueue {
  private readonly pending = new Map<string, Pending>()
  private readonly options: ApprovalQueueOptions

  constructor(options: ApprovalQueueOptions) {
    this.options = options
  }

  list(): ApprovalRequest[] {
    return [...this.pending.values()].map((entry) => entry.request).sort((a, b) => a.createdAt - b.createdAt)
  }

  /** Adds a request and resolves with the decision; `signal` (the caller going away) counts as denied. */
  request(input: Omit<ApprovalRequest, 'id' | 'createdAt' | 'expiresAt'>, signal?: AbortSignal): Promise<ApprovalDecision> {
    const now = Date.now()
    const request: ApprovalRequest = {
      ...input,
      id: `apr-${randomBytes(6).toString('hex')}`,
      createdAt: now,
      expiresAt: now + this.options.timeoutMs
    }
    return new Promise((resolve) => {
      const finish = (decision: ApprovalDecision) => {
        const entry = this.pending.get(request.id)
        if (entry === undefined) {
          return
        }
        clearTimeout(entry.timer)
        this.pending.delete(request.id)
        signal?.removeEventListener('abort', onAbort)
        entry.resolve(decision)
        this.options.onChange?.(this.list())
      }
      const onAbort = () => finish('denied')
      const timer = setTimeout(() => finish('timeout'), this.options.timeoutMs)
      this.pending.set(request.id, { request, resolve, timer })
      if (signal?.aborted) {
        finish('denied')
        return
      }
      signal?.addEventListener('abort', onAbort, { once: true })
      this.options.onChange?.(this.list())
      this.options.onRequest?.(request)
    })
  }

  decide(id: string, approve: boolean): boolean {
    const entry = this.pending.get(id)
    if (entry === undefined) {
      return false
    }
    clearTimeout(entry.timer)
    this.pending.delete(id)
    entry.resolve(approve ? 'approved' : 'denied')
    this.options.onChange?.(this.list())
    return true
  }

  /** Denies everything still waiting (the worker is stopping). */
  dispose(): void {
    for (const id of [...this.pending.keys()]) {
      this.decide(id, false)
    }
  }
}
