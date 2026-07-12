# Crawler Service

This folder contains the isolated Python crawler service used by the Node.js app.

The Python environment lives inside:

```text
crawlerService/.venv/
```

That virtual environment is ignored by Git. Keep Python source, `requirements.txt`, and service docs committed.

## Run Directly

From the project root:

```powershell
Set-Location crawlerService
$payload = '{"source":"manual","query":"tourist places in Kochi"}'
$payload | .\.venv\Scripts\python.exe -m crawler_service
```

On macOS/Linux:

```bash
cd crawlerService
echo '{"source":"manual","query":"tourist places in Kochi"}' | .venv/bin/python -m crawler_service
```

The service accepts JSON and returns JSON. This keeps the contract simple for Node subprocess calls.

## Run From Node

Use `runCrawlerService` from `crawlerService/runCrawlerService.js`:

```js
import { runCrawlerService } from "./crawlerService/runCrawlerService.js";

const result = await runCrawlerService({
  source: "manual",
  query: "tourist places in Kochi",
});

console.log(result);
```

## Install Python Dependencies

Activate the environment and install dependencies when `requirements.txt` gets packages:

```bash
crawlerService/.venv/Scripts/python -m pip install -r crawlerService/requirements.txt
```

On macOS/Linux:

```bash
crawlerService/.venv/bin/python -m pip install -r crawlerService/requirements.txt
```
