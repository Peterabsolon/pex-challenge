const Immutable = require("immutable");
const assert = require("assert");

/**
 * Could have used native "new Set()" as well
 */
function toSet(list) {
  return Immutable.Set(list);
}

/**
 * Joins errors list into a trimmed, period separated string
 * containing only unique errors by using Set to remove duplicates
 */
function joinErrors(errorsList) {
  return [...toSet(errorsList)]
    .map(error => `${error}. `)
    .join("")
    .trim();
}

/**
 * Flattens errors map/list and returns a single string error
 */
function mergeErrors(errors) {
  return joinErrors(errors.flatten().toList());
}

/**
 * Traverses errors map recursively and joins list entries into a single string
 */
function preserveAndJoinErrors(errors) {
  return errors.map(entry => {
    if (Immutable.List.isList(entry)) {
      return joinErrors(entry);
    } else {
      return preserveAndJoinErrors(entry);
    }
  });
}

/**
 * Main
 */
function transformErrors(errors, preserveKeysSet) {
  return errors.mapEntries(([key, entry]) => {
    // O(1) lookup time using Set
    if (preserveKeysSet.has(key)) {
      return [key, preserveAndJoinErrors(entry)];
    }

    return [key, mergeErrors(entry)];
  });
}

it("should tranform errors", () => {
  // example error object returned from API converted to Immutable.Map
  const errors = Immutable.fromJS({
    name: ["This field is required"],
    age: ["This field is required", "Only numeric characters are allowed"],
    urls: [
      {},
      {},
      {
        site: {
          code: ["This site code is invalid"],
          id: ["Unsupported id"]
        }
      }
    ],
    url: {
      site: {
        code: ["This site code is invalid"],
        id: ["Unsupported id"]
      }
    },
    tags: [
      {},
      {
        non_field_errors: ["Only alphanumeric characters are allowed"],
        another_error: ["Only alphanumeric characters are allowed"],
        third_error: ["Third error"]
      },
      {},
      {
        non_field_errors: [
          "Minumum length of 10 characters is required",
          "Only alphanumeric characters are allowed"
        ]
      }
    ],
    tag: {
      nested: {
        non_field_errors: ["Only alphanumeric characters are allowed"]
      }
    }
  });

  // in this specific case,
  // errors for `url` and `urls` keys should be nested
  // see expected object below
  const result = transformErrors(errors, toSet(["url", "urls"]));

  assert.deepEqual(result.toJS(), {
    name: "This field is required.",
    age: "This field is required. Only numeric characters are allowed.",
    urls: [
      {},
      {},
      {
        site: {
          code: "This site code is invalid.",
          id: "Unsupported id."
        }
      }
    ],
    url: {
      site: {
        code: "This site code is invalid.",
        id: "Unsupported id."
      }
    },
    tags:
      "Only alphanumeric characters are allowed. Third error. " +
      "Minumum length of 10 characters is required.",
    tag: "Only alphanumeric characters are allowed."
  });
});
