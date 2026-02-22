// Resources:
// https://jrsinclair.com/articles/2022/why-would-anyone-need-javascript-generator-functions/
// https://gist.github.com/mattpodwysocki/1d0fe43961c6222571386568b8a5ef23
// https://github.com/getify/CAF
// https://nearform.com/digital-community/javascript-power-tools-redux-saga/
//

//
// Example 1: Creating an async iterable class

class AsyncIterableClass {
  async *[Symbol.asyncIterator]() {
    yield 1
    await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate async operation
    yield 2
    await new Promise(resolve => setTimeout(resolve, 4000)) // Simulate async operation
    yield 3
  }
}

// const asyncIterableInstance = new AsyncIterableClass()
// for await (const value of asyncIterableInstance) {
//   console.log(value)
// }

// Alternatively, you can also create an async iterator using an async generator function:

//
// Example 2: Using an async generator function to create an async iterator

const asyncIterator = (async function* () {
  yield 1
  await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate async operation
  yield 2
  await new Promise(resolve => setTimeout(resolve, 4000)) // Simulate async operation
  yield 3
})()

// for await (const value of asyncIterator) {
//   console.log(value)
// }

//
// Example 3: Using Array.fromAsync to consume an async iterable

async function* generateNumbers() {
  yield 1
  await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate async operation
  yield 2
  yield 3
}

// const result = await Array.fromAsync(generateNumbers())
// console.log(result) // [1, 2, 3]

// Example 4: using a classic for loop

class UsingALoopGenerator {
  private async *gen(n: number) {
    for (let i = 0; i < n; i++) {
      await new Promise(resolve => setTimeout(resolve, i * 1000))
      yield i
    }
  }

  async run() {
    const genNext = this.gen(10)

    // console.log(await genNext.next())

    // console.log(await genNext.next())
    // console.log(await genNext.next())
    // console.log(await genNext.next())
    for await (const value of genNext) {
      console.log('value: ', value)
    }
  }
}

// const usingALoopInstance = new UsingALoopGenerator()
// const f = await usingALoopInstance.run()
// console.log('f:', f)

//
// Example ...

const sourceFunction = async function* () {
  yield Promise.resolve(1)
  yield Promise.resolve(2)
  yield Promise.resolve(3)
  console.log('All jobs have been yielded')
}

// const source = sourceFunction()
// const it = source[Symbol.asyncIterator]()

// let next
// next = await it.next()
// // First job,
// console.log('value: ', next.value, ', done: ', next.done)

// await new Promise(resolve => setTimeout(resolve, 2000))
// next = await it.next()
// // Second job which takes 2 seconds to complete
// console.log('value: ', next.value, ', done: ', next.done)

// await new Promise(resolve => setTimeout(resolve, 2000))
// next = await it.next()
// // Third job which takes 2 seconds to complete
// console.log('value: ', next.value, ', done: ', next.done)

// next = await it.next()
// // Fourth call which should indicate that the generator is done
// console.log('value: ', next.value, ', done: ', next.done)

// while (!(next = await it.next()).done) {
//   console.log(next.value)
// }

//
// deferred

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: any) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const gate = deferred<string>()

// somewhere else, later...
setTimeout(() => {
  gate.resolve('resolved from somwhere over the rainbow')
}, 2000)

// const res = await gate.promise
// console.log('res:', res)

//
// Task Runner using deferred to manage task completion

class TaskRunner {
  private gate = deferred<void>()

  async run(tasks: string[][]) {
    try {
      for (const args of tasks) {
        const proc = Bun.spawn(args, { stdout: 'inherit', stderr: 'inherit' })
        const exitCode = await proc.exited
        if (exitCode !== 0) {
          this.gate.reject(new Error(`Task failed: ${args.join(' ')} (exit ${exitCode})`))
          return
        }
      }
      this.gate.resolve()
    } catch (e) {
      this.gate.reject(e)
    }
  }

  get done() {
    return this.gate.promise
  }
}

// consumer
const runner = new TaskRunner()
runner.run([
  ['bun', '--version'],
  ['echo', 'hello'],
  ['echo', 'world'],
])

await runner.done
console.log('pipeline complete!')
