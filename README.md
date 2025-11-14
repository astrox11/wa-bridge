# AstroBridge
AstroBridge is a middleware built on top of the Open Source WhatsApp Web Client
, allowing you to send, receive, and manage all types of WhatsApp messages and chats—including p2p, groups, communities, channels, and status broadcasts.

It works by listening for messages that trigger command handlers, which then perform the corresponding actions. You can also build a frontend so users can configure and control how the middleware automates their WhatsApp workflows.

This project is intended for educational use only. Please avoid using it in ways that violate the [WhatsApp Terms of Service](https://www.whatsapp.com/legal/terms-of-service)
 or for any abusive or exploitative purposes. You’re free to use the middleware responsibly in your commercial projects—just make sure you use it ethically. Love you!

 # Getting Started
 
## Windows

Open PowerShell **as Administrator** and run the following one-liner. It will install the latest Node LTS, Git (via `winget`/`choco`), clone the repo, enable Corepack, install Yarn v4 and run `yarn install`:

```powershell
$ver=(Invoke-RestMethod 'https://nodejs.org/dist/index.json' | Where-Object { $_.lts } | Select-Object -First 1).version; $msi="https://nodejs.org/dist/$ver/node-$ver-x64.msi"; $tmp="$env:TEMP\node-latest.msi"; Invoke-WebRequest $msi -OutFile $tmp -UseBasicParsing; Start-Process msiexec.exe -ArgumentList '/i', $tmp, '/qn', '/norestart' -Wait; if (Get-Command winget -ErrorAction SilentlyContinue) { winget install --id Git.Git -e --silent } else { choco install git -y } ; git clone https://github.com/astrox11/AstroBridge; Set-Location .\AstroBridge; corepack enable; corepack prepare yarn@4.0.0 --activate; yarn install
```

---

## Linux

Run this in a shell. It detects `apt`, `dnf` (rpm) or `pacman` and uses NodeSource/setup scripts where appropriate. Run as root or with `sudo`.

```bash
# One-liner (run as root or prepend sudo)
if command -v apt-get >/dev/null 2>&1; then \
  curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs git curl; \
elif command -v dnf >/dev/null 2>&1; then \
  curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash - && sudo dnf install -y nodejs git curl; \
elif command -v pacman >/dev/null 2>&1; then \
  sudo pacman -Sy --noconfirm nodejs npm git curl; \
else \
  echo "Unsupported Linux distro — please install Node.js and git manually." && exit 1; \
fi && \
git clone https://github.com/astrox11/AstroBridge && cd AstroBridge && corepack enable && corepack prepare yarn@4.0.0 --activate && yarn install
```

Notes:

* `apt`/`dnf` branches use NodeSource’s **setup_lts.x** so you get the current LTS.
* For Arch (`pacman`) we install `nodejs`/`npm` from the official repos.
* If your environment blocks external scripts, run the failing step separately so you can inspect errors.

---

## macOS

Run in Terminal. If Homebrew is missing the script will attempt to install it (Homebrew installer may ask for your password and interactive confirmations). After Homebrew is present it installs Node & Git, then continues.

```bash
# One-liner (run in a user shell)
if command -v brew >/dev/null 2>&1; then \
  brew update && brew install node git; \
else \
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"; \
  export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"; \
  brew update && brew install node git; \
fi && \
git clone https://github.com/astrox11/AstroBridge && cd AstroBridge && corepack enable && corepack prepare yarn@4.0.0 --activate && yarn install
```

Notes:

* Homebrew’s installer may require manual interaction on first run; if you want a fully unattended install, consider installing Homebrew beforehand or running the commands step-by-step.
* On Apple Silicon `brew` typically installs to `/opt/homebrew`; the `PATH` export above helps ensure `brew`/`node` are found in the same shell.

---
