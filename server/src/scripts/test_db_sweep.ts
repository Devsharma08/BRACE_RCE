import { executeDirectly } from '../services/directExecute.js';
import { SANDBOX_BUDGETS } from '../services/codeExecution.js';

async function main() {
  console.log('=== DB SWEEP TEST ===\n');

  const input = '2,7,11,15\n9';

  console.log('Testing JavaScript Two Sum...');
  const jsCode = `
const input = require('fs').readFileSync('/dev/stdin', 'utf8').trim().split('\\n');
const nums = JSON.parse(input[0]);
const target = parseInt(input[1]);
for (let i = 0; i < nums.length; i++) {
  for (let j = i + 1; j < nums.length; j++) {
    if (nums[i] + nums[j] === target) {
      console.log([i, j]);
      return;
    }
  }
}
console.log("[]");
`;
  const jsResult = await executeDirectly('javascript', jsCode, input, SANDBOX_BUDGETS.javascript.runTimeoutMs, SANDBOX_BUDGETS.javascript.compileTimeoutMs);
  console.log('JS Two Sum: exitCode=' + jsResult.exitCode + ', stdout=' + jsResult.stdout.trim(), jsResult.stderr?.substring(0,100));

  // Python Two Sum
  const pyCode = `
import sys
d = sys.stdin.read().strip().split('\\n')
nums = list(map(int, d[0].split(',')))
target = int(d[1])
for i in range(len(nums)):
    for j in range(i+1, len(nums)):
        if nums[i] + nums[j] == target:
            print([i, j])
            sys.exit(0)
print([])
`;
  console.log('Testing Python Two Sum...');
  const pyResult = await executeDirectly('python', pyCode, input, SANDBOX_BUDGETS.python.runTimeoutMs, SANDBOX_BUDGETS.python.compileTimeoutMs);
  console.log('Python Two Sum: exitCode=' + pyResult.exitCode + ', stdout=' + pyResult.stdout.trim(), pyResult.stderr?.substring(0,100));

  // Java Two Sum
  const javaCode = `
import java.util.*;
public class Main {
  public static void main(String[] a) {
    java.util.Scanner s = new java.util.Scanner(System.in);
    String line1 = s.nextLine();
    String line2 = s.nextLine();
    String[] parts = line1.split(",");
    int[] nums = new int[parts.length];
    for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);
    int target = Integer.parseInt(line2);
    for (int i = 0; i < nums.length; i++) {
      for (int j = i + 1; j < nums.length; j++) {
        if (nums[i] + nums[j] == target) {
          System.out.println("[" + i + ", " + j + "]");
          return;
        }
      }
    }
    System.out.println("[]");
  }
}
`;
  console.log('Testing Java Two Sum...');
  const javaResult = await executeDirectly('java', javaCode, input, SANDBOX_BUDGETS.java.runTimeoutMs, SANDBOX_BUDGETS.java.compileTimeoutMs);
  console.log('Java Two Sum: exitCode=' + javaResult.exitCode + ', stdout=' + javaResult.stdout.trim(), javaResult.stderr?.substring(0,100));

  // C++ Two Sum
  const cppCode = `
#include <iostream>
#include <vector>
#include <string>
#include <sstream>
int main(int argc, char* argv[]) {
  std::string line1, line2;
  std::getline(std::cin, line1);
  std::getline(std::cin, line2);
  std::vector<int> nums;
  std::stringstream ss(line1);
  std::string item;
  while (std::getline(ss, item, ',')) {
    nums.push_back(std::stoi(item));
  }
  int target = std::stoi(line2);
  for (size_t i = 0; i < nums.size(); i++) {
    for (size_t j = i + 1; j < nums.size(); j++) {
      if (nums[i] + nums[j] == target) {
        std::cout << "[" << i << ", " << j << "]" << std::endl;
        return 0;
      }
    }
  }
  std::cout << "[]" << std::endl;
  return 0;
}
`;
  console.log('Testing C++ Two Sum...');
  const cppResult = await executeDirectly('cpp', cppCode, input, SANDBOX_BUDGETS.cpp.runTimeoutMs, SANDBOX_BUDGETS.cpp.compileTimeoutMs);
  console.log('C++ Two Sum: exitCode=' + cppResult.exitCode + ', stdout=' + cppResult.stdout.trim(), cppResult.stderr?.substring(0,100));

  console.log('\\n=== SWEEP COMPLETE ===');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });