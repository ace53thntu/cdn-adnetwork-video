import { addClass, elementHasClass, removeClass } from "./utils";

const AdUi = function (controller) {
  this.controller = controller;

  /**
   * Div used as an ad container.
   */
  this.adContainerDiv = document.getElementById("adContainer");

  /**
   * Div used to display ad controls.
   */
  this.controlsDiv = document.getElementById("ima-controls-div");

  /**
   * Div used to display ad countdown timer.
   */
  this.countdownDiv = document.getElementById("ima-countdown-div");

  /**
   * Div used to display add seek bar.
   */
  this.seekBarDiv = document.getElementById("ima-seek-bar-div");

  /**
   * Div used to display ad progress (in seek bar).
   */
  this.progressDiv = document.getElementById("ima-progress-div");

  /**
   * Div used to display ad play/pause button.
   */
  this.playPauseDiv = document.getElementById("ima-play-pause-div");

  /**
   * Div used to display ad mute button.
   */
  this.muteDiv = document.getElementById("ima-mute-div");

  /**
   * Div used by the volume slider.
   */
  this.sliderDiv = document.getElementById("ima-slider-div");

  /**
   * Volume slider level visuals
   */
  this.sliderLevelDiv = document.getElementById("ima-slider-level-div");

  /**
   * Div used to display ad fullscreen button.
   */
  this.fullscreenDiv = document.getElementById("ima-fullscreen-div");

  /**
   * Bound event handler for onMouseUp.
   */
  this.boundOnMouseUp = this.onMouseUp.bind(this);

  /**
   * Bound event handler for onMouseMove.
   */
  this.boundOnMouseMove = this.onMouseMove.bind(this);

  /**
   * Boolean flag to show or hide the ad countdown timer.
   */
  this.showCountdown = true;
  if (this.controller.getSettings().showCountdown === false) {
    this.showCountdown = false;
  }

  /**
   * Boolean flag if the current ad is nonlinear.
   */
  this.isAdNonlinear = false;

  /**
   * Boolean flag if the current ad is fullscreen.
   */
  this.isFullscreen = false;
  this.fullscreenWidth = 0;
  this.fullscreenHeight = 0;

  this.createAdContainer();
};

/**
 * @return {HTMLElement} The div for the ad container.
 */
AdUi.prototype.getAdContainerDiv = function () {
  return this.adContainerDiv;
};

/**
 * Creates the ad container.
 */
AdUi.prototype.createAdContainer = function () {
  this.adContainerDiv.addEventListener(
    "mouseenter",
    this.showAdControls.bind(this),
    false
  );
  this.adContainerDiv.addEventListener(
    "mouseleave",
    this.hideAdControls.bind(this),
    false
  );

  this.createControls();
};

/**
 * Create the controls.
 */
AdUi.prototype.createControls = function () {
  this.controlsDiv.style.width = "100%";

  if (!this.controller.getIsMobile()) {
    this.countdownDiv.innerHTML = this.controller.getSettings().adLabel;
    this.countdownDiv.style.display = this.showCountdown ? "block" : "none";
  } else {
    this.countdownDiv.style.display = "none";
  }

  this.seekBarDiv.style.width = "100%";

  addClass(this.playPauseDiv, "ima-playing");
  this.playPauseDiv.addEventListener(
    "click",
    this.onAdPlayPauseClick.bind(this),
    false
  );

  addClass(this.muteDiv, "ima-non-muted");

  this.muteDiv.addEventListener("click", this.onAdMuteClick.bind(this), false);

  this.sliderDiv.addEventListener(
    "mousedown",
    this.onAdVolumeSliderMouseDown.bind(this),
    false
  );

  // Hide volume slider controls on iOS as they aren't supported.
  if (this.controller.getIsIos()) {
    this.sliderDiv.style.display = "none";
  }

  addClass(this.fullscreenDiv, "ima-non-fullscreen");

  this.fullscreenDiv.addEventListener(
    "click",
    this.onAdFullscreenClick.bind(this),
    false
  );

  document.addEventListener(
    "fullscreenchange",
    this.exitFullscreenListener.bind(this),
    false
  );
  document.addEventListener(
    "webkitfullscreenchange",
    this.exitFullscreenListener.bind(this),
    false
  );
  document.addEventListener(
    "mozfullscreenchange",
    this.exitFullscreenListener.bind(this),
    false
  );
  document.addEventListener(
    "MSFullscreenChange",
    this.exitFullscreenListener.bind(this),
    false
  );
};

AdUi.prototype.setFullscreen = function () {
  this.isFullscreen = true;
  this.setAdContainerSize(this.fullscreenWidth, this.fullscreenHeight);
};

