module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": "ts-jest", 
  },
  moduleFileExtensions: ["ts", "js", "json", "node"],
  testMatch: ["**/src/tests/**/*.test.ts"], 
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1", 
  },
};
