const JobManager = require('./job-manager')
const { merge } = require('./util')

class WorkerInstance {
  constructor (WorkerClass, manager, options) {
    this._worker = new WorkerClass()
    this._worker.onmessage = this._handleMessage.bind(this)
    this._manager = manager || new JobManager(options)
    this._manager.next((data) => { this._worker.postMessage(data) })
  }

  _handleMessage (event) {
    this._manager.done(event.data)
    this._manager.next((data) => { this._worker.postMessage(data) })
  }

  dispatch (_type, data) {
    return this._manager.dispatch(merge(data, { _type }))
  }
}

module.exports = WorkerInstance
