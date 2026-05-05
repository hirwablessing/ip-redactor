// Runs in the page's MAIN world at document_start, before any framework code.
// Patches HTMLInputElement / HTMLTextAreaElement value setters so programmatic
// value assignments (e.g. v-model, vee-validate setFieldValue) synchronously
// add/remove the redact class — eliminating the brief unblurred frames that
// polling-based detection leaves behind.
(() => {
  if (window.__ipRedactPagePatched) return;
  window.__ipRedactPagePatched = true;

  const IPV4 = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\/\d{1,2})?\b/;
  const IPV6_FULL = /\b(?:[a-fA-F0-9]{1,4}:){3,7}[a-fA-F0-9]{1,4}\b/;
  const IPV6_COMPRESSED = /\b(?:[a-fA-F0-9]{1,4}:){1,6}:(?:[a-fA-F0-9]{1,4}:){0,5}[a-fA-F0-9]{1,4}\b/;

  function hasIP(s) {
    return IPV4.test(s) || IPV6_FULL.test(s) || IPV6_COMPRESSED.test(s);
  }

  function patch(proto) {
    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    if (!desc || typeof desc.get !== "function" || typeof desc.set !== "function") return;

    Object.defineProperty(proto, "value", {
      configurable: true,
      enumerable: desc.enumerable,
      get() {
        return desc.get.call(this);
      },
      set(v) {
        desc.set.call(this, v);
        try {
          const str = v == null ? "" : String(v);
          if (hasIP(str)) {
            this.classList.add("ip-redact-input");
          } else {
            this.classList.remove("ip-redact-input");
          }
        } catch {
          // ignore — never let our patch break the host page
        }
      },
    });
  }

  patch(HTMLInputElement.prototype);
  patch(HTMLTextAreaElement.prototype);
})();
