const FUTURE_ENHANCEMENTS = [
  'Real-time traffic data',
  'GPS integration',
  'Google Maps / OpenStreetMap integration',
  'Live weather API',
  'Traffic signal optimization',
  'Alternative route recommendation',
  'Random Forest comparison',
  'Mobile application',
];

export default function AboutProject() {
  return (
    <div>
      <div className="page-header">
        <h1>About This Project</h1>
        <p>A quick reference for explaining the project during a review.</p>
      </div>

      <div className="card prose" style={{ marginBottom: '1rem' }}>
        <dl className="definition-list">
          <dt>Project Title</dt>
          <dd>AI-Based Traffic Prediction System</dd>

          <dt>Problem</dt>
          <dd>Traffic congestion causes travel delays, wasted fuel, and extra pollution, and it is hard to anticipate without historical patterns to learn from.</dd>

          <dt>Solution</dt>
          <dd>Use historical traffic data and a Machine Learning model to predict congestion levels before you travel, so the impact of conditions like peak hours or bad weather is visible in advance.</dd>

          <dt>AI Method</dt>
          <dd>Decision Tree Classification (scikit-learn's <code>DecisionTreeClassifier</code>), trained inside a preprocessing pipeline that one-hot encodes the categorical fields.</dd>

          <dt>Input</dt>
          <dd>Vehicle count, time (hour), day of week, weather condition, location/road, and the previous traffic reading.</dd>

          <dt>Output</dt>
          <dd>A traffic level of Low, Medium, or High, with a confidence score and a plain-English explanation.</dd>
        </dl>
      </div>

      <div className="card">
        <div className="card-title">Future Enhancements</div>
        <ul className="enhancement-list">
          {FUTURE_ENHANCEMENTS.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>
    </div>
  );
}
