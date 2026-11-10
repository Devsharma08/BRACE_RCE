import { executeDirectly } from '../services/directExecute.js';
import { SANDBOX_BUDGETS } from '../services/codeExecution.js';

async function main() {
  console.log('=== DB SWEEP TEST ===\n');
  
  // Test 1: Two Sum in JavaScript
  const jsCode = `
const arr = JSON.parse(process.argv[2]);
const target = parseInt(process.argv[3]);
for (let i = 0; i < arr.length; i++) {
  for (let j = i + 1; j < arr.length; j++) {
    if (arr[i] + arr[j] === target) {
      console.log([i, j]);
      return;
    }
  }
}
console.log("[]");
`;
  
  console.log('Testing JavaScript Two Sum...');
  const jsResult = await executeDirectly('javascript', jsCode, JSON.stringify([2,7,11,15]) + ' ' + 9, SANDBOX_BUDGETS.javascript.runTimeoutMs, SANDBOX_BUDGETS.javascript.compileTimeoutMs);
  console.log('JS Two Sum:', jsResult.exitCode, jsResult.stdout.trim(), jsResult.stderr?.substring(0,100));
  
  // Test 2: Two Sum in Python
  const pyCode = `
import sys
nums = list(map(int, sys.argv[1].split(',')))
target = int(sys.argv[2])
for i in range(len(nums)):
    for j in range(i+1, len(nums)):
        if nums[i] + nums[j] == target:
            print([i, j])
            sys.exit(0)
print([])
`;
  
  console.log('\nTesting Python Two Sum...');
  const pyResult = await executeDirectly('python', pyCode, '2,7,11,15 ' + 9, SANDBOX_BUDGETS.python.runTimeoutMs, SANDBOX_BUDGETS.python.compileTimeoutMs);
  console.log('Python Two Sum:', pyResult.exitCode, pyResult.stdout.trim(), pyResult.stderr?.substring(0,100));
  
  // Test 3: Two Sum in Java
  const javaCode = `
import java.util.*;
public class Main {
  public static void main(String[] args) {
    String[] parts = args[0].split(",");
    int[] nums = new int[parts.length];
    for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);
    int target = Integer.parseInt(args[1]);
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
  
  console.log('\nTesting Java Two Sum...');
  const javaResult = await executeDirectly('java', javaCode, '2,7,11,15 ' + 9, SANDBOX_BUDGETS.java.runTimeoutMs, SANDBOX_BUDGETS.java.compileTimeoutMs);
  console.log('Java Two Sum:', javaResult.exitCode, javaResult.stdout.trim(), javaResult.stderr?.substring(0,100));
  
  // Test 4: Two Sum in C++
  const cppCode = `
#include <iostream>
#include <vector>
#include <string>
#include <sstream>
int main(int argc, char* argv[]) {
  std::string input = argv[1];
  std::stringstream ss(input);
  std::vector<int> nums;
  std::string item;
  while (std::getline(ss, item, ',')) {
    nums.push_back(std::stoi(item));
  }
  int target = std::stoi(argv[2]);
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
  
  console.log('\nTesting C++ Two Sum...');
  const cppResult = await executeDirectly('cpp', cppCode, '2,7,11,15 ' + 9, SANDBOX_BUDGETS.cpp.runTimeoutMs, SANDBOX_BUDGETS.cpp.compileTimeoutMs);
  console.log('C++ Two Sum:', cppResult.exitCode, cppResult.stdout.trim(), cppResult.stderr?.substring(0,100));
  
  console.log('\n=== SWEEP COMPLETE ===');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
