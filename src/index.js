import "./css/video-js.min.css";
import "./css/videojs.ima.css";
import "./css/style.css";

import Controller from "./controller";

/**
 * @param  {Object} options - Options provided by the implementation
 * @param {string} options.vastTag - VAST tag URL
 * @param {number} options.width - Ads container width
 * @param {number} options.height - Ads container height
 */
const Init = function (options) {
  this.controller = new Controller(options);
};

const init = function (options) {
  new Init(options);
};

export { init };
