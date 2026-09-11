export const assertRuntimeEnv = () => {
  if (!process.env.GITHUB_KEY || process.env.GITHUB_KEY === "your_github_token_here") {
    console.error("Fatal: GITHUB_KEY is missing or still a placeholder. Set a real GitHub token in your env file.");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("Fatal: DATABASE_URL is not configured.");
    process.exit(1);
  }
  if (!process.env.DIRECT_URL) {
    console.error("Fatal: DIRECT_URL is not configured.");
    process.exit(1);
  }
};
