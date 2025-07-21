import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 定时任务配置管理器
 */
class ScheduleConfig {
	constructor() {
		this.configPath = join(__dirname, '../../config/schedule.json');
		this.config = null;
		this.loadConfig();
	}

	/**
	 * 加载配置文件
	 */
	loadConfig() {
		try {
			const configData = readFileSync(this.configPath, 'utf8');
			this.config = JSON.parse(configData);
		} catch (error) {
			console.warn(`无法读取定时任务配置文件: ${error.message}`);
			// 使用默认配置
			this.config = this.getDefaultConfig();
		}
	}

	/**
	 * 获取默认配置
	 * @returns {Object} 默认配置对象
	 */
	getDefaultConfig() {
		return {
			defaultSchedule: {
				cronExpression: '0 8 * * *',
				description: '每天早上8点执行签到',
				parallel: false,
				platforms: [],
			},
			presetSchedules: [
				{
					name: 'morning',
					cronExpression: '0 8 * * *',
					description: '每天早上8点',
					parallel: false,
				},
				{
					name: 'morning-9am',
					cronExpression: '0 9 * * *',
					description: '每天早上9点',
					parallel: false,
				},
			],
			timezone: 'Asia/Shanghai',
			logLevel: 'info',
			retryOnFailure: true,
			maxRetries: 3,
			retryDelay: 300000,
		};
	}

	/**
	 * 获取默认调度配置
	 * @returns {Object} 默认调度配置
	 */
	getDefaultSchedule() {
		return this.config.defaultSchedule;
	}

	/**
	 * 获取所有预设调度配置
	 * @returns {Array} 预设调度配置数组
	 */
	getPresetSchedules() {
		return this.config.presetSchedules || [];
	}

	/**
	 * 根据名称获取预设调度配置
	 * @param {string} name - 预设名称
	 * @returns {Object|null} 预设配置或null
	 */
	getPresetSchedule(name) {
		const presets = this.getPresetSchedules();
		return presets.find((preset) => preset.name === name) || null;
	}

	/**
	 * 获取时区配置
	 * @returns {string} 时区
	 */
	getTimezone() {
		return this.config.timezone || 'Asia/Shanghai';
	}

	/**
	 * 获取日志级别
	 * @returns {string} 日志级别
	 */
	getLogLevel() {
		return this.config.logLevel || 'info';
	}

	/**
	 * 是否启用失败重试
	 * @returns {boolean} 是否重试
	 */
	shouldRetryOnFailure() {
		return this.config.retryOnFailure !== false;
	}

	/**
	 * 获取最大重试次数
	 * @returns {number} 最大重试次数
	 */
	getMaxRetries() {
		return this.config.maxRetries || 3;
	}

	/**
	 * 获取重试延迟时间（毫秒）
	 * @returns {number} 重试延迟时间
	 */
	getRetryDelay() {
		return this.config.retryDelay || 300000; // 默认5分钟
	}

	/**
	 * 列出所有可用的预设
	 * @returns {Array} 预设信息数组
	 */
	listPresets() {
		return this.getPresetSchedules().map((preset) => ({
			name: preset.name,
			description: preset.description,
			cronExpression: preset.cronExpression,
			parallel: preset.parallel || false,
		}));
	}

	/**
	 * 验证cron表达式格式
	 * @param {string} cronExpression - cron表达式
	 * @returns {boolean} 是否有效
	 */
	validateCronExpression(cronExpression) {
		// 简单的cron表达式验证（5个字段）
		const cronRegex =
			/^(\*|([0-5]?\d)) (\*|([01]?\d|2[0-3])) (\*|([01]?\d|[12]\d|3[01])) (\*|([01]?\d)) (\*|([0-6]))$/;
		return cronRegex.test(cronExpression);
	}

	/**
	 * 解析cron表达式为可读描述
	 * @param {string} cronExpression - cron表达式
	 * @returns {string} 可读描述
	 */
	describeCronExpression(cronExpression) {
		const parts = cronExpression.split(' ');
		if (parts.length !== 5) {
			return '无效的cron表达式';
		}

		const [minute, hour, day, month, weekday] = parts;
		let description = '';

		// 处理时间
		if (hour === '*') {
			if (minute === '*') {
				description += '每分钟';
			} else {
				description += `每小时的第${minute}分钟`;
			}
		} else {
			const hourNum = parseInt(hour);
			const minuteNum = parseInt(minute);
			description += `每天${hourNum}:${minuteNum.toString().padStart(2, '0')}`;
		}

		// 处理星期
		if (weekday !== '*') {
			const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
			if (weekday.includes('-')) {
				const [start, end] = weekday.split('-').map((d) => parseInt(d));
				description += ` (${weekdays[start]}-${weekdays[end]})`;
			} else {
				const days = weekday
					.split(',')
					.map((d) => weekdays[parseInt(d)])
					.join('、');
				description += ` (${days})`;
			}
		}

		return description;
	}
}

export default new ScheduleConfig();
