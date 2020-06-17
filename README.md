微信公众号接口。

已支持的微信接口

- 发送微信模板消息

支持使用 mongodb 库存储数据。

| 名称                                    | 必填 | 说明                         |
| --------------------------------------- | ---- | ---------------------------- |
| TMS_WXPROXY_MONGODB_DB                  | 否   |                              |
| TMS_WXPROXY_MONGODB_CL_CONFIG           | 否   | 存放微信公众号配置信息的集合 |
| TMS_WXPROXY_MONGODB_CL_TEMPLATE_MESSAGE | 否   | 记录发送微信模版消息的集合   |
| TMS_WXPROXY_WX_APPID                    | 否   | 微信公众号对接参数           |
| TMS_WXPROXY_WX_APPSECRET                | 否   | 微信公众号对接参数           |

微信公众号配置集合（通过`TMS_WXPROXY_MONGODB_CL_CONFIG`指定）支持字段

| 字段                 | 类型   | 说明 |     |
| -------------------- | ------ | ---- | --- |
| appid                | String |      |     |
| appsecret            | String |      |     |
| accessToken          | Object |      |     |
| accessToken.value    | String |      |     |
| accessToken.expireAt | Number |      |     |

微信公众号模板消息集合（通过`TMS_WXPROXY_MONGODB_CL_TEMPLATE_MESSAGE`指定）支持的字段

| 字段        | 类型   | 说明 |     |
| ----------- | ------ | ---- | --- |
| touser      | String |      |     |
| template_id | String |      |     |
| data        | String |      |     |
| url         | String |      |     |
| sendAt      | String |      |     |
| msgid       | String |      |     |
