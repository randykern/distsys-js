'use strict';

/**
 * AggregatePromises module. Helper for complex fanout/timeout scenarios.
 * @module distsys-js/aggregatepromises
 */

// TODO: Convert from CommonJS style module to ES6 style


function timer(timeout) {
  return new Promise((resolve, reject) => {
    let id = setTimeout(() => {
      clearTimeout(id);
      resolve({ resolve: null, reject: 'timeout' });
    }, timeout);
  });
}

/**
 * Aggregate multiple promise objects, with helpful logic for timeouts.
 * 
 * The returned promise will resolve when:
 *  - All required promises resolve (or reject), or the timeoutRequired passes
 *  - All optipnal promises resolve/reject, or the timeoutOptional expires
 * 
 * Generally the timeoutOptional is lower than the timeoutRequired. Consider
 * this a minimum amount of time given to optional promises to resolve - even
 * if all the required promises complete, optional promises will be given timeoutOptional
 * milliseconds to resolve.
 * 
 * The returned promise will resolve to an object with the following structure:
 * {
 *   required: [
 *     undefined | {
 *       resolve: null | <any>,
 *       reject: null | <any>
 *     }
 *   ],
 *   optional: [
 *   ]
 * }
 * 
 * Each entry in required and optional corresponds to the promise passed in the required and
 * optioanl lists, in the same order. If a promise fails to complete before timing out, the
 * relevent result will be undefined.
 * 
 * @param {[thenable]} required - Iterable of Promise/Thenable objects that are required
 * @param {number} timeoutRequired - The timeout for required promises
 * @param {[thenable]} optional - Iterable of optional promises
 * @param {number} timeoutOptional - Minimum time to give optional promises (if the requrired complete)
 * @returns {thenable}
 */
module.exports.aggregatePromises = async function aggregatePromises(required, timeoutRequired, optional, timeoutOptional) {
  if (timeoutOptional >= timeoutRequired) {
    throw new Error('aggregatePromises called with an optional timeout longer than the required timeout- this is incorrect.');
  }

  if (required.length === 0 && optional.length === 0) {
    throw new Error('aggregatePromises called without any promises!');
  }

  // Start the timer for optional promises
  const optionalTimeout = timer(timeoutOptional);

  // Setup all the required promises to capture their results
  const requiredResults = [];
  requiredResults.length = required.length;

  if (required.length > 0) {
    const requiredPromises = required.map((promise, index) => {
      return promise.then(
        (value) => requiredResults[index] = { resolve: value, reject: null },
        (err) => requiredResults[index] = { resolve: null, reject: err }
      )
    });

    // Wait for the required promises to finish, or the timeout to expire
    await Promise.race([
      timer(timeoutRequired),
      Promise.all(requiredPromises),
    ]);
  }

  // Setup the same capture process for optional promises
  const optionalResults = [];
  optionalResults.length = optional.length;

  if (optional.length > 0) {
    const optionalPromises = optional.map((promise, index) => {
      return promise.then(
        (value) => optionalResults[index] = { resolve: value, reject: null },
        (err) => optionalResults[index] = { resolve: null, reject: err }
      )
    });

    // Give the optional promises their time too
    await Promise.race([
      optionalTimeout,
      Promise.all(optionalPromises)
    ]);
  }

  return {
    required: requiredResults,
    optional: optionalResults,
  };
}