from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from schemas import TweetRequest, TweetGenerationRequest 
import pandas as pd
from neo4j_connector import Neo4jConnector
import json
import faiss

from services.topic_extraction import classify_topic
from services.tweet_analysis_generation import stream_llm_response, stream_llm_generation, encoder 

app = FastAPI()
connector = Neo4jConnector()

# Allow requests from frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Frontend origin URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/analyze")
async def LLM_analyze_tweet(data: TweetRequest):
    topic, confidence = classify_topic(data.tweet)
    print(f"[DEBUG] Topic extracted: {topic} ({confidence:.2%})")
    
    df = connector.LLM_get_tweets_by_topic(topic)
    df = pd.DataFrame(df)
    
    if df.empty:
        return JSONResponse(status_code=404, content={
            "predicted_author": "ERROR",
            "explanation": "No tweets found for this topic. Please try a different tweet.",
            "confidence": 0.0,
            "topic": topic,
            "topic_confidence": round(confidence * 100, 2),
            "streaming": False
        })
        
    # Context embedding and search
    corpus_embeddings = encoder.encode(df["text"].tolist(), convert_to_numpy=True)
    dimension = corpus_embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(corpus_embeddings)

    query_embedding = encoder.encode([data.tweet])
    distances, indices = index.search(query_embedding, 10)
    
    # Prepare context tweets with authors
    context_tweets_with_authors = []
    for idx in indices[0]:
        t_text = df.iloc[idx]["text"]
        t_author = df.iloc[idx]["author"]
        context_tweets_with_authors.append(f'- "{t_text}" (Author: {t_author})')
    
    context_str = "\n".join(context_tweets_with_authors)
    print(f"[DEBUG] Context tweets for LLM: {context_str}")
    
    prompt = f"""I will provide you with a list of tweets.

Tweets:
{context_str}

Now, consider this new tweet:

"{data.tweet}"
Question: Could this tweet have been written by Obama, Musk or neither?
Answer and give a brief explanation."""

    async def generate_llm_response():
        full_explanation = ""
        
        initial_data = {
            "explanation": full_explanation, # Initial empty explanation
            "streaming": True # Indicates that streaming will start
        }
        yield json.dumps(initial_data) + "\n"

        # Stream LLM response
        async for text_chunk in stream_llm_response(prompt):
            if "ERROR" in text_chunk: 
                final_error_data = {
                    "predicted_author": "ERROR",
                    "explanation": text_chunk,
                    "confidence": 0.0,
                    "topic": topic,
                    "topic_confidence": round(confidence * 100, 2),
                    "streaming": False # End streaming
                }
                yield json.dumps(final_error_data) + "\n"
                print(f"[FINAL RESULT] ERROR: {text_chunk} (Topic: {topic}, Topic Confidence: {round(confidence * 100, 2)}%)")
                return 

            full_explanation += text_chunk
            # Send a partial update with the current explanation
            partial_data = {
                "explanation": full_explanation,
                "streaming": True # Keep streaming status
            }
            yield json.dumps(partial_data) + "\n"

        # Final result processing
        response_lower = full_explanation.lower()
        if "obama" in response_lower:
            final_predicted_author = "Obama"
        elif "musk" in response_lower or "elon" in response_lower:
            final_predicted_author = "Musk"
        else:
            final_predicted_author = "neither" # Default if no author found

        final_data = {
            "predicted_author": final_predicted_author,
            "explanation": full_explanation,
            "confidence": 100.0, 
            "topic": topic,
            "topic_confidence": round(confidence * 100, 2),
            "streaming": False # States that streaming is done
        }
        yield json.dumps(final_data) + "\n" # Sending final result

        # Log the final result
        print(f"[FINAL RESULT] Predicted Author: {final_predicted_author}, LLM Confidence: {100.0}%, Topic: {topic}, Topic Confidence: {round(confidence * 100, 2)}%")


    return StreamingResponse(generate_llm_response(), media_type="application/x-ndjson")

