import { existsSync, readdirSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { Worker } from 'worker_threads';

export function parseEnv(file: string): Record<string, string> {
    const result: Record<string, string> = {};
    const fullPath = resolve(file);

    if (!existsSync(fullPath)) return result;

    const content = readFileSync(fullPath, 'utf8');
    const lines = content.split(/\r\n|\n|\r/);

    for (let raw of lines) {
        let line = raw.trim();
        if (!line || line.startsWith('#')) continue;

        // allow "export KEY=VALUE" style
        if (line.startsWith('export ')) line = line.replace(/^export\s+/, '');

        const eqIndex = line.indexOf('=');
        if (eqIndex === -1) continue;

        const key = line.slice(0, eqIndex).trim();
        let val = line.slice(eqIndex + 1).trim();

        // If value is quoted, preserve inner string and unescape common sequences
        if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
        ) {
            val = val.slice(1, -1);
            // Unescape common escape sequences
            val = val
                .replace(/\\n/g, '\n')
                .replace(/\\r/g, '\r')
                .replace(/\\t/g, '\t')
                .replace(/\\\\/g, '\\')
                .replace(/\\"/g, '"')
                .replace(/\\'/g, "'");
        } else {
            // remove inline comments for unquoted values (first unescaped #)
            const hashIndex = val.indexOf('#');
            if (hashIndex !== -1) {
                val = val.slice(0, hashIndex).trim();
            }
        }

        if (key) result[key] = val;
    }

    return result;
}

type Outcome<T> = { ok: true; value: T } | { ok: false; error: any };

/**
 * Runs any number of tasks in separate worker threads so they execute
 * concurrently and cannot affect each other's runtime (exceptions,
 * memory, globals, etc.).
 *
 * Each task is a function that can return a value, a Promise, or nothing
 * (void) in case it's a non-ending/background function. For non-ending
 * tasks the worker will keep running; the Promise returned for that task
 * will simply never resolve unless the worker posts a result or an error.
 *
 * Returns an array of Promises that resolve to Outcome<T> when the
 * corresponding worker posts a result/error or when the worker exits
 * with a non-zero code. Workers are NOT terminated automatically here,
 * allowing long-running/background tasks to continue running.
 */
export function runIndependentTasks(...tasks: Array<() => any>): Array<Promise<Outcome<any>>> {
    const runInWorker = (fn: () => any): Promise<Outcome<any>> => {
        return new Promise((resolve) => {
            const fnStr = fn.toString();

            const worker = new Worker(
                `
                (async () => {
                    try {
                        const fn = eval('(' + workerData.fn + ')');
                        const maybe = fn();
                        // await if it's a promise; if it's a non-ending function that never resolves,
                        // this await will hang and the worker will keep running (as desired).
                        const result = await maybe;
                        parentPort.postMessage({ type: 'result', result });
                    } catch (err) {
                        parentPort.postMessage({ type: 'error', error: {
                            message: err && err.message,
                            stack: err && err.stack,
                            name: err && err.name
                        }});
                    }
                })();
                `,
                { eval: true, workerData: { fn: fnStr } }
            );

            let settled = false;

            const maybeResolve = (outcome: Outcome<any>) => {
                if (settled) return;
                settled = true;
                resolve(outcome);
                // Intentionally do NOT terminate the worker here so long-running tasks stay alive.
            };

            worker.on('message', (msg: any) => {
                if (msg && msg.type === 'result') {
                    maybeResolve({ ok: true, value: msg.result });
                } else if (msg && msg.type === 'error') {
                    maybeResolve({ ok: false, error: msg.error });
                }
            });

            worker.on('error', (err: any) => {
                maybeResolve({ ok: false, error: { message: err && err.message, stack: err && err.stack } });
            });

            worker.on('exit', (code: number) => {
                if (!settled && code !== 0) {
                    maybeResolve({ ok: false, error: { message: `Worker exited with code ${code}` } });
                }
                // If exit was 0 and not settled, it means the worker finished without posting;
                // treat that as a successful undefined result.
                if (!settled && code === 0) {
                    maybeResolve({ ok: true, value: undefined });
                }
            });
        });
    };

    return tasks.map((t) => runInWorker(t));
}

export function findEnvFile(dir: string): string | null {
    try {
        const files: string[] = readdirSync(dir);
        for (const f of files) {
            if (f.startsWith('.env')) {
                const p = resolve(dir, f);
                if (existsSync(p)) return p;
            }
        }
    } catch {
        // ignore errors (e.g. missing directory / permissions)
    }

    return null;
}