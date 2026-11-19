(() => {
  "use strict";

  const form = document.getElementById("unlock-form");
  const keyInput = document.getElementById("access-key");
  const unlock = document.getElementById("unlock");
  const lock = document.getElementById("lock");
  const notice = document.getElementById("notice");
  const entry = document.getElementById("entry");
  const workspace = document.getElementById("workspace");
  let activeRequest = null;
  let frameURL = null;

  function lockDashboard(focus) {
    if (activeRequest) activeRequest.abort();
    activeRequest = null;
    workspace.replaceChildren();
    if (frameURL) URL.revokeObjectURL(frameURL);
    frameURL = null;
    workspace.hidden = true;
    entry.hidden = false;
    lock.hidden = true;
    document.body.classList.remove("explorer-open");
    keyInput.value = "";
    keyInput.removeAttribute("aria-invalid");
    notice.textContent = "";
    unlock.disabled = !window.crypto?.subtle;
    if (focus) keyInput.focus();
  }

  function showDashboard(plaintext) {
    frameURL = URL.createObjectURL(new Blob([plaintext], {type: "text/html;charset=utf-8"}));
    const frame = document.createElement("iframe");
    frame.id = "explorer";
    frame.title = "ShopLab participant explorer";
    frame.setAttribute("sandbox", "allow-scripts");
    frame.referrerPolicy = "no-referrer";
    frame.src = frameURL;
    workspace.replaceChildren(frame);
    workspace.hidden = false;
    entry.hidden = true;
    lock.hidden = false;
    document.body.classList.add("explorer-open");
    lock.focus();
  }

  async function loadSnapshot(signal) {
    const response = await fetch("snapshot.bin", {signal, cache:"no-store", credentials:"omit", redirect:"error"});
    if (!response.ok) throw new Error("Download failed");
    const bytes = new Uint8Array(await response.arrayBuffer());
    // SLX1, a 12-byte IV, and ciphertext with its 16-byte GCM tag.
    if (bytes.length <= 32 || String.fromCharCode(...bytes.subarray(0, 4)) !== "SLX1") {
      throw new Error("Unexpected snapshot format");
    }
    return bytes;
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (activeRequest || !window.crypto?.subtle) return;
    const input = keyInput.value.trim();
    if (!/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/.test(input)) {
      keyInput.setAttribute("aria-invalid", "true");
      notice.textContent = "The access key has 43 characters. Check that you copied the whole key.";
      keyInput.focus();
      return;
    }
    const bytes = Uint8Array.from(atob(input.replace(/-/g, "+").replace(/_/g, "/") + "="), c => c.charCodeAt(0));
    keyInput.value = "";
    keyInput.removeAttribute("aria-invalid");
    const request = new AbortController();
    activeRequest = request;
    unlock.disabled = true;
    notice.textContent = "Opening dashboard…";
    let encrypted;
    try {
      const key = await window.crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["decrypt"]);
      bytes.fill(0);
      encrypted = await loadSnapshot(request.signal);
      const plaintext = await window.crypto.subtle.decrypt({
        name:"AES-GCM", iv:encrypted.subarray(4, 16), tagLength:128
      }, key, encrypted.subarray(16));
      try {
        if (!request.signal.aborted) showDashboard(plaintext);
      } finally {
        new Uint8Array(plaintext).fill(0);
      }
    } catch {
      if (!request.signal.aborted) {
        notice.textContent = encrypted
          ? "The dashboard could not be unlocked. Check your key and try again."
          : "The dashboard could not be loaded. Check your connection and try again.";
        if (encrypted) keyInput.setAttribute("aria-invalid", "true");
        keyInput.focus();
      }
    } finally {
      bytes.fill(0);
      if (activeRequest === request) {
        activeRequest = null;
        unlock.disabled = false;
      }
    }
  });

  lock.addEventListener("click", () => lockDashboard(true));
  window.addEventListener("pagehide", () => lockDashboard(false));
  if (window.crypto?.subtle) unlock.disabled = false;
  else notice.textContent = "Open this page over HTTPS in a browser that supports Web Crypto.";
})();
