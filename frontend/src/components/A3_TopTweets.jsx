import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const A3_TopTweets = () => {
  const [metric, setMetric] = useState('likes');
  const [limit, setLimit] = useState(5);
  const [data, setData] = useState([]);
  const [author, setAuthor] = useState("All");

  useEffect(() => {
    const fetchTopTweets = async () => {
      const res = await fetch(`http://localhost:8000/top-tweets?metric=${metric}&limit=${limit}&author=${author}`);
      const json = await res.json();
      setData(json.data);
    };
    fetchTopTweets();
  }, [metric, limit, author]);

  return (
    <motion.div
        className="card p-4 shadow mt-5"
        style={{ maxWidth: '700px', width: '100%' }}
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }} 
        transition={{ duration: 0.6 }}
        data-aos="fade-up"
    >
        <div className="text-center mb-3">
        <div className="d-inline-flex align-items-center">
          <i className="fas fa-medal fa-lg text-primary me-2"></i>
          <h5 className="h4 fw-bold d-inline">Top {limit} Tweet per {metric === 'likes' ? 'Like' : 'Retweet'} ({author}) </h5>
        </div>

        <p className="text-muted">
            This table shows the top tweets ranked by the number of likes or retweets. You can switch between the two metrics and choose how many tweets to display.
            It helps identify the most engaging or viral tweets over time, giving insight into which topics or messages resonate most with the audience.
        </p>
      </div>
        
        <div className="d-flex mb-3 gap-3">
        <select className="form-select w-auto" value={metric} onChange={(e) => setMetric(e.target.value)}>
            <option value="likes">Like</option>
            <option value="retweets">Retweet</option>
        </select>

        <select className="form-select w-auto" value={limit} onChange={(e) => setLimit(parseInt(e.target.value))}>
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
        </select>

        <select className="form-select w-auto" value={author} onChange={(e) => setAuthor(e.target.value)}>
            <option value="All">All</option>
            <option value="Obama">Barack Obama</option>
            <option value="Musk">Elon Musk</option>
        </select>
        </div>

        <div className="table-responsive">
        <table className="table table-bordered table-hover align-middle">
            <thead className="custom-thead">
                <tr>
                    <th>Date</th>
                    <th style={{ maxWidth: '300px' }}>Tweet</th>
                    <th>Topic</th>
                    <th>#{metric.charAt(0).toUpperCase() + metric.slice(1)}</th>
                    <th>Author</th>
                </tr>
            </thead>
            <tbody>
            {data.map((tweet, idx) => (
                <tr key={idx}>
                <td>{tweet.date}</td>
                <td style={{ maxWidth: '300px', whiteSpace: 'normal', wordWrap: 'break-word' }}>
                {tweet.content}
                </td>
                <td>{tweet.topic}</td>
                <td>{tweet[metric]}</td>
                <td>{tweet.author}</td> 
                </tr>
            ))}
            </tbody>
        </table>
        </div>
    </motion.div>
    );

};

export default A3_TopTweets;
