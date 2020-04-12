import nodemailer from 'nodemailer';

export default class Mailer {
	transporter = null;

	constructor(transporterOptions) {
		this.transporter = nodemailer.createTransport(transporterOptions);
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
