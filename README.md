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
switchyard uninstall          # remove app, keep profile data
switchyard uninstall --purge-data
```

If Switchyard is already running, `switchyard` prints the URL, PID, and options to open, stop, restart in the background, or view logs.

## Local Development

```sh
npm install
npm run dev
```

The development server also binds to `127.0.0.1:49287`.

## Uninstall

Remove the app and command, preserving profile data:

```sh
switchyard uninstall
```

Remove everything, including saved profile data:

```sh
switchyard uninstall --purge-data
```

Remote uninstall, useful if the command is not on `PATH`:

```sh
curl -fsSL https://raw.githubusercontent.com/irvanariyanto/switchyard/main/scripts/install.sh | bash -s -- --uninstall
```
