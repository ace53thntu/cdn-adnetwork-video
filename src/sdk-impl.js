const SdkImpl = function (controller) {
  /**
   * Plugin controller.
   */

  this.controller = controller;

  /**
   * IMA SDK AdDisplayContainer.
   */
  this.adDisplayContainer = null;

  /**
   * True if the AdDisplayContainer has been initialized. False otherwise.
   */
  this.adDisplayContainerInitialized = false;

  /**
   * IMA SDK AdsLoader
   */
  this.adsLoader = null;

  /**
   * IMA SDK AdsManager
   */
  this.adsManager = null;

  /**
   * IMA SDK AdsRenderingSettings.
   */
  this.adsRenderingSettings = null;

  /**
   * VAST, VMAP, or ad rules response. Used in lieu of fetching a response
   * from an ad tag URL.
   */
  this.adsResponse = null;

  /**
   * Current IMA SDK Ad.
   */
  this.currentAd = null;

  /**
   * Timer used to track ad progress.
   */
  this.adTrackingTimer = null;

  /**
   * True if ALL_ADS_COMPLETED has fired, false until then.
   */
  this.allAdsCompleted = false;

  /**
   * True if ads are currently displayed, false otherwise.
   * True regardless of ad pause state if an ad is currently being displayed.
   */
  this.adsActive = false;

  /**
   * True if ad is currently playing, false if ad is paused or ads are not
   * currently displayed.
   */
  this.adPlaying = false;

  /**
   * True if the ad is muted, false otherwise.
   */
  this.adMuted = false;

  /**
   * Listener to be called to trigger manual ad break playback.
   */
  this.adBreakReadyListener = undefined;

  /**
   * Tracks whether or not we have already called adsLoader.contentComplete().
   */
  this.contentCompleteCalled = false;

  /**
   * True if the ad has timed out.
   */
  this.isAdTimedOut = false;

  /**
   * Stores the dimensions for the ads manager.
   */
  this.adsManagerDimensions = {
    width: 0,
    height: 0,
  };
};

/**
 * Play ads
 */
SdkImpl.prototype.playAds = function () {
  this.controller.showAdContainer();
  // Sync ad volume with content volume.
  this.adsManager.setVolume(this.controller.getPlayerVolume());
  this.adsManager.start();
  this.adPlaying = true;
  this.adsActive = true;
};

/**
 * Pause ads.
 */
SdkImpl.prototype.pauseAds = function () {
  this.adsManager.pause();
  this.adPlaying = false;
};

/**
 * Resume ads.
 */
SdkImpl.prototype.resumeAds = function () {
  this.adsManager.resume();
  this.adPlaying = true;
};

/**
 * Initializes the AdDisplayContainer. On mobile, this must be done as a
 * result of user action.
 */
SdkImpl.prototype.initializeAdDisplayContainer = function () {
  if (this.adDisplayContainer) {
    if (!this.adDisplayContainerInitialized) {
      this.adDisplayContainer.initialize();
      this.adDisplayContainerInitialized = true;
    }
  }
};

/**
 * Creates and initializes the IMA SDK objects.
 */
SdkImpl.prototype.initAdObjects = function () {
  this.adDisplayContainer = new google.ima.AdDisplayContainer(
    this.controller.getAdContainerDiv()
    // this.controller.getContentPlayer()
  );

  this.adsLoader = new google.ima.AdsLoader(this.adDisplayContainer);

  this.adsLoader.addEventListener(
    google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
    this.onAdsManagerLoaded.bind(this),
    false
  );

  this.adsLoader.addEventListener(
    google.ima.AdErrorEvent.Type.AD_ERROR,
    this.onAdsLoaderError.bind(this),
    false
  );
};

SdkImpl.prototype.onPlayerReady = function () {
  this.initAdObjects();
  if (this.controller.getSettings().vastTag) {
    this.requestAds();
  }
};

/**
 * Listener for errors fired by the AdsLoader.
 * @param {google.ima.AdErrorEvent} event The error event thrown by the
 *     AdsLoader. See
 *     https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/reference/js/google.ima.AdError#.Type
 */
SdkImpl.prototype.onAdsLoaderError = function (event) {
  window.console.warn("AdsLoader error: " + event.getError());
  this.controller.onErrorLoadingAds(event);
  if (this.adsManager) {
    this.adsManager.destroy();
  }
};

/**
 * Creates the AdsRequest and request ads through the AdsLoader.
 */
