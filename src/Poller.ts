import fs from 'fs';
import path from 'path';
import axios from 'axios';
import moment from 'moment';
import cheerio from 'cheerio';
import encoding from 'encoding';
import slugify from 'slugify';
import md5 from 'md5';
import md5file from 'md5-file';
import url from 'url';
import mime from 'mime';
import random_useragent from 'random-useragent';

import createLogger from './Logger';

export default class Poller {
	options = {
		url: '',
		css: undefined,
		count: undefined,
		interval: undefined,
		emails: [],
		storage: null,
		file: false,
	};

	mailer = null;
	logger = null;
	count = 0;
	timeout = null;

	response = null;
	responseStream = null;
	mime = null;
	body = null;
	lastBody = null;

	constructor(options, mailer) {
		this.options = {
			...this.options,
			...options,
		};

		this.mailer = mailer;

		this.logger = createLogger(`${this.storageDir}/log.log`);
	}

	start() {
		this.logger.info(
			`Started watching with polling interval ${this.options.interval} seconds` +
				(this.options.css ? ` with CSS selector: ${this.options.css}` : '')
		);
		this.loop();
	}

	stop() {
		if (this.timeout) {
			clearTimeout(this.timeout);
			this.logger.info('Stopped watching');
		}
	}

	async loop() {
		await this.poll();

		if (this.options.count) {
			this.count++;
			if (this.count == this.options.count) {
				process.exit();
			}
		}

		this.timeout = setTimeout(() => {
			this.loop();
		}, this.options.interval * 1000);
	}

	async poll() {
		try {
			await this.download();
		} catch (error) {
			this.logger.error(error);
			return;
		}

		switch (this.mime) {
			// If response is webpage
			case 'text/html':
				const html = encoding.convert(this.response.data, 'UTF-8');
				const $ = cheerio.load(html);

				// Concat contents of all matched css elements
				if (this.options.css) {
					const els = $(this.options.css);
					if (els.length) {
						this.body = '';
						els.each((i, el) => {
							this.body += $(el).html();
						});
					} else {
						this.logger.error(`No css elements matched selector ${this.options.css}`);
					}
				} else {
					this.body = this.response.data;
				}
				break;
			default:
				// Anything else
				this.body = this.response.data;
		}

		if (!this.body) {
			this.body = 'EMPTY';
		}

		// Check if response is different than last stored file
		if (this.lastStoredResponseMd5) {
			if (this.lastStoredResponseMd5 != md5(this.body)) {
				this.logger.info(`Change detected ! URL: ${this.options.url}`);
				this.saveBody();
			}
		} else {
			this.logger.info(`MIME: ${this.mime}`);
			this.logger.info(`Saving first response`);
			this.saveBody();
		}

		if (this.body !== 'EMPTY' && this.lastBody && this.lastBody != this.body) {
			this.logger.info(`Change detected ! URL: ${this.options.url}`);
			this.saveBody();

			// Send emails
			for (let email of this.options.emails) {
				try {
					await this.mailer.send({
						from: process.env.EMAIL_FROM,
						to: email,
						subject: process.env.EMAIL_SUBJECT || 'Change detected !',
						html: `Change detected on <a href="${this.options.url}">${this.options.url}</a>`,
					});
					this.logger.info(`Email sent to: ${email}`);
				} catch (error) {
					this.stop();
				}
			}
		}

		this.lastBody = this.body;
	}

	async download() {
		this.response = await axios.get(this.options.url, {
			headers: {
				'User-Agent': random_useragent.getRandom(ua => {
					return ua.browserName == 'Chrome' && ua.osName == 'Windows' && ua.osVersion == '10';
				}),
			},
			proxy:
				(process.env.HTTP_PROXY &&
					process.env.HTTP_PROXY_PORT && {
						host: process.env.HTTP_PROXY,
						port: Number(process.env.HTTP_PROXY_PORT),
					}) ||
				undefined,
		});
		if (this.options.file) {
			this.responseStream = await axios({ method: 'get', url: this.options.url, responseType: 'stream' });
		}
		this.mime = this.response.headers['content-type'].split(';').find(item => {
			if (item.match(/\//)) {
				return item.trim();
			}
		});
	}

	compareFilesMd5(file1, file2) {
		return md5file.sync(file1) == md5file.sync(file2);
	}

	saveBody() {
		const name = this.fileName;
		if (!fs.existsSync(this.storageDir)) {
			fs.mkdirSync(this.storageDir);
		}

		if (this.responseStream) {
			this.responseStream.data.pipe(fs.createWriteStream(`${this.storageDir}/${name}`));
		} else {
			fs.writeFileSync(`${this.storageDir}/${name}`, this.body);
		}

		this.logger.info(`Saved file ${name}`);
	}

	// Getters

	get fileName() {
		const ext = mime.getExtension(this.mime);
		return `${moment().format('YYYY-MM-DD_HH-mm-ss.SSS')}-md5_${md5(this.body)}.${ext}`;
	}

	get storageDir() {
		const parsed = url.parse(this.options.url);

		const ntfsChars = /[<>:"\/\|?\*]*/g;

		return [
			`${this.options.storage}/`.replace(/\/$/, ''),
			'/',
			parsed.host.replace(/www\./, '').replace(/\./g, '_').replace(ntfsChars, ''),
			slugify(parsed.path.replace(/\//g, '_s_')).replace(ntfsChars, ''),
			`-md5_${md5(this.options.url)}`,
		].join('');
	}

	get lastStoredResponse() {
		if (fs.existsSync(this.storageDir)) {
			const files = fs.readdirSync(this.storageDir);

			if (files.length) {
				let lastFile = null;
				for (let file of files) {
					if (file.match(/^[0-9-_\.]*md5_([0-9a-z]*)\./)) {
						lastFile = file;
					}
				}
				return lastFile;
			}
		}
		return null;
	}

	get lastStoredResponseMd5() {
		const file = this.lastStoredResponse;

		if (!file) {
			return null;
		}

		const match = file
			.split('/')
			.pop()
			.match(/md5_([0-9a-z]*)\./i);

		return (match && match[1]) || null;
	}
}
