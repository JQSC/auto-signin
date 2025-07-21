#!/usr/bin/env node

import CronScheduler from './scheduler/cron.js';
import logger from './utils/logger.js';
import chalk from 'chalk';

/**
 * 定时任务守护进程
 * 专门用于运行定时签到任务
 */
class SignInDaemon {
	constructor() {
		this.scheduler = new CronScheduler();
		this.isRunning = false;
	}

	/**
	 * 启动守护进程
	 * @param {Object} options - 配置选项
	 */
	start(options = {}) {
		const {
			cronExpression = '0 8 * * *', // 默认每天8点
			parallel = false,
			platforms = [],
		} = options;

		logger.title('🚀 自动签到守护进程启动', 'green');
		logger.info(`进程ID: ${chalk.cyan(process.pid)}`);
		logger.info(`启动时间: ${chalk.cyan(new Date().toLocaleString('zh-CN'))}`);

		// 启动定时任务
		this.scheduler.start(cronExpression, { parallel, platforms });
		this.isRunning = true;

		// 设置信号处理
		this.setupSignalHandlers();

		// 保持进程运行
		this.keepAlive();
	}

	/**
	 * 设置信号处理器
	 */
	setupSignalHandlers() {
		// 优雅关闭
		process.on('SIGINT', () => {
			logger.info('\n收到 SIGINT 信号，正在关闭守护进程...');
			this.stop();
		});

		process.on('SIGTERM', () => {
			logger.info('\n收到 SIGTERM 信号，正在关闭守护进程...');
			this.stop();
		});

		// 处理未捕获的异常
		process.on('unhandledRejection', (reason, promise) => {
			logger.failure('未处理的Promise拒绝:', reason);
		});

		process.on('uncaughtException', (error) => {
			logger.failure('未捕获的异常:', error);
			this.stop();
			process.exit(1);
		});
	}

	/**
	 * 保持进程运行
	 */
	keepAlive() {
		logger.info(chalk.blue('守护进程正在运行中...'));
		logger.info(chalk.gray('使用 Ctrl+C 或发送 SIGTERM 信号来停止进程'));

		// 每分钟输出一次状态信息
		const statusInterval = setInterval(() => {
			if (!this.isRunning) {
				clearInterval(statusInterval);
				return;
			}

			const status = this.scheduler.getStatus();
			logger.debug(
				`守护进程状态: ${status.isRunning ? '运行中' : '已停止'} | 任务数: ${
					status.taskCount
				}`
			);
		}, 60000); // 每分钟检查一次

		// 防止进程退出
		const keepAliveInterval = setInterval(() => {
			if (!this.isRunning) {
				clearInterval(keepAliveInterval);
			}
		}, 1000);
	}

	/**
	 * 停止守护进程
	 */
	stop() {
		if (!this.isRunning) {
			return;
		}

		logger.info('正在停止定时任务...');
		this.scheduler.stop();
		this.isRunning = false;

		logger.success('✅ 守护进程已安全关闭');
		process.exit(0);
	}
}

/**
 * 解析命令行参数
 */
function parseArgs() {
	const args = process.argv.slice(2);
	const options = {
		cronExpression: '0 8 * * *',
		parallel: false,
		platforms: [],
	};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		switch (arg) {
			case '--help':
			case '-h':
				showHelp();
				process.exit(0);
				break;
			case '--time':
			case '-t':
				if (i + 1 < args.length) {
					options.cronExpression = args[i + 1];
					i++; // 跳过下一个参数
				}
				break;
			case '--parallel':
			case '-p':
				options.parallel = true;
				break;
			case '--platforms':
				if (i + 1 < args.length) {
					options.platforms = args[i + 1].split(',').map((p) => p.trim());
					i++; // 跳过下一个参数
				}
				break;
		}
	}

	return options;
}

/**
 * 显示帮助信息
 */
function showHelp() {
	console.log(
		chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════╗
║                   自动签到守护进程                      ║
╚══════════════════════════════════════════════════════════╝

${chalk.yellow.bold('用法：')}
  node src/daemon.js [选项]

${chalk.yellow.bold('选项：')}
  --help, -h              显示帮助信息
  --time, -t <cron>       指定执行时间（cron表达式）
  --parallel, -p          并行执行所有平台签到
  --platforms <list>      指定要执行的平台（逗号分隔）

${chalk.yellow.bold('示例：')}
  ${chalk.gray('node src/daemon.js')}                        # 每天8点执行签到
  ${chalk.gray('node src/daemon.js --time "0 9 * * *"')}     # 每天9点执行签到
  ${chalk.gray('node src/daemon.js --parallel')}             # 并行模式执行签到
  ${chalk.gray(
		'node src/daemon.js --platforms "juejin,bilibili"'
	)} # 只签到指定平台

${chalk.yellow.bold('常用Cron表达式：')}
  ${chalk.gray('0 8 * * *')}   - 每天早上8点
  ${chalk.gray('0 9 * * *')}   - 每天早上9点
  ${chalk.gray('0 12 * * *')}  - 每天中午12点
  ${chalk.gray('0 20 * * *')}  - 每天晚上8点
  ${chalk.gray('0 8 * * 1-5')} - 工作日早上8点
  ${chalk.gray('0 */6 * * *')} - 每6小时执行一次

${chalk.yellow.bold('控制守护进程：')}
  启动: node src/daemon.js
  停止: Ctrl+C 或 kill <PID>
	`)
	);
}

/**
 * 主函数
 */
function main() {
	try {
		const options = parseArgs();
		const daemon = new SignInDaemon();
		daemon.start(options);
	} catch (error) {
		logger.failure(`守护进程启动失败: ${error.message}`);
		process.exit(1);
	}
}

// 启动守护进程
main();
