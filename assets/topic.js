(() => {
  const manifestPath = "topics/topics.txt";
  const params = new URLSearchParams(location.search);
  const slug = params.get("topic") || "";
  const state = { topic: null, questions: [], query: "", invalidBlocks: 0 };

  const questionList = document.querySelector("#question-list");
  const questionSearch = document.querySelector("#question-search");
  const questionStatus = document.querySelector("#question-status");
  const topicState = document.querySelector("#topic-state");

  function readNumber(key) {
    try { return Number.parseInt(localStorage.getItem(key) || "0", 10) || 0; }
    catch (_) { return 0; }
  }

  function writeNumber(key, value) {
    try { localStorage.setItem(key, String(value)); } catch (_) { /* Storage may be unavailable. */ }
  }

  function hashText(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  const questionKey = (question) => `speakos:topic:${slug}:question:${hashText(question)}:reveals`;
  const revealCount = (question) => readNumber(questionKey(question));

  function parseManifest(text) {
    return text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#")).map((line, index) => {
      const [rawId, rawTitle, rawSlug, rawCategory] = line.split("|").map((part) => part?.trim());
      const topicSlug = rawSlug || "";
      if (!/^[a-z0-9-]+$/.test(topicSlug)) return null;
      return {
        id: rawId || String(index + 1).padStart(2, "0"),
        title: rawTitle || "Untitled module",
        slug: topicSlug,
        category: rawCategory || "General"
      };
    }).filter(Boolean);
  }

  function parseQuestionFile(text) {
    const normalised = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
    if (!normalised) return { questions: [], invalidBlocks: 0 };

    const blocks = normalised.split(/\n\s*---+\s*(?:\n|$)/);
    const questions = [];
    let invalidBlocks = 0;

    blocks.forEach((rawBlock) => {
      const block = rawBlock.trim();
      if (!block) return;
      const answerMarker = block.search(/\nAnswer\s*:/i);
      if (!/^Question\s*:/i.test(block) || answerMarker < 0) {
        invalidBlocks += 1;
        return;
      }
      const question = block.slice(0, answerMarker).replace(/^Question\s*:/i, "").trim();
      const answer = block.slice(answerMarker).replace(/^\nAnswer\s*:/i, "").trim();
      if (!question || !answer) {
        invalidBlocks += 1;
        return;
      }
      questions.push({ question, answer });
    });

    return { questions, invalidBlocks };
  }

  function updateTopicIdentity(topic) {
    document.title = `SPEAK//OS — ${topic.title}`;
    document.querySelector("#module-number").textContent = String(topic.id).padStart(2, "0");
    document.querySelector("#topic-category").textContent = topic.category;
    document.querySelector("#topic-title").textContent = topic.title;
    document.querySelector("#breadcrumb-topic").textContent = topic.title;
    document.querySelector("#topic-file").textContent = `topics/${topic.slug}.txt`;
  }

  function updateMetrics() {
    const counts = state.questions.map((item) => revealCount(item.question));
    document.querySelector("#question-total").textContent = state.questions.length;
    document.querySelector("#practised-total").textContent = counts.filter((count) => count > 0).length;
    document.querySelector("#reveal-total").textContent = counts.reduce((sum, count) => sum + count, 0);
  }

  function setCardOpen(card, open) {
    card.classList.toggle("is-open", open);
    card.querySelector(".question-toggle").setAttribute("aria-expanded", String(open));
  }

  function createQuestionCard(item, index) {
    const count = revealCount(item.question);
    const card = document.createElement("article");
    card.className = "question-card";
    card.style.setProperty("--delay", `${Math.min(index * 28, 360)}ms`);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "question-toggle";
    toggle.setAttribute("aria-expanded", "false");

    const number = document.createElement("span");
    number.className = "question-index";
    number.textContent = `Q${String(index + 1).padStart(2, "0")}`;

    const question = document.createElement("span");
    question.className = "question-text";
    question.textContent = item.question;

    const meta = document.createElement("span");
    meta.className = "question-meta";
    const counter = document.createElement("span");
    counter.className = "question-count";
    const counterLed = document.createElement("i");
    const counterText = document.createElement("span");
    counterText.textContent = `${count} ${count === 1 ? "reveal" : "reveals"}`;
    counter.append(counterLed, counterText);
    const chevron = document.createElement("svg");
    chevron.classList.add("chevron");
    chevron.setAttribute("viewBox", "0 0 24 24");
    chevron.setAttribute("aria-hidden", "true");
    chevron.innerHTML = '<path d="m6 9 6 6 6-6"></path>';
    meta.append(counter, chevron);
    toggle.append(number, question, meta);

    const panel = document.createElement("div");
    panel.className = "answer-panel";
    const clip = document.createElement("div");
    clip.className = "answer-clip";
    const content = document.createElement("div");
    content.className = "answer-content";
    const label = document.createElement("p");
    label.className = "answer-label";
    label.textContent = "Model answer";
    const answer = document.createElement("p");
    answer.textContent = item.answer;
    content.append(label, answer);
    clip.append(content);
    panel.append(clip);
    card.append(toggle, panel);

    toggle.addEventListener("click", () => {
      const opening = !card.classList.contains("is-open");
      setCardOpen(card, opening);
      if (opening) {
        const next = revealCount(item.question) + 1;
        writeNumber(questionKey(item.question), next);
        counterText.textContent = `${next} ${next === 1 ? "reveal" : "reveals"}`;
        updateMetrics();
      }
    });
    return card;
  }

  function showTopicState(code, title, message) {
    questionList.hidden = true;
    topicState.hidden = false;
    document.querySelector("#topic-state-code").textContent = code;
    document.querySelector("#topic-state-title").textContent = title;
    document.querySelector("#topic-state-message").textContent = message;
  }

  function renderQuestions() {
    const query = state.query.trim().toLowerCase();
    const visible = state.questions.filter((item) => !query || `${item.question} ${item.answer}`.toLowerCase().includes(query));
    const skipped = state.invalidBlocks ? ` • ${state.invalidBlocks} malformed ${state.invalidBlocks === 1 ? "block" : "blocks"} skipped` : "";
    questionStatus.textContent = `${visible.length} / ${state.questions.length} cards online${skipped}`;

    if (!visible.length) {
      showTopicState(
        state.questions.length ? "NO_MATCH" : "DATA_EMPTY",
        state.questions.length ? "No matching cards" : "No questions available",
        state.questions.length ? "Try another search phrase." : "Add Question: and Answer: pairs to this topic text file."
      );
      return;
    }

    topicState.hidden = true;
    questionList.hidden = false;
    questionList.replaceChildren(...visible.map(createQuestionCard));
  }

  async function initialise() {
    if (!/^[a-z0-9-]+$/.test(slug)) {
      showTopicState("INVALID_MODULE", "Invalid topic address", "Return to the index and open a valid topic card.");
      questionStatus.textContent = "Module address rejected";
      return;
    }

    try {
      const manifestResponse = await fetch(manifestPath, { cache: "no-store" });
      if (!manifestResponse.ok) throw new Error(`Manifest returned ${manifestResponse.status}`);
      const topic = parseManifest(await manifestResponse.text()).find((item) => item.slug === slug);
      if (!topic) throw new Error("Topic is not registered in the manifest");
      state.topic = topic;
      updateTopicIdentity(topic);

      const questionResponse = await fetch(`topics/${topic.slug}.txt`, { cache: "no-store" });
      if (!questionResponse.ok) {
        if (questionResponse.status === 404) {
          showTopicState("SOURCE_PENDING", "Content file not added yet", `Create topics/${topic.slug}.txt using the documented Question: and Answer: structure.`);
          questionStatus.textContent = "Text source pending";
          document.querySelector("#question-total").textContent = "0";
          return;
        }
        throw new Error(`Topic file returned ${questionResponse.status}`);
      }

      const parsed = parseQuestionFile(await questionResponse.text());
      state.questions = parsed.questions;
      state.invalidBlocks = parsed.invalidBlocks;
      updateMetrics();
      renderQuestions();
    } catch (error) {
      const localHint = location.protocol === "file:"
        ? "The browser blocked text-file loading through file://. Use GitHub Pages or a local web server."
        : "Check the topic manifest and text-file paths, then reload this page.";
      showTopicState("SOURCE_OFFLINE", "Unable to load topic data", localHint);
      questionStatus.textContent = "Data connection failed";
      console.error(error);
    }
  }

  questionSearch.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderQuestions();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && document.activeElement !== questionSearch) {
      event.preventDefault();
      questionSearch.focus();
    }
  });

  document.querySelector("#expand-all").addEventListener("click", () => {
    questionList.querySelectorAll(".question-card").forEach((card) => setCardOpen(card, true));
  });
  document.querySelector("#collapse-all").addEventListener("click", () => {
    questionList.querySelectorAll(".question-card").forEach((card) => setCardOpen(card, false));
  });

  initialise();
})();