SdkImpl.prototype.requestAds = function () {
  const adsRequest = new google.ima.AdsRequest();
  adsRequest.adTagUrl = this.controller.getSettings().vastTag;

  // if (this.controller.getSettings().vastLoadTimeout) {
  //   adsRequest.vastLoadTimeout = this.controller.getSettings().vastLoadTimeout;
  // }

  adsRequest.linearAdSlotWidth = this.controller.getPlayerWidth();
  adsRequest.linearAdSlotHeight = this.controller.getPlayerHeight();

  adsRequest.setAdWillAutoPlay(this.controller.adsWillAutoplay());
  adsRequest.setAdWillPlayMuted(this.controller.adsWillPlayMuted());

  this.adsLoader.requestAds(adsRequest);
};

/**
 * Listener for the ADS_MANAGER_LOADED event. Creates the AdsManager,
 * sets up event listeners, and triggers the 'adsready' event for
 * videojs-ads-contrib.
 *
 * @param {google.ima.AdsManagerLoadedEvent} adsManagerLoadedEvent Fired when
 *     the AdsManager loads.
 */
SdkImpl.prototype.onAdsManagerLoaded = function (adsManagerLoadedEvent) {
  this.createAdsRenderingSettings();

  this.adsManager = adsManagerLoadedEvent.getAdsManager(
    this.controller.getContentPlayheadTracker(),
    this.adsRenderingSettings
  );

  this.adsManager.addEventListener(
    google.ima.AdErrorEvent.Type.AD_ERROR,
    this.onAdError.bind(this)
  );
  // this.adsManager.addEventListener(
  //     google.ima.AdEvent.Type.AD_BREAK_READY,
  //     this.onAdBreakReady.bind(this));
  // this.adsManager.addEventListener(
  //     google.ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED,
  //     this.onContentPauseRequested.bind(this));
  // this.adsManager.addEventListener(
  //     google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED,
  //     this.onContentResumeRequested.bind(this));
  this.adsManager.addEventListener(
    google.ima.AdEvent.Type.ALL_ADS_COMPLETED,
    this.onAllAdsCompleted.bind(this)
  );

  // this.adsManager.addEventListener(
  //     google.ima.AdEvent.Type.LOADED,
  //     this.onAdLoaded.bind(this));
  this.adsManager.addEventListener(
    google.ima.AdEvent.Type.STARTED,
    this.onAdStarted.bind(this)
  );
  // this.adsManager.addEventListener(
  //     google.ima.AdEvent.Type.COMPLETE,
  //     this.onAdComplete.bind(this));
  // this.adsManager.addEventListener(
  //     google.ima.AdEvent.Type.SKIPPED,
  //     this.onAdComplete.bind(this));
  // this.adsManager.addEventListener(
  //     google.ima.AdEvent.Type.LOG,
  //     this.onAdLog.bind(this));
  // this.adsManager.addEventListener(
  //     google.ima.AdEvent.Type.PAUSED,
  //     this.onAdPaused.bind(this));
  this.adsManager.addEventListener(
    google.ima.AdEvent.Type.RESUMED,
    this.onAdResumed.bind(this)
  );

  this.initAdsManager();
};

/**
 * Initialize the ads manager.
 */
SdkImpl.prototype.initAdsManager = function () {
  try {
    const initWidth = this.controller.getPlayerWidth();
    const initHeight = this.controller.getPlayerHeight();
    this.adsManagerDimensions.width = initWidth;
    this.adsManagerDimensions.height = initHeight;
    this.adsManager.init(initWidth, initHeight, google.ima.ViewMode.NORMAL);

    this.adsManager.setVolume(this.controller.getPlayerVolume());
    this.initializeAdDisplayContainer();
    this.controller.adUi.controlsDiv.style.display = "block";
    this.playAds();
  } catch (adError) {
    this.onAdError(adError);
  }
};

/**
 * Syncs controls when an ad resumes.
 * @param {google.ima.AdEvent} adEvent The AdEvent thrown by the AdsManager.
 */
SdkImpl.prototype.onAdResumed = function (adEvent) {
  this.controller.onAdsResumed();
};

/**
 * Starts the interval timer to check the current ad time when an ad starts
 * playing.
 * @param {google.ima.AdEvent} adEvent The AdEvent thrown by the AdsManager.
 */
SdkImpl.prototype.onAdStarted = function (adEvent) {
  this.currentAd = adEvent.getAd();
  if (this.currentAd.isLinear()) {
    this.adTrackingTimer = setInterval(
      this.onAdPlayheadTrackerInterval.bind(this),
      250
    );
    // this.controller.onLinearAdStart();
  } else {
    // this.controller.onNonLinearAdStart();
  }
};

/**
 * Gets the current time and duration of the ad and calls the method to
 * update the ad UI.
 */
