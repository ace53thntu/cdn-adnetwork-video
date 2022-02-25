import canAutoplay from "can-autoplay";

import AdUi from "./ad-ui";
import SdkImpl from "./sdk-impl";

/**
 * Controller
 * @param  {Object} options - Options provided by the implementation
 * @param {string} options.vastTag - VAST tag URL
 * @param {number} options.width - Ads container width
 * @param {number} options.height - Ads container height
 */
const Controller = function (options) {
  /**
   * Stores user-provided settings.
   * @type {Object}
   */
  this.settings = {};

  /**
   * Whether or not we are running on a mobile platform.
   */
  this.isMobile =
    navigator.userAgent.match(/iPhone/i) ||
    navigator.userAgent.match(/iPad/i) ||
    navigator.userAgent.match(/Android/i);

  /**
   * Whether or not we are running on an iOS platform.
   */
  this.isIos =
    navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPad/i);

  this.initWithSettings(options);

  this.autoplayAllowed = false;
  this.autoplayRequiresMute = false;

  this.checkUnmutedAutoplaySupport().then(() => {
    this.adUi = new AdUi(this);
    this.sdkImpl = new SdkImpl(this);
    this.sdkImpl.onPlayerReady();
    if (this.autoplayRequiresMute) {
      this.adUi.mute();
      this.sdkImpl.adMuted = true;
    } else {
      this.adUi.unmute();
      this.sdkImpl.adMuted = false;
    }
  });
};

Controller.IMA_DEFAULTS = {
  adLabel: "Advertisement",
  adLabelNofN: "of",
  debug: false,
  disableAdControls: false,
  prerollTimeout: 1000,
  preventLateAdStart: false,
  requestMode: "onLoad",
  showControlsForJSAds: true,
  timeout: 5000,
};

/**
 * Called when there is an error loading ads.
 *
 * @param {Object} adErrorEvent The ad error event thrown by the IMA SDK.
 */
Controller.prototype.onErrorLoadingAds = function (adErrorEvent) {
  this.adUi.onAdError();
};

/**
 * @return {number} The volume of the content player.
 */
Controller.prototype.getPlayerVolume = function () {
  const volume = this.autoplayRequiresMute ? 0 : 1;
  return volume;
};

Controller.prototype.checkUnmutedAutoplaySupport = function () {
  const self = this;

  return new Promise((resolve) => {
    canAutoplay.video({ timeout: 100, muted: false }).then(function (response) {
      if (response.result === false) {
        // Unmuted autoplay is not allowed.
        resolve(self.checkMutedAutoplaySupport());
      } else {
        // Unmuted autoplay is allowed.
        self.autoplayAllowed = true;
        self.autoplayRequiresMute = false;
        resolve();
      }
    });
  });
};

Controller.prototype.checkMutedAutoplaySupport = function () {
  const self = this;

  return new Promise((resolve) => {
    canAutoplay.video({ timeout: 100, muted: true }).then(function (response) {
      if (response.result === false) {
        // Muted autoplay is not allowed.
        self.autoplayAllowed = false;
        self.autoplayRequiresMute = false;
      } else {
        // Muted autoplay is allowed.
        self.autoplayAllowed = true;
        self.autoplayRequiresMute = true;
      }
      resolve();
    });
  });
};

/**
 * Takes data from the sdk impl and passes it to the ad UI to update the UI.
 *
 * @param {number} currentTime Current time of the ad.
 * @param {number} remainingTime Remaining time of the ad.
 * @param {number} duration Duration of the ad.
 * @param {number} adPosition Index of the ad in the pod.
 * @param {number} totalAds Total number of ads in the pod.
 */
Controller.prototype.onAdPlayheadUpdated = function (
  currentTime,
  remainingTime,
  duration,
  adPosition,
  totalAds
) {
  this.adUi.updateAdUi(
    currentTime,
    remainingTime,
    duration,
    adPosition,
    totalAds
  );
};

/**
 * Changes the ad tag. You will need to call requestAds after this method
 * for the new ads to be requested.
 * @param {?string} adTag The ad tag to be requested the next time
 *     requestAds is called.
 */
Controller.prototype.changeAdTag = function (adTag) {
  this.reset();
  this.settings.vastTag = adTag;
};

/**
 * Resets the state of the plugin.
 */
Controller.prototype.reset = function () {
  this.sdkImpl.reset();
  this.adUi.reset();
};

/**
 * Handles the SDK firing an ad resumed event.
 */
Controller.prototype.onAdsResumed = function () {
  this.adUi.onAdsResumed();
};

/**
 * Handles when all ads have finished playing.
 */
Controller.prototype.onAllAdsCompleted = function () {
  this.adUi.onAllAdsCompleted();
};

/**
 * Called by the ad UI when the mute button is clicked.
 *
 */
Controller.prototype.onAdMuteClick = function () {
  const isMuted = this.sdkImpl.isAdMuted();
  this.autoplayRequiresMute = !isMuted;
  if (isMuted) {
    this.adUi.unmute();
    this.sdkImpl.unmute();
  } else {
    this.adUi.mute();
    this.sdkImpl.mute();
  }
};

