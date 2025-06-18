from sentence_transformers import SentenceTransformer
import faiss
import pandas as pd
import openai
import collections.abc 

# Zero-shot classification and encoder initialization
encoder = SentenceTransformer("all-MiniLM-L6-v2")
# LM Studio client initialization
client = openai.OpenAI(base_url="http://localhost:1234/v1", api_key="lm-studio")

async def stream_llm_response(prompt: str):
    """
    Stream a response from the local LLM using LM Studio API.

    Args:
        prompt (str): The prompt to send to the LLM for generating a response.

    Returns:
        collections.abc.Generator[str, None, None]: A generator yielding chunks of the LLM's response.
    """
    try:
        completion = client.chat.completions.create(
            model="local-model", # Local model name (using meta-llama-3.1-8b-instruct)
            messages=[
                {"role": "system", "content": "You are an expert in tweet author attribution. Provide concise and accurate explanations based on the context."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1, # Making the model more deterministic
            max_tokens=200,
            stream=True, # Enable streaming
        )

        for chunk in completion:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
    except openai.APIConnectionError as e:
        print(f"ERROR: Could not connect to LM Studio API. Is LM Studio running and the server started? {e}")
        yield "ERROR: LLM API connection failed."
    except Exception as e:
        print(f"An unexpected error occurred during LLM inference: {e}")
        yield f"ERROR: An unexpected error occurred: {e}"
        
        
async def stream_llm_generation(system_prompt: str, user_prompt: str):
    """
    Stream a tweet generation response from the local LLM using LM Studio API.

    Args:
        system_prompt (str): The system-level prompt for the LLM.
        user_prompt (str): The user-level prompt for the LLM.

    Returns:
        collections.abc.Generator[str, None, None]: A generator yielding chunks of the LLM's response.
    """
    try:
        completion = client.chat.completions.create(
            model="local-model", # Local model name (using meta-llama-3.1-8b-instruct)
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7, # Making the model less deterministic
            max_tokens=200, 
            stream=True, # Enable streaming
        )

        for chunk in completion:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
    except openai.APIConnectionError as e:
        print(f"ERROR: Could not connect to LM Studio API for generation. Is LM Studio running and the server started? {e}")
        yield "ERROR: LLM API connection failed."
    except Exception as e:
        print(f"An unexpected error occurred during LLM generation: {e}")
        yield f"ERROR: An unexpected error occurred: {e}"