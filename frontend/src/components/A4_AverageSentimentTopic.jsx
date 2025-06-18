import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const A4_AverageSentimentTopic = () => {
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    fetch("http://localhost:8000/analytics/sentiment-by-topic")
      .then(res => res.json())
      .then(res => {
        const labels = res.data.map(d => d.topic);
        const values = res.data.map(d => d.average_sentiment);

        setChartData({
          labels,
          datasets: [
            {
              label: "Average Sentiment Score",
              data: values,
              backgroundColor: values.map(v => 
                v > 0 ? 'rgba(40, 167, 69, 0.7)' : v < 0 ? 'rgba(220, 53, 69, 0.7)' : 'rgba(255, 193, 7, 0.7)'
              ),
              borderColor: "#333",
              borderWidth: 1,
            },
          ],
        });
      });
  }, []);

  if (!chartData) return <p>Loading sentiment chart...</p>;

  return (
    <div className="card p-4 shadow mt-5" style={{ maxWidth: '700px', width: '100%' }}>
      <div className="text-center mb-4">
        <div className="d-inline-flex align-items-center"> 
          <i className="fas fa-chart-bar fa-lg text-primary me-2"></i> 
          <h5 className="h4 fw-bold d-inline">Average Sentiment by Topic</h5>
          
        </div>
        <p className="text-muted">
          The "Average Sentiment by Topic" chart visualizes the overall sentiment (positive, neutral, or negative) associated with each topic based on tweet content. Each sentiment score is weighted by the confidence of the sentiment classifier to provide a more accurate average.
          This visualization helps users understand how different topics are generally perceived. For instance, topics with consistently negative sentiment might signal controversy or public dissatisfaction, while positive sentiment may indicate general approval or optimism. It is useful for analyzing audience mood and emotional trends in communication.
        </p>
      </div>

      

      <Bar
        data={chartData}
        options={{
          scales: {
            y: {
              beginAtZero: true,
              min: -1,
              max: 1,
              ticks: {
                stepSize: 0.5
              }
            }
          }
        }}
      />
    </div>
  );
};

export default A4_AverageSentimentTopic;