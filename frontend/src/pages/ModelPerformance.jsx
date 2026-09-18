import { useEffect, useState } from 'react';
import { getModelInfo, getApiErrorMessage } from '../services/api';
import Loader from '../components/Loader';

export default function ModelPerformance() {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getModelInfo()
      .then(setInfo)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader label="Loading model performance…" />;

  if (error) {
    return <div className="banner banner-error">{error}</div>;
  }

  const m = info?.metrics || {};
  const labels = m.labels || ['Low', 'Medium', 'High'];
  const cm = m.confusion_matrix || [];

  return (
    <div>
      <div className="page-header">
        <h1>Model Performance</h1>
        <p>How well the Decision Tree does on data it never saw during training (the 20% test split).</p>
      </div>

      <div className="metric-grid">
        <div className="stat-card" style={{ '--stat-accent': 'var(--color-accent)' }}>
          <div className="stat-card-label">Accuracy</div>
          <div className="stat-card-value">{Math.round((m.accuracy || 0) * 100)}%</div>
        </div>
        <div className="stat-card" style={{ '--stat-accent': 'var(--color-low)' }}>
          <div className="stat-card-label">Precision (macro)</div>
          <div className="stat-card-value">{Math.round((m.precision || 0) * 100)}%</div>
        </div>
        <div className="stat-card" style={{ '--stat-accent': 'var(--color-medium)' }}>
          <div className="stat-card-label">Recall (macro)</div>
          <div className="stat-card-value">{Math.round((m.recall || 0) * 100)}%</div>
        </div>
        <div className="stat-card" style={{ '--stat-accent': 'var(--color-high)' }}>
          <div className="stat-card-label">F1-Score (macro)</div>
          <div className="stat-card-value">{Math.round((m.f1_score || 0) * 100)}%</div>
        </div>
      </div>

      <div className="chart-grid" style={{ gridTemplateColumns: '1fr 1fr', alignItems: 'start' }}>
        <div className="card">
          <div className="card-title">Confusion Matrix</div>
          <p style={{ fontSize: '0.83rem', marginTop: '-0.4rem', marginBottom: '0.9rem' }}>
            Rows = actual level, columns = predicted level. The diagonal (highlighted) is where the model got it right.
          </p>
          <div className="table-wrap">
            <table className="confusion-table">
              <thead>
                <tr>
                  <th></th>
                  {labels.map((l) => <th key={l}>Predicted {l}</th>)}
                </tr>
              </thead>
              <tbody>
                {cm.map((row, i) => (
                  <tr key={labels[i]}>
                    <td className="row-label">Actual {labels[i]}</td>
                    {row.map((val, j) => (
                      <td key={j} className={i === j ? 'confusion-diag' : ''}>{val}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: '0.8rem', marginTop: '0.9rem', marginBottom: 0 }}>
            Trained on {m.n_train ?? '—'} records, tested on {m.n_test ?? '—'} unseen records
            ({m.n_samples ?? '—'} total). Tree depth: {m.tree_depth ?? '—'}, leaves: {m.tree_leaves ?? '—'}.
          </p>
        </div>

        <div className="card">
          <div className="card-title">How a Decision Tree predicts</div>
          <p style={{ fontSize: '0.87rem' }}>
            A Decision Tree learns a sequence of yes/no questions from the training data. Each
            internal node tests one feature (for example, "is vehicle count over 190?"), each
            branch is the answer to that test, and each leaf assigns a final traffic class. To
            classify a new reading, the tree starts at the top and follows the matching branch at
            every node until it reaches a leaf.
          </p>
          <p style={{ fontSize: '0.87rem' }}>
            The <code>Medium</code> class is the hardest to separate, since it sits on the
            boundary of both <code>Low</code> and <code>High</code> — the confusion matrix above
            shows most mistakes happen there, which matches how real traffic actually behaves:
            congestion changes gradually, not in sharp jumps.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="card-title">Simplified Decision Tree Diagram</div>
        <div className="tree-image-wrap">
          <img src="/decision_tree.png" alt="First three levels of the trained decision tree" />
        </div>
        <p style={{ fontSize: '0.78rem', marginTop: '0.75rem', marginBottom: 0 }}>
          The real trained tree is {m.tree_depth ?? 8} levels deep with {m.tree_leaves ?? '—'} leaves —
          too wide to render as one readable image. This diagram shows only the first three levels,
          generated directly from the trained model, to illustrate how the splits work.
        </p>
      </div>
    </div>
  );
}
