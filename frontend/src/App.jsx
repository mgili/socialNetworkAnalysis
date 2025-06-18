import { useState, useEffect } from 'react';
import './App.css';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { AnimatePresence } from 'framer-motion';

import A1_LikesTopicYear from './components/A1_LikesTopicYear';
import A2_TopicTrendMonth from './components/A2_TopicTrendMonth';
import A3_TopTweets from './components/A3_TopTweets';
import A4_AverageSentimentTopic from "./components/A4_AverageSentimentTopic";
import A5_AverageSentimentYear from './components/A5_AverageSentimentYear';
import LLM_TweetGenerator from './components/LLM_TweetGenerator';


const App = () => {
  const [tweet, setTweet] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null); // Final response after streaming
  const [currentExplanation, setCurrentExplanation] = useState(''); // For streaming response

  useEffect(() => {
    AOS.init({ duration: 1000 });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResponse(null); 
    setCurrentExplanation(''); // Reset streaming explanation

    try {
      const res = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tweet })
      });

      // Streaming management
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedResponse = {}; // Save the final response
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Process the buffer to extract complete JSON objects
        const lines = buffer.split('\n');
        buffer = lines.pop(); 

        for (const line of lines) {
          if (line.trim() === '') continue; 
          try {
            const data = JSON.parse(line);
            
            setCurrentExplanation(data.explanation);

            if (!data.streaming) { 
                accumulatedResponse = data; // Final JSON response
            }

          } catch (jsonError) {
            console.error('Error parsing JSON chunk:', jsonError, line);
            setCurrentExplanation(prev => prev + `\nError processing data: ${jsonError.message}`);
          }
        }
      }

      setResponse(accumulatedResponse); // Set the final response after streaming completes
      
    } catch (error) {
      console.error('Error during fetch:', error);
      setResponse({
          predicted_author: "ERROR",
          explanation: `An error occurred: ${error.message}`,
          confidence: 0.0,
          topic: "N/A",
          topic_confidence: 0.0,
          streaming: false // Streaming failed
      });

    }

    setLoading(false);
  };

  return (
    <div className="container py-5 d-flex flex-column align-items-center">
      <div className="card p-4 shadow" style={{ maxWidth: '700px', width: '100%' }}>
        <div className="text-center mb-4">
          <i className="fas fa-user-secret fa-2x text-primary me-2"></i>
          <h1 className="h4 fw-bold d-inline">Twitter Author Identifier</h1>
          <p className="text-muted">Determine if a tweet was likely written by a specific person</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Enter tweet to analyze</label>
            <textarea
              className="form-control"
              rows="4"
              value={tweet}
              onChange={(e) => setTweet(e.target.value)}
              required
              placeholder="Paste the tweet you want to analyze here..."
            />
          </div>
          <button className="btn btn-primary w-100 d-flex align-items-center justify-content-center" type="submit" disabled={loading}>
            <i className="fas fa-search me-2"></i>
            {loading ? 'Analyzing...' : 'Analyze Tweet'}
          </button>
        </form>

        {loading && (
          <div className="text-center mt-4">
            <div className="spinner-border text-primary" role="status" />
            <p className="mt-2">Analyzing writing patterns...</p>
          </div>
        )}

        {/* Streaming response visualization */}
        {currentExplanation && ( 
          <div className="alert alert-info mt-4">
            <h5 className="mb-3">Analysis Result</h5>
            <p>
              {currentExplanation} {/* Streaming response*/}
            </p>

          </div>
        )}

        {/* If there's an error, shows the final explanaition */}
        {response && response.predicted_author === "ERROR" && !currentExplanation && (
            <div className="alert alert-danger mt-4">
                <h5 className="mb-3">Error</h5>
                <p>{response.explanation}</p>
            </div>
        )}
      </div>

      <LLM_TweetGenerator /> 

      <A1_LikesTopicYear /> 

      <A2_TopicTrendMonth />

      <AnimatePresence mode="wait">
        <A3_TopTweets key="top-tweets" />
      </AnimatePresence>

      <A4_AverageSentimentTopic/>

      <A5_AverageSentimentYear />
        
    </div>
  );
};
export default App;