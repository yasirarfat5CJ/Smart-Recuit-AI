const q = (title, difficulty, platform, slug, pattern) => ({
  title,
  difficulty,
  platform,
  url: platform === "LeetCode"
    ? `https://leetcode.com/problems/${slug}/`
    : `https://www.geeksforgeeks.org/problems/${slug}/1`,
  pattern
});

export const dsaTopics = [
  {
    id: "arrays",
    name: "Arrays",
    focus: "Hashing, prefix logic, two pointers, intervals",
    questions: [
      q("Two Sum", "Easy", "LeetCode", "two-sum", "Hash map"),
      q("Best Time to Buy and Sell Stock", "Easy", "LeetCode", "best-time-to-buy-and-sell-stock", "Running minimum"),
      q("Contains Duplicate", "Easy", "LeetCode", "contains-duplicate", "Hash set"),
      q("Product of Array Except Self", "Medium", "LeetCode", "product-of-array-except-self", "Prefix and suffix"),
      q("Maximum Subarray", "Medium", "LeetCode", "maximum-subarray", "Kadane"),
      q("Merge Intervals", "Medium", "LeetCode", "merge-intervals", "Sorting intervals"),
      q("3Sum", "Medium", "LeetCode", "3sum", "Two pointers"),
      q("Container With Most Water", "Medium", "LeetCode", "container-with-most-water", "Two pointers"),
      q("Kadane's Algorithm", "Medium", "GFG", "kadanes-algorithm-1587115620", "Dynamic subarray"),
      q("Count Pairs With Given Sum", "Medium", "GFG", "count-pairs-with-given-sum5022", "Frequency map")
    ]
  },
  {
    id: "strings",
    name: "Strings",
    focus: "Frequency maps, windows, parsing, palindromes",
    questions: [
      q("Valid Anagram", "Easy", "LeetCode", "valid-anagram", "Frequency count"),
      q("Valid Palindrome", "Easy", "LeetCode", "valid-palindrome", "Two pointers"),
      q("Longest Substring Without Repeating Characters", "Medium", "LeetCode", "longest-substring-without-repeating-characters", "Sliding window"),
      q("Group Anagrams", "Medium", "LeetCode", "group-anagrams", "Hash key"),
      q("Longest Palindromic Substring", "Medium", "LeetCode", "longest-palindromic-substring", "Expand around center"),
      q("Minimum Window Substring", "Hard", "LeetCode", "minimum-window-substring", "Sliding window"),
      q("String to Integer", "Medium", "LeetCode", "string-to-integer-atoi", "Parsing"),
      q("Longest Common Prefix", "Easy", "LeetCode", "longest-common-prefix", "Prefix scan"),
      q("Anagram", "Easy", "GFG", "anagram-1587115620", "Frequency count"),
      q("Check if Strings are Rotations of Each Other", "Easy", "GFG", "check-if-strings-are-rotations-of-each-other-or-not-1587115620", "String matching")
    ]
  },
  {
    id: "linked-list",
    name: "Linked List",
    focus: "Pointers, reversal, cycle detection, merge logic",
    questions: [
      q("Reverse Linked List", "Easy", "LeetCode", "reverse-linked-list", "Three pointers"),
      q("Merge Two Sorted Lists", "Easy", "LeetCode", "merge-two-sorted-lists", "Dummy node"),
      q("Linked List Cycle", "Easy", "LeetCode", "linked-list-cycle", "Floyd cycle"),
      q("Remove Nth Node From End of List", "Medium", "LeetCode", "remove-nth-node-from-end-of-list", "Fast and slow"),
      q("Reorder List", "Medium", "LeetCode", "reorder-list", "Middle reverse merge"),
      q("Add Two Numbers", "Medium", "LeetCode", "add-two-numbers", "Carry simulation"),
      q("Intersection of Two Linked Lists", "Easy", "LeetCode", "intersection-of-two-linked-lists", "Pointer switching"),
      q("Palindrome Linked List", "Easy", "LeetCode", "palindrome-linked-list", "Reverse second half"),
      q("Detect Loop in Linked List", "Easy", "GFG", "detect-loop-in-linked-list", "Floyd cycle"),
      q("Merge Two Sorted Linked Lists", "Medium", "GFG", "merge-two-sorted-linked-lists", "Pointer merge")
    ]
  },
  {
    id: "stack-queue",
    name: "Stack & Queue",
    focus: "Monotonic stack, parsing, queue simulation",
    questions: [
      q("Valid Parentheses", "Easy", "LeetCode", "valid-parentheses", "Stack matching"),
      q("Min Stack", "Medium", "LeetCode", "min-stack", "Auxiliary stack"),
      q("Daily Temperatures", "Medium", "LeetCode", "daily-temperatures", "Monotonic stack"),
      q("Evaluate Reverse Polish Notation", "Medium", "LeetCode", "evaluate-reverse-polish-notation", "Expression stack"),
      q("Next Greater Element I", "Easy", "LeetCode", "next-greater-element-i", "Monotonic stack"),
      q("Largest Rectangle in Histogram", "Hard", "LeetCode", "largest-rectangle-in-histogram", "Monotonic stack"),
      q("Implement Queue using Stacks", "Easy", "LeetCode", "implement-queue-using-stacks", "Two stacks"),
      q("Sliding Window Maximum", "Hard", "LeetCode", "sliding-window-maximum", "Deque"),
      q("Parenthesis Checker", "Easy", "GFG", "parenthesis-checker2744", "Stack matching"),
      q("Next Larger Element", "Medium", "GFG", "next-larger-element-1587115620", "Monotonic stack")
    ]
  },
  {
    id: "trees",
    name: "Trees",
    focus: "DFS, BFS, BST validation, recursion",
    questions: [
      q("Maximum Depth of Binary Tree", "Easy", "LeetCode", "maximum-depth-of-binary-tree", "DFS height"),
      q("Invert Binary Tree", "Easy", "LeetCode", "invert-binary-tree", "Recursive swap"),
      q("Same Tree", "Easy", "LeetCode", "same-tree", "DFS compare"),
      q("Binary Tree Level Order Traversal", "Medium", "LeetCode", "binary-tree-level-order-traversal", "BFS"),
      q("Validate Binary Search Tree", "Medium", "LeetCode", "validate-binary-search-tree", "Range recursion"),
      q("Lowest Common Ancestor of a Binary Search Tree", "Medium", "LeetCode", "lowest-common-ancestor-of-a-binary-search-tree", "BST traversal"),
      q("Construct Binary Tree from Preorder and Inorder Traversal", "Medium", "LeetCode", "construct-binary-tree-from-preorder-and-inorder-traversal", "Tree construction"),
      q("Binary Tree Maximum Path Sum", "Hard", "LeetCode", "binary-tree-maximum-path-sum", "Postorder DP"),
      q("Height of Binary Tree", "Easy", "GFG", "height-of-binary-tree", "DFS height"),
      q("Check for BST", "Medium", "GFG", "check-for-bst", "Range recursion")
    ]
  },
  {
    id: "math",
    name: "Math",
    focus: "Number theory, modular arithmetic, bit tricks, simulation",
    questions: [
      q("Palindrome Number", "Easy", "LeetCode", "palindrome-number", "Digit reversal"),
      q("Reverse Integer", "Medium", "LeetCode", "reverse-integer", "Overflow handling"),
      q("Pow(x, n)", "Medium", "LeetCode", "powx-n", "Fast exponentiation"),
      q("Sqrt(x)", "Easy", "LeetCode", "sqrtx", "Binary search math"),
      q("Plus One", "Easy", "LeetCode", "plus-one", "Carry simulation"),
      q("Happy Number", "Easy", "LeetCode", "happy-number", "Cycle detection"),
      q("Count Primes", "Medium", "LeetCode", "count-primes", "Sieve"),
      q("Excel Sheet Column Number", "Easy", "LeetCode", "excel-sheet-column-number", "Base conversion"),
      q("Armstrong Numbers", "Easy", "GFG", "armstrong-numbers2727", "Digit power sum"),
      q("LCM And GCD", "Easy", "GFG", "lcm-and-gcd4516", "Euclidean algorithm")
    ]
  },
  {
    id: "binary-search",
    name: "Binary Search",
    focus: "Sorted search, rotated arrays, answer space",
    questions: [
      q("Binary Search", "Easy", "LeetCode", "binary-search", "Classic search"),
      q("Search Insert Position", "Easy", "LeetCode", "search-insert-position", "Lower bound"),
      q("Search in Rotated Sorted Array", "Medium", "LeetCode", "search-in-rotated-sorted-array", "Rotated search"),
      q("Find Minimum in Rotated Sorted Array", "Medium", "LeetCode", "find-minimum-in-rotated-sorted-array", "Pivot search"),
      q("Find First and Last Position of Element in Sorted Array", "Medium", "LeetCode", "find-first-and-last-position-of-element-in-sorted-array", "Boundary search"),
      q("Median of Two Sorted Arrays", "Hard", "LeetCode", "median-of-two-sorted-arrays", "Partition search"),
      q("Koko Eating Bananas", "Medium", "LeetCode", "koko-eating-bananas", "Binary search answer"),
      q("Capacity To Ship Packages Within D Days", "Medium", "LeetCode", "capacity-to-ship-packages-within-d-days", "Binary search answer"),
      q("Aggressive Cows", "Medium", "GFG", "aggressive-cows", "Binary search answer"),
      q("Square Root", "Easy", "GFG", "square-root", "Binary search answer")
    ]
  },
  {
    id: "heap",
    name: "Heap",
    focus: "Top K, priority queues, streaming data",
    questions: [
      q("Kth Largest Element in an Array", "Medium", "LeetCode", "kth-largest-element-in-an-array", "Min heap"),
      q("Top K Frequent Elements", "Medium", "LeetCode", "top-k-frequent-elements", "Heap or bucket"),
      q("Find Median from Data Stream", "Hard", "LeetCode", "find-median-from-data-stream", "Two heaps"),
      q("Merge K Sorted Lists", "Hard", "LeetCode", "merge-k-sorted-lists", "Min heap"),
      q("Task Scheduler", "Medium", "LeetCode", "task-scheduler", "Max heap"),
      q("Last Stone Weight", "Easy", "LeetCode", "last-stone-weight", "Max heap"),
      q("K Closest Points to Origin", "Medium", "LeetCode", "k-closest-points-to-origin", "Heap selection"),
      q("Reorganize String", "Medium", "LeetCode", "reorganize-string", "Greedy heap"),
      q("Kth Largest Element in a Stream", "Easy", "LeetCode", "kth-largest-element-in-a-stream", "Fixed min heap"),
      q("Kth Smallest Element", "Medium", "GFG", "kth-smallest-element5635", "Max heap")
    ]
  },
  {
    id: "backtracking",
    name: "Backtracking",
    focus: "Choices, constraints, recursion trees",
    questions: [
      q("Subsets", "Medium", "LeetCode", "subsets", "Include/exclude"),
      q("Combination Sum", "Medium", "LeetCode", "combination-sum", "Choice recursion"),
      q("Permutations", "Medium", "LeetCode", "permutations", "Used set"),
      q("Letter Combinations of a Phone Number", "Medium", "LeetCode", "letter-combinations-of-a-phone-number", "DFS combinations"),
      q("Generate Parentheses", "Medium", "LeetCode", "generate-parentheses", "Constraint recursion"),
      q("Word Search", "Medium", "LeetCode", "word-search", "Grid backtracking"),
      q("Palindrome Partitioning", "Medium", "LeetCode", "palindrome-partitioning", "Partition recursion"),
      q("N-Queens", "Hard", "LeetCode", "n-queens", "Constraint placement"),
      q("Rat in a Maze Problem", "Medium", "GFG", "rat-in-a-maze-problem", "Grid backtracking"),
      q("Solve the Sudoku", "Hard", "GFG", "solve-the-sudoku-1587115621", "Constraint backtracking")
    ]
  }
];

export const allDsaQuestions = dsaTopics.flatMap((topic) =>
  topic.questions.map((question) => ({
    ...question,
    topicId: topic.id,
    topicName: topic.name
  }))
);
