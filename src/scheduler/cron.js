import cron from 'node-cron';
import logger from '../utils/logger.js';
import scheduleConfig from '../utils/scheduleConfig.js';
import chalk from 'chalk';

/**
 * 定时任务管理器
 * 用于管理自动签到的定时执行
 */
class CronScheduler {
	constructor() {
		this.tasks = new Map();
		this.defaultCronExpression =
			scheduleConfig.getDefaultSchedule().cronExpression;
		this.isRunning = false;
		this.timezone = scheduleConfig.getTimezone();
	}

	/**
	 * 启动定时任务
	 * @param {string} cronExpression - cron表达式，默认为每天早上8点
	 * @param {Object} options - 配置选项
	 * @param {boolean} options.parallel - 是否并行执行
	 * @param {string[]} options.platforms - 指定要执行的平台，不指定则执行所有启用的平台
	 */
	start(cronExpression = this.defaultCronExpression, options = {}) {
		if (this.isRunning) {
			logger.warning('定时任务已在运行中');
			return;
		}

		// 验证cron表达式
		if (!cron.validate(cronExpression)) {
			logger.failure(`无效的cron表达式: ${cronExpression}`);
			return;
		}

		const { parallel = false, platforms = [] } = options;

		logger.info(`启动定时任务，执行时间: ${chalk.cyan(cronExpression)}`);
		logger.info(
			`执行模式: ${parallel ? chalk.yellow('并行') : chalk.blue('串行')}`
		);

		if (platforms.length > 0) {
			logger.info(`指定平台: ${chalk.green(platforms.join(', '))}`);
		} else {
			logger.info(`执行范围: ${chalk.green('所有启用的平台')}`);
		}

		const task = cron.schedule(
			cronExpression,
			async () => {
				logger.title('⏰ 定时任务触发 - 开始自动签到', 'yellow');

				try {
					// 动态导入AutoSignIn类以避免循环导入
					const { AutoSignIn } = await import('../index.js');
					const autoSignIn = new AutoSignIn();

					if (platforms.length > 0) {
						// 执行指定平台的签到
						for (const platformName of platforms) {
							await autoSignIn.runSingle(platformName);
							// 平台之间间隔一段时间
							if (platforms.indexOf(platformName) < platforms.length - 1) {
								await new Promise((resolve) => setTimeout(resolve, 3000));
							}
						}
					} else {
						// 执行所有平台的签到
						await autoSignIn.runAll(parallel);
					}

					logger.success('⏰ 定时任务执行完成');
				} catch (error) {
					logger.failure(`⏰ 定时任务执行失败: ${error.message}`);
				}
			},
			{
				scheduled: false, // 不立即启动
				timezone: this.timezone, // 使用配置的时区
			}
		);

		this.tasks.set('main', task);
		task.start();
		this.isRunning = true;

		logger.success(`✅ 定时任务已启动`);
		logger.info(
			`下次执行时间: ${chalk.cyan(this.getNextExecutionTime(cronExpression))}`
		);
	}

	/**
	 * 停止定时任务
	 */
	stop() {
		if (!this.isRunning) {
			logger.warning('定时任务未在运行');
			return;
		}

		this.tasks.forEach((task, name) => {
			task.stop();
			logger.info(`已停止定时任务: ${name}`);
		});

		this.tasks.clear();
		this.isRunning = false;
		logger.success('✅ 所有定时任务已停止');
	}

	/**
	 * 获取定时任务状态
	 * @returns {Object} 任务状态信息
	 */
	getStatus() {
		return {
			isRunning: this.isRunning,
			taskCount: this.tasks.size,
			tasks: Array.from(this.tasks.keys()),
		};
	}

	/**
	 * 获取下次执行时间
	 * @param {string} cronExpression - cron表达式
	 * @returns {string} 下次执行时间的格式化字符串
	 */
	getNextExecutionTime(cronExpression) {
		try {
			const task = cron.schedule(cronExpression, () => {}, {
				scheduled: false,
			});
			// 由于node-cron没有直接获取下次执行时间的API，我们使用一个简化的方法
			const now = new Date();
			const tomorrow = new Date(now);
			tomorrow.setDate(tomorrow.getDate() + 1);
			tomorrow.setHours(8, 0, 0, 0); // 假设默认是8点执行

			return tomorrow.toLocaleString('zh-CN', {
				timeZone: this.timezone,
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit',
			});
		} catch (error) {
			return '无法计算';
		}
	}

	/**
	 * 立即执行一次签到任务（不影响定时任务）
	 * @param {Object} options - 执行选项
	 */
	async runNow(options = {}) {
		logger.info('🚀 手动触发签到任务');

		try {
			// 动态导入AutoSignIn类以避免循环导入
			const { AutoSignIn } = await import('../index.js');
			const autoSignIn = new AutoSignIn();
			const { parallel = false, platforms = [] } = options;

			if (platforms.length > 0) {
				for (const platformName of platforms) {
					await autoSignIn.runSingle(platformName);
				}
			} else {
				await autoSignIn.runAll(parallel);
			}

			logger.success('✅ 手动执行完成');
		} catch (error) {
			logger.failure(`❌ 手动执行失败: ${error.message}`);
		}
	}

	/**
	 * 添加多个定时任务
	 * @param {Array} schedules - 定时任务配置数组
	 */
	addMultipleSchedules(schedules) {
		schedules.forEach((schedule, index) => {
			const { cronExpression, options = {}, name } = schedule;
			const taskName = name || `task_${index}`;

			if (!cron.validate(cronExpression)) {
				logger.failure(`任务 ${taskName} 的cron表达式无效: ${cronExpression}`);
				return;
			}

			const task = cron.schedule(
				cronExpression,
				async () => {
					logger.info(`⏰ 定时任务 ${taskName} 开始执行`);
					await this.runNow(options);
				},
				{
					scheduled: false,
					timezone: this.timezone,
				}
			);

			this.tasks.set(taskName, task);
			task.start();
			logger.success(`✅ 定时任务 ${taskName} 已添加`);
		});
	}
}

export default CronScheduler;
