# playground

Play around with bun's child processes

## spawn

```ts
const proc = Bun.spawn(["bun", "--version"], {
console.log(await proc.stdout.text())
```

## write

```ts
const proc = Bun.spawn(["cat"], {
  stdin: "pipe", // return a FileSink for writing
});

// enqueue string data
proc.stdin.write("hello");

// enqueue binary data
const enc = new TextEncoder();
proc.stdin.write(enc.encode(" world!"));

// send buffered data
proc.stdin.flush();

// close the input stream after 1 second
setTimeout(() => {
  proc.stdin.end();
}, 1000);

// hello world!
console.log(await proc.stdout.text());
```

## chunks

```ts
const proc = Bun.spawn(["cat"], {
  stdin: "pipe", // return a FileSink for writing
});

proc.stdin.write("hello");
const enc = new TextEncoder();
proc.stdin.write(enc.encode(" world!"));

proc.stdin.flush();

const decoder = new TextDecoder();
// decode each chunk (uint 8 > string)
for await (const chunk of proc.stdout) {
  console.log("Received chunk:", decoder.decode(chunk));
}
```

## building a pipeline

```ts
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
      console.log(`[${name}] stdout stream closed \n`);
    },
    abort(err) {
      console.error(`[${name}] stdout stream error:`, err);
    },
  });
  proc.stdout.pipeTo(stdoutWritable);
}

runStep("build", ["echo", "Building..."]);
runStep("test", ["echo", "Testing..."]);
runStep("version", ["bun", "--version"]);
```
