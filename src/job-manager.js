const { RETURN, ERROR } = require('./message-types')
const { uniqueId, merge } = require('./util')

class JobManager {
  constructor (options = {}) {
    this._options = options
    this._listeners = []
    this._jobQueue = []
    this._workerQueue = []
    this._pending = {}
    this._completed = 0
  }

  get completed () {
    return this._completed
  }

  get pending () {
    return Object.keys(this._pending).length
  }

  isEmpty () {
    return this._jobQueue.length === 0
  }

  dispatch (data) {
    let _id = uniqueId()
    let { Promise: P = Promise, Task } = this._options

    let resolver = (resolve, reject) => {
      this._pending[_id] = { resolve, reject }
      this._jobQueue.push(merge(data, { _id }))
      this._flush()
    }

    if (Task) {
      return new Task((reject, resolve) => resolver(resolve, reject))
    } else {
      return new P(resolver)
    }
  }

  next (f) {
    if (typeof f !== 'function') {
      throw new Error('manager.next must be passed a work function')
    }
    this._workerQueue.push(f)
    this._flush()
  }

  done (data) {
    let { _type, _id, value } = data
    let resolver = this._pending[_id]
    delete this._pending[_id]
    this._completed++
    this._notify()
    switch (_type) {
      case RETURN:
        return resolver.resolve(value)
      case ERROR:
        return resolver.reject(new Error(value))
      default:
        throw new Error('Unkwnown message type')
    }
  }

  subscribe (f) {
    this._listeners.push(f)
    return () => {
      let index = this._listeners.indexOf(f)
      if (index > -1) this._listeners.splice(index, 1)
    }
  }

  clear () {
    this._jobQueue = []
    this._coompleted = 0
  }

  _flush () {
    while (this._workerQueue.length && this._jobQueue.length) {
      let nextf = this._workerQueue.shift()
      let nextd = this._jobQueue.shift()
      nextf(nextd)
    }
  }

  _notify () {
    let completed = this.completed
    let pending = this.pending
    this._listeners.forEach(f => f({ completed, pending }))
  }
}

module.exports = JobManager
