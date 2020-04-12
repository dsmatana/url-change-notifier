"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nodemailer_1 = __importDefault(require("nodemailer"));
class Mailer {
    constructor(transporterOptions) {
        this.transporter = null;
        this.transporter = nodemailer_1.default.createTransport(transporterOptions);
    }
    send(options) {
        return new Promise((resolve, reject) => {
            this.transporter.sendMail(options, (error, info) => {
                if (error) {
                    return reject(error);
                }
                resolve(info);
            });
        });
    }
}
exports.default = Mailer;
//# sourceMappingURL=Mailer.js.map