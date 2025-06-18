from neo4j import GraphDatabase
import os
from dotenv import load_dotenv

load_dotenv()

class Neo4jConnector:
    def __init__(self):
        """
        Initialize the Neo4j database connection using environment variables.
        """
        self.driver = GraphDatabase.driver(
            os.getenv("NEO4J_URI"),
            auth=(os.getenv("NEO4J_USER"), os.getenv("NEO4J_PASSWORD"))
        )

    def close(self):
        """
        Close the Neo4j database connection.
        """
        self.driver.close()
        
    def LLM_get_tweets_by_topic(self, topic: str):
        """
        Retrieve tweets by a specific author and topic from the Neo4j database.
        
        Args:
            topic (str): The topic to filter tweets by.
            
        Returns:
            list: A list of tweets by the specified topic, each represented as a dictionary.
        """
        """if author not in  ["Obama", "Musk"]:
            print("[DEBUG] Author not found.")
            return []"""
        
        with self.driver.session() as session:
            result = session.run(
                """
                MATCH (t:Tweet)
                WHERE t.topic = $topic 
                RETURN t.text AS text, t.date AS date, t.sentiment AS sentiment, t.author AS author
                """,
                
                topic=topic
            )
            return [record.data() for record in result]

    def LLM_get_tweets_by_author_topic(self, author: str, topic: str):
        """
        Retrieve tweets by a specific author and topic for tweet generation.
        
        Args:
            author (str): The author to filter tweets by (e.g., "Obama", "Musk").
            topic (str): The topic to filter tweets by.
            
        Returns:
            list: A list of tweets by the specified author and topic, each as a dictionary.
        """
        if author not in ["Obama", "Musk"]:
            print(f"[DEBUG] Author '{author}' not supported for tweet generation.")
            return []
        
        with self.driver.session() as session:
            result = session.run(
                """
                MATCH (t:Tweet)
                WHERE t.author = $author AND t.topic = $topic
                RETURN t.text AS text, t.date AS date, t.sentiment AS sentiment, t.author AS author
                """,
                author=author,
                topic=topic
            )
            return [record.data() for record in result]

    def A_get_topics_by_author(self, author: str):
        """
        Return distinct topics for tweets authored by the given author.
        
        Args:
            author (str): The author's name to filter tweets by (or 'All')
            
        Returns:
            list: A list of distinct topics associated with the author's tweets.
        """
        query = """
        MATCH (t:Tweet)
        WHERE t.topic IS NOT NULL
        """

        if author != "All":
            query += " AND t.author = $author"

        query += """
        RETURN DISTINCT t.topic AS topic
        ORDER BY topic
        """

        with self.driver.session() as session:
            result = session.run(query, author=author) if author != "All" else session.run(query)
            return [record["topic"] for record in result]

    def A_get_years_by_author(self, author: str):
        """
        Return distinct years (YYYY) in which the given author has posted tweets.

        Args:
            author (str): Author name or "All"
        
        Returns:
            list: A sorted list of years (as strings)
        """
        query = """
        MATCH (t:Tweet)
        WHERE t.date IS NOT NULL
        """

        if author != "All":
            query += " AND t.author = $author"

        query += """
        RETURN DISTINCT substring(t.date, 0, 4) AS year
        ORDER BY year
        """

        with self.driver.session() as session:
            result = session.run(query, author=author) if author != "All" else session.run(query)
            return [record["year"] for record in result]

    def A1_get_likes_by_year_for_topic_and_author(self, topic: str, author: str):
        
        """
        Return number of likes per year for a given topic. 
        
        Args:
            topic (str): The topic to filter tweets by.
            author (str): The author to filter tweets by.
        
        Returns:
            list: A list of dictionaries with year and total likes for that year.
        """
        with self.driver.session() as session:
            result = session.run(
                """
                MATCH (t:Tweet)
                WHERE t.topic = $topic AND t.author = $author
                WITH t, substring(t.date, 0, 4) AS year
                RETURN year, sum(t.likes) AS total_likes
                ORDER BY year
                """,
                topic=topic,
                author=author
            )
            return [{"year": record["year"], "likes": record["total_likes"]} for record in result]
        
    def A2_get_topic_trend_by_month_year(self, year: str, author: str):
        """
        Retrieve the topic trend for a specific year and author from the Neo4j database.
        
        Args:
            year (str): Year in 'YYYY' format
            author (str): Author name or 'All' for all authors
        
        Returns:
            list: List of {month, topic, count}
        """
        query = """
        MATCH (t:Tweet)
        WHERE t.date STARTS WITH $year
        AND t.topic IS NOT NULL
        """

        if author != "All":
            query += " AND t.author = $author"

        query += """
        RETURN substring(t.date, 5, 2) AS month, t.topic AS topic, count(*) AS count
        ORDER BY month, count DESC
        """

        params = {"year": year}
        if author != "All":
            params["author"] = author

        with self.driver.session() as session:
            result = session.run(query, **params)
            return result.data()

    def A3_get_top_tweets(self, metric: str, limit: int, author: str):
        """
        Retrieve top tweets ordered by likes or retweets.

        Args:
            metric (str): 'likes' or 'retweets'
            limit (int): number of top tweets to return
            author (str): Author to filter tweets by (or 'All')

        Returns:
            list: tweets with id, content, likes, retweets, date, and topic
        """
        assert metric in ["likes", "retweets"]
        query = f"""
        MATCH (t:Tweet)
        WHERE t.{metric} IS NOT NULL
        """
        
        if author != "All":
            query += " AND t.author = $author"
            
        query += f"""
        RETURN t.text AS content, t.likes AS likes, t.retweets AS retweets,
            substring(t.date, 0, 10) AS date, t.topic AS topic, t.author AS author
        ORDER BY t.{metric} DESC
        LIMIT $limit"""
        
        with self.driver.session() as session:
            params = {"limit": limit}
            if author != "All":
                params["author"] = author
            result = session.run(query, **params)
            return result.data()

    def A4_get_average_sentiment_by_topic(self):
        """
        Retrieve the average sentiment for each topic from the Neo4j database.
        
        Returns:
            list: A list of dictionaries containing the topic and its average sentiment value.
        """
        with self.driver.session() as session:
            result = session.run("""
                MATCH (t:Tweet)
                WHERE t.sentiment IN ['positive', 'neutral', 'negative'] 
                AND t.topic IS NOT NULL 
                AND t.sentiment_confidence IS NOT NULL
                WITH t.topic AS topic,
                    CASE t.sentiment
                        WHEN 'positive' THEN 1
                        WHEN 'neutral' THEN 0
                        WHEN 'negative' THEN -1
                    END AS s_value,
                    t.sentiment_confidence AS weight
                RETURN topic, 
                    sum(s_value * weight) / sum(weight) AS weighted_average_sentiment
                ORDER BY weighted_average_sentiment DESC
            """)
            return [
                {"topic": row["topic"], "average_sentiment": row["weighted_average_sentiment"]}
                for row in result
            ]

    def A5_get_average_sentiment_per_year(self, author):
        """
        Retrieve the average sentiment per year for a given author.
        
        Args:
            author (str): Author to filter tweets by.
        
        Returns:
            list: List of dictionaries with year and average sentiment.
        """
        with self.driver.session() as session:
            result = session.run("""
                MATCH (t:Tweet)
                WHERE t.author = $author
                WITH toInteger(split(t.date, "-")[0]) AS year,
                    CASE t.sentiment
                        WHEN "positive" THEN 1.0 * t.sentiment_confidence
                        WHEN "negative" THEN -1.0 * t.sentiment_confidence
                        ELSE 0
                    END AS sentiment_score
                RETURN year, avg(sentiment_score) AS avg_sentiment
                ORDER BY year
            """, author=author)
            return [{"year": record["year"], "avg_sentiment": record["avg_sentiment"]} for record in result]
