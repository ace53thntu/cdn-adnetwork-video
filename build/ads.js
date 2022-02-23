var Application = function (vastTag, width, height, iframe) {
  if (!vastTag || !width || !height) return;

  /**
   * Returns a regular expression to test a string for the given className.
   *
   * @param {string} className The name of the class.
   * @return {RegExp} The regular expression used to test for that class.
   */
  var getClassRegexp = function (className) {
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
  var addClass = function (element, classToAdd) {
    element.className = element.className.trim() + " " + classToAdd;
  };

  /**
   * Removes a class from the given element if it has the given class
   *
   * @param {HTMLElement} element Element from which the class will be removed.
   * @param {string} classToRemove Class to remove.
   */
  var removeClass = function (element, classToRemove) {
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
  var elementHasClass = function (element, className) {
    const classRegexp = getClassRegexp(className);
    return classRegexp.test(element.className);
  };

  /**
   * Constants
   */
  var adContainer = "adContainer";

  var autoplayAllowed = false;
  var autoplayRequiresMute = false;
  var adDisplayContainer;
  var adsManager;
  var adsLoader;
  var adsInitialized;
  //
  var playing = false;
  var adMuted = autoplayRequiresMute;
  var currentAd, adTrackingTimer;
  var isFullscreen = false;

  var fullscreenWidth = null;
  var fullscreenHeight = null;

  function checkMutedAutoplaySupport() {
    canAutoplay.video({ timeout: 100, muted: true }).then(function (response) {
      if (response.result === false) {
        // Muted autoplay is not allowed.
        autoplayAllowed = false;
        autoplayRequiresMute = false;
        adMuted = false;
      } else {
        // Muted autoplay is allowed.
        autoplayAllowed = true;
        autoplayRequiresMute = true;
        adMuted = true;
      }
      autoplayChecksResolved();
    });
  }

  function checkUnmutedAutoplaySupport() {
    canAutoplay.video({ timeout: 100, muted: false }).then(function (response) {
      if (response.result === false) {
        // Unmuted autoplay is not allowed.
        checkMutedAutoplaySupport();
      } else {
        // Unmuted autoplay is allowed.
        autoplayAllowed = true;
        autoplayRequiresMute = false;
        adMuted = false;
        autoplayChecksResolved();
      }
    });
  }

  function autoplayChecksResolved() {
    // Request video ads.
    var adsRequest = new google.ima.AdsRequest();
    adsRequest.adTagUrl = vastTag;

    // Specify the linear and nonlinear slot sizes. This helps the SDK to
    // select the correct creative if multiple are returned.
    adsRequest.linearAdSlotWidth = width;
    adsRequest.linearAdSlotHeight = height;

    // adsRequest.nonLinearAdSlotWidth = 640;
    // adsRequest.nonLinearAdSlotHeight = 150;

    adsRequest.setAdWillAutoPlay(autoplayAllowed);
    adsRequest.setAdWillPlayMuted(autoplayRequiresMute);
    adsLoader.requestAds(adsRequest);
  }

  function setUpIMA() {
    // Create the ad display container.
    createAdDisplayContainer();
    // Create ads loader.
    adsLoader = new google.ima.AdsLoader(adDisplayContainer);
    // Listen and respond to ads loaded and error events.
    adsLoader.addEventListener(
      google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
      onAdsManagerLoaded,
      false
    );
    adsLoader.addEventListener(
      google.ima.AdErrorEvent.Type.AD_ERROR,
      onAdError,
      false
    );

    // An event listener to tell the SDK that our content video
    // is completed so the SDK can play any post-roll ads.
    // videoContent.onended = contentEndedListener;
  }

  function createAdDisplayContainer() {
    // We assume the adContainer is the DOM id of the element that will house
    // the ads.
    adDisplayContainer = new google.ima.AdDisplayContainer(
      document.getElementById(adContainer)
      // videoContent
    );
  }

  function onAdError(adErrorEvent) {
    // Handle the error logging.
    console.log(adErrorEvent.getError());
    adsManager.destroy();
    // Fall back to playing content.
    // videoContent.play();
  }

  function onContentPauseRequested() {
    // videoContent.pause();
    // videoContent.onended = null;
  }

  function onContentResumeRequested() {
    // videoContent.play();
    // videoContent.onended = contentEndedListener;
  }

  function onAdEvent(adEvent) {
    // Retrieve the ad from the event. Some events (e.g. ALL_ADS_COMPLETED)
    // don't have ad object associated.
    var ad = adEvent.getAd();
    switch (adEvent.type) {
      case google.ima.AdEvent.Type.LOADED:
        // This is the first event sent for an ad - it is possible to
        // determine whether the ad is a video ad or an overlay.
        if (!ad.isLinear()) {
          // videoContent.play();
        }
        break;
      case google.ima.AdEvent.Type.ALL_ADS_COMPLETED:
        if (adTrackingTimer) {
          clearInterval(adTrackingTimer);
        }
        adsManager.destroy();
        hideAdContainer();
        if (iframe) {
          iframe.style.display = "none";
        }

        break;
    }
  }

  function onAdsManagerLoaded(adsManagerLoadedEvent) {
    // Get the ads manager.
    var adsRenderingSettings = new google.ima.AdsRenderingSettings();
    adsRenderingSettings.restoreCustomPlaybackStateOnAdBreakComplete = true;
    // adsRenderingSettings.uiElements = [
    //   google.ima.UiElements.AD_ATTRIBUTION,
    //   google.ima.UiElements.COUNTDOWN,
    // ];
    adsRenderingSettings.mimeTypes = [
      "application/x-mpegURL",
      "video/mp4",
      "video/mpeg",
      "video/ogg",
      "video/3gpp",
      "video/webm",
      "application/dash+xml",
    ];

    // videoContent should be set to the content video element.
    const videoNe = document.createElement("video");
    adsManager = adsManagerLoadedEvent.getAdsManager(
      videoNe,
      adsRenderingSettings
    );
    // Mute the ad if doing muted autoplay.
    const adVolume = autoplayAllowed && autoplayRequiresMute ? 0 : 1;
    adsManager.setVolume(adVolume);

    // Add listeners to the required events.
    adsManager.addEventListener(
      google.ima.AdErrorEvent.Type.AD_ERROR,
      onAdError
    );
    adsManager.addEventListener(
      google.ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED,
      onContentPauseRequested
    );
    adsManager.addEventListener(
      google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED,
      onContentResumeRequested
    );
    adsManager.addEventListener(
      google.ima.AdEvent.Type.ALL_ADS_COMPLETED,
      onAdEvent
    );

    // Listen to any additional events, if necessary.
    adsManager.addEventListener(google.ima.AdEvent.Type.LOADED, onAdEvent);
    adsManager.addEventListener(google.ima.AdEvent.Type.STARTED, onAdStarted);
    adsManager.addEventListener(google.ima.AdEvent.Type.COMPLETE, onAdEvent);

    document.getElementById("ima-controls-div").style.display = "block";
    showAdContainer();

    if (autoplayAllowed) {
      playAds();
    } else {
      //
      // playButton.style.display = "block";
    }
  }

  function playAds() {
    try {
      if (!adsInitialized) {
        adDisplayContainer.initialize();
        adsInitialized = true;
      }
      // Initialize the ads manager. Ad rules playlist will start at this time.
      adsManager.init(width, height, google.ima.ViewMode.NORMAL);
      // adsManager.init(1600, 900, google.ima.ViewMode.FULLSCREEN);
      // Call play to start showing the ad. Single video and overlay ads will
      // start at this time; the call will be ignored for ad rules.
      adsManager.start();
      playing = true;

      if (autoplayRequiresMute) {
        muteUI();
      } else {
        unmuteUI();
      }
    } catch (adError) {
      // An error may be thrown if there was a problem with the VAST response.
      // videoContent.play();
      playing = false;
    }
  }

  /**
   * Ad controls
   */
  function onShowAdControls() {
    document
      .getElementById(adContainer)
      .addEventListener("mouseenter", showAdControls, false);
  }

  function showAdControls() {
    var controlsElement = document.getElementById("ima-controls-div");
    addClass(controlsElement, "ima-controls-div-showing");
  }

  function onHideAdControls() {
    document
      .getElementById(adContainer)
      .addEventListener("mouseleave", hideAdControls, false);
  }

  function hideAdControls() {
    removeClass(
      document.getElementById("ima-controls-div"),
      "ima-controls-div-showing"
    );
  }

  /**
   * Ad play/pause
   */
  function onAdPlayPauseClick() {
    document
      .getElementById("ima-play-pause-div")
      .addEventListener("click", playPauseAd, false);
  }

  function onAdsPaused() {
    adsManager.pause();
    playing = false;
    var playPauseDiv = document.getElementById("ima-play-pause-div");
    removeClass(playPauseDiv, "ima-playing");
    addClass(playPauseDiv, "ima-paused");
    showAdControls();
  }

  function onAdsPlaying() {
    adsManager.resume();
    playing = true;
    var playPauseDiv = document.getElementById("ima-play-pause-div");
    addClass(playPauseDiv, "ima-playing");
    removeClass(playPauseDiv, "ima-paused");
  }

  function playPauseAd() {
    if (playing) {
      onAdsPaused();
    } else {
      onAdsPlaying();
    }
  }

  /**
   * Ad mute/un mute
   */
  function onAdMuteClick() {
    document
      .getElementById("ima-mute-div")
      .addEventListener("click", muteUnMuteAd, false);
  }

  function muteUnMuteAd() {
    if (adMuted) {
      unmute();
    } else {
      mute();
    }
  }

  function unmute() {
    adsManager.setVolume(1);
    adMuted = false;
    unmuteUI();
  }

  function unmuteUI() {
    const muteDiv = document.getElementById("ima-mute-div");
    addClass(muteDiv, "ima-non-muted");
    removeClass(muteDiv, "ima-muted");
    const sliderLevelDiv = document.getElementById("ima-slider-level-div");
    sliderLevelDiv.style.width = "100%";
  }

  function mute() {
    adsManager.setVolume(0);
    adMuted = true;
    muteUI();
  }

  function muteUI() {
    const muteDiv = document.getElementById("ima-mute-div");
    addClass(muteDiv, "ima-muted");
    removeClass(muteDiv, "ima-non-muted");
    const sliderLevelDiv = document.getElementById("ima-slider-level-div");
    sliderLevelDiv.style.width = "0%";
  }

  /**
   * Seek and progress
   */
  function onAdStarted(adEvent) {
    currentAd = adEvent.getAd();

    if (currentAd.isLinear()) {
      //
      adTrackingTimer = setInterval(onAdPlayheadTrackerInterval, 250);
    } else {
      //
    }
  }

  function onAdPlayheadTrackerInterval() {
    if (adsManager === null) return;

    const remainingTime = adsManager.getRemainingTime();
    const duration = currentAd.getDuration();
    let currentTime = duration - remainingTime;
    currentTime = currentTime > 0 ? currentTime : 0;
    let totalAds = 0;
    let adPosition;
    if (currentAd.getAdPodInfo()) {
      adPosition = currentAd.getAdPodInfo().getAdPosition();
      totalAds = currentAd.getAdPodInfo().getTotalAds();
    }

    onAdPlayheadUpdated(
      currentTime,
      remainingTime,
      duration,
      adPosition,
      totalAds
    );
  }

  function onAdPlayheadUpdated(
    currentTime,
    remainingTime,
    duration,
    adPosition,
    totalAds
  ) {
    //
    updateAdUi(currentTime, remainingTime, duration, adPosition, totalAds);
  }

  function updateAdUi(
    currentTime,
    remainingTime,
    duration,
    adPosition,
    totalAds
  ) {
    const remainingMinutes = Math.floor(remainingTime / 60);
    let remainingSeconds = Math.floor(remainingTime % 60);
    if (remainingSeconds.toString().length < 2) {
      remainingSeconds = "0" + remainingSeconds;
    }
    let podCount = ": ";

    const countdownDiv = document.getElementById("ima-countdown-div");
    countdownDiv.innerHTML =
      "Advertisement: " + remainingMinutes + ":" + remainingSeconds;

    // Update UI
    const playProgressRatio = currentTime / duration;
    const playProgressPercent = playProgressRatio * 100;
    const progressDiv = document.getElementById("ima-progress-div");
    progressDiv.style.width = playProgressPercent + "%";
  }

  /**
   * Full screen
   */

  function onAdFullscreenClick() {
    const fullScreenDiv = document.getElementById("ima-fullscreen-div");
    fullScreenDiv.addEventListener("click", fullScreen, false);
  }

  function fullScreen() {
    if (isFullscreen) {
      //
      var cancelFullscreen =
        document.exitFullscreen ||
        document.exitFullScreen ||
        document.webkitCancelFullScreen ||
        document.mozCancelFullScreen;
      if (cancelFullscreen) {
        cancelFullscreen.call(document);
      } else {
        onFullscreenChange();
      }
    } else {
      //
      var requestFullscreen =
        document.documentElement.requestFullscreen ||
        document.documentElement.webkitRequestFullscreen ||
        document.documentElement.mozRequestFullscreen ||
        document.documentElement.requestFullScreen ||
        document.documentElement.webkitRequestFullScreen ||
        document.documentElement.mozRequestFullScreen;
      if (requestFullscreen) {
        fullscreenWidth = window.screen.width;
        fullscreenHeight = window.screen.height;
        requestFullscreen.call(document.documentElement);
      } else {
        fullscreenWidth = window.innerWidth;
        fullscreenHeight = window.innerHeight;
        onFullscreenChange();
      }
    }
    // requestFullscreen.call(document.documentElement);
  }

  function onFullscreenChange() {
    if (isFullscreen) {
      adsManager.resize(width, height, google.ima.ViewMode.NORMAL);
      isFullscreen = false;
      updateAdContainerStyle(width, height);
    } else {
      makeAdsFullscreen();
      isFullscreen = true;
    }
  }

  function makeAdsFullscreen() {
    adsManager.resize(
      fullscreenWidth,
      fullscreenHeight,
      google.ima.ViewMode.FULLSCREEN
    );
    updateAdContainerStyle(fullscreenWidth, fullscreenHeight);
  }

  function updateAdContainerStyle(width, height) {
    document.getElementById("adContainer").style.width = width;
    document.getElementById("adContainer").style.height = height;
  }

  var fullScreenEvents = [
    "fullscreenchange",
    "mozfullscreenchange",
    "webkitfullscreenchange",
  ];
  for (key in fullScreenEvents) {
    document.addEventListener(fullScreenEvents[key], onFullscreenChange, false);
  }

  function hideAdContainer() {
    document.getElementById("adContainer").style.display = "none";
  }

  function showAdContainer() {
    document.getElementById("adContainer").style.display = "block";
  }

  /**
   * Volume
   */
  function onAdVolumeSliderMouseDown() {
    document
      .getElementById("ima-slider-div")
      .addEventListener("mousedown", adVolumeSliderMouseDown, false);
  }

  function adVolumeSliderMouseDown() {
    document.addEventListener("mouseup", boundOnMouseUp, false);
    document.addEventListener("mousemove", boundOnMouseMove, false);
  }

  var changeVolume = function (event) {
    var sliderDiv = document.getElementById("ima-slider-div");
    var sliderLevelDiv = document.getElementById("ima-slider-level-div");
    let percent =
      (event.clientX - sliderDiv.getBoundingClientRect().left) /
      sliderDiv.offsetWidth;
    percent *= 100;
    // Bounds value 0-100 if mouse is outside slider region.
    percent = Math.min(Math.max(percent, 0), 100);
    sliderLevelDiv.style.width = percent + "%";

    const muteDiv = document.getElementById("ima-mute-div");

    if (percent === 0) {
      if (!elementHasClass(muteDiv, "ima-muted")) {
        addClass(muteDiv, "ima-muted");
      }
      removeClass(muteDiv, "ima-non-muted");
    } else {
      if (!elementHasClass(muteDiv, "ima-non-muted")) {
        addClass(muteDiv, "ima-non-muted");
      }
      removeClass(muteDiv, "ima-muted");
    }
    setVolume(percent / 100);
  };

  var onMouseUp = function (event) {
    changeVolume(event);
    document.removeEventListener("mouseup", boundOnMouseUp);
    document.removeEventListener("mousemove", boundOnMouseMove);
  };

  var onMouseMove = function (event) {
    changeVolume(event);
  };

  function boundOnMouseUp(evt) {
    onMouseUp(evt);
  }

  function boundOnMouseMove(evt) {
    onMouseMove(evt);
  }

  function setVolume(volume) {
    adsManager.setVolume(volume);
    if (volume == 0) {
      adMuted = true;
    } else {
      adMuted = false;
    }
  }

  hideAdControls();
  onShowAdControls();
  onHideAdControls();
  onAdPlayPauseClick();
  onAdMuteClick();
  onAdFullscreenClick();
  onAdVolumeSliderMouseDown();

  setUpIMA();
  checkUnmutedAutoplaySupport();
};
