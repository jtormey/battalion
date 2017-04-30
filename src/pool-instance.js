const JobManager = require('./job-manager')
const WorkerInstance = require('./worker-instance')
const { merge, repeat } = require('./util')

class PoolInstance {
  constructor (WorkerClass, manager, options = {}) {
    this._manager = manager || new JobManager(options)
    repeat(options.count, () =>
      new WorkerInstance(WorkerClass, this._manager, options)
    )
  }

  dispatch (_type, data) {
    return this._manager.dispatch(merge(data, { _type }))
  }

  subscribe (f) {
    return this._manager.subscribe(f)
  }

  clear () {
    this._manager.clear()
  }
}

module.exports = PoolInstance
