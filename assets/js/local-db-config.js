(function () {
  const config = {
    localUrl: "http://127.0.0.1:3001",
    cloudUrl: "/api",
    cloudHosts: [
      "cinetube-gray.vercel.app"
    ]
  };

  function isLocalHost(hostname) {
    return ["localhost", "127.0.0.1", "::1"].includes(hostname);
  }

  function resolveUrl() {
    const hostname = window.location.hostname;
    if (isLocalHost(hostname)) return config.localUrl;
    if (config.cloudHosts.includes(hostname)) return config.cloudUrl;
    return config.cloudUrl || "";
  }

  window.CINETUBE_API_CONFIG = config;
  window.CINETUBE_LOCAL_API = {
    url: resolveUrl()
  };
})();
