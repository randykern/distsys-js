'use strict';


// #region Helpers
const aggregatePromises = require('./aggregatepromises').aggregatePromises;

const TIMEOUT_REQUIRED = 1000;
const TIMEOUT_OPTIONAL = 500;

const DELAY_IMMEDIATE = 0;
const DELAY_FAST = 100;
const DELAY_MEDIUM = 350;
const DELAY_SLOW = 650;
const DELAY_SLOWER = 750;
const DELAY_GLACIAL = 2000;

/**
 * Helper to create  new Promise that will resolve after delay milliseconds.
 * @param {any} tag - Value to pass to resolve. Usually a string.
 * @param {number} delay - Period to wait before resolving the promise.
 */
function resolve(tag, delay) {
  if (delay === DELAY_IMMEDIATE) {
    return new Promise((resolve, reject) => {
      resolve(tag);
    });
  } else {
    return new Promise((resolve, reject) => {
      let id = setTimeout(() => {
        clearTimeout(id);
        resolve(tag);
      }, delay);
    });
  }
}

/**
 * Helper to create  new Promise that will reject after delay milliseconds.
 * @param {any} tag - Value to pass to reject. Usually a string.
 * @param {number} delay - Period to wait before rejecting the promise.
 */
function reject(tag, delay) {
  if (delay === DELAY_IMMEDIATE) {
    return new Promise((resolve, reject) => {
      reject(tag);
    });
  } else {
    return new Promise((resolve, reject) => {
      let id = setTimeout(() => {
        clearTimeout(id);
        reject(tag);
      }, delay);
    });
  }
}

/**
 * Helper function to write Jest unit tests for aggregatePromises.
 * @param {string} name - Test name
 * @param {*} expected - Expected resolve value from aggregatePromises
 * @param {() => [thenable]} required - Function to return an iterable of required promises
 * @param {() => [thenable]} optional - Function to return an iterable of optional promises
 */
function testAP(name, expected, required, optional) {
  test(name, (done) => {
    const ap = aggregatePromises(
      required(),
      TIMEOUT_REQUIRED,
      optional(),
      TIMEOUT_OPTIONAL);

    ap.then((value) => {
      expect(value).toEqual(expected);
      done();
    });
  });
}
// #endregion


// #region Tests for required promises
testAP('Promise aggregator with 1 required immediate resolve, 0 optional',
  {
    required: [
      {
        resolve: 'immediate',
        reject: null
      }
    ],
    optional: []
  },
  () => [resolve('immediate', DELAY_IMMEDIATE)],
  () => []
);

testAP('Promise aggregator with 1 required slow resolve, 0 optional',
  {
    required: [
      {
        resolve: 'slow',
        reject: null
      }
    ],
    optional: []
  },
  () => [resolve('slow', DELAY_SLOW)],
  () => []
);

testAP('Promise aggregator with 1 required resolve which times out, 0 optional',
  {
    required: [
      undefined
    ],
    optional: []
  },
  () => [resolve('glacial', DELAY_GLACIAL)],
  () => []
);

testAP('Promise aggregator with 3 required resolve, 1 fast, 1 slow, 1 timeout, 0 optional',
  {
    required: [
      {
        resolve: 'slow',
        reject: null
      },
      undefined,
      {
        resolve: 'fast',
        reject: null
      }
    ],
    optional: []
  },
  () => [
    resolve('slow', DELAY_SLOW),
    resolve('glacial', DELAY_GLACIAL),
    resolve('fast', DELAY_FAST)
  ],
  () => []
);

testAP('Promise aggregator with 3 required resolve, 2 fast, 1 timeout, 0 optional',
  {
    required: [
      {
        resolve: 'fast',
        reject: null
      },
      undefined,
      {
        resolve: 'immediate',
        reject: null
      }
    ],
    optional: []
  },
  () => [
    resolve('fast', DELAY_FAST),
    resolve('glacial', DELAY_GLACIAL),
    resolve('immediate', DELAY_IMMEDIATE)
  ],
  () => []
);
// #endregion


// #region Tests for optional promises
testAP('Promise aggregator with 1 optional resolve, 0 required',
  {
    optional: [
      {
        resolve: 'fast',
        reject: null
      }
    ],
    required: []
  },
  () => [],
  () => [resolve('fast', DELAY_FAST)]
);

testAP('Promise aggregator with 1 optional slow resolve, 0 required',
  {
    optional: [undefined],
    required: []
  },
  () => [],
  () => [resolve('slow', DELAY_SLOW)]
);

testAP('Promise aggregator with 3 optional resolve, 2 fast, 1 slow, 0 required',
  {
    optional: [
      {
        resolve: 'fast',
        reject: null
      },
      undefined,
      {
        resolve: 'fast',
        reject: null
      }
    ],
    required: []
  },
  () => [],
  () => [
    resolve('fast', DELAY_FAST),
    resolve('slow', DELAY_SLOW),
    resolve('fast', DELAY_FAST)
  ]
);
// #endregion


// #region Tests for mixed (required and optional) promises
testAP('Promise aggregator with 1 fast required promise, and 1 fast optional promise',
  {
    required: [
      {
        resolve: 'fast 1',
        reject: null
      },
    ],
    optional: [
      {
        resolve: 'fast 2',
        reject: null
      },
    ]
  },
  () => [resolve('fast 1', DELAY_FAST)],
  () => [resolve('fast 2', DELAY_FAST)]
);

testAP('Promise aggregator with 1 fast required promise, and 1 slow optional promise',
  {
    required: [
      {
        resolve: 'fast',
        reject: null
      },
    ],
    optional: [
      undefined
    ]
  },
  () => [resolve('fast', DELAY_FAST)],
  () => [resolve('slow', DELAY_SLOW)]
);

testAP('Promise aggregator with 1 slow required promise, and 1 slower optional promise',
  {
    required: [
      {
        resolve: 'slow',
        reject: null
      },
    ],
    optional: [
      undefined
    ]
  },
  () => [resolve('slow', DELAY_SLOW)],
  () => [resolve('slower', DELAY_SLOWER)]
);

testAP('Promise aggregator with 1 slower required promise, and 1 slow optional promise',
  {
    required: [
      {
        resolve: 'slower',
        reject: null
      },
    ],
    optional: [
      {
        resolve: 'slow',
        reject: null
      }
    ]
  },
  () => [resolve('slower', DELAY_SLOWER)],
  () => [resolve('slow', DELAY_SLOW)]
);

testAP('Promise aggregator with 1 fast required promise, 1 slower required promise, and 1 slow optional promise',
  {
    required: [
      {
        resolve: 'slower',
        reject: null
      },
      {
        resolve: 'fast',
        reject: null
      },
    ],
    optional: [
      {
        resolve: 'slow',
        reject: null
      }
    ]
  },
  () => [
    resolve('slower', DELAY_SLOWER),
    resolve('fast', DELAY_FAST)
  ],
  () => [resolve('slow', DELAY_SLOW)]
);
// #endregion

// #region Tests for rejected promises
testAP('Promise aggregator with 1 fast required promise that rejects, and 1 fast optional promise',
  {
    required: [
      {
        resolve: null,
        reject: 'fast 1'
      },
    ],
    optional: [
      {
        resolve: 'fast 2',
        reject: null
      },
    ]
  },
  () => [reject('fast 1', DELAY_FAST)],
  () => [resolve('fast 2', DELAY_FAST)]
);
// #endregion
