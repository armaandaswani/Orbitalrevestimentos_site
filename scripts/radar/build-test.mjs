import { execFileSync } from "node:child_process";
execFileSync(process.execPath,["node_modules/typescript/bin/tsc","--module","commonjs","--moduleResolution","node","--target","es2022","--esModuleInterop","--skipLibCheck","--outDir",".next/radar-check","src/lib/radar/domain.ts","src/lib/radar/ocr.ts"],{stdio:"inherit"});
