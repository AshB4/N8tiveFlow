/** @format */

// /scripts/seoChecker.js
const { runSeoCheck } = require("./seoCheckRunner.js");

(async () => {
        let chalk;
        try {
                chalk = (await import("chalk")).default;
        } catch {
                chalk = {
                        red: (s) => s,
                        cyan: (s) => s,
                        yellow: (s) => s,
                        green: (s) => s,
                };
        }

        const productKey = process.argv[2];
        const result = runSeoCheck(productKey);

        if (!result.ok) {
                console.error(chalk.red(result.error));
                process.exit(1);
        }

        console.log(chalk.cyan(`🔍 SEO Preflight Check: ${result.meta.title}`));
        console.log("———————————————————————————————");

        console.log(chalk.yellow("Meta Tags Preview"));
        console.log("• Title:", result.meta.title);
        console.log("• Description:", result.meta.description);
        console.log("• Image:", result.meta.image);
        console.log("• URL:", result.meta.url);

        console.log("\n" + chalk.yellow("Schema Markup Snippet (JSON-LD)"));
        console.log(JSON.stringify(result.schema, null, 2));

        console.log("\n" + chalk.green("✅ Manual steps to follow:"));
        Object.entries(result.todoLinks).forEach(([label, url]) =>
                console.log(`• [${label}] → ${url}`)
        );

        // To use later in terminal make a button for normies:
        // node scripts/seoChecker.js prompt-storm
})();
