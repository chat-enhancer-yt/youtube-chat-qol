interface WalkthroughClip {
  endSeconds: number | null;
  hash: string;
  startSeconds: number;
  title: string;
}

interface ClipOpenOptions {
  continueFromPreview?: boolean;
  updateHash?: boolean;
}

interface ClipPreviewCloseOptions {
  keepActive?: boolean;
  keepPlayback?: boolean;
}

interface ClipCloseOptions {
  clearHash?: boolean;
}

interface DocsConfig {
  walkthrough?: unknown;
}

type ClipPreload = "auto" | "metadata";

export function initializeWalkthroughClips() {
  const clipTriggers = Array.from(document.querySelectorAll<HTMLElement>("[data-walkthrough-clip-open]"));
  const clipModalElement = document.querySelector<HTMLDialogElement>("[data-walkthrough-clip-modal]");
  const clipTitle = clipModalElement?.querySelector<HTMLElement>("[data-walkthrough-clip-title]");
  const clipVideoElement = document.querySelector<HTMLVideoElement>("[data-walkthrough-clip-video]");
  const clipFrame = document.querySelector<HTMLElement>("[data-walkthrough-clip-frame]");
  const clipModalPanel = document.querySelector<HTMLElement>("[data-walkthrough-clip-modal-panel]");
  const clipPreview = document.querySelector<HTMLElement>("[data-walkthrough-clip-preview]");
  const walkthroughPath = readDocsConfig().walkthrough;

  if (
    !clipTriggers.length ||
    !clipModalElement ||
    !(clipVideoElement instanceof HTMLVideoElement) ||
    typeof walkthroughPath !== "string" ||
    !walkthroughPath
  ) {
    return;
  }

  const clipModal = clipModalElement;
  const clipVideo = clipVideoElement;

  const clips = new Map<HTMLElement, WalkthroughClip>();
  for (const trigger of clipTriggers) {
    const clip = readClip(trigger);
    if (clip) clips.set(trigger, clip);
  }
  if (!clips.size) return;

  const clipsByHash = new Map<string, WalkthroughClip>();
  const videoUrl = new URL(walkthroughPath, window.location.href);
  const hoverPreviewQuery = typeof window.matchMedia === "function"
    ? window.matchMedia("(hover: hover) and (pointer: fine)")
    : null;
  const reducedMotionQuery = typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;
  const previewElements = (
    clipFrame instanceof HTMLElement &&
    clipModalPanel instanceof HTMLElement &&
    clipPreview instanceof HTMLElement
  ) ? { frame: clipFrame, modalPanel: clipModalPanel, preview: clipPreview } : null;
  const canPreviewOnHover = previewElements !== null && hoverPreviewQuery?.matches === true;
  let activeClip: WalkthroughClip | null = null;
  let clearHashOnModalClose = true;
  let hoveredTrigger: HTMLElement | null = null;
  let loopFrame = 0;
  let pendingStartTime: number | null = null;
  let previewCloseTimer = 0;
  let previewTimer = 0;
  let previewTrigger: HTMLElement | null = null;

  clips.forEach((clip, trigger) => {
    if (!clipsByHash.has(clip.hash)) clipsByHash.set(clip.hash, clip);
    trigger.setAttribute("aria-controls", clipModal.id || "walkthrough-clip");
    trigger.setAttribute("aria-haspopup", "dialog");
    const prepareVideo = () => prepareClipVideo("auto");
    trigger.addEventListener("pointerenter", () => {
      cancelPreviewCloseTimer();
      hoveredTrigger = trigger;
      prepareVideo();
      scheduleClipPreview(trigger);
    });
    trigger.addEventListener("pointerleave", () => {
      if (hoveredTrigger === trigger) hoveredTrigger = null;
      scheduleClipPreviewClose();
    });
    trigger.addEventListener("pointerdown", () => {
      cancelPreviewTimer();
      prepareVideo();
    });
    trigger.addEventListener("focus", prepareVideo);
    trigger.addEventListener("click", (event) => {
      if (event instanceof MouseEvent && (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) {
        return;
      }

      event.preventDefault();
      openClip(clips.get(trigger), {
        continueFromPreview: previewTrigger === trigger && isClipPreviewOpen(),
        updateHash: true
      });
    });
  });

  if (!document.querySelector("[data-walkthrough-video]")) {
    scheduleClipMetadataPreload();
  }

  clipModal.addEventListener("click", (event) => {
    if (event.target === clipModal) closeClip();
  });
  clipModal.addEventListener("close", () => {
    if (clearHashOnModalClose) clearClipHash(activeClip);
    clearHashOnModalClose = true;
    resetClip();
  });

  clipVideo.addEventListener("loadedmetadata", () => {
    applyPendingStartTime();
    enforceClipBounds();
  });
  clipVideo.addEventListener("timeupdate", enforceClipBounds);
  clipVideo.addEventListener("ended", () => {
    if (!activeClip || !isClipPlayerVisible()) return;

    seekToClipStart();
    startActivePlayback();
  });
  clipVideo.addEventListener("play", startLoopMonitor);
  clipVideo.addEventListener("pause", stopLoopMonitor);
  document.addEventListener("visibilitychange", () => {
    if (!isClipPlayerVisible()) return;
    if (document.hidden) {
      clipVideo.pause();
      return;
    }

    startActivePlayback();
  });

  if (canPreviewOnHover && previewElements) {
    previewElements.preview.addEventListener("pointerenter", cancelPreviewCloseTimer);
    previewElements.preview.addEventListener("pointerleave", scheduleClipPreviewClose);
    window.addEventListener("resize", positionClipPreview);
    window.addEventListener("scroll", positionClipPreview, true);
  }

  window.addEventListener("hashchange", syncClipToHash);

  if (getClipFromHash()) {
    window.requestAnimationFrame(syncClipToHash);
  }

  function readClip(trigger: HTMLElement): WalkthroughClip | null {
    if (!(trigger instanceof HTMLElement)) return null;

    const chapter = trigger.dataset.walkthroughClipChapter?.trim().toLowerCase();
    const startSeconds = Number(trigger.dataset.walkthroughClipStart);
    const endValue = trigger.dataset.walkthroughClipEnd;
    const endSeconds = endValue === undefined ? null : Number(endValue);
    if (!chapter || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(chapter)) return null;
    if (!Number.isFinite(startSeconds) || startSeconds < 0) return null;
    if (endSeconds !== null && (!Number.isFinite(endSeconds) || endSeconds <= startSeconds)) return null;

    return {
      hash: `#clip-${chapter}`,
      endSeconds,
      startSeconds,
      title: trigger.dataset.walkthroughClipTitle?.trim() || ""
    };
  }

  function openClip(clip: WalkthroughClip | null | undefined, options: ClipOpenOptions = {}) {
    if (!clip) return;

    const continueFromPreview = (
      options.continueFromPreview === true &&
      activeClip === clip &&
      isClipPreviewOpen()
    );
    hoveredTrigger = null;
    closeClipPreview({ keepActive: true, keepPlayback: continueFromPreview });
    if (options.updateHash) updateClipHash(clip);

    if (typeof clipModal.showModal !== "function") {
      clipVideo.pause();
      resetClip();
      const fallbackUrl = new URL(videoUrl);
      fallbackUrl.hash = clip.endSeconds === null
        ? `t=${clip.startSeconds}`
        : `t=${clip.startSeconds},${clip.endSeconds}`;
      window.open(fallbackUrl.href, "_blank", "noopener");
      return;
    }

    activeClip = clip;
    prepareClipVideo("auto");
    if (clipTitle && clip.title) clipTitle.textContent = clip.title;
    if (!continueFromPreview) seekToClipStart();
    if (!clipModal.open) clipModal.showModal();
    startPlayback();
  }

  function scheduleClipPreview(trigger: HTMLElement) {
    if (
      !canPreviewOnHover ||
      clipModal.open ||
      (previewTrigger === trigger && isClipPreviewOpen())
    ) return;

    cancelPreviewTimer();
    previewTimer = window.setTimeout(() => {
      previewTimer = 0;
      if (hoveredTrigger !== trigger || clipModal.open) return;
      openClipPreview(trigger, clips.get(trigger));
    }, 250);
  }

  function openClipPreview(trigger: HTMLElement, clip: WalkthroughClip | undefined) {
    if (!canPreviewOnHover || !previewElements || !clip || hoveredTrigger !== trigger || clipModal.open) return;

    cancelPreviewCloseTimer();
    activeClip = clip;
    previewTrigger = trigger;
    prepareClipVideo("auto");
    previewElements.preview.append(previewElements.frame);
    previewElements.preview.hidden = false;
    positionClipPreview();
    void previewElements.preview.offsetWidth;
    previewElements.preview.classList.add("is-visible");
    seekToClipStart();
    startPreviewPlayback();
  }

  function closeClipPreview(options: ClipPreviewCloseOptions = {}) {
    cancelPreviewTimer();
    cancelPreviewCloseTimer();
    if (!previewElements || !isClipPreviewOpen()) return;

    previewElements.preview.classList.remove("is-visible");
    previewElements.preview.hidden = true;
    previewElements.preview.removeAttribute("data-placement");
    previewElements.modalPanel.append(previewElements.frame);
    previewTrigger = null;
    if (!options.keepPlayback) clipVideo.pause();
    if (!options.keepActive) {
      pendingStartTime = null;
      activeClip = null;
    }
  }

  function cancelPreviewTimer() {
    if (!previewTimer) return;

    window.clearTimeout(previewTimer);
    previewTimer = 0;
  }

  function scheduleClipPreviewClose() {
    cancelPreviewCloseTimer();
    previewCloseTimer = window.setTimeout(() => {
      previewCloseTimer = 0;
      closeClipPreview();
    }, 180);
  }

  function cancelPreviewCloseTimer() {
    if (!previewCloseTimer) return;

    window.clearTimeout(previewCloseTimer);
    previewCloseTimer = 0;
  }

  function isClipPreviewOpen() {
    return canPreviewOnHover && previewElements?.preview.hidden === false;
  }

  function positionClipPreview() {
    if (!previewElements || !isClipPreviewOpen() || !(previewTrigger instanceof HTMLElement)) return;

    const triggerRect = previewTrigger.getBoundingClientRect();
    const previewRect = previewElements.preview.getBoundingClientRect();
    const viewportMargin = 12;
    const previewGap = 10;
    const previewWidth = previewRect.width;
    const previewHeight = previewRect.height;
    const maximumLeft = Math.max(viewportMargin, window.innerWidth - previewWidth - viewportMargin);
    const desiredLeft = triggerRect.left + triggerRect.width / 2 - previewWidth / 2;
    const left = Math.min(Math.max(viewportMargin, desiredLeft), maximumLeft);
    const above = triggerRect.top - previewGap - previewHeight;
    const below = triggerRect.bottom + previewGap;
    const placeBelow = above < viewportMargin && below + previewHeight <= window.innerHeight - viewportMargin;
    const maximumTop = Math.max(viewportMargin, window.innerHeight - previewHeight - viewportMargin);
    const top = Math.min(Math.max(viewportMargin, placeBelow ? below : above), maximumTop);

    previewElements.preview.dataset.placement = placeBelow ? "below" : "above";
    previewElements.preview.style.left = `${Math.round(left)}px`;
    previewElements.preview.style.top = `${Math.round(top)}px`;
  }

  function prepareClipVideo(preload: ClipPreload) {
    if (preload !== "auto" && clipVideo.preload === "auto") return;

    const sourceChanged = clipVideo.src !== videoUrl.href;
    const preloadChanged = clipVideo.preload !== preload;
    if (!sourceChanged && !preloadChanged) return;

    clipVideo.preload = preload;
    if (sourceChanged) clipVideo.src = videoUrl.href;
    clipVideo.load();
  }

  function scheduleClipMetadataPreload() {
    const preloadMetadata = () => {
      if (document.hidden) return;
      prepareClipVideo("metadata");
    };

    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(preloadMetadata, { timeout: 4_000 });
      return;
    }

    window.setTimeout(preloadMetadata, 2_000);
  }

  function closeClip(options: ClipCloseOptions = {}) {
    clipVideo.pause();
    if (typeof clipModal.close === "function" && clipModal.open) {
      clearHashOnModalClose = options.clearHash !== false;
      clipModal.close();
      return;
    }

    if (options.clearHash !== false) clearClipHash(activeClip);
    resetClip();
  }

  function resetClip() {
    clipVideo.pause();
    stopLoopMonitor();
    pendingStartTime = null;
    activeClip = null;
  }

  function getClipFromHash() {
    return clipsByHash.get(window.location.hash.toLowerCase()) || null;
  }

  function syncClipToHash() {
    const clip = getClipFromHash();
    if (clip) {
      openClip(clip);
      return;
    }

    if (clipModal.open) closeClip({ clearHash: false });
  }

  function updateClipHash(clip: WalkthroughClip) {
    if (window.location.hash.toLowerCase() === clip.hash) return;
    history.pushState(null, "", clip.hash);
  }

  function clearClipHash(clip: WalkthroughClip | null) {
    if (!clip || window.location.hash.toLowerCase() !== clip.hash) return;
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }

  function seekToClipStart() {
    if (!activeClip) return;

    pendingStartTime = activeClip.startSeconds;
    applyPendingStartTime();
  }

  function applyPendingStartTime() {
    if (pendingStartTime === null || clipVideo.readyState === 0) return;

    const duration = Number.isFinite(clipVideo.duration) ? clipVideo.duration : 0;
    clipVideo.currentTime = duration ? Math.min(duration, pendingStartTime) : pendingStartTime;
    pendingStartTime = null;
  }

  function getClipEndTime() {
    if (!activeClip) return null;
    if (activeClip.endSeconds !== null) return activeClip.endSeconds;
    return Number.isFinite(clipVideo.duration) && clipVideo.duration > activeClip.startSeconds
      ? clipVideo.duration
      : null;
  }

  function enforceClipBounds() {
    if (!activeClip) return;

    const endSeconds = getClipEndTime();
    const currentTime = clipVideo.currentTime;
    if (
      currentTime < activeClip.startSeconds - 0.05 ||
      (endSeconds !== null && currentTime >= endSeconds - 0.05)
    ) {
      seekToClipStart();
    }
  }

  function startLoopMonitor() {
    if (loopFrame) return;

    const monitor = () => {
      loopFrame = 0;
      if (clipVideo.paused || !isClipPlayerVisible() || !activeClip) return;

      enforceClipBounds();
      loopFrame = window.requestAnimationFrame(monitor);
    };
    loopFrame = window.requestAnimationFrame(monitor);
  }

  function stopLoopMonitor() {
    if (!loopFrame) return;

    window.cancelAnimationFrame(loopFrame);
    loopFrame = 0;
  }

  function isClipPlayerVisible() {
    return clipModal.open || isClipPreviewOpen();
  }

  function startActivePlayback() {
    if (clipModal.open) {
      startPlayback();
      return;
    }
    if (isClipPreviewOpen()) startPreviewPlayback();
  }

  function startPreviewPlayback() {
    clipVideo.volume = 0;
    clipVideo.muted = true;
    if (reducedMotionQuery?.matches === true) {
      clipVideo.pause();
      return;
    }

    void clipVideo.play().catch(() => undefined);
  }

  function startPlayback() {
    clipVideo.volume = 1;
    clipVideo.muted = false;
    void clipVideo.play().catch(() => {
      clipVideo.muted = true;
      void clipVideo.play().catch(() => undefined);
    });
  }

  function readDocsConfig(): DocsConfig {
    const configScript = document.querySelector('script[type="application/json"][data-docs-config]');
    if (!(configScript instanceof HTMLScriptElement)) return {};

    try {
      const value: unknown = JSON.parse(configScript.textContent || "{}");
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch {
      return {};
    }
  }
}

initializeWalkthroughClips();
