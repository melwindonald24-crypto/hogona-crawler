console.log(`Hogona discovery and enrichment pipeline

Run one explicit stage at a time:
  npm run discover            Collect Serper Places evidence for Karnataka.
  npm run queue               Create deduplicated manual-enrichment jobs.
  npm run export -- 3         Write a ChatGPT-ready batch of up to 10 jobs.
  npm run import -- <file>    Import a source-backed ChatGPT JSON result.
  npm test                    Run the unit tests.

See README.md for the full workflow.`);
