
const WorkerInstance = require('./worker-instance')
const { uniqueId } = require('./util')

class PoolInstance {
  constructor (WorkerClass, options = {}) {
    this._queue = []
    this._pending = {}
    this._listeners = []
    this._options = options
    this._completed = 0

    this._workers = [...new Array(options.count)].map(_ =>
      new WorkerInstance(WorkerClass, options)
    )
  }

  get pending () {
    return this._workers.map(w => w.pending).reduce((a, b) => a + b, 0)
  }

  schedule () {
    let { Task } = this._options

    let notify = () => {
      this._completed += 1
      this._listeners.forEach(f => {
        let pending = this._queue.length
        let completed = this._completed
        f({ pending, completed })
      })
    }

    this._workers.filter(w => {
      return w.pending === 0
    }).forEach(w => {
      if (this._queue.length) {
        let next = this._queue.shift()
        let { resolve, reject } = this._pending[next._id]
        if (Task) {
          w.dispatch(next._type, next.data).fork(reject, (value) => {
            notify()
            delete this._pending[next._id]
            resolve(value)
          })
        } else {
          w.dispatch(next._type, next.data).then(resolve, reject).then(() => {
            notify()
            delete this._pending[next._id]
          })
        }
      }
    })
  }

  dispatch (_type, data) {
    let _id = uniqueId()
    let { Promise: P = Promise, Task } = this._options

    let resolver = (res, rej) => {
      this._queue.push({ _id, _type, data })
      let resolve = (x) => { res(x); this.schedule() }
      let reject = (x) => { rej(x); this.schedule() }
      this._pending[_id] = { resolve, reject }
      this.schedule()
    }

    if (Task) {
      return new Task((reject, resolve) => resolver(resolve, reject))
    } else {
      return new P(resolver)
    }
  }

  clear () {
    this._completed = 0
    this._queue = []
  }

  subscribe (f) {
    this._listeners.push(f)
  }
}

module.exports = PoolInstance
