import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 会话管理类
 * 使用 Playwright 的 storageState 功能保存和恢复登录状态
 */
class SessionManager {
	constructor() {
		this.sessionDir = path.join(__dirname, '../../sessions');
		this.ensureSessionDir();
	}

	/**
	 * 确保会话目录存在
	 */
	ensureSessionDir() {
		if (!fs.existsSync(this.sessionDir)) {
			fs.mkdirSync(this.sessionDir, { recursive: true });
		}
	}

	/**
	 * 获取平台会话文件路径
	 * @param {string} platformName - 平台名称
	 * @returns {string} 会话文件路径
	 */
	getSessionPath(platformName) {
		return path.join(this.sessionDir, `${platformName}_state.json`);
	}

	/**
	 * 保存浏览器存储状态
	 * @param {string} platformName - 平台名称
	 * @param {Object} context - Playwright 浏览器上下文
	 */
	async saveStorageState(platformName, context) {
		try {
			const sessionPath = this.getSessionPath(platformName);

			// 使用 Playwright 的 storageState 方法保存状态
			await context.storageState({ path: sessionPath });

			logger.info(`${platformName} - 登录状态已保存`);
		} catch (error) {
			logger.error(`${platformName} - 保存登录状态失败: ${error.message}`);
		}
	}

	/**
	 * 检查会话文件是否存在且有效
	 * @param {string} platformName - 平台名称
	 * @returns {boolean} 会话是否有效
	 */
	hasValidSession(platformName) {
		const sessionPath = this.getSessionPath(platformName);

		if (!fs.existsSync(sessionPath)) {
			return false;
		}

		try {
			// 检查文件是否可读且包含有效数据
			const data = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));

			// 检查文件修改时间，超过7天则认为过期
			const stats = fs.statSync(sessionPath);
			const daysSinceModified =
				(Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

			if (daysSinceModified > 7) {
				logger.info(
					`${platformName} - 会话文件已过期（${Math.round(
						daysSinceModified
					)}天前），删除文件`
				);
				this.clearSession(platformName);
				return false;
			}

			// 检查是否包含必要的字段
			return data.cookies && Array.isArray(data.cookies);
		} catch (error) {
			logger.warn(`${platformName} - 会话文件损坏: ${error.message}`);
			this.clearSession(platformName);
			return false;
		}
	}

	/**
	 * 获取存储状态文件路径（用于 Playwright 加载）
	 * @param {string} platformName - 平台名称
	 * @returns {string|null} 存储状态文件路径，如果不存在则返回 null
	 */
	getStorageStatePath(platformName) {
		if (this.hasValidSession(platformName)) {
			return this.getSessionPath(platformName);
		}
		return null;
	}

	/**
	 * 清除会话状态
	 * @param {string} platformName - 平台名称
	 */
	clearSession(platformName) {
		try {
			const sessionPath = this.getSessionPath(platformName);
			if (fs.existsSync(sessionPath)) {
				fs.unlinkSync(sessionPath);
				logger.info(`${platformName} - 登录状态已清除`);
			}
		} catch (error) {
			logger.error(`${platformName} - 清除登录状态失败: ${error.message}`);
		}
	}

	/**
	 * 清理所有过期会话
	 */
	cleanupExpiredSessions() {
		try {
			const files = fs.readdirSync(this.sessionDir);
			let cleanedCount = 0;

			for (const file of files) {
				if (file.endsWith('_state.json')) {
					const filePath = path.join(this.sessionDir, file);
					const stats = fs.statSync(filePath);
					const daysSinceModified =
						(Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

					if (daysSinceModified > 7) {
						fs.unlinkSync(filePath);
						cleanedCount++;
					}
				}
			}

			if (cleanedCount > 0) {
				logger.info(`清理了 ${cleanedCount} 个过期会话文件`);
			}
		} catch (error) {
			logger.error(`清理过期会话失败: ${error.message}`);
		}
	}

	/**
	 * 获取所有会话状态信息
	 * @returns {Array} 会话状态列表
	 */
	getAllSessions() {
		try {
			const files = fs.readdirSync(this.sessionDir);
			const sessions = [];

			for (const file of files) {
				if (file.endsWith('_state.json')) {
					const platformName = file.replace('_state.json', '');
					const filePath = path.join(this.sessionDir, file);

					try {
						const stats = fs.statSync(filePath);
						const daysSinceModified =
							(Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

						sessions.push({
							platform: platformName,
							isValid: daysSinceModified <= 7,
							lastModified: stats.mtime,
							daysOld: Math.round(daysSinceModified),
						});
					} catch (error) {
						logger.warn(`读取会话文件 ${file} 失败: ${error.message}`);
					}
				}
			}

			return sessions;
		} catch (error) {
			logger.error(`获取会话状态列表失败: ${error.message}`);
			return [];
		}
	}

	/**
	 * 批量清理指定平台的会话
	 * @param {Array} platformNames - 平台名称数组
	 */
	clearMultipleSessions(platformNames) {
		platformNames.forEach((platformName) => {
			this.clearSession(platformName);
		});
	}
}

export default new SessionManager();
