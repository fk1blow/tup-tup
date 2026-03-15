import type { PipelineDefinition } from './pipeline.types'

export interface RuntimeContext {
  repoUrl: string
  repoBranch?: string
  definition: PipelineDefinition
  workspacePath: string
  artifactsPath: string
  logsPath: string
  // What's the appPath for? What app?
  // TODO let's document this better
  // const runtimeCtx = {
  //   repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
  //   repoBranch: undefined,
  //   workspacePath:
  //     '/Users/dragostudorache/Playground/tup-tup/tests/provisioner/workspace-bdc620cc-a70a-4dcc-8884-bd597200e45e',
  //   artifactsPath:
  //     '/Users/dragostudorache/Playground/tup-tup/tests/provisioner/workspace-bdc620cc-a70a-4dcc-8884-bd597200e45e/artifacts',
  //   logsPath:
  //     '/Users/dragostudorache/Playground/tup-tup/tests/provisioner/workspace-bdc620cc-a70a-4dcc-8884-bd597200e45e/logs',
  //   appPath:
  //     '/Users/dragostudorache/Playground/tup-tup/tests/provisioner/workspace-bdc620cc-a70a-4dcc-8884-bd597200e45e/app',
  //   definition: {
  //     name: 'my-pipeline',
  //     jobs: [
  //       // [Object ...], [Object ...]
  //     ],
  //   },
  // }
  appPath: string
}
