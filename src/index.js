
const WorkerInstance = require('./worker-instance')
const PoolInstance = require('./pool-instance')
const { RETURN, ERROR } = require('./message-types')

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
      context.postMessage({ _type: RETURN, _id, value })
    }

    let sendError = (_id, value) => {
      context.postMessage({ _type: ERROR, _id, value })
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

module.exports = Battalion
