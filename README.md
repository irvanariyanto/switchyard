# Switchyard

Browser-accessible local profile switcher for config files.

## One-Line Install And Start

Install, build, and start in the background:

```sh
curl -fsSL https://raw.githubusercontent.com/irvanariyanto/switchyard/main/scripts/install.sh | bash -s -- --start --background
```

The installer also installs shell completion for `bash`, `zsh`, or `fish` when it can detect your shell.

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
switchyard update             # pull and build the latest version
switchyard completion         # print completion for detected shell
switchyard install-completion # install completion for detected shell
switchyard uninstall          # remove app, keep profile data
switchyard uninstall --purge-data
```

If Switchyard is already running, `switchyard` prints the URL, PID, and options to open, stop, restart in the background, or view logs.

## Shell Completion

Install completion for your current shell:

```sh
switchyard install-completion
```

If completion was not installed automatically during an older install, update first, then install completion:

```sh
switchyard update
switchyard install-completion
```

Switchyard detects `bash`, `zsh`, or `fish` from `$SHELL`. You can also choose explicitly:

```sh
switchyard install-completion zsh
switchyard install-completion bash
switchyard install-completion fish
```

Open a new shell after installing. To inspect the generated script without installing it:

```sh
switchyard completion
```

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
