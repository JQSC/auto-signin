import winston from 'winston';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 彩色日志格式化器
 */
const colorizedFormat = winston.format.printf(
	({ level, message, timestamp, service }) => {
		// 时间戳样式 - 灰色
		const coloredTimestamp = chalk.gray(`[${timestamp}]`);

		// 服务名样式 - 蓝色
		const coloredService = chalk.blue(`[${service}]`);

		// 根据日志级别设置颜色
		let coloredLevel;
		let coloredMessage = message;

		switch (level) {
			case 'error':
				coloredLevel = chalk.red.bold('ERROR');
				// 错误消息用红色高亮
				coloredMessage = chalk.red(message);
				break;
			case 'warn':
				coloredLevel = chalk.yellow.bold('WARN ');
				// 警告消息用黄色高亮
				coloredMessage = chalk.yellow(message);
				break;
			case 'info':
				coloredLevel = chalk.green.bold('INFO ');
				// 对信息消息进行智能着色
				coloredMessage = formatInfoMessage(message);
				break;
			case 'debug':
				coloredLevel = chalk.magenta.bold('DEBUG');
				coloredMessage = chalk.magenta(message);
				break;
			default:
				coloredLevel = level.toUpperCase();
		}

		return `${coloredTimestamp} ${coloredService} ${coloredLevel} ${coloredMessage}`;
	}
);

/**
 * 智能格式化信息消息，突出重要数据
 * @param {string} message - 原始消息
 * @returns {string} 格式化后的消息
 */
function formatInfoMessage(message) {
	// 平台名称高亮 (绿色加粗)
	message = message.replace(/(掘金|B站|bilibili|juejin)/gi, (match) =>
		chalk.green.bold(match)
	);

	// 签到相关状态高亮
	message = message.replace(/签到成功/g, chalk.green.bold('✅ 签到成功'));
	message = message.replace(/签到失败/g, chalk.red.bold('❌ 签到失败'));
	message = message.replace(/登录成功/g, chalk.cyan.bold('🔐 登录成功'));
	message = message.replace(/登录失败/g, chalk.red.bold('🚫 登录失败'));

	// 数字高亮 (青色)
	message = message.replace(
		/(\d+)\s*(个|秒|分钟|小时|天|次)/g,
		(match, num, unit) => chalk.cyan.bold(num) + chalk.white(unit)
	);

	// 成功/失败计数高亮
	message = message.replace(
		/成功:\s*(\d+)/g,
		(match, num) => chalk.green('成功: ') + chalk.green.bold(num)
	);
	message = message.replace(
		/失败:\s*(\d+)/g,
		(match, num) => chalk.red('失败: ') + chalk.red.bold(num)
	);
	message = message.replace(
		/总计:\s*(\d+)/g,
		(match, num) => chalk.blue('总计: ') + chalk.blue.bold(num)
	);
	message = message.replace(
		/耗时:\s*(\d+)/g,
		(match, num) => chalk.magenta('耗时: ') + chalk.magenta.bold(num)
	);

	// 分隔线高亮
	message = message.replace(/=== (.+?) ===/g, (match, content) =>
		chalk.cyan.bold(`=== ${content} ===`)
	);

	// 状态标识符高亮
	message = message.replace(/✅/g, chalk.green.bold('✅'));
	message = message.replace(/❌/g, chalk.red.bold('❌'));
	message = message.replace(/🔐/g, chalk.cyan.bold('🔐'));
	message = message.replace(/🚫/g, chalk.red.bold('🚫'));

	// URL高亮 (下划线蓝色)
	message = message.replace(/(https?:\/\/[^\s]+)/g, (match) =>
		chalk.blue.underline(match)
	);

	// 文件路径高亮 (灰色)
	message = message.replace(/([\/\\][\w\/\\.-]+\.(js|json|log))/g, (match) =>
		chalk.gray(match)
	);

	return message;
}

/**
 * 日志记录器配置
 */
