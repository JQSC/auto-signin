import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 加载环境变量
dotenv.config();

/**
 * 配置管理类
 */
class Config {
	constructor() {
		this.platformsConfig = null;
		this.loadPlatformsConfig();
	}

	/**
	 * 加载平台配置
	 */
	loadPlatformsConfig() {
		try {
			const configPath = path.join(__dirname, '../../config/platforms.json');
			const configData = fs.readFileSync(configPath, 'utf8');
			this.platformsConfig = JSON.parse(configData);
		} catch (error) {
			throw new Error(`加载平台配置失败: ${error.message}`);
		}
	}

	/**
	 * 获取所有平台配置
	 * @returns {Array} 平台配置数组
	 */
	getPlatforms() {
		return this.platformsConfig.platforms.filter(
			(platform) => platform.enabled
		);
	}

	/**
	 * 获取特定平台配置
	 * @param {string} platformName - 平台名称
	 * @returns {Object} 平台配置对象
	 */
	getPlatformConfig(platformName) {
		return this.platformsConfig.platforms.find(
			(platform) => platform.name === platformName
		);
	}

	/**
	 * 获取平台账号信息
	 * @param {string} platformName - 平台名称
	 * @returns {Object} 账号信息
	 */
	getPlatformCredentials(platformName) {
		const usernameKey = `${platformName.toUpperCase()}_USERNAME`;
		const passwordKey = `${platformName.toUpperCase()}_PASSWORD`;

		return {
			username: process.env[usernameKey],
			password: process.env[passwordKey],
		};
	}

	/**
	 * 获取浏览器配置
	 * @returns {Object} 浏览器配置
	 */
	getBrowserConfig() {
		return {
			headless: process.env.HEADLESS === 'true',
			timeout: parseInt(process.env.BROWSER_TIMEOUT) || 30000,
		};
	}
}

export default new Config();