AdUi.prototype.getFullscreenWidth = function () {
  return this.fullscreenWidth;
};

AdUi.prototype.getFullscreenHeight = function () {
  return this.fullscreenHeight;
};

AdUi.prototype.exitFullscreen = function () {
  this.isFullscreen = false;
  const initWidth = this.controller.getPlayerWidth();
  const initHeight = this.controller.getPlayerHeight();
  this.setAdContainerSize(initWidth, initHeight);
};

AdUi.prototype.exitFullscreenListener = function () {
  const isExitFullscreen =
    !document.fullscreenElement &&
    !document.webkitIsFullScreen &&
    !document.mozFullScreen &&
    !document.msFullscreenElement;

  if (isExitFullscreen) {
    this.controller.toggleFullscreen();
  }
};

AdUi.prototype.requestFullscreenHandler = function () {
  const elem = document.documentElement;

  if (elem.requestFullscreen) {
    this.fullscreenWidth = window.screen.width;
    this.fullscreenHeight = window.screen.height;
    elem.requestFullscreen();
    this.controller.toggleFullscreen();
  } else if (elem.webkitRequestFullscreen) {
    /* Safari */
    this.fullscreenWidth = window.screen.width;
    this.fullscreenHeight = window.screen.height;
    elem.webkitRequestFullscreen();
    this.controller.toggleFullscreen();
  } else if (elem.msRequestFullscreen) {
    /* IE11 */
    this.fullscreenWidth = window.screen.width;
    this.fullscreenHeight = window.screen.height;
    elem.msRequestFullscreen();
    this.controller.toggleFullscreen();
  } else {
    this.fullscreenWidth = window.innerWidth;
    this.fullscreenHeight = window.innerHeight;
    this.controller.toggleFullscreen();
  }
};

AdUi.prototype.exitFullscreenHandler = function () {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.webkitExitFullscreen) {
    /* Safari */
    document.webkitExitFullscreen();
  } else if (document.msExitFullscreen) {
    /* IE11 */
    document.msExitFullscreen();
  }
};

/**
 * Listener for clicks on the fullscreen button during ad playback.
 */
AdUi.prototype.onAdFullscreenClick = function () {
  if (this.isFullscreen) {
    this.exitFullscreenHandler();
  } else {
    this.requestFullscreenHandler();
  }
};

/**
 * Set ads container size
 * @param {number} width - width for ads container
 * @param {number} height - height for ads container
 */
AdUi.prototype.setAdContainerSize = function (width, height) {
  this.adContainerDiv.style.width = width;
  this.adContainerDiv.style.height = height;
};

/*
 * Listener for mouse down events during ad playback. Used for volume.
 */
AdUi.prototype.onAdVolumeSliderMouseDown = function () {
  document.addEventListener("mouseup", this.boundOnMouseUp, false);
  document.addEventListener("mousemove", this.boundOnMouseMove, false);
};

/**
 * Handles UI changes when the ad is unmuted.
 */
AdUi.prototype.unmute = function () {
  if (!elementHasClass(this.muteDiv, "ima-non-muted")) {
    addClass(this.muteDiv, "ima-non-muted");
  }
  removeClass(this.muteDiv, "ima-muted");
  this.sliderLevelDiv.style.width =
    this.controller.getPlayerVolume() * 100 + "%";
};

/**
 * Handles UI changes when the ad is muted.
 */
AdUi.prototype.mute = function () {
  if (!elementHasClass(this.muteDiv, "ima-muted")) {
    addClass(this.muteDiv, "ima-muted");
  }
  removeClass(this.muteDiv, "ima-non-muted");
  this.sliderLevelDiv.style.width = "0%";
};

/**
 * Listener for clicks on the play/pause button during ad playback.
 */
AdUi.prototype.onAdMuteClick = function () {
  this.controller.onAdMuteClick();
};

/**
 * Listener for clicks on the play/pause button during ad playback.
 */
AdUi.prototype.onAdPlayPauseClick = function () {
  this.controller.onAdPlayPauseClick();
};

/**
 * Show pause and hide play button
 */
AdUi.prototype.onAdsPaused = function () {
  this.controller.sdkImpl.adPlaying = false;
  if (!elementHasClass(this.playPauseDiv, "ima-paused")) {
    addClass(this.playPauseDiv, "ima-paused");
  }
  removeClass(this.playPauseDiv, "ima-playing");
  this.showAdControls();
};

/**
 * Show play and hide pause button
 */
