# 定时任务功能说明

## 概述

自动签到程序支持定时任务功能，可以在指定时间自动执行签到任务，无需手动干预。

## 快速开始

### 1. 启动默认定时任务（每天早上8点）

```bash
npm run schedule
```

或者

```bash
node src/daemon.js
```

### 2. 指定执行时间

```bash
# 每天早上9点执行
npm run schedule:9am

# 自定义时间（每天晚上8点）
node src/daemon.js --time "0 20 * * *"
```

### 3. 并行执行模式

```bash
npm run schedule:parallel
```

## 命令行选项

### 主程序选项（src/index.js）

| 选项 | 说明 |
|------|------|
| `--schedule` | 启动定时任务（默认每天8点） |
| `--schedule-time <cron>` | 指定定时任务执行时间 |
| `--stop-schedule` | 停止定时任务 |
| `--schedule-status` | 查看定时任务状态 |
| `--run-now` | 立即执行一次签到任务 |

### 守护进程选项（src/daemon.js）

| 选项 | 说明 |
|------|------|
| `--help, -h` | 显示帮助信息 |
| `--time, -t <cron>` | 指定执行时间（cron表达式） |
| `--parallel, -p` | 并行执行所有平台签到 |
| `--platforms <list>` | 指定要执行的平台（逗号分隔） |

## Cron表达式说明

Cron表达式格式：`分钟 小时 日期 月份 星期`

### 常用表达式示例

| 表达式 | 说明 |
|--------|------|
| `0 8 * * *` | 每天早上8点 |
| `0 9 * * *` | 每天早上9点 |
| `0 12 * * *` | 每天中午12点 |
| `0 20 * * *` | 每天晚上8点 |
| `0 8 * * 1-5` | 工作日早上8点 |
| `0 */6 * * *` | 每6小时执行一次 |
| `30 9 * * 1,3,5` | 周一、三、五上午9:30 |

### 字段说明

- **分钟**: 0-59
- **小时**: 0-23
- **日期**: 1-31
- **月份**: 1-12
- **星期**: 0-6 (0=周日)

## 使用示例

### 基本使用

```bash
# 启动定时任务（默认每天8点）
node src/daemon.js

# 自定义时间
node src/daemon.js --time "0 9 * * *"

# 只签到指定平台
node src/daemon.js --platforms "juejin,bilibili"

# 并行模式执行
node src/daemon.js --parallel
```

### 高级使用

```bash
# 工作日早上8点执行
node src/daemon.js --time "0 8 * * 1-5"

# 每6小时执行一次，并行模式
node src/daemon.js --time "0 */6 * * *" --parallel

# 只在周一、三、五上午9:30执行掘金签到
node src/daemon.js --time "30 9 * * 1,3,5" --platforms "juejin"
```

## 配置文件

可以通过 `config/schedule.json` 配置文件自定义定时任务的默认设置：

```json
{
  "defaultSchedule": {
    "cronExpression": "0 8 * * *",
    "description": "每天早上8点执行签到",
    "parallel": false,
    "platforms": []
  },
  "timezone": "Asia/Shanghai",
  "logLevel": "info",
  "retryOnFailure": true,
  "maxRetries": 3,
  "retryDelay": 300000
}
```

### 配置项说明

- `defaultSchedule`: 默认调度配置
- `timezone`: 时区设置
- `logLevel`: 日志级别
- `retryOnFailure`: 是否在失败时重试
- `maxRetries`: 最大重试次数
- `retryDelay`: 重试延迟时间（毫秒）

## 进程管理

### 启动守护进程

```bash
# 前台运行
node src/daemon.js

# 后台运行（使用nohup）
nohup node src/daemon.js > logs/daemon.log 2>&1 &

# 使用PM2管理（推荐）
npm install -g pm2
pm2 start src/daemon.js --name "auto-signin"
pm2 list
pm2 stop auto-signin
pm2 restart auto-signin
```

### 停止守护进程

```bash
# 前台运行时按 Ctrl+C

# 后台运行时找到进程ID并终止
ps aux | grep daemon.js
kill <PID>

# 使用PM2
pm2 stop auto-signin
```

## 日志管理

定时任务的执行日志会保存在 `logs/` 目录下：

- 主日志：`logs/app.log`
- 错误日志：`logs/error.log`

可以通过以下命令查看日志：

```bash
# 查看最新日志
tail -f logs/app.log

# 查看错误日志
tail -f logs/error.log
```

## 故障排除

### 常见问题

1. **定时任务未执行**
   - 检查cron表达式是否正确
   - 确认进程是否正在运行
   - 查看错误日志

2. **签到失败**
   - 检查网络连接
   - 确认登录状态是否有效
   - 查看详细错误信息

3. **进程意外退出**
   - 查看错误日志
   - 检查系统资源
   - 使用PM2等进程管理工具

### 调试模式

```bash
# 立即执行一次任务进行测试
node src/index.js --run-now

# 查看定时任务状态
node src/index.js --schedule-status

# 查看所有登录状态
node src/index.js --sessions
```

## 最佳实践

1. **使用PM2管理进程**：提供进程监控、自动重启等功能
2. **定期检查日志**：及时发现和解决问题
3. **备份登录状态**：避免频繁重新登录
4. **合理设置执行时间**：避开网站维护时间
5. **监控执行结果**：设置邮件或消息通知

## 系统服务配置

### Linux Systemd

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
sudo systemctl status auto-signin
```

### macOS LaunchAgent

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
launchctl start com.auto-signin
``` 