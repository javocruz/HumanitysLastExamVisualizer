const questionsTable = document.getElementById('questions');
const tbody = questionsTable.querySelector('tbody');
const statusEl = document.getElementById('status');
const startIndexInput = document.getElementById('start-index');

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

  const rawQuestion = 'question' in entry ? entry.question : Object.values(entry)[0];
  const questionText = rawQuestion ? String(rawQuestion) : `Question ${index}`;
  const image = entry.image || entry.image_url || entry.imageUrl || entry.url || '';

  return { question: questionText, image };
}

function applyQuestions(questions) {
  originalQuestions = questions.map((q, idx) => ({ ...q, index: idx + 1 }));
  filteredQuestions = [...originalQuestions];
  render();
}

function render() {
  const startAt = Number(startIndexInput.value) || 0;

  filteredQuestions = originalQuestions.filter((item) => item.index > startAt);

  tbody.innerHTML = '';

  if (filteredQuestions.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 3;
    cell.className = 'empty';
    cell.textContent = 'No questions to display yet.';
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  const fragment = document.createDocumentFragment();

  filteredQuestions.forEach((item) => {
    const row = document.createElement('tr');

    const indexCell = document.createElement('td');
    indexCell.textContent = item.index;
    row.appendChild(indexCell);

    const questionCell = document.createElement('td');
    questionCell.textContent = item.question;
    row.appendChild(questionCell);

    const imageCell = document.createElement('td');
    if (item.image) {
      const img = document.createElement('img');
      img.src = item.image;
      img.alt = `Image for question ${item.index}`;
      img.loading = 'lazy';
      imageCell.appendChild(img);
    } else {
      imageCell.textContent = '—';
    }
    row.appendChild(imageCell);

    fragment.appendChild(row);
  });

  tbody.appendChild(fragment);
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
startIndexInput.addEventListener('input', render);

// Initial sample load for quick preview
loadSample();
