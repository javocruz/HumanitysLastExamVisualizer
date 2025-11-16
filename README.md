# Humanity's Last Exam Viewer

A lightweight static webpage that displays questions from the **Humanity's Last Exam** dataset on Hugging Face. You can either load the bundled sample file or fetch any JSON/JSONL file from a Hugging Face dataset repository by providing the repo id and file path.

## Running locally

No build step is required. Open `index.html` in your browser or serve the folder with any static file server:

```bash
python -m http.server 8000
```

Then visit http://localhost:8000/ to use the viewer.

## Loading data from Hugging Face

1. Enter the dataset repo id (e.g., `Humanity-Dataset/Humanitys-Last-Exam`).
2. Provide the path to a JSON or JSONL file that includes a `question` field for each entry.
3. (Optional) Paste a Hugging Face token for private datasets.
4. Click **Fetch from Hugging Face**. The app builds a URL like `https://huggingface.co/datasets/<repoId>/resolve/main/<filePath>` and loads the content.

Use the search box, sort selector, and row limit controls to browse the questions once loaded.

## Bundled sample data

A small sample file lives at `data/sample-questions.json` so the interface has immediate content even without network access.
