(() => {
  const IPV4 = String.raw`\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\/\d{1,2})?\b`;
  // 4+ segments minimum to dodge time/version false positives like 12:34:56
  const IPV6_FULL = String.raw`\b(?:[a-fA-F0-9]{1,4}:){3,7}[a-fA-F0-9]{1,4}\b`;
  const IPV6_COMPRESSED = String.raw`\b(?:[a-fA-F0-9]{1,4}:){1,6}:(?:[a-fA-F0-9]{1,4}:){0,5}[a-fA-F0-9]{1,4}\b`;
  const COMBINED = new RegExp(`${IPV4}|${IPV6_FULL}|${IPV6_COMPRESSED}`, "g");

  const SKIP_TAGS = new Set([
    "SCRIPT",
    "STYLE",
    "NOSCRIPT",
    "TEMPLATE",
    "TEXTAREA",
    "INPUT",
    "CODE",
  ]);

  function shouldSkip(node) {
    let p = node.parentNode;
    while (p) {
      if (p.nodeType === 1) {
        if (SKIP_TAGS.has(p.tagName)) return true;
        if (p.classList?.contains("ip-redact")) return true;
        if (p.isContentEditable) return true;
      }
      p = p.parentNode;
    }
    return false;
  }

  function wrapTextNode(textNode) {
    const text = textNode.nodeValue;
    if (!text || text.length < 7) return;
    const re = new RegExp(COMBINED.source, "g");
    if (!re.test(text)) return;
    re.lastIndex = 0;

    const frag = document.createDocumentFragment();
    let last = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) {
        frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      }
      const span = document.createElement("span");
      span.className = "ip-redact";
      span.dataset.ipRedacted = "1";
      span.textContent = m[0];
      frag.appendChild(span);
      last = m.index + m[0].length;
    }
    if (last < text.length) {
      frag.appendChild(document.createTextNode(text.slice(last)));
    }
    textNode.parentNode?.replaceChild(frag, textNode);
  }

  function scanInputs(root) {
    const els = root.querySelectorAll
      ? root.querySelectorAll("input, textarea")
      : [];
    for (const el of els) {
      const v = el.value || "";
      const re = new RegExp(COMBINED.source, "g");
      if (re.test(v)) {
        el.classList.add("ip-redact-input");
      } else {
        el.classList.remove("ip-redact-input");
      }
    }
  }

  function scanRoot(root) {
    if (!root) return;
    const start = root.nodeType === 1 ? root : document.body;
    if (!start) return;

    const walker = document.createTreeWalker(start, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (!n.nodeValue || n.nodeValue.length < 7) {
          return NodeFilter.FILTER_REJECT;
        }
        if (shouldSkip(n)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    for (const tn of nodes) wrapTextNode(tn);

    scanInputs(start);
  }

  // Initial scan
  if (document.body) {
    scanRoot(document.body);
  } else {
    document.addEventListener("DOMContentLoaded", () => scanRoot(document.body));
  }

  // Observe future changes
  const observer = new MutationObserver((mutations) => {
    for (const mut of mutations) {
      if (mut.type === "characterData") {
        const t = mut.target;
        if (t.nodeType === 3 && !shouldSkip(t)) wrapTextNode(t);
      } else if (mut.type === "childList") {
        for (const node of mut.addedNodes) {
          if (node.nodeType === 3) {
            if (!shouldSkip(node)) wrapTextNode(node);
          } else if (node.nodeType === 1) {
            scanRoot(node);
          }
        }
      } else if (mut.type === "attributes" && mut.attributeName === "value") {
        scanInputs(mut.target.parentNode || document);
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  // Re-check input values on user typing
  document.addEventListener("input", (e) => {
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) {
      const re = new RegExp(COMBINED.source, "g");
      if (re.test(t.value || "")) {
        t.classList.add("ip-redact-input");
      } else {
        t.classList.remove("ip-redact-input");
      }
    }
  });

  // Programmatic value changes (e.g. v-model assigning input.value) don't fire
  // input events or DOM mutations — poll inputs periodically as a safety net.
  setInterval(() => {
    if (document.hidden) return;
    scanInputs(document);
  }, 250);

  // Apply initial state from storage
  chrome.storage.local.get(["enabled"], ({ enabled }) => {
    if (enabled) document.documentElement.classList.add("ip-redact-on");
  });

  // Listen for toggle messages
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "IP_REDACT_TOGGLE") {
      document.documentElement.classList.toggle("ip-redact-on", !!msg.enabled);
    }
  });
})();
