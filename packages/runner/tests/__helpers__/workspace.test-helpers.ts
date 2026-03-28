import { mkdirSync, rmSync } from 'fs'
import path from 'path'

export function setupWorkspaceIn(workingDir: string) {
  // This is the path to the workspace directory that the provisioner will use to prepare the environment.
  // In a real scenario, this would be provided by the environment in which the
  // provisioner is running (e.g., a CI/CD pipeline), but for testing purposes, we can define it here.

  // Need to create a unique workspace directory for each test to ensure isolation and avoid conflicts between tests.
  // This might come from the system's, from an .env file or from the CLI args in a real scenario
  const workspacePath = path.resolve(
    path.join(workingDir, `./${crypto.randomUUID()}`),
  )

  mkdirSync(workspacePath, { recursive: true })

  return workspacePath
}

export function teardownWorkspaceIn(workspacePath: string) {
  try {
    rmSync(workspacePath, { recursive: true, force: true })
  } catch (err) {
    console.error(`Error cleaning up workspace: ${err}`)
  }
}
