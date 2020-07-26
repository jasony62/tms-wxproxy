const dotenv = require('dotenv')
dotenv.config({ path: './.env.test' })

const { WXProxy } = require('@/wxproxy')

describe('wxproxy', () => {
  // it('getAccessToken', async () => {
  //   const wxproxy = new WXProxy()
  //   const token = await wxproxy.getAccessToken()
  //   expect(token).toMatch(/.*/)
  // })
  it('templateList', async () => {
    const wxproxy = new WXProxy()
    const templates = await wxproxy.templateList()
    console.log('templates', JSON.stringify(templates[0]))
  })
  // it('messageTemplateSend', async () => {
  //   const wxproxy = new WXProxy()
  //   const message = {
  //     touser: process.env.TMS_WXPROXY_TEST_WX_OPENID,
  //     template_id: process.env.TMS_WXPROXY_TEST_WX_TEMPLATE_ID,
  //   }
  //   const msgid = await wxproxy.messageTemplateSend(message)
  //   console.log('msgid', msgid)
  // })
})
