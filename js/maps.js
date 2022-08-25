// Constants (to avoid magic numbers)
const MIN_SCALE = 1;
const MAX_SCALE = 3;

// Select elements
const mapContainer = document.querySelector(".map-container");
const mapMatrix = document.querySelector("#map-matrix");
const mapSVG = document.querySelector(".map-svg");
const mapLand = document.querySelectorAll(".map-land");
const mapNorth = document.querySelectorAll(".map-north");
const mapCenter = document.querySelectorAll(".map-center");
const mapSouth = document.querySelectorAll(".map-south");
const countFound = document.querySelector(".count-found");
const countIncorrect = document.querySelector(".count-incorrect");
const countHint = document.querySelector(".count-hint");
const countTotal = document.querySelector(".count-total");
const hintBtn = document.querySelector(".hint-btn");
const resetBtn = document.querySelector(".reset-btn");
const prompt = document.querySelector(".prompt");

// PAN & ZOOM Variables
const viewBox = mapSVG.getAttribute("viewBox").split(" ");
const viewBoxW = viewBox[2];
const viewBoxH = viewBox[3];

let isDragging = false;
let isMouseDown = false;
let isGesture = false;
let isGesturePinch = false;
let isTouchDown = false;
let fromX = 0;
let fromY = 0;
let lastX = 0;
let lastY = 0;
let mapScale = MIN_SCALE;
let mapRange = 0;
let mapX = 0;
let mapY = 0;
let gestureTimer = null;
let gesturePinchTimer = null;
let gestureCache = [];
let gesturePinch = -1;

// APP Variables
let mapData = [];
let found = 0;
let incorrect = 0;
let hint = 0;
let promptData = null;

// APP Handlers
const handlePromptUpdate = () => {
  if (!mapData.length) {
    prompt.innerText = "Congratulations! You completed the map.";
    hintBtn.disabled = true;
    resetBtn.disabled = false;
    return;
  }

  const [location] = mapData.splice(Math.floor(Math.random() * mapData.length), 1);

  promptData = location;
  prompt.innerHTML = `Can you locate <strong>${promptData.name}</strong>?`;
};

const handleFound = target => {
  found += 1;
  countFound.innerHTML = `Found: <strong>${found}</strong>`;
  target.classList.add("found");
  handlePromptUpdate();
};

const handleIncorrect = target => {
  incorrect += 1;
  countIncorrect.innerHTML = `Incorrect: <strong>${incorrect}</strong>`;
  target.classList.add("incorrect");

  setTimeout(() => {
    target.classList.remove("incorrect");
  }, 100);
};

const handleHint = () => {
  hint += 1;
  countHint.innerHTML = `Hint: <strong>${hint}</strong>`;

  if (promptData && promptData.hint) {
    switch (promptData.hint) {
      case "map-north":
        handleHintEffect(mapNorth);
        break;
      case "map-center":
        handleHintEffect(mapCenter);
        break;
      case "map-south":
        handleHintEffect(mapSouth);
        break;
    }
  }
};

const handleHintEffect = region => {
  if (region) {
    region.forEach(regionPath => {
      regionPath.classList.add("hint");
    });

    setTimeout(() => {
      region.forEach(regionPath => {
        regionPath.classList.remove("hint");
      });
    }, 200);
  }
};

const handleReset = () => {
  handleDataFetch(window.location.href);

  found = 0;
  incorrect = 0;
  hint = 0;

  countFound.innerHTML = `Found: <strong>${found}</strong>`;
  countIncorrect.innerHTML = `Incorrect: <strong>${incorrect}</strong>`;
  countHint.innerHTML = `Hint: <strong>${hint}</strong>`;

  mapLand.forEach(land => {
    land.classList.remove("found");
  });

  fromX = 0;
  fromY = 0;
  lastX = 0;
  lastY = 0;
  mapScale = MIN_SCALE;
  mapRange = 0;
  mapX = 0;
  mapY = 0;

  handleMapMatrix(lastX, lastY, null);

  hintBtn.disabled = false;
  resetBtn.disabled = true;
};

const handleDataFetch = href => {
  const url = href.replace(/\/$/, "");
  const map = url.substring(url.lastIndexOf("/") + 1);

  fetch("../../data/maps.json")
    .then(res => res.json())
    .then(data => {
      mapData = data[map];
      countTotal.innerHTML = `Total: <strong>${mapData.length}</strong>`;
      handlePromptUpdate();
    })
    .catch(error => {
      prompt.innerText = "An error occurred while loading map data. Please refresh the page.";
      console.log(error);
    });
};

// APP Listeners
hintBtn.addEventListener("click", handleHint);
resetBtn.addEventListener("click", handleReset);

mapLand.forEach(land => {
  land.addEventListener("mouseenter", event => {
    if (isDragging || isTouchDown) {
      return;
    }

    const isFound = event.target.classList.contains("found");

    if (!isFound) {
      land.classList.add("hover");
    }

    if (!isDragging) {
      document.body.style.cursor = isFound ? "default" : "pointer";
    }
  });

  land.addEventListener("mouseleave", event => {
    if (isDragging || isTouchDown) {
      return;
    }

    const isFound = event.target.classList.contains("found");

    land.classList.remove("hover");

    if (!isDragging) {
      document.body.style.cursor = "default";
    }
  });
});

