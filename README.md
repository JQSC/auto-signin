# 自动签到系统

基于 Playwright 的多平台自动签到工具，支持掘金、B站等平台的自动签到功能。

## 功能特性

- 🚀 支持多平台签到（掘金、B站等）
- 🔧 模块化设计，易于扩展新平台
- 📝 完善的日志记录系统
- ⚙️ 灵活的配置管理
- 🔄 支持串行和并行执行模式
- 🛡️ 错误处理和异常恢复
- 📊 详细的签到结果统计
- 💾 自动保存登录状态，避免重复登录
- ⏰ **支持定时任务，每日自动执行签到**
- 🖥️ 独立的守护进程模式
- 🎯 灵活的定时配置（支持cron表达式）

## 项目结构

```
auto-signin/
├── src/
│   ├── base/
│   │   └── BaseSignIn.js          # 基础签到抽象类
│   ├── platforms/
│   │   ├── juejin.js              # 掘金签到实现
│   │   └── bilibili.js            # B站签到实现
│   ├── scheduler/
│   │   └── cron.js                # 定时任务调度器
│   ├── utils/
│   │   ├── logger.js              # 日志记录工具
│   │   ├── config.js              # 配置管理工具
│   │   └── scheduleConfig.js      # 定时任务配置管理
│   ├── index.js                   # 主程序入口
│   └── daemon.js                  # 守护进程入口
├── config/
│   ├── platforms.json             # 平台配置文件
│   └── schedule.json              # 定时任务配置文件
├── docs/
│   └── SCHEDULE.md                # 定时任务详细说明
├── sessions/                      # 登录状态保存目录
├── logs/                          # 日志文件目录
├── .env.example                   # 环境变量模板
├── package.json
└── README.md
```

## 安装依赖

```bash
npm install
```

## 配置说明

### 1. 环境变量配置

复制 `.env.example` 文件为 `.env`，并填写你的账号信息：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 掘金账号配置
JUEJIN_USERNAME=your_juejin_username
JUEJIN_PASSWORD=your_juejin_password

# B站账号配置
BILIBILI_USERNAME=your_bilibili_username
BILIBILI_PASSWORD=your_bilibili_password

# 浏览器配置
HEADLESS=true
BROWSER_TIMEOUT=30000

# 日志配置
LOG_LEVEL=info
```

### 2. 平台配置

编辑 `config/platforms.json` 文件来启用或禁用特定平台：

```json
{
  "platforms": [
    {
      "name": "juejin",
      "displayName": "掘金",
      "enabled": true,
      // ... 其他配置
    },
    {
      "name": "bilibili",
      "displayName": "B站",
      "enabled": true,
      // ... 其他配置
    }
  ]
}
```

## 使用方法

### 基本用法

```bash
# 执行所有平台的签到（串行模式）
npm start

# 或者直接使用 node
node src/index.js
```

### 高级用法

```bash
# 并行执行所有平台签到
node src/index.js --parallel

# 只执行掘金签到
node src/index.js juejin

# 只执行B站签到
node src/index.js bilibili

# 查看帮助信息
node src/index.js --help

# 列出所有可用平台
node src/index.js --list

# 显示所有保存的登录状态
node src/index.js --sessions

# 清除所有登录状态
node src/index.js --clear-sessions

# 清除指定平台的登录状态
node src/index.js --clear-session juejin
```

### 命令行选项

| 选项 | 说明 |
|------|------|
| `--help`, `-h` | 显示帮助信息 |
| `--parallel`, `-p` | 并行执行所有平台签到 |
| `--list`, `-l` | 列出所有可用平台 |
| `--sessions`, `-s` | 显示所有保存的登录状态 |
| `--clear-sessions` | 清除所有登录状态 |
| `--clear-session` | 清除指定平台的登录状态 |
| `--schedule`, `-c` | 启动定时任务（默认每天8点） |
| `--schedule-time` | 指定定时任务执行时间（cron表达式） |
| `--stop-schedule` | 停止定时任务 |
| `--schedule-status` | 查看定时任务状态 |
| `--run-now` | 立即执行一次签到任务 |
| `平台名称` | 只执行指定平台的签到 |

## 日志说明

程序会在 `logs/` 目录下生成以下日志文件：

- `combined.log` - 所有级别的日志
- `error.log` - 错误级别的日志

日志级别可以通过环境变量 `LOG_LEVEL` 控制，支持：`error`, `warn`, `info`, `debug`

## 登录状态管理

本系统使用 Playwright 的 `storageState` 功能自动保存和恢复登录状态，避免每次签到都需要重新登录。

### 工作原理

1. **首次登录**：程序会在主页点击登录按钮，打开登录弹窗并执行登录流程
2. **保存状态**：登录成功后，自动保存浏览器的存储状态（cookies、localStorage等）
3. **状态恢复**：下次运行时，程序会自动加载保存的状态，跳过登录步骤
4. **自动过期**：登录状态默认保存7天，过期后会自动清理

### 管理登录状态

```bash
# 查看所有平台的登录状态
node src/index.js --sessions

# 清除所有平台的登录状态
node src/index.js --clear-sessions

# 清除特定平台的登录状态
node src/index.js --clear-session juejin
```

### 注意事项

- 登录状态文件保存在 `sessions/` 目录下
- 如果登录失败，可以尝试清除对应平台的登录状态后重新运行
- 登录状态文件包含敏感信息，请妥善保管
- 系统采用弹窗登录模式，会在主页点击登录按钮打开登录弹窗

## 扩展新平台

要添加新的签到平台，请按照以下步骤：

### 1. 创建平台实现类

在 `src/platforms/` 目录下创建新的平台文件，例如 `newplatform.js`：

```javascript
import BaseSignIn from '../base/BaseSignIn.js';
import logger from '../utils/logger.js';

