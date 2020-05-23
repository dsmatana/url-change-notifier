# URL Change notifier 📃
### Attention: Work in progress 🔧

Console tool to watch changes of a content at given URL (file/html) then send notifications via email using SMTP
## Installation
Install globally
```
npm install -g url-change-notifier
```
## Usage
```
url-change-notifier --url=xyz
```

# Params
```
--url, -u       URL to watch                                                    [string] [required]
--emails, -e    Email recipients separated by comma to notify after change      [string]
--interval, -i  Polling interval in seconds                                     [number] [default: 10]
--count, -c     Number of times to check url                                    [number]
--css           For HTML responses only. 
                Watch only contents of elements that match entered CSS selector [string]
--file, -f      Enter if URL returns file to enable save to storage by stream   [boolean] [default: false]
--storage       Folder to store responses                                       [string]
--smtp_host     SMTP Host                                                       [string]
--smtp_port     SMTP Port                                                       [number] [default: 587]
--smtp_secure   SMTP Secure flag                                                [boolean] [default: false]
--smtp_user     SMTP User                                                       [string]
--smtp_pass     SMTP Password                                                   [string]
```