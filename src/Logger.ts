const winston = require('winston');

export default (filename = 'log.log') => {
	return winston.createLogger({
		transports: [new winston.transports.Console(), new winston.transports.File({ filename })],
		format: winston.format.combine(
			winston.format.label({ label: 'UCN' }),
			winston.format.timestamp(),
			winston.format.printf(({ level, message, label, timestamp }) => {
				return `${timestamp} [${label}] ${level}: ${message}`;
			})
		),
	});
};
