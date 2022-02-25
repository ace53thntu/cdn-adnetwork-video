/**
 * Returns a regular expression to test a string for the given className.
 *
 * @param {string} className The name of the class.
 * @return {RegExp} The regular expression used to test for that class.
 */
export const getClassRegexp = function (className) {
  // Matches on
  // (beginning of string OR NOT word char)
  // classname
  // (negative lookahead word char OR end of string)
  return new RegExp("(^|[^A-Za-z-])" + className + "((?![A-Za-z-])|$)", "gi");
};

/**
 * Adds a class to the given element if it doesn't already have the class
 * @param {HTMLElement} element Element to which the class will be added.
 * @param {string} classToAdd Class to add.
 */
export const addClass = function (element, classToAdd) {
  element.className = element.className.trim() + " " + classToAdd;
};

/**
 * Removes a class from the given element if it has the given class
 *
 * @param {HTMLElement} element Element from which the class will be removed.
 * @param {string} classToRemove Class to remove.
 */
export const removeClass = function (element, classToRemove) {
  const classRegexp = getClassRegexp(classToRemove);
  element.className = element.className.trim().replace(classRegexp, "");
};

/**
 * Returns whether or not the provided element has the provied class in its
 * className.
 * @param {HTMLElement} element Element to tes.t
 * @param {string} className Class to look for.
 * @return {boolean} True if element has className in class list. False
 *     otherwise.
 */
export const elementHasClass = function (element, className) {
  const classRegexp = getClassRegexp(className);
  return classRegexp.test(element.className);
};
