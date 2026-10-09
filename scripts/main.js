Hooks.on("renderFilePicker", async (app, html, data) => {
  const root = html instanceof HTMLElement ? html : html[0];
  if (!root) return;

  if (root.querySelector(".url-picker-container")) return;

  const targetPath = app.field?.name || app.options?.field || "";
  const isTokenField = targetPath.includes("prototypeToken") || targetPath.includes("token");

  let doc = app.document || app.object || app.options?.document;
  if (!doc || typeof doc.setFlag !== "function") {
    const activeSheet = document.querySelector(".sheet.actor");
    if (activeSheet) {
      const actorId = activeSheet.id?.replace("actor-", "") || activeSheet.dataset?.appid;
      if (actorId && game.actors) {
        doc = game.actors.get(actorId) || game.actors.find(a => activeSheet.id.includes(a.id));
      }
    }
  }

  if (!doc) {
    for (let w of Object.values(ui.windows)) {
      if (w.actor && typeof w.actor.setFlag === "function") {
        doc = w.actor;
        break;
      }
    }
  }

  let savedConfig = {};
  if (doc && typeof doc.getFlag === "function") {
    savedConfig = doc.getFlag("world", "easyUrlPickerConfig") || {};
  }

  const storageKey = doc ? `easyUrlPicker_${doc.id}` : "easyUrlPicker_last";
  if (!savedConfig.rawUrl) {
    try {
      const localData = localStorage.getItem(storageKey);
      if (localData) savedConfig = JSON.parse(localData);
    } catch (e) {}
  }

  let rawUrl = savedConfig.rawUrl || "";

  if (!rawUrl) {
    if (app.field?.value && typeof app.field.value === "string" && app.field.value.startsWith("http")) {
      rawUrl = app.field.value;
    } else if (app.options?.current && typeof app.options.current === "string" && app.options.current.startsWith("http")) {
      rawUrl = app.options.current;
    }
  }

  const defaultFileName = savedConfig.fileName || (doc?.name ? doc.name.toLowerCase().replace(/[^a-z0-9]/g, "-") : "token-base");

  let offsetX = savedConfig.offX ?? 0;
  let offsetY = savedConfig.offY ?? 0;
  let scale = savedConfig.sc ?? 1.0;
  let borderWidth = savedConfig.bw ?? 10;
  let borderStyle = savedConfig.st || "spikes";
  let borderColor = savedConfig.col || "#eab308";
  let isTokenMode = savedConfig.isTok ?? true;

  let isDragging = false;
  let startX = 0;
  let startY = 0;

  const formGroup = document.createElement("div");
  formGroup.className = "url-picker-container";
  formGroup.innerHTML = `
    <label class="url-picker-label">
      <i class="fas fa-link"></i> Image Link (URL):
      <span class="url-picker-target-badge">${isTokenField ? "TOKEN" : "PORTRAIT"}</span>
    </label>
    
    <div class="url-picker-input-group">
      <input type="text" class="url-picker-input" placeholder="https://example.com/image.png" value="${rawUrl}" />
      <button type="button" class="url-picker-clear-btn" title="Clear URL" style="padding: 0 8px; margin-right: 4px;"><i class="fas fa-times"></i></button>
      <button type="button" class="url-picker-btn" title="Apply URL"><i class="fas fa-check"></i> Apply</button>
    </div>

    <!-- Token Options -->
    <div class="url-picker-token-options" style="display:flex;">
      <label class="url-picker-checkbox-label">
        <input type="checkbox" class="url-picker-as-token" ${isTokenMode ? 'checked' : ''}>
        <i class="fas fa-coins"></i> Format as Circular Token
      </label>

      <div class="url-picker-border-controls" style="${isTokenMode ? 'display:flex;' : 'display:none;'}">
        <div class="url-picker-control-row">
          <label><i class="fas fa-shield-alt"></i> RPG Themed Designs:</label>
          <select class="url-picker-border-style">
            <option value="none" ${borderStyle === "none" ? "selected" : ""}>No Border</option>
            <option value="spikes" ${borderStyle === "spikes" ? "selected" : ""}>Iron Spikes / Thorns</option>
            <option value="fire" ${borderStyle === "fire" ? "selected" : ""}>Fire / Flaming Aura</option>
            <option value="nature" ${borderStyle === "nature" ? "selected" : ""}>Vines & Druidic Leaves</option>
            <option value="ice" ${borderStyle === "ice" ? "selected" : ""}>Ice Crystal / Frost</option>
            <option value="stone" ${borderStyle === "stone" ? "selected" : ""}>Stone / Ancient Rocks</option>
            <option value="rivets" ${borderStyle === "rivets" ? "selected" : ""}>Bronze Rivets / Plates</option>
            <option value="elven" ${borderStyle === "elven" ? "selected" : ""}>Elven Filigree / Gold</option>
            <option value="water" ${borderStyle === "water" ? "selected" : ""}>Water / Fluid Waves</option>
            <option value="solid" ${borderStyle === "solid" ? "selected" : ""}>Simple Classic Border</option>
            <option value="double" ${borderStyle === "double" ? "selected" : ""}>Double Astrological Ring</option>
            <option value="cogwheel" ${borderStyle === "cogwheel" ? "selected" : ""}>Arcane Cogwheel</option>
          </select>
        </div>

        <div class="url-picker-control-row">
          <label><i class="fas fa-palette"></i> Color Tone:</label>
          <div class="url-picker-color-group">
            <input type="color" class="url-picker-border-color" value="${borderColor}" />
            <span class="url-picker-color-val">${borderColor.toUpperCase()}</span>
          </div>
        </div>

        <div class="url-picker-control-row">
          <label><i class="fas fa-arrows-alt-h"></i> Thickness / Relief:</label>
          <div class="url-picker-scale-group">
            <input type="range" class="url-picker-border-width" min="4" max="22" step="1" value="${borderWidth}" />
            <span class="url-picker-width-val">${borderWidth}px</span>
          </div>
        </div>

        <div class="url-picker-control-row">
          <label><i class="fas fa-search-plus"></i> Zoom / Scale:</label>
          <div class="url-picker-scale-group">
            <input type="range" class="url-picker-zoom" min="0.5" max="2.5" step="0.05" value="${scale}" />
            <button type="button" class="url-picker-reset-pos" title="Center Position"><i class="fas fa-sync-alt"></i></button>
          </div>
        </div>
        <small class="url-picker-drag-hint"><i class="fas fa-hand-pointer"></i> Click and drag preview to position image</small>
      </div>
    </div>

    <!-- Previsualizador y Nombre de Archivo -->
    <div class="url-picker-preview-wrapper" style="display:flex; flex-direction:column; align-items:center;">
      <img class="url-picker-preview" alt="Preview" />
      
      <div class="url-picker-filename-group" style="margin-top: 10px; display: flex; align-items: center; gap: 6px; width: 100%; max-width: 320px;">
        <label style="font-size: 12px; white-space: nowrap;"><i class="fas fa-file-signature"></i> File Name:</label>
        <input type="text" class="url-picker-filename-input" value="${defaultFileName}" placeholder="token-name" style="flex: 1; height: 26px; font-size: 12px;" />
        <span style="font-size: 12px; color: #888;">.png</span>
      </div>
    </div>
  `;

  const targetContainer = root.querySelector(".filepicker-body") || root.querySelector("form") || root;
  targetContainer.insertBefore(formGroup, targetContainer.firstChild);

  const inputUrl = formGroup.querySelector(".url-picker-input");
  const inputFileName = formGroup.querySelector(".url-picker-filename-input");
  const btnClear = formGroup.querySelector(".url-picker-clear-btn");
  const btnApply = formGroup.querySelector(".url-picker-btn");
  const imgPreview = formGroup.querySelector(".url-picker-preview");
  const chkAsToken = formGroup.querySelector(".url-picker-as-token");
  const selectBorder = formGroup.querySelector(".url-picker-border-style");
  const inputColor = formGroup.querySelector(".url-picker-border-color");
  const colorValLabel = formGroup.querySelector(".url-picker-color-val");
  const inputBorderWidth = formGroup.querySelector(".url-picker-border-width");
  const widthValLabel = formGroup.querySelector(".url-picker-width-val");
  const borderControls = formGroup.querySelector(".url-picker-border-controls");
  const inputZoom = formGroup.querySelector(".url-picker-zoom");
  const btnResetPos = formGroup.querySelector(".url-picker-reset-pos");

  inputUrl.addEventListener("click", () => inputUrl.select());
  inputFileName.addEventListener("click", () => inputFileName.select());

  btnClear.addEventListener("click", () => {
    inputUrl.value = "";
    updatePreview("");
    inputUrl.focus();
  });

  chkAsToken.addEventListener("change", (e) => {
    borderControls.style.display = e.target.checked ? "flex" : "none";
    updatePreview(inputUrl.value.trim());
  });

  imgPreview.addEventListener("mousedown", (e) => {
    if (!chkAsToken.checked) return;
    isDragging = true;
    startX = e.clientX - offsetX;
    startY = e.clientY - offsetY;
    imgPreview.style.cursor = "grabbing";
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    offsetX = e.clientX - startX;
    offsetY = e.clientY - startY;
    updatePreview(inputUrl.value.trim());
  });

  window.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      imgPreview.style.cursor = "grab";
    }
  });

  inputZoom.addEventListener("input", (e) => {
    scale = parseFloat(e.target.value);
    updatePreview(inputUrl.value.trim());
  });

  inputBorderWidth.addEventListener("input", (e) => {
    borderWidth = parseInt(e.target.value, 10);
    widthValLabel.textContent = `${borderWidth}px`;
    updatePreview(inputUrl.value.trim());
  });

  btnResetPos.addEventListener("click", () => {
    offsetX = 0;
    offsetY = 0;
    scale = 1.0;
    inputZoom.value = 1.0;
    updatePreview(inputUrl.value.trim());
  });

  selectBorder.addEventListener("change", () => updatePreview(inputUrl.value.trim()));
  
  inputColor.addEventListener("input", (e) => {
    colorValLabel.textContent = e.target.value.toUpperCase();
    updatePreview(inputUrl.value.trim());
  });

  const processImageToken = (srcUrl, style, colorHex, bWidth) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const size = 512;
        canvas.width = size;
        canvas.height = size;

        const center = size / 2;
        const paddingExtra = bWidth + 12;
        const radius = size / 2 - paddingExtra;

        ctx.save();
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();

        const aspect = img.width / img.height;
        let baseW, baseH;
        if (aspect > 1) {
          baseH = size;
          baseW = size * aspect;
        } else {
          baseW = size;
          baseH = size / aspect;
        }

        const drawWidth = baseW * scale;
        const drawHeight = baseH * scale;
        const drawX = (size - drawWidth) / 2 + offsetX;
        const drawY = (size - drawHeight) / 2 + offsetY;

        ctx.drawImage(img, 0, 0, img.width, img.height, drawX, drawY, drawWidth, drawHeight);
        ctx.restore();

        if (style !== "none") {
          ctx.save();
          ctx.strokeStyle = colorHex;
          ctx.fillStyle = colorHex;

          if (style === "spikes") {
            const spikeCount = 16;
            ctx.shadowColor = colorHex;
            ctx.shadowBlur = 6;

            ctx.lineWidth = bWidth;
            ctx.beginPath();
            ctx.arc(center, center, radius, 0, Math.PI * 2);
            ctx.stroke();

            for (let i = 0; i < spikeCount; i++) {
              const angle = (i / spikeCount) * Math.PI * 2;
              const pX = center + Math.cos(angle) * (radius + bWidth / 2 + 12);
              const pY = center + Math.sin(angle) * (radius + bWidth / 2 + 12);

              const b1X = center + Math.cos(angle - 0.15) * (radius + bWidth / 2);
              const b1Y = center + Math.sin(angle - 0.15) * (radius + bWidth / 2);
              const b2X = center + Math.cos(angle + 0.15) * (radius + bWidth / 2);
              const b2Y = center + Math.sin(angle + 0.15) * (radius + bWidth / 2);

              ctx.beginPath();
              ctx.moveTo(b1X, b1Y);
              ctx.lineTo(pX, pY);
              ctx.lineTo(b2X, b2Y);
              ctx.closePath();
              ctx.fill();
            }
          } 
          else if (style === "fire") {
            const flames = 32;
            ctx.shadowColor = "#ff4500";
            ctx.shadowBlur = 12;

            for (let i = 0; i < flames; i++) {
              const angle = (i / flames) * Math.PI * 2;
              const flameLen = (i % 2 === 0 ? bWidth * 1.5 : bWidth * 0.8) + Math.sin(i) * 4;
              
              const x1 = center + Math.cos(angle) * radius;
              const y1 = center + Math.sin(angle) * radius;
              const x2 = center + Math.cos(angle + 0.08) * (radius + flameLen);
              const y2 = center + Math.sin(angle + 0.08) * (radius + flameLen);

              ctx.strokeStyle = i % 2 === 0 ? colorHex : "#ffaa00";
              ctx.lineWidth = Math.max(2, bWidth / 3);
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.quadraticCurveTo(x1 + 4, y1 + 4, x2, y2);
              ctx.stroke();
            }

            ctx.lineWidth = bWidth / 2;
            ctx.strokeStyle = colorHex;
            ctx.beginPath();
            ctx.arc(center, center, radius, 0, Math.PI * 2);
            ctx.stroke();
          } 
          else if (style === "nature") {
            ctx.lineWidth = Math.max(3, bWidth / 2);
            ctx.strokeStyle = colorHex;
            ctx.beginPath();
            ctx.arc(center, center, radius, 0, Math.PI * 2);
            ctx.stroke();

            const leaves = 20;
            for (let i = 0; i < leaves; i++) {
              const angle = (i / leaves) * Math.PI * 2;
              const lx = center + Math.cos(angle) * radius;
              const ly = center + Math.sin(angle) * radius;

              ctx.save();
              ctx.translate(lx, ly);
              ctx.rotate(angle + Math.PI / 4);
              ctx.beginPath();
              ctx.ellipse(0, 0, bWidth, bWidth / 2, 0, 0, Math.PI * 2);
              ctx.fillStyle = colorHex;
              ctx.fill();
              ctx.restore();
            }
          } 
          else if (style === "ice") {
            const spikes = 24;
            ctx.shadowColor = colorHex;
            ctx.shadowBlur = 10;

            ctx.lineWidth = bWidth / 2;
            ctx.beginPath();
            ctx.arc(center, center, radius, 0, Math.PI * 2);
            ctx.stroke();

            for (let i = 0; i < spikes; i++) {
              const angle = (i / spikes) * Math.PI * 2;
              const len = (i % 3 === 0 ? 14 : 7) + (bWidth / 2);
              const x1 = center + Math.cos(angle) * (radius - 2);
              const y1 = center + Math.sin(angle) * (radius - 2);
              const x2 = center + Math.cos(angle) * (radius + len);
              const y2 = center + Math.sin(angle) * (radius + len);

              ctx.lineWidth = i % 2 === 0 ? 4 : 2;
              ctx.strokeStyle = i % 3 === 0 ? "#ffffff" : colorHex;
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.stroke();
            }
          } 
          else if (style === "stone") {
            const blocks = 16;
            ctx.lineWidth = bWidth;
            
            for (let i = 0; i < blocks; i++) {
              const a1 = (i / blocks) * Math.PI * 2;
              const a2 = ((i + 0.85) / blocks) * Math.PI * 2;
              
              ctx.strokeStyle = colorHex;
              ctx.beginPath();
              ctx.arc(center, center, radius, a1, a2);
              ctx.stroke();
            }
          } 
          else if (style === "rivets") {
            ctx.lineWidth = bWidth;
            ctx.beginPath();
            ctx.arc(center, center, radius, 0, Math.PI * 2);
            ctx.stroke();

            const rivets = 16;
            for (let i = 0; i < rivets; i++) {
              const angle = (i / rivets) * Math.PI * 2;
              const rx = center + Math.cos(angle) * radius;
              const ry = center + Math.sin(angle) * radius;

              ctx.beginPath();
              ctx.arc(rx, ry, Math.max(2, bWidth / 3), 0, Math.PI * 2);
              ctx.fillStyle = "#ffffff";
              ctx.fill();
            }
          } 
          else if (style === "elven") {
            ctx.lineWidth = Math.max(2, bWidth / 3);
            ctx.beginPath();
            ctx.arc(center, center, radius + 4, 0, Math.PI * 2);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(center, center, radius - 4, 0, Math.PI * 2);
            ctx.stroke();

            const curls = 12;
            for (let i = 0; i < curls; i++) {
              const angle = (i / curls) * Math.PI * 2;
              const cx = center + Math.cos(angle) * radius;
              const cy = center + Math.sin(angle) * radius;

              ctx.beginPath();
              ctx.arc(cx, cy, bWidth / 2, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
          else if (style === "water") {
            const drops = 20;
            ctx.shadowColor = colorHex;
            ctx.shadowBlur = 8;

            ctx.lineWidth = bWidth / 2;
            ctx.beginPath();
            ctx.arc(center, center, radius, 0, Math.PI * 2);
            ctx.stroke();

            for (let i = 0; i < drops; i++) {
              const angle = (i / drops) * Math.PI * 2 + (i % 2);
              const dx = center + Math.cos(angle) * (radius + 4);
              const dy = center + Math.sin(angle) * (radius + 4);

              ctx.beginPath();
              ctx.arc(dx, dy, (i % 3) + 2, 0, Math.PI * 2);
              ctx.fillStyle = colorHex;
              ctx.fill();
            }
          }
          else if (style === "solid") {
            ctx.lineWidth = bWidth;
            ctx.beginPath();
            ctx.arc(center, center, radius, 0, Math.PI * 2);
            ctx.stroke();
          } 
          else if (style === "double") {
            ctx.lineWidth = Math.max(2, bWidth / 2);
            ctx.beginPath();
            ctx.arc(center, center, radius + 4, 0, Math.PI * 2);
            ctx.stroke();

            ctx.lineWidth = Math.max(1, bWidth / 3);
            ctx.beginPath();
            ctx.arc(center, center, radius - 4, 0, Math.PI * 2);
            ctx.stroke();
          } 
          else if (style === "cogwheel") {
            const teeth = 14;
            ctx.lineWidth = Math.max(2, bWidth / 2);
            ctx.beginPath();
            ctx.arc(center, center, radius, 0, Math.PI * 2);
            ctx.stroke();

            for (let i = 0; i < teeth; i++) {
              const angle = (i / teeth) * Math.PI * 2;
              const x1 = center + Math.cos(angle) * (radius - 2);
              const y1 = center + Math.sin(angle) * (radius - 2);
              const x2 = center + Math.cos(angle) * (radius + bWidth);
              const y2 = center + Math.sin(angle) * (radius + bWidth);

              ctx.lineWidth = Math.max(3, bWidth * 0.8);
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.stroke();
            }
          }

          ctx.restore();
        }

        resolve(canvas);
      };
      img.onerror = () => resolve(null);
      img.src = srcUrl;
    });
  };

  const saveAndOverwriteTokenFile = (canvasObj, customFileName) => {
    return new Promise((resolve) => {
      canvasObj.toBlob(async (blob) => {
        if (!blob) return resolve(null);

        const worldId = game.world.id;
        const folder = `worlds/${worldId}/assets/actors`;
        const cleanName = customFileName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-") || "token-base";
        const fileName = `${cleanName}.png`;
        const file = new File([blob], fileName, { type: "image/png" });

        const pickerApp = foundry.applications?.apps?.FilePicker || globalThis.FilePicker;

        try {
          // Crear los subdirectorios recursivamente en la carpeta Data si aún no existen
          try {
            await pickerApp.createDirectory("data", `worlds/${worldId}/assets`, {}, { notify: false });
          } catch (e1) {}
          try {
            await pickerApp.createDirectory("data", folder, {}, { notify: false });
          } catch (e2) {}

          const uploaded = await pickerApp.upload("data", folder, file, {}, { notify: false });
          const finalPath = (uploaded.path || `${folder}/${fileName}`) + `?t=${Date.now()}`;
          resolve(finalPath);
        } catch (err) {
          console.error("Easy URL Picker | Upload error:", err);
          resolve(null);
        }
      }, "image/png");
    });
  };

  const updatePreview = async (url) => {
    if (url && url.length > 2) {
      if (chkAsToken.checked) {
        imgPreview.classList.add("token-style");
        imgPreview.style.cursor = "grab";
        const canvas = await processImageToken(url, selectBorder.value, inputColor.value, borderWidth);
        if (canvas) imgPreview.src = canvas.toDataURL("image/png");
      } else {
        imgPreview.classList.remove("token-style");
        imgPreview.style.cursor = "default";
        imgPreview.src = url;
      }
      imgPreview.classList.add("visible");
    } else {
      imgPreview.classList.remove("visible");
      imgPreview.src = "";
    }
  };

  if (rawUrl) {
    updatePreview(rawUrl);
  }

  inputUrl.addEventListener("input", (ev) => {
    updatePreview(ev.target.value.trim());
  });

  btnApply.addEventListener("click", async (ev) => {
    ev.preventDefault();
    ev.stopPropagation();

    const typedUrl = inputUrl.value.trim();
    const typedFileName = inputFileName.value.trim() || defaultFileName;

    if (!typedUrl) {
      ui.notifications.warn("Please enter a valid URL.");
      return;
    }

    const configToSave = {
      rawUrl: typedUrl,
      fileName: typedFileName,
      offX: offsetX,
      offY: offsetY,
      sc: scale,
      bw: borderWidth,
      st: selectBorder.value,
      col: inputColor.value,
      isTok: chkAsToken.checked
    };

    if (doc && typeof doc.setFlag === "function") {
      try {
        await doc.setFlag("world", "easyUrlPickerConfig", configToSave);
      } catch (err) {
        console.warn("Easy URL Picker | Error saving flags:", err);
      }
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify(configToSave));
    } catch (e) {}

    let finalUrl = typedUrl;
    if (chkAsToken.checked) {
      const canvas = await processImageToken(typedUrl, selectBorder.value, inputColor.value, borderWidth);
      if (canvas) {
        const savedFilePath = await saveAndOverwriteTokenFile(canvas, typedFileName);
        if (savedFilePath) {
          finalUrl = savedFilePath;
        }
      }
    }

    if (app.field) {
      app.field.value = finalUrl;
      app.field.dispatchEvent(new Event("change", { bubbles: true }));
    }

    if (typeof app.callback === "function") {
      try {
        await app.callback(finalUrl);
      } catch (err) {
        console.warn("Easy URL Picker | Callback exception:", err);
      }
    } else if (app.options && typeof app.options.callback === "function") {
      try {
        await app.options.callback(finalUrl);
      } catch (err) {
        console.warn("Easy URL Picker | options.callback exception:", err);
      }
    }

    app.close();
  });
});
