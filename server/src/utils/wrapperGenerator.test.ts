import { describe, test, expect } from "@jest/globals";
import { WrapperGenerator } from "./wrapperGenerator.js";
import type { ProblemSignature } from "./wrapperGenerator.js";

describe("WrapperGenerator Utility", () => {
  const sampleSignature: ProblemSignature = {
    funcName: "twoSum",
    returnType: "int[]",
    args: [
      { name: "nums", type: "int[]" },
      { name: "target", type: "int" },
    ],
  };

  test("should generate all 5 supported language wrappers", () => {
    const wrappers = WrapperGenerator.generateAll(sampleSignature);
    expect(wrappers).toHaveLength(5);
    const languages = wrappers.map((w) => w.language);
    expect(languages).toEqual(["javascript", "python", "java", "cpp", "c"]);
  });

  test("should generate valid JavaScript wrapper with parameter parsing", () => {
    const jsWrapper = WrapperGenerator.generateJavaScript(sampleSignature);
    expect(jsWrapper.code).toContain("var twoSum = function(nums, target)");
    expect(jsWrapper.wrapperCode).toContain("const nums = JSON.parse(input[0]);");
    expect(jsWrapper.wrapperCode).toContain("const target = JSON.parse(input[1]);");
  });

  test("should generate valid Python wrapper with json input reading", () => {
    const pyWrapper = WrapperGenerator.generatePython(sampleSignature);
    expect(pyWrapper.code).toContain("def twoSum(nums, target):");
    expect(pyWrapper.wrapperCode).toContain("nums = json.loads(input_lines[0])");
    expect(pyWrapper.wrapperCode).toContain("target = json.loads(input_lines[1])");
  });
});