class NewPlatformSignIn extends BaseSignIn {
  constructor() {
    super('newplatform');
  }

  async isLoggedIn() {
    // 实现登录状态检查逻辑
  }

  async login() {
    // 实现登录逻辑
  }

  async signIn() {
    // 实现签到逻辑
  }
}

export default NewPlatformSignIn;
```

### 2. 更新平台配置

在 `config/platforms.json` 中添加新平台的配置：

```json
{
  "name": "newplatform",
  "displayName": "新平台",
  "enabled": true,
  "url": "https://newplatform.com",
  "loginUrl": "https://newplatform.com/login",
  "signInUrl": "https://newplatform.com/signin",
  "selectors": {
    // 页面元素选择器
  }
}
```

### 3. 添加环境变量

在 `.env.example` 中添加新平台的账号配置：

```env
# 新平台账号配置
NEWPLATFORM_USERNAME=your_username
NEWPLATFORM_PASSWORD=your_password
```

### 4. 注册平台类

在 `src/index.js` 中导入并注册新平台：

```javascript
import NewPlatformSignIn from './platforms/newplatform.js';

const PLATFORM_CLASSES = {
  juejin: JuejinSignIn,
  bilibili: BilibiliSignIn,
  newplatform: NewPlatformSignIn  // 添加这行
};
```

## 注意事项

1. **账号安全**：请确保 `.env` 文件不要提交到版本控制系统中
2. **验证码处理**：某些平台可能需要验证码，程序会等待手动处理
3. **反爬虫机制**：建议设置合理的执行间隔，避免被平台检测
4. **浏览器模式**：开发调试时可以设置 `HEADLESS=false` 来查看浏览器操作过程

## ⏰ 定时任务功能

本系统内置了强大的定时任务功能，支持每日自动执行签到，无需手动干预。

### 快速开始

```bash
# 启动默认定时任务（每天早上8点执行）
npm run schedule

# 或者使用守护进程
node src/daemon.js

# 指定执行时间（每天早上9点）
node src/daemon.js --time "0 9 * * *"

# 立即执行一次签到任务
npm run run-now
```

### 定时任务命令

```bash
# 启动定时任务（默认每天8点）
node src/index.js --schedule

# 指定时间启动定时任务
node src/index.js --schedule-time "0 9 * * *"

# 查看定时任务状态
node src/index.js --schedule-status

# 立即执行一次签到
node src/index.js --run-now
```

### 守护进程模式

使用独立的守护进程来管理定时任务：

```bash
# 启动守护进程（默认每天8点）
node src/daemon.js

# 自定义时间
node src/daemon.js --time "0 20 * * *"

# 并行模式执行
node src/daemon.js --parallel

# 只签到指定平台
node src/daemon.js --platforms "juejin,bilibili"

# 查看帮助
node src/daemon.js --help
```

### Cron表达式

支持标准的cron表达式来设置执行时间：

| 表达式 | 说明 |
|--------|------|
| `0 8 * * *` | 每天早上8点 |
| `0 9 * * *` | 每天早上9点 |
| `0 12 * * *` | 每天中午12点 |
| `0 20 * * *` | 每天晚上8点 |
| `0 8 * * 1-5` | 工作日早上8点 |
| `0 */6 * * *` | 每6小时执行一次 |

### 进程管理

推荐使用 PM2 来管理守护进程：

```bash
# 安装 PM2
npm install -g pm2

# 启动守护进程
pm2 start src/daemon.js --name "auto-signin"

# 查看状态
pm2 list

# 停止进程
pm2 stop auto-signin

# 重启进程
pm2 restart auto-signin

# 开机自启
pm2 startup
pm2 save
```

### 配置文件

可以通过 `config/schedule.json` 自定义定时任务配置：

```json
{
  "defaultSchedule": {
    "cronExpression": "0 8 * * *",
    "description": "每天早上8点执行签到",
    "parallel": false,
    "platforms": []
  },
  "timezone": "Asia/Shanghai",
  "retryOnFailure": true,
  "maxRetries": 3
}
```

### 系统服务配置

#### Linux Systemd

创建服务文件 `/etc/systemd/system/auto-signin.service`：

```ini
[Unit]
Description=Auto SignIn Service
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/auto-signin
ExecStart=/usr/bin/node src/daemon.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable auto-signin
sudo systemctl start auto-signin
```

#### macOS LaunchAgent

创建 `~/Library/LaunchAgents/com.auto-signin.plist`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.auto-signin</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/path/to/auto-signin/src/daemon.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/path/to/auto-signin</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

加载服务：

```bash
launchctl load ~/Library/LaunchAgents/com.auto-signin.plist
```

> 📖 **详细说明**：更多定时任务功能的详细说明请查看 [定时任务文档](docs/SCHEDULE.md)

## 故障排除

### 常见问题

1. **登录失败**
   - 检查账号密码是否正确
   - 确认平台是否有新的安全验证
   - 查看日志文件获取详细错误信息

2. **找不到页面元素**
   - 平台页面可能已更新，需要更新选择器
   - 检查网络连接是否正常
   - 尝试设置 `HEADLESS=false` 查看页面状态

3. **签到失败**
   - 检查是否已经签到过
   - 确认签到页面是否正常加载
   - 查看平台是否有新的签到规则

### 调试模式

设置以下环境变量来启用调试模式：

```env
HEADLESS=false
LOG_LEVEL=debug
```

## 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

本项目采用 ISC 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 免责声明

本工具仅供学习和研究使用，请遵守各平台的使用条款和服务协议。使用本工具所产生的任何问题由使用者自行承担。 