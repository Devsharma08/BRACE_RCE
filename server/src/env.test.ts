import { jest } from "@jest/globals";
import dotenv from "dotenv";

describe("env.ts module", () => {
  let warnSpy: any;
  let dotenvSpy: any;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    dotenvSpy = jest.spyOn(dotenv, "config").mockReturnValue({});
  });

  afterEach(() => {
    process.env = originalEnv;
    warnSpy.mockRestore();
    dotenvSpy.mockRestore();
  });

  it("should warn if required env variables are missing", async () => {
    delete process.env.DIRECT_URL;
    delete process.env.DATABASE_URL;
    delete process.env.GITHUB_KEY;
    await import(`./env.js?test=missing-${Date.now()}`);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Missing required environment variable: DIRECT_URL")
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Missing required environment variable: DATABASE_URL")
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Missing required environment variable: GITHUB_KEY")
    );
  });

  it("should warn if required env variables contain placeholder values", async () => {
    process.env.DIRECT_URL = "your_direct_url";
    process.env.DATABASE_URL = "your_database_url";
    process.env.GITHUB_KEY = "your_github_key";

    await import(`./env.js?test=placeholder-${Date.now()}`);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Environment variable DIRECT_URL appears to be a placeholder value")
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Environment variable DATABASE_URL appears to be a placeholder value")
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Environment variable GITHUB_KEY appears to be a placeholder value")
    );
  });
});
