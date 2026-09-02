/**
 * Benchmark tasks: small, self-contained JavaScript functions with executable
 * assertions. Each task is scored objectively — the model's code either passes
 * every assertion or it doesn't. No LLM-as-judge, no subjective rubric.
 *
 * Mix is deliberate: `general` tasks are ordinary programming; `agentic` tasks
 * lean toward the tooling/orchestration shapes RuvLTRA claims to specialise in
 * ("Claude Code workflows, agentic coding"), so the fine-tune gets a fair shot
 * at the domain it was tuned for.
 */

module.exports = [
  {
    id: 'reverse-string', category: 'general', fn: 'reverseString',
    prompt: 'Write a JavaScript function named reverseString(str) that returns the string reversed. Reply with code only.',
    tests: [
      ['reverseString("hello")', 'olleh'],
      ['reverseString("")', ''],
      ['reverseString("a")', 'a'],
    ],
  },
  {
    id: 'sum-even', category: 'general', fn: 'sumEven',
    prompt: 'Write a JavaScript function named sumEven(numbers) that returns the sum of all even numbers in an array. Reply with code only.',
    tests: [
      ['sumEven([1,2,3,4])', 6],
      ['sumEven([])', 0],
      ['sumEven([1,3,5])', 0],
      ['sumEven([-2,-4,1])', -6],
    ],
  },
  {
    id: 'is-palindrome', category: 'general', fn: 'isPalindrome',
    prompt: 'Write a JavaScript function named isPalindrome(str) that returns true if the string is a palindrome, ignoring case and non-alphanumeric characters. Reply with code only.',
    tests: [
      ['isPalindrome("A man, a plan, a canal: Panama")', true],
      ['isPalindrome("hello")', false],
      ['isPalindrome("")', true],
    ],
  },
  {
    id: 'fizzbuzz', category: 'general', fn: 'fizzbuzz',
    prompt: 'Write a JavaScript function named fizzbuzz(n) that returns "Fizz" if n is divisible by 3, "Buzz" if divisible by 5, "FizzBuzz" if divisible by both, otherwise the number as a string. Reply with code only.',
    tests: [
      ['fizzbuzz(3)', 'Fizz'], ['fizzbuzz(5)', 'Buzz'],
      ['fizzbuzz(15)', 'FizzBuzz'], ['fizzbuzz(7)', '7'],
    ],
  },
  {
    id: 'group-by', category: 'general', fn: 'groupBy',
    prompt: 'Write a JavaScript function named groupBy(items, keyFn) that groups array items into an object keyed by keyFn(item). Reply with code only.',
    tests: [
      ['JSON.stringify(groupBy([1,2,3,4], n => n % 2 === 0 ? "even" : "odd"))', '{"odd":[1,3],"even":[2,4]}'],
      ['JSON.stringify(groupBy([], x => x))', '{}'],
    ],
  },
  {
    id: 'flatten-deep', category: 'general', fn: 'flattenDeep',
    prompt: 'Write a JavaScript function named flattenDeep(arr) that fully flattens a nested array to a single level. Reply with code only.',
    tests: [
      ['JSON.stringify(flattenDeep([1,[2,[3,[4]]]]))', '[1,2,3,4]'],
      ['JSON.stringify(flattenDeep([]))', '[]'],
    ],
  },
  {
    id: 'debounce-count', category: 'general', fn: 'chunk',
    prompt: 'Write a JavaScript function named chunk(arr, size) that splits an array into chunks of the given size. Reply with code only.',
    tests: [
      ['JSON.stringify(chunk([1,2,3,4,5], 2))', '[[1,2],[3,4],[5]]'],
      ['JSON.stringify(chunk([], 3))', '[]'],
    ],
  },
  {
    id: 'parse-args', category: 'agentic', fn: 'parseArgs',
    prompt: 'Write a JavaScript function named parseArgs(argv) that parses an array of CLI arguments like ["--name","test","--verbose"] into an object {name:"test", verbose:true}. Flags without a following value are true. Reply with code only.',
    tests: [
      ['JSON.stringify(parseArgs(["--name","test","--verbose"]))', '{"name":"test","verbose":true}'],
      ['JSON.stringify(parseArgs([]))', '{}'],
    ],
  },
  {
    id: 'retry-backoff', category: 'agentic', fn: 'backoffDelays',
    prompt: 'Write a JavaScript function named backoffDelays(attempts, baseMs) that returns an array of exponential backoff delays. For attempts=4 and baseMs=100 it returns [100,200,400,800]. Reply with code only.',
    tests: [
      ['JSON.stringify(backoffDelays(4,100))', '[100,200,400,800]'],
      ['JSON.stringify(backoffDelays(1,50))', '[50]'],
      ['JSON.stringify(backoffDelays(0,100))', '[]'],
    ],
  },
  {
    id: 'tool-schema', category: 'agentic', fn: 'validateToolCall',
    prompt: 'Write a JavaScript function named validateToolCall(call, schema) that returns an array of missing required parameter names. call is {name, params}, schema is {name, required:[...]}. Return [] if all required params are present. Reply with code only.',
    tests: [
      ['JSON.stringify(validateToolCall({name:"read",params:{path:"a"}},{name:"read",required:["path"]}))', '[]'],
      ['JSON.stringify(validateToolCall({name:"read",params:{}},{name:"read",required:["path","mode"]}))', '["path","mode"]'],
    ],
  },
  {
    id: 'diff-lines', category: 'agentic', fn: 'changedLines',
    prompt: 'Write a JavaScript function named changedLines(before, after) that takes two arrays of strings and returns the count of lines present in after but not in before. Reply with code only.',
    tests: [
      ['changedLines(["a","b"],["a","b","c"])', 1],
      ['changedLines(["a"],["a"])', 0],
      ['changedLines([],["x","y"])', 2],
    ],
  },
  {
    id: 'token-budget', category: 'agentic', fn: 'fitBudget',
    prompt: 'Write a JavaScript function named fitBudget(items, budget) that takes an array of {name, tokens} objects and returns the names of items that fit within the token budget, taking items in order until the budget is exceeded. Reply with code only.',
    tests: [
      ['JSON.stringify(fitBudget([{name:"a",tokens:5},{name:"b",tokens:3},{name:"c",tokens:100}],10))', '["a","b"]'],
      ['JSON.stringify(fitBudget([],10))', '[]'],
    ],
  },
];
