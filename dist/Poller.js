"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const axios_1 = __importDefault(require("axios"));
const moment_1 = __importDefault(require("moment"));
const cheerio_1 = __importDefault(require("cheerio"));
const encoding_1 = __importDefault(require("encoding"));
const slugify_1 = __importDefault(require("slugify"));
const md5_1 = __importDefault(require("md5"));
const md5_file_1 = __importDefault(require("md5-file"));
const url_1 = __importDefault(require("url"));
const mime_1 = __importDefault(require("mime"));
const random_useragent_1 = __importDefault(require("random-useragent"));
const Logger_1 = __importDefault(require("./Logger"));
class Poller {
    constructor(options, mailer) {
        this.options = {
            url: '',
            css: undefined,
            count: undefined,
            interval: undefined,
            emails: [],
            storage: null,
            file: false,
        };
        this.mailer = null;
        this.logger = null;
        this.count = 0;
        this.timeout = null;
        this.response = null;
        this.responseStream = null;
        this.mime = null;
        this.body = null;
        this.lastBody = null;
        this.options = Object.assign(Object.assign({}, this.options), options);
        this.mailer = mailer;
        this.logger = Logger_1.default(`${this.storageDir}/log.log`);
    }
    start() {
        this.logger.info(`Started watching with polling interval ${this.options.interval} seconds` +
            (this.options.css ? ` with CSS selector: ${this.options.css}` : ''));
        this.loop();
    }
    stop() {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.logger.info('Stopped watching');
        }
    }
    loop() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.poll();
            if (this.options.count) {
                this.count++;
                if (this.count == this.options.count) {
                    process.exit();
                }
            }
            this.timeout = setTimeout(() => {
                this.loop();
            }, this.options.interval * 1000);
        });
    }
    poll() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.download();
            }
            catch (error) {
                this.logger.error(error);
                return;
            }
            switch (this.mime) {
                // If response is webpage
                case 'text/html':
                    const html = encoding_1.default.convert(this.response.data, 'UTF-8');
                    const $ = cheerio_1.default.load(html);
                    // Concat contents of all matched css elements
                    if (this.options.css) {
                        const els = $(this.options.css);
                        if (els.length) {
                            this.body = '';
                            els.each((i, el) => {
                                this.body += $(el).html();
                            });
                        }
                        else {
                            this.logger.error(`No css elements matched selector ${this.options.css}`);
                        }
                    }
                    else {
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
                if (this.lastStoredResponseMd5 != md5_1.default(this.body)) {
                    this.onChange();
                }
            }
            else {
                this.logger.info(`MIME: ${this.mime}`);
                this.logger.info(`Saving first response`);
                this.saveBody();
            }
            this.lastBody = this.body;
        });
    }
    onChange() {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.info(`Change detected ! URL: ${this.options.url}`);
            this.saveBody();
            // Send emails
            for (let email of this.options.emails) {
                try {
                    yield this.mailer.send({
                        from: process.env.EMAIL_FROM,
                        to: email,
                        subject: process.env.EMAIL_SUBJECT || 'Change detected !',
                        html: `Change detected on <a href="${this.options.url}">${this.options.url}</a>`,
                    });
                    this.logger.info(`Email sent to: ${email}`);
                }
                catch (error) {
                    this.stop();
                }
            }
        });
    }
    download() {
        return __awaiter(this, void 0, void 0, function* () {
            this.response = yield axios_1.default.get(this.options.url, {
                headers: {
                    'User-Agent': random_useragent_1.default.getRandom(ua => {
                        return ua.browserName == 'Chrome' && ua.osName == 'Windows' && ua.osVersion == '10';
                    }),
                },
                proxy: (process.env.HTTP_PROXY &&
                    process.env.HTTP_PROXY_PORT && {
                    host: process.env.HTTP_PROXY,
                    port: Number(process.env.HTTP_PROXY_PORT),
                }) ||
                    undefined,
            });
            if (this.options.file) {
                this.responseStream = yield axios_1.default({ method: 'get', url: this.options.url, responseType: 'stream' });
            }
            this.mime = this.response.headers['content-type'].split(';').find(item => {
                if (item.match(/\//)) {
                    return item.trim();
                }
            });
        });
    }
    compareFilesMd5(file1, file2) {
        return md5_file_1.default.sync(file1) == md5_file_1.default.sync(file2);
    }
    saveBody() {
        const name = this.fileName;
        if (!fs_1.default.existsSync(this.storageDir)) {
            fs_1.default.mkdirSync(this.storageDir);
        }
        if (this.responseStream) {
            this.responseStream.data.pipe(fs_1.default.createWriteStream(`${this.storageDir}/${name}`));
        }
        else {
            fs_1.default.writeFileSync(`${this.storageDir}/${name}`, this.body);
        }
        this.logger.info(`Saved file ${name}`);
    }
    // Getters
    get fileName() {
        const ext = mime_1.default.getExtension(this.mime);
        return `${moment_1.default().format('YYYY-MM-DD_HH-mm-ss.SSS')}-md5_${md5_1.default(this.body)}.${ext}`;
    }
    get storageDir() {
        const parsed = url_1.default.parse(this.options.url);
        const ntfsChars = /[<>:"\/\|?\*]*/g;
        return [
            `${this.options.storage}/`.replace(/\/$/, ''),
            '/',
            parsed.host.replace(/www\./, '').replace(/\./g, '_').replace(ntfsChars, ''),
            slugify_1.default(parsed.path.replace(/\//g, '_s_')).replace(ntfsChars, ''),
            this.options.css ? `-css_${this.options.css}` : '',
            `-md5_${md5_1.default(this.options.url)}`,
        ].join('');
    }
    get lastStoredResponse() {
        if (fs_1.default.existsSync(this.storageDir)) {
            const files = fs_1.default.readdirSync(this.storageDir);
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
exports.default = Poller;
//# sourceMappingURL=Poller.js.map