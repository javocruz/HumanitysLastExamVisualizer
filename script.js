const questionsContainer = document.getElementById('questions');
const statusEl = document.getElementById('status');
const searchInput = document.getElementById('search');
const sortSelect = document.getElementById('sort');
const limitSelect = document.getElementById('limit');

let originalQuestions = [];
let filteredQuestions = [];

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.className = isError ? 'status error' : 'status';
}

function normalizeInput(value) {
  return value.replace(/[^\w\-./]/g, '').trim();
}

async function fetchQuestionsFromHuggingFace() {
  const repoId = normalizeInput(document.getElementById('repo-id').value);
  const filePath = normalizeInput(document.getElementById('file-path').value);
  const token = document.getElementById('token').value.trim();

  if (!repoId || !filePath) {
    setStatus('Please provide both a dataset repo id and file path.', true);
    return;
  }

  const url = `https://huggingface.co/datasets/${repoId}/resolve/main/${filePath}`;
  setStatus(`Fetching ${url} ...`);

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const text = await response.text();
    const parsed = parseQuestions(text, filePath);
    applyQuestions(parsed);
    setStatus(`Loaded ${parsed.length} questions from Hugging Face.`);
  } catch (error) {
    console.error(error);
    setStatus(`Unable to load data: ${error.message}`, true);
  }
}

function parseQuestions(text, filePath) {
  const trimmed = text.trim();

  if (filePath.endsWith('.jsonl')) {
    return trimmed
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line))
      .map(extractQuestion);
  }

  const json = JSON.parse(trimmed);
  if (Array.isArray(json)) {
    return json.map(extractQuestion);
  }

  if (json && typeof json === 'object' && Array.isArray(json.questions)) {
    return json.questions.map(extractQuestion);
  }

  throw new Error('Unexpected data format. Expecting an array of question objects or a { questions: [] } wrapper.');
}

function extractQuestion(entry, index) {
  if (!entry) return { question: `Unknown question at index ${index}` };
  if (typeof entry === 'string') return { question: entry };
  if ('question' in entry) return { question: entry.question };
  const [firstValue] = Object.values(entry);
  return { question: String(firstValue) };
}

function applyQuestions(questions) {
  originalQuestions = questions.map((q, idx) => ({ ...q, index: idx + 1 }));
  filteredQuestions = [...originalQuestions];
  render();
}

function render() {
  const query = searchInput.value.trim().toLowerCase();
  const sort = sortSelect.value;
  const limit = Number(limitSelect.value);

  filteredQuestions = originalQuestions.filter((item) => item.question.toLowerCase().includes(query));

  if (sort === 'asc') {
    filteredQuestions.sort((a, b) => a.question.localeCompare(b.question));
  } else if (sort === 'desc') {
    filteredQuestions.sort((a, b) => b.question.localeCompare(a.question));
  }

  const toShow = limit > 0 ? filteredQuestions.slice(0, limit) : filteredQuestions;

  questionsContainer.innerHTML = '';

  if (toShow.length === 0) {
    questionsContainer.innerHTML = '<p class="empty">No questions match your search yet.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();

  toShow.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'card';

    const heading = document.createElement('h3');
    heading.textContent = `Q${item.index}`;

    const body = document.createElement('p');
    body.textContent = item.question;

    card.appendChild(heading);
    card.appendChild(body);
    fragment.appendChild(card);
  });

  questionsContainer.appendChild(fragment);
}

async function loadSample() {
  setStatus('Loading bundled sample ...');
  try {
    const response = await fetch('data/sample-questions.json');
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    const json = await response.json();
    applyQuestions(json.questions);
    setStatus(`Loaded ${json.questions.length} sample questions. Use the Hugging Face form to load the full set.`);
  } catch (error) {
    console.error(error);
    setStatus(`Unable to load sample data: ${error.message}`, true);
  }
}

// Wire up interactions
document.getElementById('load-remote').addEventListener('click', fetchQuestionsFromHuggingFace);
document.getElementById('load-sample').addEventListener('click', loadSample);
searchInput.addEventListener('input', render);
sortSelect.addEventListener('change', render);
limitSelect.addEventListener('change', render);

// Initial sample load for quick preview
loadSample();
