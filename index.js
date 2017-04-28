
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

  handleMessage (event) {
    let { _type, _id, value } = event.data
    if (_type === RETURN_TYPE) {
      this._pending[_id].resolve(value)
    } else if (_type === ERROR_TYPE) {
      this._pending[_id].reject(new Error(value))
    }
    delete this._pending[_id]
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

module.exports = Battalion
