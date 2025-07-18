import { chromium } from 'playwright';
import logger from '../utils/logger.js';
import config from '../utils/config.js';
import sessionManager from '../utils/session.js';

/**
 * 基础签到抽象类
 * 所有平台的签到实现都应该继承此类
 */
class BaseSignIn {
	/**
	 * 构造函数
	 * @param {string} platformName - 平台名称
	 */
	constructor(platformName) {
		this.platformName = platformName;
		this.platformConfig = config.getPlatformConfig(platformName);
		this.credentials = config.getPlatformCredentials(platformName);
		this.browserConfig = config.getBrowserConfig();
		this.browser = null;
		this.context = null;
		this.page = null;

		if (!this.platformConfig) {
			throw new Error(`未找到平台 ${platformName} 的配置`);
		}

		if (!this.credentials.username || !this.credentials.password) {
			throw new Error(`平台 ${platformName} 的账号信息不完整`);
		}
	}

	/**
	 * 初始化浏览器
	 */
	async initBrowser() {
		try {
			// 启动浏览器
			this.browser = await chromium.launch({
				headless: this.browserConfig.headless,
				timeout: this.browserConfig.timeout,
			});

			// 检查是否有保存的登录状态
			const storageStatePath = sessionManager.getStorageStatePath(
				this.platformName
			);

			if (storageStatePath) {
				// 使用保存的存储状态创建浏览器上下文
				this.context = await this.browser.newContext({
					storageState: storageStatePath,
				});
				logger.info(
					`${this.platformConfig.displayName} - 使用保存的登录状态初始化浏览器`
				);
			} else {
				// 创建新的浏览器上下文
				this.context = await this.browser.newContext();
				logger.info(`${this.platformConfig.displayName} - 创建新的浏览器会话`);
			}

			// 创建页面
			this.page = await this.context.newPage();

			// 设置用户代理
			await this.page.setUserAgent(
				'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
			);

			// 设置视口大小
			await this.page.setViewportSize({ width: 1920, height: 1080 });

			logger.info(`${this.platformConfig.displayName} - 浏览器初始化成功`);
		} catch (error) {
			logger.error(
				`${this.platformConfig.displayName} - 浏览器初始化失败: ${error.message}`
			);
			throw error;
		}
	}

	/**
	 * 关闭浏览器
	 */
	async closeBrowser() {
		try {
			if (this.page) {
				await this.page.close();
			}
			if (this.context) {
				await this.context.close();
			}
			if (this.browser) {
				await this.browser.close();
			}
			logger.info(`${this.platformConfig.displayName} - 浏览器已关闭`);
		} catch (error) {
			logger.error(
				`${this.platformConfig.displayName} - 关闭浏览器失败: ${error.message}`
			);
		}
	}

	/**
	 * 等待元素出现
	 * @param {string} selector - 选择器
	 * @param {number} timeout - 超时时间
	 */
	async waitForElement(selector, timeout = 10000) {
		try {
			await this.page.waitForSelector(selector, { timeout });
			return true;
		} catch (error) {
			logger.warn(
				`${this.platformConfig.displayName} - 等待元素 ${selector} 超时`
			);
			return false;
		}
	}

	/**
	 * 安全点击元素
	 * @param {string} selector - 选择器
	 * @param {number} timeout - 超时时间
	 */
	async safeClick(selector, timeout = 10000) {
		try {
			await this.page.waitForSelector(selector, { timeout });
			await this.page.click(selector);
			return true;
		} catch (error) {
			logger.warn(
				`${this.platformConfig.displayName} - 点击元素 ${selector} 失败: ${error.message}`
			);
			return false;
		}
	}

	/**
	 * 安全输入文本
	 * @param {string} selector - 选择器
	 * @param {string} text - 文本内容
	 * @param {number} timeout - 超时时间
	 */
	async safeInput(selector, text, timeout = 10000) {
		try {
			await this.page.waitForSelector(selector, { timeout });
			await this.page.fill(selector, text);
			return true;
		} catch (error) {
			logger.warn(
				`${this.platformConfig.displayName} - 输入文本到 ${selector} 失败: ${error.message}`
			);
			return false;
		}
	}

	/**
	 * 检查是否已登录
	 * @returns {boolean} 是否已登录
	 */
	async isLoggedIn() {
		// 子类需要实现此方法
		throw new Error('子类必须实现 isLoggedIn 方法');
	}

	/**
	 * 执行登录
	 * @returns {boolean} 登录是否成功
	 */
	async login() {
		// 子类需要实现此方法
		throw new Error('子类必须实现 login 方法');
	}

	/**
	 * 执行签到
	 * @returns {boolean} 签到是否成功
	 */
	async signIn() {
		// 子类需要实现此方法
		throw new Error('子类必须实现 signIn 方法');
	}

	/**
	 * 保存登录状态
	 * @returns {boolean} 保存是否成功
	 */
	async saveLoginState() {
		try {
			if (this.context) {
				await sessionManager.saveStorageState(this.platformName, this.context);
				return true;
			}
			return false;
		} catch (error) {
			logger.error(
				`${this.platformConfig.displayName} - 保存登录状态失败: ${error.message}`
			);
			return false;
		}
	}

	/**
	 * 清除登录状态
	 */
	clearLoginState() {
		sessionManager.clearSession(this.platformName);
	}

	/**
	 * 主要的签到流程
	 * @returns {boolean} 整个流程是否成功
	 */
	async run() {
		try {
			logger.info(`${this.platformConfig.displayName} - 开始签到流程`);

			// 初始化浏览器
			await this.initBrowser();

			// 导航到主页
			await this.page.goto(this.platformConfig.url);
			await this.page.waitForLoadState('networkidle');

			// 检查是否已登录
			const loggedIn = await this.isLoggedIn();

			if (!loggedIn) {
				logger.info(`${this.platformConfig.displayName} - 需要登录`);
				const loginSuccess = await this.login();
				if (!loginSuccess) {
					throw new Error('登录失败');
				}

				// 登录成功后保存登录状态
				await this.saveLoginState();
			} else {
				logger.info(`${this.platformConfig.displayName} - 已登录`);
			}

			// 执行签到
			const signInSuccess = await this.signIn();

			if (signInSuccess) {
				logger.info(`${this.platformConfig.displayName} - 签到成功`);
				return true;
			} else {
				logger.error(`${this.platformConfig.displayName} - 签到失败`);
				return false;
			}
		} catch (error) {
			logger.error(
				`${this.platformConfig.displayName} - 签到流程出错: ${error.message}`
			);
			return false;
		} finally {
			await this.closeBrowser();
		}
	}
}

export default BaseSignIn;
