# 基于 Cloudflare Worker 的拼车机器人部署指南

## 🌟 项目简介
通过 Cloudflare Worker 实现零成本 Telegram 流量查询机器人，适合拼车群组使用。用户可自助查询：
- 剩余流量
- 到期时间
- 在线状态

![img](https://r2.369069.xyz/20250410_a5ffde54.jpg)
![img](https://r2.369069.xyz/20250410_014c7614.jpg)

---

## 🚀 快速部署

### 准备工作
1. Cloudflare 账号
2. 3x-ui 面板（需开放外网访问）
3. Telegram 机器人 Token（通过 @BotFather 申请）参考链接：[获取 Telegram 机器人 Token](https://blog.xiny.cc/archives/mTaUz0TW)

### 部署步骤

1. **创建新 Worker**  
   进入 Cloudflare Dashboard → Workers → 创建

2. **粘贴代码**  
   复制 GitHub 完整代码：[worker.js](https://github.com/xinycai/worker-query-3xui-TGbot/blob/main/worker.js)  
   👉 粘贴到 Worker 编辑器中

3. **配置代码中的参数**  
   在Worker 编辑器中编辑以下参数：

```javascript
const TELEGRAM_BOT_TOKEN = "xxxxxxxxxxmCW3s"; // 你的机器人Token
const TG_NAME = '@xxxxx'         // 联系方式（支持消息转发机器人）
const BASE_URL = "http://xxx.xxx:2334/dfhask" // 3x-ui面板地址（含端口和路径）
const USERNAME = "xxxx"                       // 3x-ui管理员账号
const PASSWORD = "xxxxxxxxxxx"                // 3x-ui管理员密码
```

4. **部署服务**  
   点击 "保存并部署" 

5. **设置 Webhook**  
   访问以下URL激活机器人（替换为你的Worker域名）：
   ```
   https://你的worker域名/setWebhook
   ```

---

## 🛠️ 功能验证
向机器人发送以下命令测试：
| 命令          | 功能说明                  |
|---------------|-------------------------|
| `/start`      | 显示功能菜单             |
| `/status`     | 查询当前账号流量         |
| `/query 参数` | 指定参数查询其他账号      |
| `/id`         | 获取当前会话ID          |
| `/help`       | 显示管理员联系方式       |

---

## ⚠️ 注意事项
1. **3x-ui 面板需开放外网访问**
2. **Webhook 设置必须执行**

---

## 🙏 致谢
灵感来源于 [hkfires](https://www.nodeseek.com/space/23484)
上车老哥的claw，看到这个机器人，感觉很不错，所以整了一个
如果对你有用的话，麻烦给我点个Star，感恩的心
