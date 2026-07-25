import { paginate } from "../pagination";

const items = [1, 2, 3, 4, 5, 6, 7];

describe("paginate", () => {
  test("page 1 returns the first pageSize items", () => {
    expect(paginate(items, 1, 3)).toEqual([1, 2, 3]);
  });

  test("page 2 returns the next block", () => {
    expect(paginate(items, 2, 3)).toEqual([4, 5, 6]);
  });

  test("the last page may be partial", () => {
    expect(paginate(items, 3, 3)).toEqual([7]);
  });

  test("a page past the end is empty", () => {
    expect(paginate(items, 4, 3)).toEqual([]);
  });

  test("a pageSize larger than the list returns everything on page 1", () => {
    expect(paginate(items, 1, 100)).toEqual(items);
  });
});
