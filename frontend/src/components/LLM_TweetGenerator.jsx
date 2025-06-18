import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const LLM_TweetGenerator = () => {
  const [selectedAuthor, setSelectedAuthor] = useState('Obama');
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [generatedTweet, setGeneratedTweet] = useState('');
  const [loadingGeneration, setLoadingGeneration] = useState(false);
  const [errorGeneration, setErrorGeneration] = useState(null);

  useEffect(() => {
    if (selectedAuthor) {
      setLoadingGeneration(true); // Indicate loading while fetching topics
      setErrorGeneration(null);
      fetch(`http://localhost:8000/analytics/topics?author=${selectedAuthor}`)
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          setTopics(data.topics);
          setSelectedTopic(data.topics[0] || ''); // Select the first topic by default
          setLoadingGeneration(false);
        })
        .catch(err => {
          console.error("Error fetching topics:", err);
          setErrorGeneration(`Failed to load topics: ${err.message}. Make sure the backend is running.`);
          setTopics([]);
          setSelectedTopic('');
          setLoadingGeneration(false);
        });
    }
  }, [selectedAuthor]); // Re-fetch when author changes

  const handleGenerateTweet = async () => {
    setLoadingGeneration(true);
    setGeneratedTweet(''); // Clear previous tweet
    setErrorGeneration(null);

    try {
      const res = await fetch('http://localhost:8000/generate_tweet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: selectedAuthor, topic: selectedTopic })
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line

        for (const line of lines) {
          if (line.trim() === '') continue;
          try {
            const data = JSON.parse(line);
            if (data.generated_tweet) {
              setGeneratedTweet(data.generated_tweet);
            }
            if (data.error) { // Handle errors from backend stream
              setErrorGeneration(data.error);
              setGeneratedTweet('');
              break; // Stop processing
            }
          } catch (jsonError) {
            console.error('Error parsing JSON chunk:', jsonError, line);
            setErrorGeneration(`Error processing streamed data: ${jsonError.message}`);
            break;
          }
        }
      }

    } catch (error) {
      console.error('Error during tweet generation fetch:', error);
      setErrorGeneration(`An error occurred: ${error.message}. Please check the backend.`);
      setGeneratedTweet('');
    } finally {
      setLoadingGeneration(false);
    }
  };

  return (
    <div className="card p-4 shadow mt-5" data-aos="fade-up" style={{ maxWidth: '700px', width: '100%' }}>
      <div className="text-center mb-4">
        <i className="fas fa-robot fa-2x text-primary me-2"></i> 
        <h5 className="h4 fw-bold d-inline">Generate Tweet in Author's Style</h5>
        <p className="text-muted">
          Select an author and a topic to generate a new tweet in their typical writing style.
        </p>
      </div>

      <div className="mb-3">
        <label className="form-label">Select Author</label>
        <select 
          className="form-select" 
          value={selectedAuthor} 
          onChange={(e) => setSelectedAuthor(e.target.value)}
          disabled={loadingGeneration} 
        >
          <option value="Obama">Barack Obama</option>
          <option value="Musk">Elon Musk</option>
        </select>
      </div>

      <div className="mb-3">
        <label className="form-label">Select Topic</label>
        <select 
          className="form-select" 
          value={selectedTopic} 
          onChange={(e) => setSelectedTopic(e.target.value)}
          disabled={loadingGeneration || topics.length === 0} 
        >
          {topics.length > 0 ? (
            topics.map(topic => (
              <option key={topic} value={topic}>{topic}</option>
            ))
          ) : (
            <option value="">{loadingGeneration ? "Loading topics..." : "No topics available"}</option>
          )}
        </select>
      </div>

      <button 
        className="btn btn-primary w-100 d-flex align-items-center justify-content-center"
        onClick={handleGenerateTweet} 
        disabled={loadingGeneration || !selectedTopic} 
      >
        <i className="fas fa-magic me-2"></i> 
        {loadingGeneration ? 'Generating...' : 'Generate Tweet'}
      </button>

      {loadingGeneration && (
        <div className="text-center mt-4">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-2">Crafting a new tweet...</p>
        </div>
      )}

      {errorGeneration && (
        <div className="alert alert-danger mt-3" role="alert">
          {errorGeneration}
        </div>
      )}

      {generatedTweet && (
        <motion.div 
          className="alert alert-info mt-3"
          role="alert"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <h6 className="mb-2">Generated Tweet:</h6>
          <p className="mb-0">{generatedTweet}</p>
        </motion.div>
      )}
    </div>
  );
};

export default LLM_TweetGenerator;