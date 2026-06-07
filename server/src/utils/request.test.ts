import { getQueryValue } from "./request.js";

describe("getQueryValue",()=>{
   it("should return the string value if string type value is passed in arguments",()=>{
      const result = getQueryValue("test-string");
      expect(result).toBe("test-string");
   });

   it("should return an empty string if non-string value is passed in arguments",()=>{
      expect(getQueryValue(123)).toBe("");
      expect(getQueryValue({name:"John"})).toBe("");
      expect(getQueryValue([1,2,3])).toBe("");
      expect(getQueryValue(null)).toBe("");
      expect(getQueryValue(undefined)).toBe("");
   })
})