// Example 1: Creating an async iterable class
//

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

// Example 2: Using an async generator function to create an async iterator
//

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

// Example 3: Using Array.fromAsync to consume an async iterable
//

async function* generateNumbers() {
  yield 1
  await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate async operation
  yield 2
  yield 3
}

// const result = await Array.fromAsync(generateNumbers())
// console.log(result) // [1, 2, 3]

// Example 4: using a classic for loop
//

class UsingALoopGenerator {
  private async *gen(n: number) {
    for (let i = 0; i < n; i++) {
      yield i
    }
  }

  async run() {
    const genNext = this.gen(3)

    console.log(await genNext.next())
    console.log(await genNext.next())
    console.log(await genNext.next())
    console.log(await genNext.next())
    console.log(await genNext.next())
  }
}

new UsingALoopGenerator().run()

// Example 5:...
//

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
