import logger from './utils/logger.js';
import config from './utils/config.js';
import sessionManager from './utils/session.js';
import JuejinSignIn from './platforms/juejin.js';
import BilibiliSignIn from './platforms/bilibili.js';
import chalk from 'chalk';

/**
 * 平台签到类映射
 */
const PLATFORM_CLASSES = {
	juejin: JuejinSignIn,
	bilibili: BilibiliSignIn,
};

/**
 * 自动签到主程序
 */
class AutoSignIn {
	constructor() {
		this.platforms = config.getPlatforms();
		this.results = [];
	}

	/**
	 * 执行单个平台的签到
	 * @param {Object} platformConfig - 平台配置
	 * @returns {Object} 签到结果
	 */
	async signInPlatform(platformConfig) {
		const { name, displayName } = platformConfig;

		try {
			logger.progress(`开始处理平台: ${displayName}`);

			const PlatformClass = PLATFORM_CLASSES[name];
			if (!PlatformClass) {
				throw new Error(`未找到平台 ${name} 的实现类`);
			}

			const signInInstance = new PlatformClass();
			const success = await signInInstance.run();

			const result = {
				platform: name,
				displayName,
				success,
				timestamp: new Date().toISOString(),
				message: success ? '签到成功' : '签到失败',
			};

			if (success) {
				logger.success(`平台 ${displayName} 签到成功`);
			} else {
				logger.failure(`平台 ${displayName} 签到失败`);
			}

			return result;
		} catch (error) {
			const result = {
				platform: name,
				displayName,
				success: false,
				timestamp: new Date().toISOString(),
				message: `签到出错: ${error.message}`,
				error: error.message,
			};

			logger.failure(`平台 ${displayName} 签到出错: ${error.message}`);
			return result;
		}
	}

	/**
	 * 执行所有平台的签到
	 * @param {boolean} parallel - 是否并行执行
	 */
	async runAll(parallel = false) {
		logger.title('自动签到程序开始', 'green');
		logger.info(`共需要处理 ${chalk.cyan.bold(this.platforms.length)} 个平台`);

		// 清理过期会话
		sessionManager.cleanupExpiredSessions();

		const startTime = Date.now();

		try {
			if (parallel) {
				// 并行执行所有平台的签到
				logger.info(chalk.blue.bold('🚀 ') + '采用并行模式执行签到');
				const promises = this.platforms.map((platform) =>
					this.signInPlatform(platform)
				);
				this.results = await Promise.all(promises);
			} else {
				// 串行执行所有平台的签到
				logger.info(chalk.blue.bold('🔄 ') + '采用串行模式执行签到');
				for (const platform of this.platforms) {
					const result = await this.signInPlatform(platform);
					this.results.push(result);

					// 平台之间间隔一段时间，避免被检测
					if (this.platforms.indexOf(platform) < this.platforms.length - 1) {
						logger.info(chalk.yellow('⏳ ') + '等待 3 秒后处理下一个平台...');
						await new Promise((resolve) => setTimeout(resolve, 3000));
					}
				}
			}

			const endTime = Date.now();
			const duration = Math.round((endTime - startTime) / 1000);

			// 输出签到结果统计
			this.printResults(duration);
		} catch (error) {
			logger.failure(`自动签到程序执行失败: ${error.message}`);
		}

		logger.title('自动签到程序结束', 'green');
	}

	/**
	 * 打印签到结果统计
	 * @param {number} duration - 执行时长（秒）
	 */
	printResults(duration) {
		const successCount = this.results.filter((r) => r.success).length;
		const failCount = this.results.length - successCount;

		// 使用新的统计信息方法
		logger.stats({
			总计: `${this.results.length} 个平台`,
			成功: `${successCount} 个`,
			失败: `${failCount} 个`,
			耗时: `${duration} 秒`,
			成功率: `${Math.round((successCount / this.results.length) * 100)}%`,
		});

		// 使用表格显示详细结果
		console.log(chalk.cyan.bold('📋 详细结果'));
		console.log(chalk.gray('─'.repeat(60)));

		const tableData = this.results.map((result) => ({
			平台: result.displayName,
			状态: result.success
				? chalk.green.bold('✅ 成功')
				: chalk.red.bold('❌ 失败'),
			消息: result.message,
			时间: new Date(result.timestamp).toLocaleTimeString('zh-CN'),
		}));

		logger.table(tableData);

		// 如果有失败的平台，输出失败原因
		const failedResults = this.results.filter((r) => !r.success);
		if (failedResults.length > 0) {
			console.log(chalk.red.bold('❗ 失败详情'));
			console.log(chalk.gray('─'.repeat(60)));
			failedResults.forEach((result) => {
				console.log(
					chalk.red('▶ ') +
						chalk.white.bold(result.displayName) +
						': ' +
						chalk.red(result.error || result.message)
				);
			});
			console.log('');
		}
	}

	/**
	 * 执行特定平台的签到
	 * @param {string} platformName - 平台名称
	 */
	async runSingle(platformName) {
		const platformConfig = this.platforms.find((p) => p.name === platformName);

		if (!platformConfig) {
			logger.failure(`未找到平台 ${platformName} 的配置或该平台未启用`);
			return;
		}

		logger.title(`单独执行 ${platformConfig.displayName} 签到`, 'blue');

		const result = await this.signInPlatform(platformConfig);
		this.results = [result];

		this.printResults(0);
	}
}

