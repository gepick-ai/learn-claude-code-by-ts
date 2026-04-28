import path from "node:path";

export function safePath(inputPath: string) {
    return path.resolve(process.cwd(), inputPath);
}