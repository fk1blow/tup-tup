// const proc = Bun.spawn(["cat"], {
//   stdin: "pipe", // return a FileSink for writing
// });

// // enqueue string data
// proc.stdin.write("hello");

// // enqueue binary data
// const enc = new TextEncoder();
// proc.stdin.write(enc.encode(" world!"));

// // send buffered data
// proc.stdin.flush();

// // close the input stream
// setTimeout(() => {
//   proc.stdin.end();
// }, 1000);

const proc = Bun.spawn(["cat"], {
  stdin: "pipe",
  stdout: "pipe",
});

proc.stdin.write("hello\n");
proc.stdin.write("world\n");
proc.stdin.flush(); // push buffered data through
proc.stdin.end(); // close stdin — signals EOF to the proce

const decoder = new TextDecoder();
// for await (const chunk of proc.stdout) {
//   console.log("Received chunk:", decoder.decode(chunk));
// }
console.log(await proc.stdout.text());

// proc.stdout.pipeTo(
//   new WritableStream({
//     write(chunk) {
//       console.log("Received chunk:", new TextDecoder().decode(chunk));
//     },
//     close() {
//       console.log("Stream closed");
//     },
//     abort(err) {
//       console.error("Stream error:", err);
//     },
//   }),
// );
