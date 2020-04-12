"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const winston = require('winston');
exports.default = (filename = 'log.log') => {
    return winston.createLogger({
        transports: [new winston.transports.Console(), new winston.transports.File({ filename })],
        format: winston.format.combine(winston.format.label({ label: 'UCN' }), winston.format.timestamp(), winston.format.printf(({ level, message, label, timestamp }) => {
            return `${timestamp} [${label}] ${level}: ${message}`;
        })),
    });
};
//# sourceMappingURL=Logger.js.map