// === INITIAL SETUP ===
document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("container");
  const addPanelBtn = document.getElementById("addPanelBtn");

  // create 1 default panel
  createPanel(container);

  addPanelBtn.addEventListener("click", () => {
    const panels = container.querySelectorAll(".panel");
    if (panels.length >= 3) return; // max 3
    createPanel(container);
    resizePanels(container);
  });
});

function createPanel(container) {
  const panel = document.createElement("div");
  panel.classList.add("panel");

  const closeBtn = document.createElement("span");
  closeBtn.classList.add("close-btn");
  closeBtn.innerHTML = "×";
  closeBtn.onclick = () => {
    panel.remove();
    resizePanels(container);
  };

  const editor = document.createElement("div");
  editor.classList.add("editor");
  editor.contentEditable = "true";
  editor.addEventListener("keydown", handleEditorKeys);

  panel.appendChild(closeBtn);
  panel.appendChild(editor);
  container.appendChild(panel);

  resizePanels(container);
}

// === SPLIT SCREEN RESIZING ===
function resizePanels(container) {
  const panels = container.querySelectorAll(".panel");
  const dividers = container.querySelectorAll(".divider");
  dividers.forEach(d => d.remove()); // clear old dividers

  const width = 100 / panels.length;
  panels.forEach(p => (p.style.width = width + "%"));

  // add draggable dividers
  for (let i = 0; i < panels.length - 1; i++) {
    const divider = document.createElement("div");
    divider.classList.add("divider");
    container.insertBefore(divider, panels[i + 1]);

    let startX, startWidthLeft, startWidthRight;
    divider.addEventListener("mousedown", (e) => {
      startX = e.clientX;
      const leftPanel = panels[i];
      const rightPanel = panels[i + 1];
      startWidthLeft = leftPanel.offsetWidth;
      startWidthRight = rightPanel.offsetWidth;
      document.addEventListener("mousemove", resize);
      document.addEventListener("mouseup", stopResize);

      function resize(e) {
        const dx = e.clientX - startX;
        leftPanel.style.width = ((startWidthLeft + dx) / container.offsetWidth) * 100 + "%";
        rightPanel.style.width = ((startWidthRight - dx) / container.offsetWidth) * 100 + "%";
      }

      function stopResize() {
        document.removeEventListener("mousemove", resize);
        document.removeEventListener("mouseup", stopResize);
      }
    });
  }
}

// === EDITOR LOGIC (YOUR EXISTING CODE) ===
function handleEditorKeys(e) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const node = sel.anchorNode;

  // Plain text indenting (no bullet)
  if (e.key === "Tab") {
    const li = getClosestListItem(node);
    if (!li) {
      e.preventDefault();
      const block = getClosestBlock(node);
      const currentIndent = parseInt(block.style.marginLeft || 0);
      if (e.shiftKey) {
        block.style.marginLeft = `${Math.max(0, currentIndent - 20)}px`;
      } else {
        block.style.marginLeft = `${currentIndent + 20}px`;
      }
      return;
    }
  }

  // /- + space => create bullet
  if (e.key === " " && node && (node.nodeType === 3 || node.nodeType === 1)) {
    const text = (node.nodeType === 3 ? node.textContent : node.innerText || node.textContent).trim();
    if (text === "/-") {
      e.preventDefault();
      let parent = node.nodeType === 3 ? node.parentNode : node;
      const li = document.createElement("li");
      li.innerHTML = "<br>";
      const ul = document.createElement("ul");
      ul.appendChild(li);
      parent.replaceChild(ul, node);
      placeCaretAtStart(li);
      return;
    }
  }

  // Tab inside bullet
  if (e.key === "Tab" && !e.shiftKey) {
    const li = getClosestListItem(node);
    if (li) {
      e.preventDefault();
      indentListItem(li);
      return;
    }
  }

  // Shift+Tab inside bullet
  if (e.key === "Tab" && e.shiftKey) {
    const li = getClosestListItem(node);
    if (li) {
      e.preventDefault();
      unindentListItem(li);
      return;
    }
  }

  // Enter on empty bullet
  if (e.key === "Enter") {
    const li = getClosestListItem(node);
    if (li && isEmptyListItem(li)) {
      e.preventDefault();
      exitListAt(li);
      return;
    }
  }

  // Backspace on empty bullet
  if (e.key === "Backspace") {
    const li = getClosestListItem(node);
    if (li && isEmptyListItem(li)) {
      e.preventDefault();
      const ul = li.parentElement;
      const parentLi = ul.closest("li");
      const next = li.nextElementSibling;
      li.remove();
      cleanupEmptyUlsUpwards(ul);
      if (next) placeCaretAtStart(next);
      else if (parentLi) placeCaretAtEnd(parentLi);
      else {
        const editor = findClosestEditor(ul);
        const p = document.createElement("div");
        p.innerHTML = "<br>";
        ul.parentElement.insertBefore(p, ul.nextSibling);
        ul.remove();
        placeCaretAtStart(p);
      }
      return;
    }
  }
}

// === HELPERS ===
function getClosestBlock(node) {
  while (node && node !== document && !node.classList?.contains("editor")) {
    if (node.nodeType === 1 && (node.tagName === "DIV" || node.tagName === "P")) return node;
    node = node.parentNode;
  }
  const editor = findClosestEditor(node);
  const block = document.createElement("div");
  block.innerHTML = "<br>";
  editor.appendChild(block);
  placeCaretAtStart(block);
  return block;
}

function getClosestListItem(node) {
  while (node && node !== document) {
    if (node.nodeType === 1 && node.tagName === "LI") return node;
    node = node.parentNode;
  }
  return null;
}

function isEmptyListItem(li) {
  return li.innerText.trim() === "";
}

function findClosestEditor(node) {
  while (node && node !== document) {
    if (node.classList && node.classList.contains("editor")) return node;
    node = node.parentNode;
  }
  return null;
}

function placeCaretAtStart(el) {
  const range = document.createRange();
  const sel = window.getSelection();
  range.setStart(el, 0);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

function placeCaretAtEnd(el) {
  const range = document.createRange();
  const sel = window.getSelection();
  range.selectNodeContents(el);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

function indentListItem(li) {
  const prev = li.previousElementSibling;
  if (!prev) return;
  let sublist = prev.querySelector("ul");
  if (!sublist) {
    sublist = document.createElement("ul");
    prev.appendChild(sublist);
  }
  sublist.appendChild(li);
  placeCaretAtStart(li);
}

function unindentListItem(li) {
  const parentUl = li.parentElement;
  const parentLi = parentUl.closest("li");
  if (!parentLi) return;
  parentUl.parentElement.insertBefore(li, parentLi.nextSibling);
  placeCaretAtStart(li);
}

function exitListAt(li) {
  const ul = li.parentElement;
  const editor = findClosestEditor(ul);
  const div = document.createElement("div");
  div.innerHTML = "<br>";
  ul.parentElement.insertBefore(div, ul.nextSibling);
  li.remove();
  cleanupEmptyUlsUpwards(ul);
  placeCaretAtStart(div);
}

function cleanupEmptyUlsUpwards(ul) {
  while (ul && ul.tagName === "UL" && ul.children.length === 0) {
    const parent = ul.parentElement;
    ul.remove();
    ul = parent.closest("ul");
  }
}
