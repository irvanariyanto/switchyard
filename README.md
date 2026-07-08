# Switchyard

Browser-accessible local profile switcher for config files.

## One-Line Install And Start

Install, build, and start in the background:

```sh
curl -fsSL https://raw.githubusercontent.com/irvanariyanto/switchyard/main/scripts/install.sh | bash -s -- --start --background
```

Default URL:

```text
http://127.0.0.1:49287
```

## Commands

```sh
switchyard                    # start in the foreground
switchyard start --background # start in the background
switchyard status             # show status
switchyard stop               # stop background process
switchyard restart --background
switchyard logs               # follow background logs
switchyard open               # open in browser
```

If Switchyard is already running, `switchyard` prints the URL, PID, and options to open, stop, restart in the background, or view logs.

## Local Development

```sh
npm install
npm run dev
```

The development server also binds to `127.0.0.1:49287`.
