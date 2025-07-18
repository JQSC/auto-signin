import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
				winston.format.colorize(),
				winston.format.simple()
			),
		})
	);
}

export default logger;
