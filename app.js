const DATA_BASE_URL = "http://192.168.2.90/diagnostics";

async function loadDiagnostics() {
  const res = await fetch(`${DATA_BASE_URL}/index.json`, {
    cache: "no-store"
  });

  if (!res.ok) {
    throw new Error("Failed to load diagnostics index");
  }

  const index = await res.json();

  document.getElementById("summary").textContent =
    `Sessions: ${index.sessions.length}`;

  document.getElementById("raw").textContent =
    JSON.stringify(index, null, 2);
}

loadDiagnostics().catch(err => {
  document.getElementById("summary").textContent =
    "ERROR: " + err.message;
});