// PAN and ZOOM Gesture Cache
const handleGestureCache = (event, action) => {
  for (let i = 0; i < gestureCache.length; i++) {
    if (gestureCache[i].pointerId === event.pointerId) {
      if (action === "update") {
        gestureCache[i] = event;
      } else if (action === "remove") {
        gestureCache.splice(i, 1);
      }
      break;
    }
  }
};

// PAN and ZOOM Handlers
const handleMapMatrix = (x, y, scale) => {
  if (scale !== null) {
    mapScale += scale;
    mapScale = Math.min(Math.max(MIN_SCALE, mapScale), MAX_SCALE);

    // Range prevents the map from being dragged outside of SVG limits
    mapRange = (mapScale - MIN_SCALE) / (MAX_SCALE - MIN_SCALE);
  }

  mapX = Math.min(viewBoxW * mapRange, Math.max(x, -viewBoxW * mapRange));
  mapY = Math.min(viewBoxH * mapRange, Math.max(y, -viewBoxH * mapRange));

  mapMatrix.style.transform = `matrix(${mapScale}, 0, 0, ${mapScale}, ${mapX}, ${mapY})`;
};

const handleMapWheel = event => {
  event.preventDefault();
  handleMapMatrix(lastX, lastY, event.deltaY * -0.01);
};

const handlePointerDown = event => {
  if (event.pointerType === "mouse") {
    isMouseDown = true;
  }

  if (event.pointerType === "touch") {
    isTouchDown = true;
    gestureCache.push(event);
  }

  fromX = event.clientX;
  fromY = event.clientY;
};

const handlePointerUp = event => {
  const isTargetLand = event.target.dataset.title;
  const isFound = event.target.classList.contains("found");

  if (event.pointerType === "mouse") {
    if (isDragging) {
      isDragging = false;

      if (isTargetLand) {
        if (!isFound) {
          event.target.classList.add("hover");
        }

        document.body.style.cursor = isFound ? "default" : "pointer";
      } else {
        document.body.style.cursor = "default";
      }
    } else {
      if (isTargetLand && !isFound) {
        if (isTargetLand === promptData.name) {
          handleFound(event.target);
          document.body.style.cursor = "default";
        } else {
          handleIncorrect(event.target);
        }
      }
    }

    isMouseDown = false;
  }

  if (event.pointerType === "touch") {
    handleGestureCache(event, "remove");

    if (gestureCache.length < 1 && !isGesture) {
      if (isTargetLand && !isFound) {
        if (isTargetLand === promptData.name) {
          handleFound(event.target);
        } else {
          handleIncorrect(event.target);
        }
      }
    }

    if (gestureCache.length < 2) {
      gesturePinch = -1;
    }
  }

  lastX = mapX;
  lastY = mapY;
};

const handlePointerMove = event => {
  if (event.pointerType === "mouse") {
    if (isMouseDown) {
      if (!isDragging) {
        event.target.classList.remove("hover");
      }

      let x = lastX - (fromX - event.clientX);
      let y = lastY - (fromY - event.clientY);

      isDragging = true;
      document.body.style.cursor = "move";

      handleMapMatrix(x, y, null);
    } else {
      // Reset touch detection when mouse moves
      // This allows for supporting devices with both mouse and touchscreen
      if (isTouchDown) {
        isTouchDown = false;
      }
    }
  }

  if (event.pointerType === "touch") {
    clearTimeout(gestureTimer);
    handleGestureCache(event, "update");

    // Length 1 = Pan, Length 2 = Zoom
    if (gestureCache.length === 1) {
      if (isGesturePinch) return;

      let x = lastX - (fromX - event.clientX);
      let y = lastY - (fromY - event.clientY);

      if (Math.abs(fromX - event.clientX) > 10 || Math.abs(fromY - event.clientY) > 10) {
        isGesture = true;
      }

      handleMapMatrix(x, y, null);
    } else if (gestureCache.length === 2) {
      // When performing a gesture, single touch events are ignored
      clearTimeout(gesturePinchTimer);
      isGesture = true;
      isGesturePinch = true;

      // Calculate the distance between the two pointers on Y axis
      const curDiff = Math.abs(gestureCache[0].clientY - gestureCache[1].clientY);

      if (gesturePinch > 0) {
        if (curDiff > gesturePinch) {
          // Zoom in
          handleMapMatrix(lastX, lastY, 0.025);
        }
        if (curDiff < gesturePinch) {
          // Zoom out
          handleMapMatrix(lastX, lastY, -0.025);
        }
      }

      // Cache the distance for the next move event
      gesturePinch = curDiff;
      gesturePinchTimer = setTimeout(() => {
        isGesturePinch = false;
      }, 250);
    }

    gestureTimer = setTimeout(() => {
      isGesture = false;
    }, 250);
  }
};

// PAN & ZOOM Listeners
mapContainer.addEventListener("pointerdown", handlePointerDown);
mapContainer.addEventListener("pointerup", handlePointerUp);
mapContainer.addEventListener("pointercancel", handlePointerUp);
mapContainer.addEventListener("pointerleave", handlePointerUp);
mapContainer.addEventListener("pointermove", handlePointerMove);
mapContainer.addEventListener("wheel", handleMapWheel);

// APP Start
handleDataFetch(window.location.href);
