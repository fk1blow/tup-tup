export async function filterRunningContainers(
  name: string,
  opts: { exact: boolean } = { exact: false },
): Promise<string[]> {
  const subprocess = Bun.spawn(
    [
      'docker',
      'ps',
      '-a',
      '--filter',
      `name=${name}`,
      '--format',
      '{{.Names}}',
    ],
    { stdout: 'pipe' },
  )

  const output = await new Response(subprocess.stdout).text()
  const containerNames = output
    .trim()
    .split('\n')
    .filter(containerName =>
      opts.exact ? containerName === name : containerName.includes(name),
    )

  return containerNames
}

export async function removeContainerByName(name: string): Promise<void> {
  const subprocess = Bun.spawn(['docker', 'rm', '-f', name], {
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const _output = await new Response(subprocess.stdout).text()
  const _errorOutput = await new Response(subprocess.stderr).text()
  await subprocess.exited
}
