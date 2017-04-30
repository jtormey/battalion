
const { RETURN, ERROR } = require('./message-types')
const { uniqueId } = require('./util')

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
    if (_type === RETURN) {
      resolver.resolve(value)
    } else if (_type === ERROR) {
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

module.exports = WorkerInstance
