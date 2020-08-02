const axios = require('axios')
const adapter = require('axios/lib/adapters/http')
const ObjectId = require('mongodb').ObjectId

const DB_NAME = process.env.TMS_WXPROXY_MONGODB_DB

const CL_CONFIG = process.env.TMS_WXPROXY_MONGODB_CL_CONFIG

const CL_TEMPLATE_MESSAGE = process.env.TMS_WXPROXY_MONGODB_CL_TEMPLATE_MESSAGE

class WXProxy {
  constructor(config, mongoClient, tmsMesgLockPromise) {
    if (config && typeof config === 'object') {
      const { appid, appsecret, _id } = config
      this.config = { appid, appsecret, _id }
    } else {
      this.config = {
        appid: process.env.TMS_WXPROXY_WX_APPID,
        appsecret: process.env.TMS_WXPROXY_WX_APPSECRET,
      }
    }
    this.mongoClient = mongoClient
    if (tmsMesgLockPromise && typeof tmsMesgLockPromise === 'object')
      this.tmsMesgLockPromise = tmsMesgLockPromise
  }
  get db() {
    return DB_NAME && this.mongoClient ? this.mongoClient.db(DB_NAME) : null
  }
  get clConfig() {
    return this.db ? this.db.collection(CL_CONFIG) : null
  }
  get clTemplateMessage() {
    return this.db ? this.db.collection(CL_TEMPLATE_MESSAGE) : null
  }
  /**
   * 向公众平台发送GET请求
   */
  async httpGet(
    cmd,
    params = null,
    newAccessToken = false,
    appendAccessToken = true
  ) {
    let url = cmd
    if (appendAccessToken) {
      const token = await this.getAccessToken(newAccessToken)
      url += url.indexOf('?') === -1 ? '?' : '&'
      url += `access_token=${token}`
    }

    const options = { adapter }
    if (params && typeof params === "object") options.params = params

    return axios.get(url, options).then((rsp) => {
      const result = rsp.data
      if (result.errcode) {
        if (result.errcode === 40014) return this.httpGet(cmd, params, true)
        throw Error(`${result.errmsg}(${result.errcode})`)
      }

      return result
    })
  }
  /**
   * 向公众平台发送POST请求
   */
  async httpPost(cmd, posted, newAccessToken = false) {
    const token = await this.getAccessToken(newAccessToken)

    let url = cmd
    url += /\?/.test(cmd) ? '&' : '?'
    url += `access_token=${token}`

    return axios.post(url, posted, { adapter }).then((rsp) => {
      const result = rsp.data
      if (result.errcode === 40014) return this.httpPost(cmd, posted, true)
      if (typeof result.errcode !== "undefined" && result.errcode !== 0)
        throw Error(`${result.errmsg}(${result.errcode})`)

      return result
    })
  }
  /**
   * 从微信服务端获得accessToken
   */
  async fetchAccessToken(appid, secret) {
    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`

    return axios
      .get(url, { adapter })
      .then((rsp) => {
        const result = rsp.data
        if (result.access_token) {
          let { access_token, expires_in } = result
          return {
            value: access_token,
            expireAt: parseInt(Date.now() / 1000) + expires_in,
          }
        } else {
          throw Error(`请求获取access_token失败[${result.errmsg}]`)
        }
      })
      .catch((e) => {
        throw Error(e)
      })
  }
  /**
   * 获得可用的accessToken
   */
  async getAccessToken(newAccessToken) {
    if (!newAccessToken) {
      if (
        this.accessToken &&
        Date.now() / 1000 < this.accessToken.expireAt - 60
      ) {
        return this.accessToken.value
      }
    }

    const getAccessToken2 = function (wxproxyObj) {
      return new Promise(async (resolve) => {
        let accessToken
        if (wxproxyObj.clConfig && wxproxyObj.config._id) {
          const tokenObj = await wxproxyObj.clConfig.findOne(
            { _id: new ObjectId(wxproxyObj.config._id) },
            { projection: { _id: 0, accessToken: 1 } }
          )
          if (tokenObj) {
            if (
              tokenObj.accessToken &&
              Date.now() / 1000 < tokenObj.accessToken.expireAt - 60
            ) {
              return resolve(tokenObj.accessToken)
            }
          }
        }
        /**
         * 重新获取token
         */
        const { appid, appsecret } = wxproxyObj.config
        if (!appid || !appsecret) {
          throw Error('微信公众号参数为空')
        }
        accessToken = await wxproxyObj.fetchAccessToken(appid, appsecret)
        if (wxproxyObj.clConfig && wxproxyObj.config._id) {
          await wxproxyObj.clConfig.updateOne(
            { _id: new ObjectId(wxproxyObj.config._id) },
            { $set: { accessToken: accessToken } }
          )
        }

        return resolve(accessToken)
      })
    }

    if (
      this.tmsMesgLockPromise &&
      typeof this.tmsMesgLockPromise === 'object'
    ) {
      this.tmsMesgLockPromise.lockGetterParams = this
      this.tmsMesgLockPromise.lockGetter = getAccessToken2
      this.accessToken = await this.tmsMesgLockPromise.wait()
    } else {
      /**
       * 重新获取token
       */
      // this.accessToken = await getAccessToken2(this)
      throw Error('获取access_token流程错误')
    }

    return this.accessToken.value
  }
  /**
   * 获取微信公众号下所有模板列表
   */
  async templateList() {
    const cmd =
      'https://api.weixin.qq.com/cgi-bin/template/get_all_private_template'

    const rst = await this.httpGet(cmd)

    const templates = rst.template_list.map((tpl) => {
      const { template_id, title, content, example } = tpl
      const myTpl = { template_id, title, content, example }
      const params = content.match(/{{.+}}/g)
      if (params)
        myTpl.params = params.map((param) => {
          let name = param.match(/{{(.+)\./)[1]
          return { name }
        })
      else myTpl.params = []

      return myTpl
    })

    return templates
  }
  /**
   * 发送模板消息
   */
  async messageTemplateSend(message, matched) {
    const cmd = 'https://api.weixin.qq.com/cgi-bin/message/template/send'

    let msgid, errmsg
    try {
      const rst = await this.httpPost(cmd, message)
      msgid = rst.msgid
      return msgid
    } catch (e) {
      errmsg = e.message
      throw e
    } finally {
      if (this.clTemplateMessage) {
        const { touser, template_id, data, url } = message
        const sendAt = new Date(new Date().getTime() + 3600 * 8 * 1000)

        const resultData = { touser, template_id, data, url, sendAt }
        if (msgid) resultData.msgid = msgid
        if (errmsg) resultData.errmsg = errmsg

        if (matched && typeof matched === 'object') {
          await this.clTemplateMessage.updateOne(matched, {
            $set: resultData,
          })
        } else {
          await this.clTemplateMessage.insertOne(resultData)
        }
      }
    }
  }
  /**
   * 生成场景二维码
   */
  async qrcodeCreate(scene_id, oneOff, expire) {
    const cmd = 'https://api.weixin.qq.com/cgi-bin/qrcode/create'

    let posted
    if (oneOff === false) {
      posted = {
        action_name: "QR_LIMIT_SCENE",
        action_info: {
          scene: { scene_id },
        },
      }
    } else {
      posted = {
        expire_seconds: expire,
        action_name: "QR_SCENE",
        action_info: {
          scene: { scene_id },
        },
      }
    }

    let msgid, errmsg
    const rst = await this.httpPost(cmd, posted)
    const pic = `https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${rst.ticket}`

    let d = {
      scene_id,
      pic,
    }
    if (oneOff) d.expire_seconds = rst.expire_seconds;

    return d
  }
  /**
   * 获得一个指定粉丝的信息
   */
  async userInfo(openid, getGroup = false) {
    const cmd = 'https://api.weixin.qq.com/cgi-bin/user/info'

    let params = { openid }
    /*user info*/
    let userRst = await this.httpGet(cmd, params)
    /*group info*/
    if (getGroup) {
      /**
       * 获得粉丝的分组信息
       */
      const cmd2 = 'https://api.weixin.qq.com/cgi-bin/groups/getid'
      const groupRst = this.httpPost(cmd2, params)
      userRst.groupid = groupRst.groupid
    }

    return userRst
  }
}

module.exports.WXProxy = WXProxy
