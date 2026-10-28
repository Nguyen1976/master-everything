## Preset: JavaScript · Node.js · TypeScript

| Id | Material | Path | Use it for |
|---|---|---|---|
| `ydkjs` | You Don't Know JS Yet (2nd ed.) | `materials/javascript/ydkjs-yet/` | How JS really works: scope, closures, `this`, prototypes, classes. ⚠️ `types-grammar`, `sync-async`, `es-next-beyond` only have chapter 1 so far |
| `jsinfo` | The Modern JavaScript Tutorial | `materials/javascript/javascript-info/1-js/` | Full curriculum with exercises (`task.md`, solutions in `solution.md`); `2-ui/99-ui-misc/03-event-loop` for the event loop |
| `mdn` | MDN — JavaScript | `materials/javascript/mdn-content/files/en-us/web/javascript/` | Authoritative reference (`reference/`) and guides (`guide/closures`, `guide/using_promises`, …) |
| `jsway` | The JavaScript Way | `materials/javascript/the-js-way/manuscript/` | Gentle beginner chapters with small exercises |
| `nodelearn` | Node.js Learn (official) | `materials/nodejs/nodejs-learn/pages/` | `asynchronous-work/` (event loop, nextTick, setImmediate), `modules/` (streams), `manipulating-files/`, `http/`, `typescript/` |
| `nodeapi` | Node.js API docs | `materials/nodejs/node-api/doc/api/` | Module reference: `fs.md`, `events.md`, `stream.md`, `esm.md`, `worker_threads.md`, … |
| `nodebp` | Node.js Best Practices | `materials/nodejs/node-best-practices/sections/` | Error handling, project structure, security, performance (use the files without a language suffix) |
| `tshb` | TypeScript Handbook (official) | `materials/typescript/ts-handbook/packages/documentation/copy/en/handbook-v2/` | Core curriculum; `Type Manipulation/` for generics, conditional and mapped types; `../reference/` for utility types |
| `tsdeep` | TypeScript Deep Dive | `materials/typescript/typescript-deep-dive/docs/` | The *why* behind the type system, practical tips |
| `tsbook` | The Concise TypeScript Book | `materials/typescript/concise-typescript-book/README.md` | All of TS in one file, good for review |
| `tschal` | Type Challenges | `materials/typescript/type-challenges/questions/` | Type-level exercises by difficulty |

Precedence when sources disagree: `mdn` / `nodeapi` / `tshb` (official) > `ydkjs` / `tsdeep` > others.
Practice setup: `cd practice && npm init -y && npm i -D typescript @types/node`, then `node file.ts` (Node ≥ 22.18 strips types) and `npx tsc --noEmit`.
