/**
 * 请求中需要包含认证信息
 */
const RUNNING_LOCK_PROMISE = Symbol('running_lock_promise')
const LOCKGETTER = Symbol('lockGetter')
const LOCKGETTERPARAMS = Symbol('lockGetterParams')

class TmsLockPromise {
  constructor() {
    this.waitingPromises = []
  }

  set lockGetter(fnLockGetter) {
    if (typeof this[LOCKGETTER] !== 'function') {
      this[LOCKGETTER] = fnLockGetter
    }
  }
  set lockGetterParams(params) {
    if (typeof this[LOCKGETTERPARAMS] !== 'object') {
      this[LOCKGETTERPARAMS] = params
    }
  }

  isRunning() {
    return !!this[RUNNING_LOCK_PROMISE]
  }
  wait() {
    if (!this.isRunning()) {
      this[RUNNING_LOCK_PROMISE] = this[LOCKGETTER](this[LOCKGETTERPARAMS])
    }
    let prom = new Promise(resolve => {
      this[RUNNING_LOCK_PROMISE].then(token => {
        // 删除处理完的请求
        this.waitingPromises.splice(this.waitingPromises.indexOf(prom), 1)
        // 所有的请求都处理完，关闭登录结果
        if (this.waitingPromises.length === 0) {
          setTimeout(() => {
            this[RUNNING_LOCK_PROMISE] = null
          })
        }
        resolve(token)
      })
    })
    this.waitingPromises.push(prom)

    return prom
  }
}

module.exports = TmsLockPromise
