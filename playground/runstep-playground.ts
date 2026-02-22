async function runStep(name: string, cmd: string[]) {
  const decoder = new TextDecoder();

  const proc = Bun.spawn(cmd, {
    stdout: "pipe",
    stderr: "pipe",
    stdin: "ignore",
  });

  const stdoutWritable = new WritableStream({
    write(chunk) {
      console.log(`[${name}] stdout: ${decoder.decode(chunk)}`);
    },
    close() {
      // console.log(`[${name}] stdout stream closed \n`);
    },
    abort(err) {
      console.error(`[${name}] stdout stream error:`, err);
    },
  });
  proc.stdout.pipeTo(stdoutWritable);

  const stderrWritable = new WritableStream({
    write(chunk) {
      console.error(`[${name}] stderr: ${decoder.decode(chunk)}`);
    },
    close() {
      // console.log(`[${name}] stderr stream closed \n`);
    },
    abort(err) {
      console.error(`[${name}] stderr stream error:`, err);
    },
  });
  proc.stderr.pipeTo(stderrWritable);
}

runStep("build", ["echo", "Building..."]);
runStep("test", ["echo", "Testing..."]);
runStep("version", ["bun", "--version"]);
runStep("docker hello world", ["docker", "run", "--rm", "hello-world"]);
