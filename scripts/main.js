Hooks.on("renderFilePicker", (app, html, data) => {
  const root = html instanceof HTMLElement ? html : html[0];
  if (!root) return;

  if (root.querySelector(".url-picker-container")) return;

  const targetPath = app.field?.name || app.options?.field || "";
  const isTokenField = targetPath.includes("prototypeToken") || targetPath.includes("token");

  // Variables de estado
  let offsetX = 0;
  let offsetY = 0;
  let scale = 1.0;
  let borderWidth = 8;
  let isDragging = false;
  let startX = 0;
  let startY = 0;

  const formGroup = document.createElement("div");
  formGroup.className = "url-picker-container";
  formGroup.innerHTML = `
    <label class="url-picker-label">
      <i class="fas fa-link"></i> Enlace de imagen (URL):
      <span class="url-picker-target-badge">${isTokenField ? "TOKEN" : "PORTRAIT"}</span>
    </label>
    
    <div class="url-picker-input-group">
      <input type="url" class="url-picker-input" placeholder="https://ejemplo.com/imagen.png" />
      <button type="button" class="url-picker-btn" title="Aplicar URL"><i class="fas fa-check"></i> Aplicar</button>
    </div>

    <!-- Opciones de Token -->
    <div class="url-picker-token-options" style="${isTokenField ? 'display:flex;' : 'display:none;'}">
      <label class="url-picker-checkbox-label">
        <input type="checkbox" class="url-picker-as-token" ${isTokenField ? 'checked' : ''}>
        <i class="fas fa-coins"></i> Formatear como Token Circular
      </label>

      <div class="url-picker-border-controls" style="${isTokenField ? 'display:flex;' : 'display:none;'}">
        <div class="url-picker-control-row">
          <label><i class="fas fa-shield-alt"></i> Diseños Temáticos RPG:</label>
          <select class="url-picker-border-style">
            <option value="none">Sin Borde</option>
            <option value="spikes" selected>⚔️ Picos de Hierro / Espinas</option>
            <option value="fire">🔥 Fuego / Aura Llameante</option>
            <option value="nature">🌿 Enredadera & Hojas Druídicas</option>
            <option value="ice">❄️ Cristal de Hielo / Escarcha</option>
            <option value="stone">🪨 Piedra / Rocas Ancestrales</option>
            <option value="rivets">🛡️ Remaches de Bronce / Placas</option>
            <option value="elven">✨ Filigrana Élfica / Dorado</option>
            <option value="water">🌊 Agua / Ondas Fluidas</option>
            <option value="solid">🔴 Borde Clásico Simple</option>
            <option value="double">⭕ Doble Anillo Astrológico</option>
            <option value="cogwheel">⚙️ Engranaje Arcana</option>
          </select>
        </div>

        <div class="url-picker-control-row">
          <label><i class="fas fa-palette"></i> Color Tonalidad:</label>
          <div class="url-picker-color-group">
            <input type="color" class="url-picker-border-color" value="#eab308" />
            <span class="url-picker-color-val">#EAB308</span>
          </div>
        </div>

        <div class="url-picker-control-row">
          <label><i class="fas fa-arrows-alt-h"></i> Grosor / Relieve:</label>
          <div class="url-picker-scale-group">
            <input type="range" class="url-picker-border-width" min="4" max="22" step="1" value="10" />
            <span class="url-picker-width-val">10px</span>
          </div>
        </div>

        <div class="url-picker-control-row">
          <label><i class="fas fa-search-plus"></i> Zoom / Escala:</label>
          <div class="url-picker-scale-group">
            <input type="range" class="url-picker-zoom" min="0.5" max="2.5" step="0.05" value="1.0" />
            <button type="button" class="url-picker-reset-pos" title="Centrar Posición"><i class="fas fa-sync-alt"></i></button>
          </div>
        </div>
        <small class="url-picker-drag-hint"><i class="fas fa-hand-pointer"></i> Haz clic y arrastra la vista previa para posicionar la imagen</small>
      </div>
    </div>

    <div class="url-picker-preview-wrapper">
      <img class="url-picker-preview" alt="Vista previa" />
    </div>
  `;

  const targetContainer = root.querySelector(".filepicker-body") || root.querySelector("form") || root;
  targetContainer.insertBefore(formGroup, targetContainer.firstChild);

  const inputUrl = formGroup.querySelector(".url-picker-input");
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

  if (!isTokenField) {
    const tokenOptionsDiv = formGroup.querySelector(".url-picker-token-options");
    tokenOptionsDiv.style.display = "flex";

    chkAsToken.addEventListener("change", (e) => {
      borderControls.style.display = e.target.checked ? "flex" : "none";
      updatePreview(inputUrl.value.trim());
    });
  }

  // --- ARRASTRE DE IMAGEN CON EL MOUSE ---
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

  // RENDERIZADO DE MARCOS
  const processImageToken = (srcUrl, style, colorHex, bWidth) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const size = 300;
        canvas.width = size;
        canvas.height = size;

        const center = size / 2;
        const paddingExtra = bWidth + 12;
        const radius = size / 2 - paddingExtra;

        // 1. Recorte circular de la imagen
        ctx.save();
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();

        const drawWidth = size * scale;
        const drawHeight = size * scale;
        const drawX = (size - drawWidth) / 2 + offsetX;
        const drawY = (size - drawHeight) / 2 + offsetY;

        ctx.drawImage(img, 0, 0, img.width, img.height, drawX, drawY, drawWidth, drawHeight);
        ctx.restore();

        // 2. Dibujo de diseños temáticos complejos
        if (style !== "none") {
          ctx.save();
          ctx.strokeStyle = colorHex;
          ctx.fillStyle = colorHex;

          if (style === "spikes") {
            // Picos / Espinas de hierro
            const spikeCount = 16;
            ctx.shadowColor = colorHex;
            ctx.shadowBlur = 6;

            // Anillo base
            ctx.lineWidth = bWidth;
            ctx.beginPath();
            ctx.arc(center, center, radius, 0, Math.PI * 2);
            ctx.stroke();

            // Púas exteriores
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
            // Fuego / Aura Llameante
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
            // Hojas y enredadera
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
            // Hielo / Escarcha Rúnica
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
            // Rocas Ancestrales
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
            // Placas con Remaches
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
            // Filigrana Dorado
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
            // Ondas de agua
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

        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => resolve(srcUrl);
      img.src = srcUrl;
    });
  };

  const updatePreview = async (url) => {
    if (url && (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:"))) {
      if (chkAsToken.checked) {
        imgPreview.classList.add("token-style");
        imgPreview.style.cursor = "grab";
        const processed = await processImageToken(url, selectBorder.value, inputColor.value, borderWidth);
        imgPreview.src = processed;
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

  inputUrl.addEventListener("input", (ev) => {
    updatePreview(ev.target.value.trim());
  });

  btnApply.addEventListener("click", async (ev) => {
    ev.preventDefault();
    ev.stopPropagation();

    let finalUrl = inputUrl.value.trim();

    if (!finalUrl) {
      ui.notifications.warn("Por favor, ingresa una URL válida.");
      return;
    }

    if (chkAsToken.checked) {
      finalUrl = await processImageToken(finalUrl, selectBorder.value, inputColor.value, borderWidth);
    }

    if (app.field) {
      app.field.value = finalUrl;
      app.field.dispatchEvent(new Event("change", { bubbles: true }));
    }

    if (typeof app.callback === "function") {
      try {
        await app.callback(finalUrl);
      } catch (err) {
        console.warn("Easy URL Picker | Excepción en callback:", err);
      }
    } else if (app.options && typeof app.options.callback === "function") {
      try {
        await app.options.callback(finalUrl);
      } catch (err) {
        console.warn("Easy URL Picker | Excepción en options.callback:", err);
      }
    }

    app.close();
  });
});