AdUi.prototype.onAdsPlaying = function () {
  this.controller.sdkImpl.adPlaying = true;
  if (!elementHasClass(this.playPauseDiv, "ima-playing")) {
    addClass(this.playPauseDiv, "ima-playing");
  }
  removeClass(this.playPauseDiv, "ima-paused");
};

/**
 * Handles when all ads have finished playing.
 */
AdUi.prototype.onAllAdsCompleted = function () {
  this.controller.reset();
  // this.hideAdContainer();
  window.parent.postMessage(
    {
      type: "ALL_ADS_COMPLETED",
    },
    "*"
  );
};

/**
 * Takes data from the controller to update the UI.
 *
 * @param {number} currentTime Current time of the ad.
 * @param {number} remainingTime Remaining time of the ad.
 * @param {number} duration Duration of the ad.
 * @param {number} adPosition Index of the ad in the pod.
 * @param {number} totalAds Total number of ads in the pod.
 */
AdUi.prototype.updateAdUi = function (
  currentTime,
  remainingTime,
  duration,
  adPosition,
  totalAds
) {
  // Update countdown timer data
  let remainingMinutes = Math.floor(remainingTime / 60);
  let remainingSeconds = Math.floor(remainingTime % 60);

  if (remainingTime < 0) {
    remainingMinutes = 0;
    remainingSeconds = 0;
  }

  if (remainingSeconds.toString().length < 2) {
    remainingSeconds = "0" + remainingSeconds;
  }

  let podCount = ": ";
  if (totalAds > 1) {
    podCount =
      " (" +
      adPosition +
      " " +
      this.controller.getSettings().adLabelNofN +
      " " +
      totalAds +
      "): ";
  }

  this.countdownDiv.innerHTML =
    this.controller.getSettings().adLabel +
    podCount +
    remainingMinutes +
    ":" +
    remainingSeconds;

  // Update UI
  const playProgressRatio = currentTime / duration;
  const playProgressPercent = playProgressRatio * 100;
  this.progressDiv.style.width = playProgressPercent + "%";
};

/**
 * Show pause and hide play button
 */
AdUi.prototype.onAdsResumed = function () {
  this.onAdsPlaying();
  this.showAdControls();
};

/**
 * Handles ad errors.
 */
AdUi.prototype.onAdError = function () {
  this.hideAdContainer();
};

/**
 * Hide the ad container
 */
AdUi.prototype.hideAdContainer = function () {
  console.log("hideAdContainer");
  this.adContainerDiv.style.display = "none";
};

/**
 * Show the ad container.
 */
AdUi.prototype.showAdContainer = function () {
  this.adContainerDiv.style.display = "block";
};

/**
 * Shows ad controls on mouseover.
 */
AdUi.prototype.showAdControls = function () {
  const { disableAdControls } = this.controller.getSettings();
  if (!disableAdControls) {
    if (!elementHasClass(this.controlsDiv, "ima-controls-div-showing")) {
      addClass(this.controlsDiv, "ima-controls-div-showing");
    }
  }
};

/**
 * Hide the ad controls.
 */
AdUi.prototype.hideAdControls = function () {
  removeClass(this.controlsDiv, "ima-controls-div-showing");
};

/*
 * Mouse release listener used for volume slider.
 */
AdUi.prototype.onMouseUp = function (event) {
  this.changeVolume(event);
  document.removeEventListener("mouseup", this.boundOnMouseUp);
  document.removeEventListener("mousemove", this.boundOnMouseMove);
};

/*
 * Mouse movement listener used for volume slider.
 */
AdUi.prototype.onMouseMove = function (event) {
  this.changeVolume(event);
};

/*
 * Utility function to set volume and associated UI
 */
AdUi.prototype.changeVolume = function (event) {
  let percent =
    (event.clientX - this.sliderDiv.getBoundingClientRect().left) /
    this.sliderDiv.offsetWidth;
  percent *= 100;
  // Bounds value 0-100 if mouse is outside slider region.
  percent = Math.min(Math.max(percent, 0), 100);
  this.sliderLevelDiv.style.width = percent + "%";
  if (percent === 0) {
    if (!elementHasClass(this.muteDiv, "ima-muted")) {
      addClass(this.muteDiv, "ima-muted");
    }
    removeClass(this.muteDiv, "ima-non-muted");
  } else {
    if (!elementHasClass(this.muteDiv, "ima-non-muted")) {
      addClass(this.muteDiv, "ima-non-muted");
    }
    removeClass(this.muteDiv, "ima-muted");
  }
  this.controller.setVolume(percent / 100); // 0-1
};

/**
 * Resets the state of the ad ui.
 */
AdUi.prototype.reset = function () {
  this.hideAdContainer();
};

export default AdUi;
