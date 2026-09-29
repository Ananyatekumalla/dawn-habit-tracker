/** Course link for a topic, with a small editor so you can add or change your own. */
import { useState } from 'react';
import { isSafeUrl } from '../../lib/topics.js';

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'link';
  }
}

export function CourseLink({ topic, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(topic.url ?? '');
  const valid = draft === '' || isSafeUrl(draft.trim());

  if (editing) {
    return (
      <form
        className="link-editor"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          onSave({ ...topic, url: draft.trim() });
          setEditing(false);
        }}
      >
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="https://…"
          aria-label={`Course link for ${topic.title}`}
          aria-invalid={!valid}
        />
        <button type="submit" disabled={!valid}>
          Save
        </button>
        <button type="button" className="link-btn" onClick={() => setEditing(false)}>
          Cancel
        </button>
      </form>
    );
  }

  return (
    <span className="course-link">
      {isSafeUrl(topic.url) && (
        <a href={topic.url} target="_blank" rel="noopener noreferrer">
          ▶ {hostOf(topic.url)}
        </a>
      )}
      <button type="button" className="link-btn" onClick={() => setEditing(true)} aria-label={`Edit link for ${topic.title}`}>
        {topic.url ? 'Edit link' : '+ Add link'}
      </button>
    </span>
  );
}