/**
 * 主函数
 */
async function main() {
	try {
		const autoSignIn = new AutoSignIn();

		// 检查命令行参数
		const args = process.argv.slice(2);

		if (args.length > 0) {
			const command = args[0];

			if (command === '--help' || command === '-h') {
				console.log(
					chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════╗
║                   自动签到程序使用说明                    ║
╚══════════════════════════════════════════════════════════╝

${chalk.yellow.bold('命令格式：')}
  node src/index.js [选项] [平台名称]

${chalk.yellow.bold('选项：')}
  --help, -h         显示帮助信息
  --parallel, -p     并行执行所有平台签到
  --list, -l         列出所有可用平台
  --sessions, -s     显示所有保存的登录状态
  --clear-sessions   清除所有登录状态
  --clear-session    清除指定平台的登录状态

${chalk.yellow.bold('平台名称：')}
  juejin          只执行掘金签到
  bilibili        只执行B站签到

${chalk.yellow.bold('示例：')}
  ${chalk.gray('node src/index.js')}                    # 串行执行所有平台签到
  ${chalk.gray('node src/index.js --parallel')}         # 并行执行所有平台签到
  ${chalk.gray('node src/index.js juejin')}             # 只执行掘金签到
  ${chalk.gray('node src/index.js bilibili')}           # 只执行B站签到
  ${chalk.gray('node src/index.js --sessions')}         # 显示所有登录状态
  ${chalk.gray('node src/index.js --clear-sessions')}   # 清除所有登录状态
  ${chalk.gray('node src/index.js --clear-session juejin')}  # 清除掘金登录状态
        `)
				);
				return;
			}

			if (command === '--list' || command === '-l') {
				console.log(chalk.cyan.bold('\n📋 可用平台列表'));
				console.log(chalk.gray('─'.repeat(40)));
				config.getPlatforms().forEach((platform) => {
					console.log(
						`${chalk.green('▶')} ${chalk.white.bold(
							platform.name
						)} - ${chalk.gray(platform.displayName)}`
					);
				});
				console.log('');
				return;
			}

			if (command === '--parallel' || command === '-p') {
				await autoSignIn.runAll(true);
			} else if (command === '--sessions' || command === '-s') {
				// 显示所有登录状态
				const sessions = sessionManager.getAllSessions();
				if (sessions.length === 0) {
					console.log(chalk.yellow('⚠️  没有保存的登录状态'));
				} else {
					console.log(chalk.cyan.bold('\n🔐 保存的登录状态'));
					console.log(chalk.gray('─'.repeat(50)));
					sessions.forEach((session) => {
						const status = session.isValid
							? chalk.green.bold('✅ 有效')
							: chalk.red.bold('❌ 已过期');
						const daysOld =
							session.daysOld === 0
								? chalk.blue('今天')
								: chalk.gray(`${session.daysOld}天前`);
						console.log(
							`${chalk.white.bold(session.platform)}: ${status} ${chalk.gray(
								'('
							)}${daysOld}${chalk.gray(')')}`
						);
					});
					console.log('');
				}
			} else if (command === '--clear-sessions') {
				// 清除所有登录状态
				const sessions = sessionManager.getAllSessions();
				if (sessions.length === 0) {
					console.log(chalk.yellow('⚠️  没有保存的登录状态'));
				} else {
					sessions.forEach((session) => {
						sessionManager.clearSession(session.platform);
					});
					console.log(
						chalk.green.bold(`✅ 已清除 ${sessions.length} 个登录状态`)
					);
				}
			} else if (command === '--clear-session') {
				// 清除指定平台的登录状态
				const platformName = args[1];
				if (!platformName) {
					console.log(chalk.yellow('⚠️  请指定要清除登录状态的平台名称'));
					console.log(
						chalk.gray('例如: node src/index.js --clear-session juejin')
					);
				} else if (PLATFORM_CLASSES[platformName]) {
					sessionManager.clearSession(platformName);
					console.log(chalk.green.bold(`✅ 已清除 ${platformName} 的登录状态`));
				} else {
					console.log(chalk.red(`❌ 未知的平台: ${platformName}`));
				}
			} else if (PLATFORM_CLASSES[command]) {
				await autoSignIn.runSingle(command);
			} else {
				logger.failure(`未知的命令或平台: ${command}`);
				logger.info('使用 --help 查看帮助信息');
			}
		} else {
			// 默认串行执行所有平台
			await autoSignIn.runAll(false);
		}
	} catch (error) {
		logger.failure(`程序执行出错: ${error.message}`);
		process.exit(1);
	}
}

// 处理未捕获的异常
process.on('unhandledRejection', (reason, promise) => {
	logger.failure('未处理的Promise拒绝:', reason);
	process.exit(1);
});

process.on('uncaughtException', (error) => {
	logger.failure('未捕获的异常:', error);
	process.exit(1);
});

// 启动程序
main();
