# Battalion

A simple interface between Workers.

## Install

```sh
npm install --save battalion
```

## Getting Started

To expose an interface from a Worker:

```js
// src/worker-module.js
import Battalion from 'battalion'

Battalion.export({
  addTwo ({ first, second }) {
    return first + second
  }
})
```

Then, to create / access that worker from the main thread:

```js
// src/index.js
import Battalion from 'battalion'
import MyWorker from './worker-module' // import worker with webpack / worker-loader

let battalion = new Battalion(MyWorker)
let workerInstance = battalion.createInstance()

workerInstance.dispatch('addTwo', { first: 1, second: 2 }).then((result) => {
  console.log(result) // => 3
})
```

## API

Options object:

* `Promise`: the Promise implementation to use (defaults to `Promise`)
* `Task`: the Task implementation to use (uses Promises by default)

### Battalion(MyWorker, options)

`MyWorker`: Worker class.

### Battalion#createInstance(options)

Returns a `WorkerInstance`.

### Battalion#createPool(count, options)

`count`: Number of workers to use.

Returns a `PoolInstance`.

### WorkerInstance#dispatch(type, data)

Assign a worker instance a job.

`type`: Name of exported function to run.

`data`: Object that will be passed to the function.

Returns a Promise (or Task) of the eventual result.

### PoolInstance#dispatch(type, data)

Same as above, but will be distributed among available workers.

### PoolInstance#subscribe(callback)

`callback`: Function, will be called when a job is complete.

Receives an object containing two properties: `completed` (total number of completed jobs) and `pending` (jobs in job queue).

### PoolInstance#clear()

Resets the `completed` jobs count and empties the existing job queue.
