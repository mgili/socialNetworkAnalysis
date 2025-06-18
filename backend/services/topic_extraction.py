from transformers import pipeline
import pandas as pd
from collections import Counter
import spacy


nlp = spacy.load("en_core_web_trf")
classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")

candidate_labels = ["politics", "climate change", "USA", "health", "family", "business", "finance"]


def extract_entities(text: str):
    """
    Extracts named entities from a given text using SpaCy.

    Args:
        text (str): The input text from which to extract entities.

    Returns:
        list: A list of tuples, each containing the entity text and its label.
    """
    return [(ent.text, ent.label_) for ent in nlp(text).ents]


def filter_entities(entities):
  entities_to_remove = ["ORDINAL", "DATE", "CARDINAL", "MONEY", "TIME","PERCENT"]
  return [e for e in entities if e[1] not in entities_to_remove]

def entities_to_string(entities):
    return " ".join(ent for ent, _ in entities)

def classify_topic(text: str) -> tuple[str, float]:
    """
    Classifies the topic of a given text using zero-shot classification.
    """
    entities = filter_entities(extract_entities(text))
    ent_str = entities_to_string(entities)
    input_text = f"{text} - {ent_str}" if ent_str else text

    result = classifier(input_text, candidate_labels, multi_label=False)
    return result["labels"][0], float(result["scores"][0])
