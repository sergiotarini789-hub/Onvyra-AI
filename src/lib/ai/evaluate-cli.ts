import { runAIEvaluation } from "./evaluate";

async function main() {
  console.log("Running AI Evaluation - 100 synthetic cases...");
  console.log("=".repeat(60));
  const result = await runAIEvaluation();
  console.log(`\nTotal cases: ${result.total}`);
  console.log(`Passed: ${result.passed}`);
  console.log(`Failed: ${result.failed}`);
  console.log(`Invalid JSON: ${result.invalidJson}`);
  console.log(`Hallucination violations: ${result.hallucinationViolations}`);
  console.log(`\nPass rate: ${((result.passed / result.total) * 100).toFixed(1)}%`);
  console.log("=".repeat(60));

  const failed = result.details.filter((d) => !d.passed);
  if (failed.length > 0) {
    console.log("\nFailed cases (first 10):");
    for (const f of failed.slice(0, 10)) {
      console.log(`- ${f.id}: ${f.reason}`);
    }
  }

  const hallucinations = result.details.filter((d) => d.hallucination);
  if (hallucinations.length > 0) {
    console.log("\nHallucination violations:");
    for (const h of hallucinations.slice(0, 10)) {
      console.log(`- ${h.id}: ${h.reason}`);
      console.log(`  Message: ${h.message?.slice(0, 100)}...`);
    }
  }

  console.log("\nEvaluation complete.");
  if (result.failed > 20) {
    console.log("WARNING: High failure rate - review AI prompts and scoring");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Evaluation failed", e);
  process.exit(1);
});
