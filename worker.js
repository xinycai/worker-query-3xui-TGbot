const TELEGRAM_BOT_TOKEN = "xxxxxxxxxxmCW3s"; // 填入你的机器人Token
const TG_NAME = '@zishou_forward_bot' // 填入用户可以联系到你的TG用户名，或者消息转发机器人
const BASE_URL = "http://txxxxxxxxxx:2334/dfhask"; // 填入你的3x-ui访问地址，末尾有自定义路径需要加上
const USERNAME = "xxxx"; // 3-xui管理员账号
const PASSWORD = "xxxxxxxxxxx"; // 3-xui管理员密码

export default {
    async fetch(request, env) {
        const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
        const url = new URL(request.url);

        try {
            if (url.pathname === '/setWebhook') {
                return await handleSetWebhook(url, TELEGRAM_API_URL);
            }

            if (url.pathname === '/webhook' && request.method === 'POST') {
                return await handleWebhook(request, TELEGRAM_API_URL);
            }

            return new Response('Not found', {status: 404});
        } catch (error) {
            console.error('全局错误:', error);
            return new Response('Server Error', {status: 500});
        }
    },
};


async function handleSetWebhook(url, apiUrl) {
    const webhookUrl = `${url.protocol}//${url.host}/webhook`;
    try {
        const response = await fetch(`${apiUrl}/setWebhook`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({url: webhookUrl}),
        });

        await setBotCommands(apiUrl);

        return response.ok
            ? new Response(`Webhook set successfully to ${webhookUrl}`)
            : new Response('Failed to set webhook', {status: 500});
    } catch (error) {
        console.error('设置Webhook失败:', error);
        return new Response('设置Webhook时发生错误', {status: 500});
    }
}

async function setBotCommands(apiUrl) {
    try {
        const commands = [
            {command: "/start", description: "召唤机器人"},
            {command: "/status", description: "查询流量"},
            {command: "/query", description: "根据ID查询流量"},
            {command: "/id", description: "查询ID"},
            {command: "/help", description: "召唤管理员"},
        ];

        const response = await fetch(`${apiUrl}/setMyCommands`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({commands}),
        });

        const data = await response.json();
        if (!data.ok) {
            console.error('命令设置失败:', data);
            return {ok: false, error: data};
        }
        console.log('命令菜单设置成功');
        return {ok: true};
    } catch (error) {
        console.error('命令设置异常:', error);
        return {ok: false, error: error.message};
    }
}


async function handleWebhook(request, apiUrl) {
    try {
        const update = await request.json();

        if (update.callback_query) {
            await handleCallbackQuery(update.callback_query, apiUrl);
            return new Response('OK');
        }

        if (update.message.text) {
            const text = update.message.text;
            const chatId = update.message.chat.id;

            if (text === '/start') {
                await sendMessageWithButtons(chatId, '欢迎使用机器人！请选择你要使用的功能：', apiUrl);
            } else if (update.message.text === '/status') {
                await handleTrafficRequest(chatId, apiUrl);
            } else if (update.message.text === '/id') {
                await getUserId(chatId, apiUrl);
            } else if (update.message.text === '/help') {
                await sendMessage(chatId, "请与管理员直接联系：" + TG_NAME, apiUrl)
            } else if (update.message.text === '/query') {
                await sendMessage(chatId, "用法示例：\n/query 5220311563" + TG_NAME, apiUrl)
            } else if (text === '/status' || text.startsWith('/query')) {
                const queryParam = text.startsWith('/query')
                    ? text.split(' ')[1] // 提取查询参数
                    : null;
                await handleTrafficRequest(chatId, apiUrl, queryParam);
            } else {
                await sendMessageWithButtons(chatId, "请选择你要使用的功能：", apiUrl)
            }
        }
        if (update.message.text) {
            const text = update.message.text;
            const chatId = update.message.chat.id;

            if (text === '/start') {
                await sendMessageWithButtons(chatId, '欢迎使用机器人！请选择你要使用的功能：', apiUrl);
            } else if (text === '/status' || text.startsWith('/query')) {
                // 统一处理流量请求
                const queryParam = text.startsWith('/query')
                    ? text.split(' ')[1] // 提取查询参数
                    : null;

                await handleTrafficRequest(chatId, apiUrl, queryParam);
            } else if (text === '/id') {
                await getUserId(chatId, apiUrl);
            } else if (text === '/help') {
                await sendMessage(chatId, "请与管理员直接联系：" + TG_NAME, apiUrl);
            } else {
                await sendMessageWithButtons(chatId, "请选择你要使用的功能：", apiUrl);
            }

        }

        return new Response('OK');
    } catch (error) {
        console.error('处理Webhook失败:', error);
        return new Response('OK');
    }
}


async function handleCallbackQuery(callbackQuery, apiUrl) {
    const {id, data, message} = callbackQuery;
    const chatId = message.chat.id;

    try {
        // 立即应答回调
        await answerCallbackQuery(id, apiUrl);

        if (data === 'button1') {
            await handleTrafficRequest(chatId, apiUrl);
        } else if (data === 'button2') {
            await getUserId(chatId, apiUrl);
        }
    } catch (error) {
        console.error('处理回调时出错:', error);
        await sendMessage(chatId, '❌ 操作处理失败，请稍后重试', apiUrl);
    }
}

