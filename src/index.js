const WorkerInstance = require('./worker-instance')
const PoolInstance = require('./pool-instance')
const { RETURN, ERROR } = require('./message-types')
const { merge } = require('./util')

class Battalion {
  constructor (WorkerClass, options = {}) {
    this.WorkerClass = WorkerClass
    this._options = options
  }

  createInstance (localOptions) {
    let options = merge(localOptions, this._options)
    return new WorkerInstance(this.WorkerClass, null, options)
  }

  createPool (count, localOptions) {
    if (!count) throw new Error('Count is required')
    let options = merge(this._options, localOptions, { count })
    return new PoolInstance(this.WorkerClass, null, options)
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