@app.post("/generate_tweet")
async def LLM_generate_author_tweet(data: TweetGenerationRequest):
    author = data.author
    topic = data.topic

    print(f"[DEBUG] Generating tweet for Author: {author}, Topic: {topic}")

    # Retrieve tweets by author and topic
    df = connector.LLM_get_tweets_by_author_topic(author, topic)
    df = pd.DataFrame(df)

    if df.empty:
        return JSONResponse(status_code=404, content={
            "error": f"No tweets found for {author} on topic '{topic}'. Cannot generate.",
            "streaming": False
        })

    # Randomly select 20 tweets (or fewer if less than 20 available)
    sample_size = min(20, len(df))
    sample_tweets = df.sample(n=sample_size)["text"].tolist() # .sample() to get random rows from the DataFrame

    context_tweets = "\n".join([f'- "{t}"' for t in sample_tweets])
    print(f"[DEBUG] Sample context tweets for generation:\n{context_tweets}")

    # 3. Construct the prompt for the LLM
    system_prompt = f"You are an expert in generating tweets in the style of a specific author. Your task is to produce a tweet that closely mimics the writing style, tone, and common vocabulary of {author} on the given topic."
    user_prompt = f"""Based on these example tweets by {author} on the topic of {topic}:

{context_tweets}

Now, generate a new tweet in the style of {author} about {topic}. 
The tweet should be concise and engaging. 
Do NOT include any explanations or extra text, just the tweet itself."""

    async def generate_response_stream():
        # Initial chunk for frontend, indicating streaming has started
        yield json.dumps({"generated_tweet": "", "streaming": True}) + "\n"

        full_generated_tweet = ""
        # Stream the response from the LLM
        async for text_chunk in stream_llm_generation(system_prompt, user_prompt): 
            full_generated_tweet += text_chunk
            # Send partial update for frontend
            yield json.dumps({"generated_tweet": full_generated_tweet, "streaming": True}) + "\n"
        
        # Post-processing to remove quotes
        full_generated_tweet = full_generated_tweet.strip() # Remove leading/trailing whitespace
        if full_generated_tweet.startswith('"') and full_generated_tweet.endswith('"'):
            full_generated_tweet = full_generated_tweet[1:-1].strip() # Remove quotes and re-strip
        
        # Final chunk, indicating streaming is complete
        yield json.dumps({"generated_tweet": full_generated_tweet, "streaming": False}) + "\n"
        print(f"[FINAL GENERATED TWEET] Author: {author}, Topic: {topic}\nTweet: \"{full_generated_tweet}\"")

    return StreamingResponse(generate_response_stream(), media_type="application/x-ndjson")

@app.get("/analytics/topics")
async def A_get_topics(author: str = Query(...)):
    try:
        topics = connector.A_get_topics_by_author(author)
        return {"author": author, "topics": topics}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/analytics/years")
async def A_get_years(author: str = Query("All")):
    try:
        years = connector.A_get_years_by_author(author)
        return {"author": author, "years": years}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/analytics/likes-by-year")
async def A1_get_likes_by_year(topic: str = Query(..., description="Topic to analyze"), author: str = Query(..., description="Author to filter by")):
    try:
        data = connector.A1_get_likes_by_year_for_topic_and_author(topic,author)
        return {"topic": topic, "author": author, "data": data}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    
@app.get("/topic-trend-by-year")
def A2_topic_trend_by_year(year: str = Query(..., min_length=4, max_length=4), author: str = Query("All")):
    data = connector.A2_get_topic_trend_by_month_year(year, author)
    return {"data": data}

@app.get("/top-tweets")
def A3_get_top_tweets(metric: str = Query("likes", enum=["likes", "retweets"]), limit: int = 5, author: str = Query(...)):
    data = connector.A3_get_top_tweets(metric, limit, author)
    return {"data": data}

@app.get("/analytics/sentiment-by-topic")
def A4_sentiment_by_topic():
    data = connector.A4_get_average_sentiment_by_topic()
    return {"data": data}

@app.get("/sentiment-per-year")
def A5_sentiment_per_year(author: str = Query(...)):
    data = connector.A5_get_average_sentiment_per_year(author)
    return {"data": data}