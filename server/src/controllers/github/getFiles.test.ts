import { jest } from "@jest/globals";
import type { Request, Response } from "express";
import { getFiles } from "./getFiles.js";
import { internalCache } from "../../lib/cache.js";
import { CACHE_KEYS } from "../../config/github.js";

describe("getFiles controller", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: any;
  let statusMock: any;
  let setMock: any;
  let fetchSpy: any;

  beforeEach(() => {
    req = {};
    jsonMock = jest.fn().mockReturnThis();
    statusMock = jest.fn().mockReturnThis();
    setMock = jest.fn().mockReturnThis();
    res = {
      status: statusMock,
      json: jsonMock,
      set: setMock,
    };

    // Spy on the global fetch method
    fetchSpy = jest.spyOn(globalThis, "fetch");
    
    // Clear the cache before each test run
    internalCache.flushAll();
  });

  afterEach(() => {
    // Restore all spies so they do not leak into other files
    jest.restoreAllMocks();
  });

  it("should return cached files immediately if available and skip fetching", async () => {
    const mockCacheData = [{ name: "file1.txt", downloadUrl: "url", type: "file", path: "file1.txt" }];
    internalCache.set(CACHE_KEYS.files, mockCacheData);

    await getFiles(req as Request, res as Response);

    expect(setMock).toHaveBeenCalledWith("Cache-Control", "public,max-age=600");
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(mockCacheData);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("should fetch files from GitHub if not cached, clean/format the response, cache it, and return 200", async () => {
    const mockGitHubData = [
      { name: "file1.txt", download_url: "url1", type: "file", path: "file1.txt", extra_field: "ignored" }
    ];

    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => mockGitHubData,
    });

    await getFiles(req as Request, res as Response);

    const expectedCleanData = [{ name: "file1.txt", downloadUrl: "url1", type: "file", path: "file1.txt" }];

    expect(fetchSpy).toHaveBeenCalled();
    expect(internalCache.get(CACHE_KEYS.files)).toEqual(expectedCleanData);
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(expectedCleanData);
  });

  it("should return correct status code and message if GitHub API fails", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });
   
    // Suppress console.error log pollution during the test run
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await getFiles(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith({ error: "GitHub request failed with status 404" });
    
    consoleErrorSpy.mockRestore();
  });
});
