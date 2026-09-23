const installButton = document.querySelector("#install");
const fullscreenButton = document.querySelector("#fullscreen");
const status = document.querySelector("#app-status");
let installPrompt;
const say = (message) => {
  status.textContent = message;
  status.hidden = !message;
};
function updateControls() {
  const fullscreen = Boolean(document.fullscreenElement);
  fullscreenButton.textContent = fullscreen
    ? "Exit full screen"
    : "Full screen";
  fullscreenButton.setAttribute("aria-pressed", String(fullscreen));
  fullscreenButton.hidden = !document.fullscreenEnabled;
  installButton.hidden =
    matchMedia("(display-mode: standalone)").matches ||
    matchMedia("(display-mode: fullscreen)").matches ||
    navigator.standalone === true;
}
fullscreenButton.addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else
      await document.documentElement.requestFullscreen({
        navigationUI: "hide",
      });
    say("");
  } catch {
    say(
      "This browser could not enter full screen. Try installing the app from Chrome’s menu.",
    );
  }
  updateControls();
});
document.addEventListener("fullscreenchange", updateControls);
for (const mode of ["standalone", "fullscreen"])
  matchMedia(`(display-mode: ${mode})`).addEventListener(
    "change",
    updateControls,
  );
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  updateControls();
});
installButton.addEventListener("click", async () => {
  if (!installPrompt) {
    document.querySelector("#install-help").showModal();
    return;
  }
  const prompt = installPrompt;
  installPrompt = null;
  try {
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === "accepted")
      say(
        "Installation requested. Launch Inglorious Batters from your home screen when it finishes.",
      );
  } catch {
    document.querySelector("#install-help").showModal();
  }
});
window.addEventListener("appinstalled", () => {
  installPrompt = null;
  installButton.hidden = true;
  say("App installed. Open Inglorious Batters from your home screen.");
});
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("./sw.js", { updateViaCache: "none" })
    .catch(() => {
      say(
        "Offline setup is unavailable. You can still use the dashboard online and tap Full screen.",
      );
    });
}
updateControls();
