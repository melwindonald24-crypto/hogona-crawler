import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.env.DRIVE_SYNC_ROOT ? path.resolve(process.env.DRIVE_SYNC_ROOT) : path.resolve("tmp", "drive-sync");
const pending = path.join(root, "pending");
const processed = path.join(root, "processed");
const imported = path.join(processed, "imported");

export function paths() { return { root, pending, processed }; }

export async function writePendingBatch(batchId, payload) {
    await mkdir(pending, { recursive: true });
    const filePath = path.join(pending, `${batchId}.json`);
    await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    return filePath;
}

export async function listCompletedBatchFiles() {
    await mkdir(processed, { recursive: true });
    return (await readdir(processed, { withFileTypes: true })).filter((entry) => entry.isFile() && entry.name.endsWith(".result.json")).map((entry) => entry.name);
}

export async function readCompletedBatch(filename) {
    return JSON.parse(await readFile(path.join(processed, path.basename(filename)), "utf8"));
}

export async function archiveCompletedBatch(filename) {
    await mkdir(imported, { recursive: true });
    await rename(path.join(processed, path.basename(filename)), path.join(imported, path.basename(filename)));
}
