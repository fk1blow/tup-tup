const _subprocess = Bun.spawn(
  [
    'docker',
    'run',
    '--rm',
    '-v',
    `host-workspace-path:/workspace`,
    '-w',
    '/workspace/app',
    'alpine/git',
    'clone',
    'https://github.com/fk1blow/tup-tup-demo-repo',
    './repo',
  ],
  {
    stdout: 'inherit',
    stderr: 'inherit',
  },
)
