import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

const A5_AverageSentimentYear = () => {
  const [data, setData] = useState([]);
  const [author, setAuthor] = useState("Obama"); 

  useEffect(() => {
    const fetchSentiment = async () => {
      const res = await fetch(`http://localhost:8000/sentiment-per-year?author=${author}`);
      const json = await res.json();
      setData(json.data);
    };
    fetchSentiment();
  }, [author]);

  return (
    <motion.div
      className="card p-4 shadow mt-5"
      style={{ maxWidth: "700px", width: "100%" }}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -40 }}
      transition={{ duration: 0.5 }}
    >
      <div className="text-center mb-0">
        <div className="d-inline-flex align-items-center">
          <i className="fas fa-smile-beam fa-lg text-primary me-2"></i>
          <h5 className="h4 fw-bold d-inline">Average Sentiment per Year ({author})</h5>
        </div>
      </div>
      

      <p className="text-muted">
        This chart displays the average sentiment of tweets over the years. 
        Each year's sentiment is computed based on the confidence-weighted sentiment score of tweets — positive tweets contribute positively, negative ones negatively, and neutral ones are counted as zero. 
        It helps identify how the general tone or public mood expressed in tweets has changed over time. 
        By analyzing sentiment trends, users can understand shifts in public attitude or emotional tone year by year, revealing how sentiment might correlate with real-world events or societal changes.
      </p>

      <div className="mb-4">
      <label htmlFor="author-select" className="form-label">Select Author:</label>
      <select
        id="author-select"
        className="form-select"
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
      >
        <option value="Obama">Barack Obama</option>
        <option value="Musk">Elon Musk</option>
      </select>
    </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" />
          <YAxis domain={[-1, 1]} tickFormatter={(v) => v.toFixed(1)} />
          <Tooltip formatter={(v) => v.toFixed(3)} />
          <Line type="monotone" dataKey="avg_sentiment" stroke="#0d6efd" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default A5_AverageSentimentYear;

