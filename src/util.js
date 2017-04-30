exports.uniqueId = () => Math.random().toString(36).slice(2)

exports.merge = (...args) => Object.assign({}, ...args)

exports.repeat = (count, of) => [...new Array(count)].map(() => of())
