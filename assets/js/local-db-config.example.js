(function () {
  const config = {
    localUrl: "",
    cloudUrl: "/api",
    cloudHosts: [
      "cinetube-gray.vercel.app"
    ]
  };

  function isLocalHost(hostname) {
    return ["localhost", "127.0.0.1", "::1"].includes(hostname);
  }

  function isPrivateNetworkHost(hostname) {
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
    return !hostname.includes(".");
  }

  function localApiUrl(hostname) {
    return config.localUrl || `${window.location.protocol}//${hostname}:3001`;
  }

  function resolveUrl() {
    const hostname = window.location.hostname;
    if (isLocalHost(hostname) || isPrivateNetworkHost(hostname)) return localApiUrl(hostname);
    if (config.cloudHosts.includes(hostname)) return config.cloudUrl;
    return config.cloudUrl || localApiUrl(hostname);
  }

  window.CINETUBE_API_CONFIG = config;
  window.CINETUBE_LOCAL_API = {
    url: resolveUrl()
  };
})();
