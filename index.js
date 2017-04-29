
const RETURN_TYPE = '@RETURN'
const ERROR_TYPE = '@ERROR'

let uniqueId = () => Math.random().toString(36).slice(2)

class Battalion {
  constructor (WorkerClass, options = {}) {
    this.WorkerClass = WorkerClass
    this._options = options
  }

  createInstance (localOptions) {
    let options = Object.assign({}, localOptions, this._options)
    return new WorkerInstance(this.WorkerClass, options)
  }

  createPool (count, localOptions) {
    if (!count) throw new Error('Count is required')
    return new PoolInstance(this.WorkerClass, Object.assign({ count }, localOptions, this._options))
  }

  static export (context, methods) {
    let sendResponse = (_id, value) => {
      context.postMessage({ _type: RETURN_TYPE, _id, value })
    }

    let sendError = (_id, value) => {
      context.postMessage({ _type: ERROR_TYPE, _id, value })
    }

    context.onmessage = (event) => {
      let { data } = event
      let { _type, _id } = data

      if (methods[_type]) {
        try {
          let result = methods[_type](data)
          sendResponse(_id, result)
        } catch (e) {
          sendError(_id, e.message)
        }
      } else {
        let error = 'Function name not on interface'
        sendError(_id, error)
      }
    }
  }
}

class WorkerInstance {
  constructor (WorkerClass, options = {}) {
    this._pending = {}
    this._worker = new WorkerClass()
    this._worker.onmessage = this.handleMessage.bind(this)
    this._options = options
  }

  get pending () {
    return Object.keys(this._pending).length
  }

  handleMessage (event) {
    let { _type, _id, value } = event.data
    let resolver = this._pending[_id]
    delete this._pending[_id]
    if (_type === RETURN_TYPE) {
      resolver.resolve(value)
    } else if (_type === ERROR_TYPE) {
      resolver.reject(new Error(value))
    }
  }

  dispatch (_type, data) {
    let _id = uniqueId()
    let { Promise: P = Promise, Task } = this._options

    let resolver = (resolve, reject) => {
      this._pending[_id] = { resolve, reject }
      this._worker.postMessage(Object.assign({}, data, { _type, _id }))
    }

    if (Task) {
      return new Task((reject, resolve) => resolver(resolve, reject))
    } else {
      return new P(resolver)
    }
  }
}

class PoolInstance {
  constructor (WorkerClass, options = {}) {
    this._queue = []
    this._pending = {}
    this._options = options

    this._workers = [...new Array(options.count)].map(_ =>
      new WorkerInstance(WorkerClass, options)
    )
  }

  get pending () {
    return this._workers.map(w => w.pending).reduce((a, b) => a + b, 0)
  }

  schedule () {
    let { Task } = this._options
    this._workers.filter(w => {
      return w.pending === 0
    }).forEach(w => {
      if (this._queue.length) {
        let next = this._queue.shift()
        let { resolve, reject } = this._pending[next._id]
        if (Task) {
          w.dispatch(next._type, next.data).fork(reject, (value) => {
            delete this._pending[next._id]
            resolve(value)
          })
        } else {
          w.dispatch(next._type, next.data).then(resolve, reject).then(() => {
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
}

module.exports = Battalion
