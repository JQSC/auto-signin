import BaseSignIn from '../base/BaseSignIn.js';
import logger from '../utils/logger.js';

/**
 * B站签到实现类
 */
class BilibiliSignIn extends BaseSignIn {
	constructor() {
		super('bilibili');
	}

	/**
	 * 检查是否已登录
	 * @returns {boolean} 是否已登录
	 */
	async isLoggedIn() {
		try {
			// 等待页面加载完成
			await this.page.waitForTimeout(2000);

			// 检查是否存在用户头像或用户信息
			const userAvatar = await this.page.$('.header-avatar-wrap, .user-avatar');
			const userInfo = await this.page.$('.user-info, .user-name');
			const loginStatus = await this.page.$('.header-login-entry');

			// 如果存在登录按钮，说明未登录
			if (loginStatus) {
				const loginText = await loginStatus.textContent();
				if (loginText && loginText.includes('登录')) {
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

			// 点击登录按钮
			const loginButtonClicked = await this.safeClick('.header-login-entry');
			if (!loginButtonClicked) {
				logger.error(`${this.platformConfig.displayName} - 找不到登录按钮`);
				return false;
			}

			// 等待登录页面加载
			await this.page.waitForTimeout(3000);

			// 选择密码登录
			const passwordTab = await this.page.$(
				'.tab-item[data-tab-name="password"]'
			);
			if (passwordTab) {
				await passwordTab.click();
				await this.page.waitForTimeout(1000);
			}

			// 输入用户名
			const usernameInput = await this.safeInput(
				'#login-username, input[placeholder*="手机号"], input[placeholder*="邮箱"]',
				this.credentials.username
			);

			if (!usernameInput) {
				logger.error(`${this.platformConfig.displayName} - 找不到用户名输入框`);
				return false;
			}

			// 输入密码
			const passwordInput = await this.safeInput(
				'#login-passwd, input[type="password"]',
				this.credentials.password
			);

			if (!passwordInput) {
				logger.error(`${this.platformConfig.displayName} - 找不到密码输入框`);
				return false;
			}

			// 点击登录按钮
			const loginSubmit = await this.safeClick('.btn-login, .login-btn');
			if (!loginSubmit) {
				logger.error(`${this.platformConfig.displayName} - 找不到登录提交按钮`);
				return false;
			}

			// 等待登录完成
			await this.page.waitForTimeout(5000);

			// 检查是否需要验证码或其他验证
			const captcha = await this.page.$('.geetest_canvas_img, .captcha');
			if (captcha) {
				logger.warn(
					`${this.platformConfig.displayName} - 需要验证码，请手动处理`
				);
				// 等待用户手动处理验证码
				await this.page.waitForTimeout(30000);
			}

			// 检查是否登录成功
			const loginSuccess = await this.isLoggedIn();

			if (loginSuccess) {
				logger.info(`${this.platformConfig.displayName} - 登录成功`);
				return true;
			} else {
				// 检查是否有错误提示
				const errorMsg = await this.page.$('.error-msg, .login-error');
				if (errorMsg) {
					const errorText = await errorMsg.textContent();
					logger.error(
						`${this.platformConfig.displayName} - 登录失败: ${errorText}`
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

			// 导航到任务中心页面
			await this.page.goto('https://www.bilibili.com/v/task/draw');
			await this.page.waitForLoadState('networkidle');

			// 等待页面加载完成
			await this.page.waitForTimeout(3000);

			// 检查是否已经签到
			const alreadySignedIn = await this.page.$('.signed, .task-completed');
			if (alreadySignedIn) {
				logger.info(`${this.platformConfig.displayName} - 今日已签到`);
				return true;
			}

			// 查找签到按钮
			let signInButton = await this.page.$('.go-btn, .task-btn, .signin-btn');

			if (!signInButton) {
				// 尝试其他可能的签到入口
				signInButton = await this.page.$('.task-item .btn');
			}

			if (!signInButton) {
				logger.warn(`${this.platformConfig.displayName} - 找不到签到按钮`);

				// 尝试直接访问签到API或其他方式
				try {
					// 执行签到请求
					const response = await this.page.evaluate(() => {
						return fetch('/x/task/reward', {
							method: 'POST',
							credentials: 'include',
							headers: {
								'Content-Type': 'application/json',
							},
						}).then((res) => res.json());
					});

					if (response && response.code === 0) {
						logger.info(`${this.platformConfig.displayName} - 通过API签到成功`);
						return true;
					}
				} catch (apiError) {
					logger.warn(
						`${this.platformConfig.displayName} - API签到失败: ${apiError.message}`
					);
				}

				return false;
			}

			// 点击签到按钮
			await signInButton.click();

			// 等待签到完成
			await this.page.waitForTimeout(3000);

			// 检查签到结果
			const signInSuccess = await this.page.$(
				'.signed, .task-completed, .success'
			);
			const signInMessage = await this.page.$('.task-msg, .result-msg');

			if (signInSuccess || signInMessage) {
				if (signInMessage) {
					const messageText = await signInMessage.textContent();
					logger.info(
						`${this.platformConfig.displayName} - 签到结果: ${messageText}`
					);
				}
				return true;
			}

			// 检查是否有错误提示
			const errorMsg = await this.page.$('.error-msg, .task-error');
			if (errorMsg) {
				const errorText = await errorMsg.textContent();
				logger.error(
					`${this.platformConfig.displayName} - 签到失败: ${errorText}`
				);
			}

			return false;
		} catch (error) {
			logger.error(
				`${this.platformConfig.displayName} - 签到过程出错: ${error.message}`
			);
			return false;
		}
	}
}

export default BilibiliSignIn;
