(() => {
  "use strict";

  const isUnsupportedModelParameterWarning = (args) => args.some((value) => (
    typeof value === "string" && value.startsWith("Warning: Parameter not found:")
  ));

  ["log", "warn", "error"].forEach((method) => {
    const original = console[method].bind(console);
    console[method] = (...args) => {
      if (!isUnsupportedModelParameterWarning(args)) original(...args);
    };
  });

  self.importScripts(new URL("../vendor/tesseract/worker.min.js", self.location.href).href);
})();
