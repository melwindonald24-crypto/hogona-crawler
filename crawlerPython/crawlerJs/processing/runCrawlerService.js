import {PythonShell} from "python-shell"
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const crawlerRoot = path.resolve(__dirname, "../..");

const pythonExecutable = process.platform === "win32"
  ? path.join(crawlerRoot, ".venv", "Scripts", "python.exe")
  : path.join(crawlerRoot, ".venv", "bin", "python");

const scriptFile = path.join(crawlerRoot, "src", "crawlerProcessing.py");

class CrawlService{
  static async crawl(url)
  {
    try{

      const result = await PythonShell.run(scriptFile, {
        pythonPath: pythonExecutable,
        args: ["--url", url],
      });
      const output = result.join("\n").trim();

      if (!output) {
        throw new Error("Crawler returned no output.");
      }

      return JSON.parse(output);
    }
    catch(error)
    {
      throw new Error(`Crawler failed for ${url}: ${error.message}`);

    }
    
  }
}
export default CrawlService