SdkImpl.prototype.onAdPlayheadTrackerInterval = function () {
  if (this.adsManager === null) return;
  const remainingTime = this.adsManager.getRemainingTime();
  const duration = this.currentAd.getDuration();
  let currentTime = duration - remainingTime;
  currentTime = currentTime > 0 ? currentTime : 0;
  let totalAds = 0;
  let adPosition;
  if (this.currentAd.getAdPodInfo()) {
    adPosition = this.currentAd.getAdPodInfo().getAdPosition();
    totalAds = this.currentAd.getAdPodInfo().getTotalAds();
  }

  this.controller.onAdPlayheadUpdated(
    currentTime,
    remainingTime,
    duration,
    adPosition,
    totalAds
  );
};

/**
 * Records that ads have completed and calls contentAndAdsEndedListeners
 * if content is also complete.
 * @param {google.ima.AdEvent} adEvent The AdEvent thrown by the AdsManager.
 */
SdkImpl.prototype.onAllAdsCompleted = function (adEvent) {
  this.allAdsCompleted = true;
  this.controller.onAllAdsCompleted();
};

/**
 * @return {boolean} True if an ad is currently playing. False otherwise.
 */
SdkImpl.prototype.isAdMuted = function () {
  return this.adMuted;
};

/**
 * Unmute ads.
 */
SdkImpl.prototype.unmute = function () {
  this.adsManager.setVolume(1);
  this.adMuted = false;
};

/**
 * Mute ads.
 */
SdkImpl.prototype.mute = function () {
  this.adsManager.setVolume(0);
  this.adMuted = true;
};

/**
 * @return {boolean} True if an ad is currently playing. False otherwise.
 */
SdkImpl.prototype.isAdPlaying = function () {
  return this.adPlaying;
};

/**
 * Listener for errors thrown by the AdsManager.
 * @param {google.ima.AdErrorEvent} adErrorEvent The error event thrown by
 *     the AdsManager.
 */
SdkImpl.prototype.onAdError = function (adErrorEvent) {
  const errorMessage =
    adErrorEvent.getError !== undefined
      ? adErrorEvent.getError()
      : adErrorEvent.stack;
  window.console.warn("Ad error: " + errorMessage);

  this.adsManager.destroy();
  this.controller.onAdError(adErrorEvent);

  // reset these so consumers don't think we are still in an ad break,
  // but reset them after any prior cleanup happens
  this.adsActive = false;
  this.adPlaying = false;
};

/**
 * Create AdsRenderingSettings for the IMA SDK.
 */
SdkImpl.prototype.createAdsRenderingSettings = function () {
  this.adsRenderingSettings = new google.ima.AdsRenderingSettings();
  this.adsRenderingSettings.restoreCustomPlaybackStateOnAdBreakComplete = true;

  // adsRenderingSettings.uiElements = [
  //   google.ima.UiElements.AD_ATTRIBUTION,
  //   google.ima.UiElements.COUNTDOWN,
  // ];
  this.adsRenderingSettings.mimeTypes = [
    "application/x-mpegURL",
    "video/mp4",
    "video/mpeg",
    "video/ogg",
    "video/3gpp",
    "video/webm",
    "application/dash+xml",
  ];
};

/**
 * Set ads as initial size
 */
SdkImpl.prototype.exitFullscreen = function () {
  const initWidth = this.controller.getPlayerWidth();
  const initHeight = this.controller.getPlayerHeight();
  this.adsManager.resize(initWidth, initHeight, google.ima.ViewMode.NORMAL);
};

SdkImpl.prototype.setFullscreen = function () {
  const width = this.controller.getFullscreenWidth();
  const height = this.controller.getFullscreenHeight();
  this.adsManager.resize(width, height, google.ima.ViewMode.FULLSCREEN);
};

/**
 * Set the volume of the ads. 0-1.
 *
 * @param {number} volume The new volume.
 */
SdkImpl.prototype.setVolume = function (volume) {
  this.adsManager.setVolume(volume);
  if (volume === 0) {
    this.adMuted = true;
  } else {
    this.adMuted = false;
  }
};

/**
 * Reset the SDK implementation.
 */
SdkImpl.prototype.reset = function () {
  this.adsActive = false;
  this.adPlaying = false;
  if (this.adTrackingTimer) {
    // If this is called while an ad is playing, stop trying to get that
    // ad's current time.
    clearInterval(this.adTrackingTimer);
  }
  if (this.adsManager) {
    this.adsManager.destroy();
    this.adsManager = null;
  }
  if (this.adsLoader && !this.contentCompleteCalled) {
    this.adsLoader.contentComplete();
  }
  this.contentCompleteCalled = false;
  this.allAdsCompleted = false;
};

export default SdkImpl;
