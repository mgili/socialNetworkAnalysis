import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import { motion } from "framer-motion";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

const A1_LikesTopicYear = () => {
  const [chartData, setChartData] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedAuthor, setSelectedAuthor] = useState('Obama'); 
  const [topics, setTopics] = useState([]);

  // Load topics when the component mounts or when the selected author changes
  useEffect(() => {
    if (selectedAuthor) {
      fetch(`http://localhost:8000/analytics/topics?author=${selectedAuthor}`)
        .then(res => res.json())
        .then(res => {
          setTopics(res.topics);
          if (!res.topics.includes(selectedTopic)) {
            setSelectedTopic(res.topics[0] || '');
          }
        });
    }
  }, [selectedAuthor, selectedTopic]); 

  // Load chart data when the selected topic or author changes
  useEffect(() => {
    if (!selectedTopic || !selectedAuthor) {
      setChartData(null); // Reset chart data if no topic or author is selected
      return;
    }

    fetch(`http://localhost:8000/analytics/likes-by-year?topic=${encodeURIComponent(selectedTopic)}&author=${encodeURIComponent(selectedAuthor)}`)
      .then(res => res.json())
      .then(res => {
        const labels = res.data.map(item => item.year);
        const likes = res.data.map(item => item.likes);
        setChartData({
          labels,
          datasets: [
            {
              label: `Likes per Year for "${selectedTopic}" by ${selectedAuthor}`,
              data: likes,
              borderColor: "#0d6efd",
              fill: false,
              tension: 0.3
            }
          ]
        });
      })
      .catch(error => {
        console.error("Error fetching A1 chart data:", error);
        setChartData(null); 
      });
  }, [selectedTopic, selectedAuthor]);

  return (
    <motion.div
      className="card p-4 shadow mt-5" 
      style={{ maxWidth: '700px', width: '100%' }}
      data-aos="fade-up" 
      key={selectedTopic + selectedAuthor} 
    >
      {/* Centered title with icon */}
      <div className="text-center mb-3">
        <div className="d-inline-flex align-items-center">
          <i className="fas fa-thumbs-up fa-lg text-primary me-2"></i> {/* Icon for likes/engagement */}
          <h5 className="h4 fw-bold d-inline">Likes per Topic per Year</h5>
        </div>

        <p className="text-muted">
          This chart shows how the number of likes received on tweets related to a selected topic has evolved over the years for each author. 
          It helps identify trends in public interest and engagement on specific themes, such as politics, climate change, or health. 
          By analyzing like counts per year, users can better understand which topics gained or lost popularity over time.
        </p>
      </div>

      <div className="mb-3">
        <label className="form-label mt-2">Select Author</label>
        <select className="form-select mb-3" value={selectedAuthor} onChange={(e) => setSelectedAuthor(e.target.value)}>
          <option value="Obama">Barack Obama</option>
          <option value="Musk">Elon Musk</option>
        </select>

        <label className="form-label">Select Topic</label>
        <select className="form-select" value={selectedTopic} onChange={(e) => setSelectedTopic(e.target.value)}>
          {topics.map(topic => (
            <option key={topic} value={topic}>{topic}</option>
          ))}
        </select>
      </div>

      {chartData ? (
        <Line data={chartData} />
      ) : (
        <p>Loading chart data... Please select an author and topic.</p>
      )}
    </motion.div>
  );
};

export default A1_LikesTopicYear;