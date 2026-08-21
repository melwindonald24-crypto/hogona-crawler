import { randomUUID } from "node:crypto";

export function createBatchId() {
    return `batch-${new Date().toISOString().slice(0, 10)}-${randomUUID().slice(0, 8)}`;
}
