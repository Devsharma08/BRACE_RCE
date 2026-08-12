import { WrapperGenerator } from "./src/utils/wrapperGenerator.js";

const wrappers = WrapperGenerator.generateAll({
  funcName: "kClosest",
  returnType: "int[][]",
  args: [
    { name: "points", type: "int[][]" },
    { name: "k", type: "int" }
  ]
});

console.log(JSON.stringify(wrappers, null, 2));
