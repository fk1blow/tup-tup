function fooMiddleware(next: () => void) {
  console.log('foo middleware')
  return next()
}

function barMiddleware(next: () => void) {
  console.log('bar middleware')
  return next()
}

const fns = [
  () => {
    console.log('first function')
  },
  // () => {
  //   console.log('second function')
  // },
]
