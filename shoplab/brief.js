"use strict";

const agreement = {
  "all": {matched: 313, total: 571, crossPct: 4.714115},
  "claude-gemini": {matched: 114, total: 188, crossPct: 4.88109},
  "claude-gpt": {matched: 98, total: 187, crossPct: 5.5012},
  "gpt-gemini": {matched: 101, total: 196, crossPct: 3.803013}
};

function updateAgreement(event) {
  const pair = agreement[event.target.value];
  const sameShare = (100 * pair.matched / pair.total).toFixed(1) + "%";
  const crossShare = pair.crossPct.toFixed(1) + "%";
  document.getElementById("same-pct").textContent = sameShare;
  document.getElementById("same-bar").style.width = sameShare;
  document.getElementById("cross-pct").textContent = crossShare;
  document.getElementById("cross-bar").style.width = crossShare;
  document.getElementById("match-count").textContent =
    pair.matched + " exact matches across " + pair.total + " tasks with two valid picks.";
}

document.getElementById("pair").addEventListener("change", updateAgreement);

const dots = document.createDocumentFragment();
for (const [group, count] of [["own", 17], ["object", 9], ["other", 60]]) {
  for (let i = 0; i < count; i++) {
    const dot = document.createElement("span");
    dot.className = group;
    dots.append(dot);
  }
}
document.getElementById("taste-dots").append(dots);
