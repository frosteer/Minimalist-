function handleEditorKeys(e) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const node = sel.anchorNode;

  // 🟢 Plain text indenting (no bullet)
  if (e.key === "Tab") {
    const li = getClosestListItem(node);
    if (!li) {
      e.preventDefault();
      const block = getClosestBlock(node);
      const currentIndent = parseInt(block.style.marginLeft || 0);
      if (e.shiftKey) {
        // Shift + Tab → unindent
        block.style.marginLeft = `${Math.max(0, currentIndent - 20)}px`;
      } else {
        // Tab → indent
        block.style.marginLeft = `${currentIndent + 20}px`;
      }
      return; // stop here so it won't trigger bullet logic
    }
  }

  // 🟢 /- + space → create bullet point
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

  // 🟢 Tab → indent bullet
  if (e.key === "Tab" && !e.shiftKey) {
    const li = getClosestListItem(node);
    if (li) {
      e.preventDefault();
      indentListItem(li);
      return;
    }
  }

  // 🟢 Shift + Tab → unindent bullet
  if (e.key === "Tab" && e.shiftKey) {
    const li = getClosestListItem(node);
    if (li) {
      e.preventDefault();
      unindentListItem(li);
      return;
    }
  }

  // 🟢 Enter → exit bullet on empty
  if (e.key === "Enter") {
    const li = getClosestListItem(node);
    if (li && isEmptyListItem(li)) {
      e.preventDefault();
      exitListAt(li);
      return;
    }
  }

  // 🟢 Backspace → remove empty bullet
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

/* --- helper to find current editable block when not in list --- */
function getClosestBlock(node) {
  while (node && node !== document && !node.classList?.contains("editor")) {
    if (node.nodeType === 1 && (node.tagName === "DIV" || node.tagName === "P")) return node;
    node = node.parentNode;
  }
  // if none, create a block inside editor
  const editor = findClosestEditor(node);
  const block = document.createElement("div");
  block.innerHTML = "<br>";
  editor.appendChild(block);
  placeCaretAtStart(block);
  return block;
}
