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
 --help          Show help                                            [boolean]
  --version       Show version number                                  [boolean]
  --url, -u       URL to watch                               [string] [required]
  --emails, -e    Email recipients to notify after change               [string]
  --interval, -i  Polling interval in seconds             [number] [default: 10]
  --css, -c       For HTML responses only. Watch only contents of elements that match entered CSS selector [string]
  --file, -f      Enter if URL returns file to enable save to storage by stream [boolean] [default: false]
  --storage, -s   Folder to store responses                             [string]
```