// 流量请求处理
async function handleTrafficRequest(chatId, apiUrl, query = chatId) {
    try {
        const cookie = await getAuthCookie();
        if (!cookie) {
            await sendMessage(chatId, '🔒 登录认证失败', apiUrl);
            return;
        }

        const searchKey = typeof query === 'string' ? query : chatId;

        const trafficData = await getClientTraffic(cookie, searchKey);
        if (!trafficData) {
            await sendMessage(chatId, '📡 未获取到流量数据，请联系管理员', apiUrl);
            return;
        }

        const onlineStatus = await checkOnlineStatus(cookie, trafficData.email);
        const message = formatTrafficMessage({...trafficData, ...onlineStatus});
        await sendMessage(chatId, message, apiUrl);
        await sendMessageWithButtons(chatId, "请选择你要使用的功能：", apiUrl);
    } catch (error) {
        console.error('流量请求处理失败:', error);
        await sendMessage(chatId, '❌ 流量查询失败，请稍后重试', apiUrl);
    }
}

// 获取认证 Cookie
async function getAuthCookie() {
    try {
        const response = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username: USERNAME, password: PASSWORD}),
        });

        return response.ok
            ? response.headers.get('Set-Cookie')
            : null;
    } catch (error) {
        console.error('获取Cookie失败:', error);
        return null;
    }
}

// 获取流量数据
async function getClientTraffic(cookie, chatId) {
    try {
        const response = await fetch(`${BASE_URL}/panel/api/inbounds/getClientTraffics/${chatId}`, {
            headers: {Cookie: cookie},
        });

        if (!response.ok) return null;

        const data = await response.json();
        if (!data?.obj) return null;

        return {
            email: data.obj.email,
            enable: data.obj.enable,
            up: data.obj.up,
            down: data.obj.down,
            total: data.obj.total,
            expiryTime: data.obj.expiryTime
        };
    } catch (error) {
        console.error('获取流量数据失败:', error);
        return null;
    }
}

// 检查在线状态
async function checkOnlineStatus(cookie, email) {
    try {
        const response = await fetch(`${BASE_URL}/panel/api/inbounds/onlines`, {
            method: 'POST',
            headers: {Cookie: cookie},
        });

        if (!response.ok) return {isOnline: false};

        const data = await response.json();
        return {
            isOnline: data?.obj?.includes?.(email) ?? false
        };
    } catch (error) {
        console.error('检查在线状态失败:', error);
        return {isOnline: false};
    }
}

// 格式化消息模板
function formatTrafficMessage(data) {
    try {
        const formatTraffic = (bytes) => {
            if (typeof bytes !== 'number') return '0B';
            const units = ['B', 'KB', 'MB', 'GB'];
            let unitIndex = 0;
            while (bytes >= 1024 && unitIndex < units.length - 1) {
                bytes /= 1024;
                unitIndex++;
            }
            return `${bytes.toFixed(2)}${units[unitIndex]}`;
        };
        // 将到期时间转为中国标准时间 (UTC+8)
        const expiryDate = new Date(data.expiryTime + 8 * 60 * 60 * 1000);

        const year = expiryDate.getFullYear();
        const month = (expiryDate.getMonth() + 1).toString().padStart(2, '0');
        const day = expiryDate.getDate().toString().padStart(2, '0');
        const hours = expiryDate.getHours().toString().padStart(2, '0');
        const minutes = expiryDate.getMinutes().toString().padStart(2, '0');
        const seconds = expiryDate.getSeconds().toString().padStart(2, '0');

        const formattedExpiryDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

        return `
📧 用户：${data.email || '未知'}
💡 状态：${data.enable ? "✅ 启用" : "❌ 禁用"}
🌐 连接：${data.isOnline ? "🟢 在线" : "🔴 离线"}
📅 到期：${formattedExpiryDate}
🔼 上传：${formatTraffic(data.up)}
🔽 下载：${formatTraffic(data.down)}
📊 总计：${formatTraffic(data.up + data.down)} / ${formatTraffic(data.total)}
        `.trim();
    } catch (error) {
        console.error('消息格式化失败:', error);
        return '⚠️ 数据格式化错误';
    }
}

// 通用消息发送函数
async function sendMessage(chatId, text, apiUrl) {
    try {
        await fetch(`${apiUrl}/sendMessage`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({chat_id: chatId, text}),
        });
    } catch (error) {
        console.error('消息发送失败:', error);
    }
}

// 带按钮消息发送
async function sendMessageWithButtons(chatId, text, apiUrl) {
    try {
        await fetch(`${apiUrl}/sendMessage`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                chat_id: chatId,
                text,
                reply_markup: {
                    inline_keyboard: [
                        [
                            {text: '查询流量', callback_data: 'button1'},
                            {text: '查询ID', callback_data: 'button2'}
                        ]
                    ]
                }
            }),
        });
    } catch (error) {
        console.error('发送按钮消息失败:', error);
    }
}

// 回调应答
async function answerCallbackQuery(callbackId, apiUrl) {
    try {
        await fetch(`${apiUrl}/answerCallbackQuery`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({callback_query_id: callbackId}),
        });
    } catch (error) {
        console.error('回调应答失败:', error);
    }
}

// 获取用户ID
async function getUserId(chatId, apiUrl) {
    try {
        await sendMessage(chatId, `你的用户ID是: ${chatId}`, apiUrl);
        await sendMessageWithButtons(chatId, "请选择你要使用的功能：", apiUrl)
    } catch (error) {
        console.error('获取用户ID失败:', error);
    }
}