const logger = winston.createLogger({
	level: process.env.LOG_LEVEL || 'info',
	format: winston.format.combine(
		winston.format.timestamp({
			format: 'YYYY-MM-DD HH:mm:ss',
		}),
		winston.format.errors({ stack: true }),
		winston.format.json()
	),
	defaultMeta: { service: 'auto-signin' },
	transports: [
		// 错误日志文件
		new winston.transports.File({
			filename: path.join(__dirname, '../../logs/error.log'),
			level: 'error',
		}),
		// 所有日志文件
		new winston.transports.File({
			filename: path.join(__dirname, '../../logs/combined.log'),
		}),
	],
});

// 如果不是生产环境，同时输出到控制台
if (process.env.NODE_ENV !== 'production') {
	logger.add(
		new winston.transports.Console({
			format: winston.format.combine(
				winston.format.timestamp({
					format: 'HH:mm:ss',
				}),
				colorizedFormat
			),
		})
	);
}

/**
 * 增强的日志方法，用于特定场景的彩色输出
 */
const enhancedLogger = {
	...logger,

	// 确保基础方法可用
	error: logger.error.bind(logger),
	warn: logger.warn.bind(logger),
	info: logger.info.bind(logger),
	debug: logger.debug.bind(logger),

	/**
	 * 输出带有边框的标题
	 * @param {string} title - 标题内容
	 * @param {string} color - 颜色 (可选)
	 */
	title(title, color = 'cyan') {
		const colorFunc = chalk[color] || chalk.cyan;
		const border = '='.repeat(title.length + 4);
		console.log(colorFunc.bold(border));
		console.log(colorFunc.bold(`  ${title}  `));
		console.log(colorFunc.bold(border));
	},

	/**
	 * 输出成功信息
	 * @param {string} message - 消息内容
	 */
	success(message) {
		this.info(chalk.green.bold('✅ ') + message);
	},

	/**
	 * 输出失败信息
	 * @param {string} message - 消息内容
	 */
	failure(message) {
		this.error(chalk.red.bold('❌ ') + message);
	},

	/**
	 * 输出警告信息
	 * @param {string} message - 消息内容
	 */
	warning(message) {
		this.warn(chalk.yellow.bold('⚠️  ') + message);
	},

	/**
	 * 输出进度信息
	 * @param {string} message - 消息内容
	 */
	progress(message) {
		this.info(chalk.blue.bold('🔄 ') + message);
	},

	/**
	 * 输出统计信息
	 * @param {Object} stats - 统计数据
	 */
	stats(stats) {
		console.log('\n' + chalk.cyan.bold('📊 统计信息'));
		console.log(chalk.gray('─'.repeat(50)));

		Object.entries(stats).forEach(([key, value]) => {
			let coloredValue = value;
			if (typeof value === 'number') {
				coloredValue = chalk.cyan.bold(value);
			} else if (typeof value === 'string') {
				if (value.includes('成功') || value.includes('✅')) {
					coloredValue = chalk.green.bold(value);
				} else if (value.includes('失败') || value.includes('❌')) {
					coloredValue = chalk.red.bold(value);
				}
			}
			console.log(`${chalk.white(key)}: ${coloredValue}`);
		});

		console.log(chalk.gray('─'.repeat(50)) + '\n');
	},

	/**
	 * 输出表格数据
	 * @param {Array} data - 表格数据
	 * @param {Array} headers - 表头
	 */
	table(data, headers = []) {
		if (data.length === 0) return;

		// 如果没有提供表头，使用第一行数据的键作为表头
		if (headers.length === 0 && typeof data[0] === 'object') {
			headers = Object.keys(data[0]);
		}

		// 输出表头
		if (headers.length > 0) {
			const headerRow = headers.map((h) => chalk.cyan.bold(h)).join(' | ');
			console.log(headerRow);
			console.log(
				chalk.gray(
					'─'.repeat(headerRow.replace(/\u001b\[[0-9;]*m/g, '').length)
				)
			);
		}

		// 输出数据行
		data.forEach((row) => {
			if (typeof row === 'object') {
				const values = headers.map((h) => {
					let value = row[h] || '';
					// 根据内容着色
					if (typeof value === 'string') {
						if (value.includes('成功') || value === '✅') {
							value = chalk.green(value);
						} else if (value.includes('失败') || value === '❌') {
							value = chalk.red(value);
						}
					}
					return value;
				});
				console.log(values.join(' | '));
			} else {
				console.log(row);
			}
		});
		console.log('');
	},
};

export default enhancedLogger;
