document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("pinForm");
  const connectBtn = document.getElementById("connectBtn");
  const disconnectBtn = document.getElementById("disconnectBtn");
  const statusEl = document.getElementById("status");
  const connectedPanel = document.getElementById("connectedPanel");
  const connectedEmail = document.getElementById("connectedEmail");

  let statusToken = 0;

  watchAccount();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await connect();
  });

  disconnectBtn.addEventListener("click", async () => {
    disconnectBtn.disabled = true;
    try {
      await disconnectAccount();
      showStatus("Disconnected.", "success");
    } catch (error) {
      showStatus(error.message || "Could not disconnect.", "error");
    } finally {
      disconnectBtn.disabled = false;
    }
  });

  function watchAccount() {
    initializeFirebase();
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        connectedPanel.classList.remove("hidden");
        connectedEmail.textContent = user.email || "your Voice Flow account";
      } else {
        connectedPanel.classList.add("hidden");
        connectedEmail.textContent = "";
      }
    });
  }

  async function connect() {
    const pin = document.getElementById("pin").value;
    connectBtn.disabled = true;
    connectBtn.textContent = "Connecting...";

    try {
      const user = await connectWithPin(pin);
      document.getElementById("pin").value = "";
      const who = user.email || "your Voice Flow account";
      showStatus("Connected as " + who + ".", "success");
    } catch (error) {
      showStatus(error.message || "Could not connect with that PIN.", "error");
    } finally {
      connectBtn.disabled = false;
      connectBtn.textContent = "Connect";
    }
  }

  function showStatus(message, type) {
    const token = ++statusToken;
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    setTimeout(() => {
      if (token === statusToken) {
        statusEl.className = "status hidden";
      }
    }, 5000);
  }
});
