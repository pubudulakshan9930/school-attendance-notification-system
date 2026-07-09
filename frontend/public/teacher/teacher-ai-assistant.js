const AI_ASSISTANT_API = "/api/teacher/ai-assistant/chat";

const assistantMessages = document.getElementById("assistantMessages");

const QUESTION_ITEMS = [
  "Summarize today's attendance.",
  "Which students have low attendance?",
  "Which students are academically weak?",
  "Which students are at risk?",
  "How is my class performing across terms?",
  "Which students are frequently late?",
  "Compare this month's attendance with last month.",
  "Generate a parent meeting summary.",
];

function getToken() {
  return localStorage.getItem("sureki_token");
}

async function assistantFetch(url, options = {}) {
  const token = getToken();
  if (!token) {
    throw new Error("Authentication required.");
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && payload.error
        ? payload.error
        : "Request failed.";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return payload;
}

function appendMessage(role, text, extraClass = "") {
  if (!assistantMessages) {
    return null;
  }

  const message = document.createElement("div");
  message.className = `assistant-message ${role}${extraClass ? ` ${extraClass}` : ""}`;
  message.textContent = text;
  assistantMessages.appendChild(message);
  assistantMessages.scrollTop = assistantMessages.scrollHeight;
  return message;
}

function scrollToLatestMessage() {
  if (!assistantMessages) {
    return;
  }

  assistantMessages.scrollTop = assistantMessages.scrollHeight;
  assistantMessages.scrollTo({
    top: assistantMessages.scrollHeight,
    behavior: "smooth",
  });

  if (typeof window !== "undefined") {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth",
    });
  }
}

function appendQuestionOptions() {
  if (!assistantMessages) {
    return null;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "assistant-message assistant";

  const title = document.createElement("div");
  title.textContent = "Available questions";
  title.className = "assistant-question-title";
  wrapper.appendChild(title);

  const list = document.createElement("div");
  list.className = "assistant-inline-question-list";

  QUESTION_ITEMS.forEach((question) => {
    const link = document.createElement("button");
    link.type = "button";
    link.className = "assistant-question-item";
    link.textContent = question;
    link.addEventListener("click", () => {
      scrollToLatestMessage();
      askAssistant(question);
      window.setTimeout(scrollToLatestMessage, 120);
    });
    list.appendChild(link);
  });

  wrapper.appendChild(list);
  assistantMessages.appendChild(wrapper);
  scrollToLatestMessage();
  return wrapper;
}

async function askAssistant(questionText) {
  const userMessage = String(questionText || "").trim();
  if (!userMessage) {
    return;
  }

  appendMessage("user", userMessage);
  const loadingMessage = appendMessage("assistant", "Thinking...", "loading");
  scrollToLatestMessage();

  try {
    const data = await assistantFetch(AI_ASSISTANT_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: userMessage }),
    });

    if (loadingMessage) {
      loadingMessage.remove();
    }

    appendMessage(
      "assistant",
      data.reply || "I could not generate a response.",
    );
    scrollToLatestMessage();
    appendQuestionOptions();
  } catch (error) {
    if (loadingMessage) {
      loadingMessage.remove();
    }

    const fallbackMessage =
      error.status === 503 ||
      String(error.message || "")
        .toLowerCase()
        .includes("temporarily unavailable")
        ? "AI Assistant is temporarily unavailable."
        : error.message || "AI Assistant is temporarily unavailable.";

    appendMessage("assistant", fallbackMessage);
    scrollToLatestMessage();
    appendQuestionOptions();
  }
}

appendMessage("assistant", "Hello! I can help analyze your class.");
appendQuestionOptions();
