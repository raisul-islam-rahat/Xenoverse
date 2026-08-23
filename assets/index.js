(() => {
  const manifestPath = "topics/topics.txt";
  const state = { topics: [], query: "", category: "All", loadError: false };

  const grid = document.querySelector("#topic-grid");
  const filters = document.querySelector("#category-filters");
  const search = document.querySelector("#topic-search");
  const resultStatus = document.querySelector("#result-status");
  const statePanel = document.querySelector("#state-panel");
  const stateCode = document.querySelector("#state-code");
  const stateTitle = document.querySelector("#state-title");
  const stateMessage = document.querySelector("#state-message");
  const stateAction = document.querySelector("#state-action");

  function readNumber(key) {
    try { return Number.parseInt(localStorage.getItem(key) || "0", 10) || 0; }
    catch (_) { return 0; }
  }

  function writeNumber(key, value) {
    try { localStorage.setItem(key, String(value)); } catch (_) { /* Storage may be unavailable. */ }
  }

  const launchKey = (slug) => `speakos:topic:${slug}:launches`;
  const launchCount = (slug) => readNumber(launchKey(slug));

  function parseManifest(text) {
    return text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#")).map((line, index) => {
      const [rawId, rawTitle, rawSlug, rawCategory] = line.split("|").map((part) => part?.trim());
      const id = rawId || String(index + 1).padStart(2, "0");
      const title = rawTitle || "Untitled module";
      const slug = rawSlug || "";
      const category = rawCategory || "General";
      if (!/^[a-z0-9-]+$/.test(slug)) return null;
      return { id, title, slug, category };
    }).filter(Boolean);
  }

  function updateMetrics() {
    const counts = state.topics.map((topic) => launchCount(topic.slug));
    document.querySelector("#total-launches").textContent = counts.reduce((sum, count) => sum + count, 0);
    document.querySelector("#active-topics").textContent = counts.filter((count) => count > 0).length;
    document.querySelector("#topic-total").textContent = state.topics.length || "—";
  }

  function createFilter(category) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `filter-button${state.category === category ? " active" : ""}`;
    button.textContent = category;
    button.setAttribute("aria-pressed", String(state.category === category));
    button.addEventListener("click", () => {
      state.category = category;
      renderFilters();
      renderTopics();
    });
    return button;
  }

  function renderFilters() {
    const categories = ["All", ...new Set(state.topics.map((topic) => topic.category))];
    filters.replaceChildren(...categories.map(createFilter));
  }

  function createTopicCard(topic, index) {
    const sessions = launchCount(topic.slug);
    const card = document.createElement("a");
    card.className = "topic-card";
    card.href = `topic.html?topic=${encodeURIComponent(topic.slug)}`;
    card.style.setProperty("--delay", `${Math.min(index * 22, 440)}ms`);
    card.setAttribute("aria-label", `Open ${topic.title}. ${sessions} previous sessions.`);

    const topLine = document.createElement("div");
    topLine.className = "card-topline";
    const number = document.createElement("span");
    number.className = "topic-number";
    number.textContent = `MOD.${String(topic.id).padStart(2, "0")}`;
    const category = document.createElement("span");
    category.className = "topic-category";
    category.textContent = topic.category;
    topLine.append(number, category);

    const title = document.createElement("h3");
    title.textContent = topic.title;
    const file = document.createElement("p");
    file.className = "topic-file";
    file.textContent = `topics/${topic.slug}.txt`;

    const footer = document.createElement("div");
    footer.className = "card-footer";
    const counter = document.createElement("span");
    counter.className = "session-counter";
    const led = document.createElement("span");
    led.className = "counter-led";
    led.textContent = "✓";
    const countText = document.createElement("span");
    countText.textContent = `${sessions} ${sessions === 1 ? "launch" : "launches"}`;
    counter.append(led, countText);

    const launch = document.createElement("span");
    launch.className = "launch-icon";
    launch.setAttribute("aria-hidden", "true");
    launch.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>';
    footer.append(counter, launch);
    card.append(topLine, title, file, footer);

    card.addEventListener("click", () => {
      writeNumber(launchKey(topic.slug), sessions + 1);
      updateMetrics();
    });
    return card;
  }

  function showState({ code, title, message, actionLabel = "Reset view" }) {
    grid.hidden = true;
    statePanel.hidden = false;
    stateCode.textContent = code;
    stateTitle.textContent = title;
    stateMessage.textContent = message;
    stateAction.textContent = actionLabel;
  }

  function renderTopics() {
    const query = state.query.trim().toLowerCase();
    const visible = state.topics.filter((topic) => {
      const categoryMatch = state.category === "All" || topic.category === state.category;
      const searchMatch = !query || `${topic.title} ${topic.category} ${topic.slug}`.toLowerCase().includes(query);
      return categoryMatch && searchMatch;
    });

    resultStatus.textContent = `${visible.length} / ${state.topics.length} modules online`;
    if (!visible.length) {
      showState({ code: "NO_MATCH", title: "No modules found", message: "Try another search or reset the category filter." });
      return;
    }

    statePanel.hidden = true;
    grid.hidden = false;
    grid.replaceChildren(...visible.map(createTopicCard));
  }

  async function loadManifest() {
    state.loadError = false;
    resultStatus.textContent = "Connecting to manifest…";
    try {
      const response = await fetch(manifestPath, { cache: "no-store" });
      if (!response.ok) throw new Error(`Manifest returned ${response.status}`);
      const topics = parseManifest(await response.text());
      if (!topics.length) throw new Error("Manifest contains no valid topic lines");
      state.topics = topics;
      renderFilters();
      updateMetrics();
      renderTopics();
    } catch (error) {
      state.loadError = true;
      state.topics = [];
      resultStatus.textContent = "Manifest connection failed";
      const localHint = location.protocol === "file:"
        ? "Text files cannot be fetched reliably through file://. Host the folder on GitHub Pages or open it through a local web server."
        : "Check that topics/topics.txt exists and follows the documented pipe-separated format.";
      showState({ code: "SOURCE_OFFLINE", title: "Topic manifest unavailable", message: localHint, actionLabel: "Retry connection" });
      console.error(error);
    }
  }

  search.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderTopics();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && document.activeElement !== search) {
      event.preventDefault();
      search.focus();
    }
  });

  stateAction.addEventListener("click", () => {
    if (state.loadError) {
      grid.hidden = false;
      grid.replaceChildren(...Array.from({ length: 4 }, () => {
        const skeleton = document.createElement("div");
        skeleton.className = "skeleton-card";
        return skeleton;
      }));
      statePanel.hidden = true;
      loadManifest();
      return;
    }
    state.query = "";
    state.category = "All";
    search.value = "";
    renderFilters();
    renderTopics();
  });

  window.addEventListener("pageshow", () => {
    if (state.topics.length) {
      updateMetrics();
      renderTopics();
    }
  });

  loadManifest();
})();
