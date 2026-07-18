/*
  Shared engine for the audio-synced event pages (ts-0001, ts-snri314).
  Defines window.TelestaiEvent; each page supplies its own colors, shift range,
  and per-frame callback (stars/sand/water), then calls TelestaiEvent.wire(...).

  Loaded in <head> (via the page's `head_scripts` front matter) so these
  definitions exist before the page's own inline <script> runs.
*/
window.TelestaiEvent = (function () {
  // Generate twinkling stars inside the given container.
  function createStars(container, count) {
    count = count || 50;
    for (let i = 0; i < count; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.animationDelay = `${Math.random() * 3}s`;
      container.appendChild(star);
    }
  }

  // Build the radial-gradient string for a given progress (0-100).
  // `stops` is [{ percent, color: [r,g,b] }, ...]; the whole gradient shifts
  // from `shiftStart`% (progress 0) to `shiftEnd`% (progress 100).
  function radialGradient(stops, shiftStart, shiftEnd, progress) {
    const gradientStops = stops.map((stop) => {
      const color = stop.color;
      const shiftAmount = shiftStart + (progress / 100) * (shiftEnd - shiftStart);
      const adjustedPercent = stop.percent + shiftAmount;
      return `rgb(${color[0]}, ${color[1]}, ${color[2]}) ${adjustedPercent}%`;
    });
    return `radial-gradient(ellipse 150% 100% at center bottom, ${gradientStops.join(', ')})`;
  }

  // Typewriter synced to audio position. Reveals the grid-area blocks in order
  // as the track plays. Returns { prepare, update }.
  function createTypewriter(audioElement) {
    let prepared = false;
    let data = [];
    let totalChars = 0;

    function prepare() {
      if (prepared) return;
      prepared = true;

      const getElement = (area) => document.querySelector(`[style*="grid-area: ${area}"]`);

      const orderedElements = [
        [getElement('header')],
        [getElement('d')],
        [getElement('t')],
        [getElement('l')],
        [getElement('i')],
        [getElement('music')],
        [getElement('and')],
        [getElement('picnic')],
        [getElement('md'), getElement('pd')], // type both columns simultaneously
        [getElement('rules')],
        [getElement('signoff')]
      ];

      orderedElements.forEach((group) => {
        const groupStartChar = totalChars;
        let maxGroupLength = 0;

        group.forEach((el) => {
          if (el) {
            const preTag = el.querySelector('pre');
            const textContainer = preTag || el;
            maxGroupLength = Math.max(maxGroupLength, textContainer.textContent.length);
          }
        });

        group.forEach((el) => {
          if (el) {
            const preTag = el.querySelector('pre');
            const textContainer = preTag || el;
            const text = textContainer.textContent;
            const height = el.offsetHeight;

            data.push({
              textContainer: textContainer,
              text: text,
              startChar: groupStartChar,
              endChar: groupStartChar + text.length
            });

            if (height > 0) {
              el.style.minHeight = `${height}px`;
            }

            textContainer.textContent = '';
            el.style.opacity = '1';
          }
        });

        totalChars += maxGroupLength;
      });
    }

    function update() {
      if (!prepared || !audioElement.duration) return;

      const progress = audioElement.currentTime / audioElement.duration;
      const targetChars = Math.floor(progress * totalChars);

      data.forEach((item) => {
        if (targetChars >= item.endChar) {
          item.textContainer.textContent = item.text;
        } else if (targetChars > item.startChar) {
          item.textContainer.textContent = item.text.substring(0, targetChars - item.startChar);
        } else {
          item.textContainer.textContent = '';
        }
      });
    }

    return { prepare: prepare, update: update };
  }

  // Wire the audio element to a per-frame callback + typewriter.
  //   opts.audioElement, opts.audioPlayer, opts.setRecordingButton
  //   opts.typewriter  -> object from createTypewriter()
  //   opts.onFrame(progress0to100) -> page-specific visuals (background, stars, ...)
  function wire(opts) {
    const audioElement = opts.audioElement;
    const audioPlayer = opts.audioPlayer;
    const setRecordingButton = opts.setRecordingButton;
    const typewriter = opts.typewriter;
    const onFrame = opts.onFrame;
    let hasBeenPlayed = false;
    let animationFrameId = null;

    function frame() {
      if (audioElement.duration) {
        const progress = (audioElement.currentTime / audioElement.duration) * 100;
        onFrame(progress);
        typewriter.update();
      }
      if (!audioElement.paused) {
        animationFrameId = requestAnimationFrame(frame);
      }
    }

    audioElement.addEventListener('play', () => {
      typewriter.prepare();
      if (!hasBeenPlayed) {
        audioPlayer.classList.add('playing');
        setRecordingButton.classList.add('moved');
        hasBeenPlayed = true;
      }
      if (animationFrameId === null) {
        frame();
      }
    });

    audioElement.addEventListener('pause', () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    });

    audioElement.addEventListener('seeked', () => {
      frame();
      typewriter.update();
    });

    audioElement.addEventListener('loadedmetadata', frame);

    return { frame: frame };
  }

  return {
    createStars: createStars,
    radialGradient: radialGradient,
    createTypewriter: createTypewriter,
    wire: wire
  };
})();
