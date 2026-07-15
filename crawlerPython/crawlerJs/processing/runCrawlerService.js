import {PythonShell} from "python-shell"
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootdir=path.resolve(__dirname,"../../")

const pythonExecutable = process.platform === "win32"
  ? path.join(rootdir, ".venv", "Scripts", "python.exe")
  : path.join(rootdir, ".venv", "bin", "python")


const scriptFile=path.join(rootdir,"src","crawlerProcessing.py")

class CrawlService{
  static async crawl(url)
  {
    try{

    const result=await PythonShell.run(scriptFile,{
      pythonPath:pythonExecutable,
      args:["--url",url]

    })
    if(!result.length)
    {
      throw new Error("crwaler returned no output")
    }
    return JSON.parse(result)
    }
    catch(error)
    {
      throw new Error(`crawler failed for ${url} for ${error.message}`)

    }
    
  }
}
export default CrawlService


