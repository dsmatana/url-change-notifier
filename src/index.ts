#!/usr/bin/env node

import dotenv from 'dotenv';
import yargs from 'yargs';

import createLogger from './Logger';
import Poller from './Poller';
import Mailer from './Mailer';

const Logger = createLogger('main.log');

dotenv.config();

const argv = yargs
	.usage('Usage: --url <url>')
	.option('url', { alias: 'u', describe: 'URL to watch', type: 'string', demandOption: true })
	.option('emails', { alias: 'e', describe: 'Email recipients to notify after change', type: 'string' })
	.option('interval', { alias: 'i', describe: 'Polling interval in seconds', type: 'number', default: 10 })
	.option('count', { describe: 'Number of times to check url', type: 'number' })
	.option('css', {
		alias: 'c',
		describe: 'For HTML responses only. Watch only contents of elements that match entered CSS selector',
		type: 'string',
	})
	.option('file', {
		alias: 'f',
		describe: 'Enter if URL returns file to enable save to storage by stream',
		type: 'boolean',
		default: false,
	})
	.option('storage', { alias: 's', describe: 'Folder to store responses', type: 'string' }).argv;

const path = require('path');

const run = () => {
	if (!argv.url) {
		throw 'Enter Url';
	}

	if (String(argv.interval) === 'NaN' || argv.interval < 1) {
		throw 'Enter interval greater or equal than 1';
	}

	const mailer = new Mailer({
		host: process.env.SMTP_HOST,
		port: Number(process.env.SMTP_PORT),
		secure: process.env.SMTP_SECURE === 'true',
		auth: {
			user: process.env.SMTP_USER,
			pass: process.env.SMTP_PASS,
		},
	});

	const options = {
		url: argv.url,
		css: argv.css,
		interval: argv.interval,
		count: argv.count,
		emails: (argv.emails && argv.emails.split(',').map(v => v.trim())) || [],
		storage: argv.storage || path.join(__dirname, '../storage'),
		file: argv.file,
	};

	const poller = new Poller(options, mailer);

	poller.start();
};

try {
	run();
} catch (error) {
	Logger.error(error);
}
