import BaseSignIn from '../base/BaseSignIn.js';
import logger from '../utils/logger.js';

/**
 * 掘金签到实现类
 */
class JuejinSignIn extends BaseSignIn {
	constructor() {
		super('juejin');
	}

	/**
	 * 检查是否已登录
	 * @returns {boolean} 是否已登录
	 */
	async isLoggedIn() {
		try {
			// 等待页面加载完成
			await this.page.waitForTimeout(2000);

			// 使用配置中的选择器检查登录状态
			const userAvatar = await this.page.$(
				this.platformConfig.selectors.userAvatar
			);
			const loginButton = await this.page.$(
				this.platformConfig.selectors.loginButton
			);

			// 如果存在登录按钮，说明未登录
			if (loginButton) {
				const loginText = await loginButton.textContent();
				if (
					loginText &&
					(loginText.includes('登录') || loginText.includes('Login'))
				) {
					return false;
				}
			}

			return !!(userAvatar || userInfo);
		} catch (error) {
			logger.warn(
				`${this.platformConfig.displayName} - 检查登录状态失败: ${error.message}`
			);
			return false;
		}
	}

	/**
	 * 执行登录
	 * @returns {boolean} 登录是否成功
	 */
	async login() {
		try {
			logger.info(`${this.platformConfig.displayName} - 开始登录流程`);

			// 打开登录弹窗
			const modalOpened = await this.openLoginModal();
			if (!modalOpened) {
				logger.error(`${this.platformConfig.displayName} - 无法打开登录弹窗`);
				return false;
			}

			// 等待弹窗完全加载
			await this.page.waitForTimeout(1000);

			// 选择密码登录方式
			const passwordTab = this.platformConfig.selectors.loginTabPassword;
			const passwordLoginTab = await this.page.$(passwordTab);
			if (passwordLoginTab) {
				await passwordLoginTab.click();
				await this.page.waitForTimeout(1000);
				logger.info(`${this.platformConfig.displayName} - 切换到密码登录`);
			}

			// 输入用户名
			const usernameInput = await this.safeInput(
				this.platformConfig.selectors.usernameInput,
				this.credentials.username
			);

			if (!usernameInput) {
				logger.error(`${this.platformConfig.displayName} - 找不到用户名输入框`);
				return false;
			}

			// 输入密码
			const passwordInput = await this.safeInput(
				this.platformConfig.selectors.passwordInput,
				this.credentials.password
			);

			if (!passwordInput) {
				logger.error(`${this.platformConfig.displayName} - 找不到密码输入框`);
				return false;
			}

			// 点击登录按钮
			const loginSubmit = await this.safeClick(
				this.platformConfig.selectors.submitButton
			);
			if (!loginSubmit) {
				logger.error(`${this.platformConfig.displayName} - 找不到登录提交按钮`);
				return false;
			}

			// 等待登录完成
			await this.page.waitForTimeout(2000);

			// 检查是否登录成功
			const loginSuccess = await this.isLoggedIn();

			if (loginSuccess) {
				logger.info(`${this.platformConfig.displayName} - 登录成功`);
				return true;
			} else {
				// 检查是否有错误提示
				const errorMsg = await this.page.$(
					'.error-msg, .login-error, .error-tip'
				);
				if (errorMsg) {
					const errorText = await errorMsg.textContent();
					logger.error(
						`${this.platformConfig.displayName} - 登录失败: ${errorText}`
					);
				} else {
					logger.error(
						`${this.platformConfig.displayName} - 登录失败，未知原因`
					);
				}
				return false;
			}
		} catch (error) {
			logger.error(
				`${this.platformConfig.displayName} - 登录过程出错: ${error.message}`
			);
			return false;
		}
	}

	/**
	 * 执行签到
	 * @returns {boolean} 签到是否成功
	 */
	async signIn() {
		try {
			logger.info(`${this.platformConfig.displayName} - 开始签到`);

			// 导航到签到页面
			await this.page.goto(
				'https://juejin.cn/user/center/signin?from=main_page'
			);
			await this.page.waitForLoadState('networkidle');

			// 等待页面加载完成
			await this.page.waitForTimeout(2000);

			// 检查是否已经签到
			const alreadySignedIn = await this.page.$(
				this.platformConfig.selectors.signedInIndicator
			);
			if (alreadySignedIn) {
				logger.info(`${this.platformConfig.displayName} - 今日已签到`);
				return true;
			}

			// 查找签到按钮
			const signInButton = await this.page.$(
				this.platformConfig.selectors.signInButton
			);
			if (!signInButton) {
				logger.warn(`${this.platformConfig.displayName} - 找不到签到按钮`);
				return false;
			}

			// 点击签到按钮
			await signInButton.click();

			logger.info(`${this.platformConfig.displayName} - 点击签到按钮`);

			// 等待签到完成
			await this.page.waitForTimeout(2000);

			// 检查签到结果
			const signInSuccess = await this.page.$(
				this.platformConfig.selectors.signedInIndicator
			);

			if (signInSuccess) {
				logger.info(`${this.platformConfig.displayName} - 签到成功`);
				return true;
			} else {
				// 检查是否有错误提示
				const errorMsg = await this.page.$('.error-msg, .sign-error');
				if (errorMsg) {
					const errorText = await errorMsg.textContent();
					logger.error(
						`${this.platformConfig.displayName} - 签到失败: ${errorText}`
					);
				}

				return false;
			}
		} catch (error) {
			logger.error(
				`${this.platformConfig.displayName} - 签到过程出错: ${error.message}`
			);
			return false;
		}
	}
}

export default JuejinSignIn;
