import { DEFAULT_RUNNER_URL } from './config'

export interface RunsResponse {
  runs: Array<{
    runId: string
    status: string
    repoUrl?: string
    branch?: string
  }>
}

export interface RunResponse {
  runId: string
  status: string
  repoUrl?: string
  branch?: string
}

export interface TriggerRunResponse {
  runId: string
  repoUrl: string
  branch?: string
}

export class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = DEFAULT_RUNNER_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
  }

  async health(): Promise<{ status: string }> {
    const res = await fetch(`${this.baseUrl}/health`)
    if (!res.ok) {
      throw new Error(`Health check failed: ${res.status} ${res.statusText}`)
    }
    return res.json()
  }

  async listRuns(): Promise<RunsResponse> {
    const res = await fetch(`${this.baseUrl}/runs`)
    if (!res.ok) {
      throw new Error(`Failed to list runs: ${res.status} ${res.statusText}`)
    }
    return res.json()
  }

  async triggerRun(repoUrl: string, branch?: string): Promise<TriggerRunResponse> {
    const res = await fetch(`${this.baseUrl}/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoUrl, branch }),
    })
    if (!res.ok) {
      throw new Error(`Failed to trigger run: ${res.status} ${res.statusText}`)
    }
    return res.json()
  }

  async getRunStatus(runId: string): Promise<RunResponse> {
    const res = await fetch(`${this.baseUrl}/runs/${runId}`)
    if (!res.ok) {
      throw new Error(`Failed to get run status: ${res.status} ${res.statusText}`)
    }
    return res.json()
  }

  async getJobLogs(runId: string, job: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/runs/${runId}/logs/${job}`)
    if (!res.ok) {
      throw new Error(`Failed to get logs: ${res.status} ${res.statusText}`)
    }
    return res.text()
  }
}
