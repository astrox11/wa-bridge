.PHONY: all setup build-util build-core

all: setup build-util build-core

setup:
	cd api && go mod download && go mod tidy

build-util:
	$(MAKE) -C util build

build-core:
	-cd core && bun -e "const fs = require('fs'); const p = 'node_modules/libsignal/src/session_record.js'; if (fs.existsSync(p)) { const c = fs.readFileSync(p, 'utf8').split('\n').filter(l => !l.includes('Closing session:') && !l.includes('Removing old closed session:')).join('\n'); fs.writeFileSync(p, c); }"
	-cd core/node_modules/baileys && bun run build
	-cd core/node_modules/whatsapp-rust-bridge && bun run build
	-cd core && bun tsc