/**
 * Called by the ad UI when the play/pause button is clicked.
 */
Controller.prototype.onAdPlayPauseClick = function () {
  if (this.sdkImpl.isAdPlaying()) {
    this.adUi.onAdsPaused();
    this.sdkImpl.pauseAds();
  } else {
    this.adUi.onAdsPlaying();
    this.sdkImpl.resumeAds();
  }
};

/**
 * Return whether or not we're in an iOS environment.
 *
 * @return {boolean} True if running on iOS, false otherwise.
 */
Controller.prototype.getIsIos = function () {
  return this.isIos;
};

/**
 * @return {boolean} true if we expect that ads will autoplay. false otherwise.
 */
Controller.prototype.adsWillAutoplay = function () {
  return this.autoplayAllowed;
};

/**
 * @return {boolean} true if we expect that ads will autoplay. false otherwise.
 */
Controller.prototype.adsWillPlayMuted = function () {
  return this.autoplayRequiresMute;
};

/**
 * Get the player width.
 *
 * @return {number} The width of the player.
 */
Controller.prototype.getPlayerWidth = function () {
  return this.settings.width;
};

/**
 * Get the player height.
 *
 * @return {number} The height of the player.
 */
Controller.prototype.getPlayerHeight = function () {
  return this.settings.height;
};

/**
 * Relays ad errors to the player wrapper.
 *
 * @param {Object} adErrorEvent The ad error event thrown by the IMA SDK.
 */
Controller.prototype.onAdError = function (adErrorEvent) {
  this.adUi.onAdError();
};

/**
 * Show the ad container.
 */
Controller.prototype.showAdContainer = function () {
  this.adUi.showAdContainer();
};

/**
 * Returns the content playhead tracker.
 *
 * @return {Object} The content playhead tracker.
 */
Controller.prototype.getContentPlayheadTracker = function () {
  const videoElem = document.createElement("video");

  return videoElem;
};

/**
 * Return whether or not we're in a mobile environment.
 *
 * @return {boolean} True if running on mobile, false otherwise.
 */
Controller.prototype.getIsMobile = function () {
  return this.isMobile;
};

/**
 * @return {HTMLElement} The div for the ad container.
 */
Controller.prototype.getAdContainerDiv = function () {
  return this.adUi.getAdContainerDiv();
};

/**
 * Initializes the AdDisplayContainer. On mobile, this must be done as a
 * result of user action.
 */
Controller.prototype.initializeAdDisplayContainer = function () {
  this.sdkImpl.initializeAdDisplayContainer();
};

/**
 * Return the settings object.
 *
 * @return {Object} The settings object.
 */
Controller.prototype.getSettings = function () {
  return this.settings;
};

/**
 * Set the volume of the player and ads. 0-1.
 *
 * @param {number} volume The new volume.
 */
Controller.prototype.setVolume = function (volume) {
  this.sdkImpl.setVolume(volume);
};

/**
 * Toggle fullscreen state.
 */
Controller.prototype.toggleFullscreen = function () {
  if (this.adUi.isFullscreen) {
    this.adUi.exitFullscreen();
    this.sdkImpl.exitFullscreen();
  } else {
    this.adUi.setFullscreen();
    this.sdkImpl.setFullscreen();
  }
};

Controller.prototype.getFullscreenWidth = function () {
  return this.adUi.getFullscreenWidth();
};

Controller.prototype.getFullscreenHeight = function () {
  return this.adUi.getFullscreenHeight();
};

/**
 * Extends the settings to include user-provided settings.
 *
 * @param {Object} options - Options to be used in initialization.
 */
Controller.prototype.initWithSettings = function (options) {
  this.settings = this.extend({}, Controller.IMA_DEFAULTS, options || {});

  this.warnAboutDeprecatedSettings();

  // Default showing countdown timer to true.
  this.showCountdown = true;
  if (this.settings.showCountdown === false) {
    this.showCountdown = false;
  }
};

/**
 * Logs console warnings when deprecated settings are used.
 */
Controller.prototype.warnAboutDeprecatedSettings = function () {
  const deprecatedSettings = [
    "adWillAutoplay",
    "adsWillAutoplay",
    "adWillPlayMuted",
    "adsWillPlayMuted",
  ];
  deprecatedSettings.forEach((setting) => {
    if (this.settings[setting] !== undefined) {
      console.warn(
        "WARNING: Aicactus video sdk ima setting " + setting + " is deprecated"
      );
    }
  });
};

/**
 * Extends an object to include the contents of objects at parameters 2 onward.
 *
 * @param {Object} obj The object onto which the subsequent objects' parameters
 *     will be extended. This object will be modified.
 * @param {...Object} var_args The objects whose properties are to be extended
 *     onto obj.
 * @return {Object} The extended object.
 */
Controller.prototype.extend = function (obj, ...args) {
  let arg;
  let index;
  let key;
  for (index = 0; index < args.length; index++) {
    arg = args[index];
    for (key in arg) {
      if (arg.hasOwnProperty(key)) {
        obj[key] = arg[key];
      }
    }
  }
  return obj;
};

export default Controller;
