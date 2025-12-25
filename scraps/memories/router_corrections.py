import os
import json
from datetime import datetime

# Optional dependencies - Vector DB features disabled if not available
try:
    from sentence_transformers import SentenceTransformer
    from annoy import AnnoyIndex
    import numpy as np
    VECTOR_DB_AVAILABLE = True
except ImportError:
    VECTOR_DB_AVAILABLE = False
    SentenceTransformer = None
    AnnoyIndex = None
    np = None

# --- Configuration ---
MODEL_NAME = 'all-MiniLM-L6-v2'
EMBEDDING_DIM = 384

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
ANNOY_INDEX_PATH = os.path.join(DATA_DIR, 'corrections.ann')
METADATA_PATH = os.path.join(DATA_DIR, 'corrections_metadata.json')

# --- Global State ---
model = None
annoy_index = None
metadata = []
index_is_built = False

# --- Core Functions ---

def _load_model():
    """Loads the SentenceTransformer model into memory."""
    global model
    if not VECTOR_DB_AVAILABLE:
        return None
    if model is None:
        print("Loading sentence transformer model...")
        model = SentenceTransformer(MODEL_NAME)
        print("Model loaded.")
    return model

def _initialize_metadata():
    """Initializes the metadata from the JSON file."""
    global metadata
    os.makedirs(DATA_DIR, exist_ok=True)
    if os.path.exists(METADATA_PATH):
        with open(METADATA_PATH, 'r') as f:
            metadata = json.load(f)
        print(f"Loaded {len(metadata)} metadata records.")
    else:
        print("No metadata file found, starting fresh.")

def _get_or_build_index():
    """
    Returns the current Annoy index, building it from metadata if necessary.
    This is for read-only operations like querying.
    """
    global annoy_index, index_is_built
    if index_is_built and annoy_index:
        return annoy_index

    _load_model()
    
    print("Building Annoy index from metadata...")
    temp_index = AnnoyIndex(EMBEDDING_DIM, 'angular')
    embeddings = model.encode([item['text'] for item in metadata])
    for i, vec in enumerate(embeddings):
        temp_index.add_item(i, vec)
    
    temp_index.build(10)
    annoy_index = temp_index
    index_is_built = True
    print(f"Index built with {annoy_index.get_n_items()} items.")
    return annoy_index

def add_correction(text: str, correct_route: str, correct_intent: str, wrong_route: str):
    """
    Adds a user's routing correction and rebuilds the persistent index.
    """
    global metadata, index_is_built

    if not VECTOR_DB_AVAILABLE:
        print("⚠️  Vector DB not available (sentence-transformers not installed)")
        print("   Correction noted but not stored in vector database")
        return

    _load_model()

    print(f"Adding correction for: '{text}'")

    # 1. Create metadata object and add to in-memory list
    correction_record = {
        "text": text,
        "correct_route": correct_route,
        "correct_intent": correct_intent,
        "wrong_route": wrong_route,
        "timestamp": datetime.now().isoformat()
    }
    metadata.append(correction_record)

    # 2. Rebuild the entire index from the updated metadata
    print("Rebuilding and saving Annoy index...")
    full_index = AnnoyIndex(EMBEDDING_DIM, 'angular')
    embeddings = model.encode([item['text'] for item in metadata])
    for i, vec in enumerate(embeddings):
        full_index.add_item(i, vec)
    
    full_index.build(10)
    full_index.save(ANNOY_INDEX_PATH)

    # 3. Save the updated metadata list
    with open(METADATA_PATH, 'w') as f:
        json.dump(metadata, f, indent=2)

    # Mark that the in-memory index (if any) is now stale
    index_is_built = False
    print(f"Correction saved. Index now has {len(metadata)} items.")

def query_corrections(text: str, top_k: int = 3, threshold: float = 0.90):
    """
    Queries the database for similar, previously corrected inputs.
    """
    if not VECTOR_DB_AVAILABLE:
        return []

    if not metadata:
        return []

    idx = _get_or_build_index()
    
    query_embedding = model.encode(text)
    indices, distances = idx.get_nns_by_vector(query_embedding, top_k, include_distances=True)

    results = []
    if not indices:
        return results

    for i, dist in zip(indices, distances):
        similarity = (2 - dist**2) / 2
        if similarity >= threshold:
            record = metadata[i].copy() # Return a copy
            record['similarity'] = similarity
            results.append(record)
            print(f"Found similar correction (sim: {similarity:.3f}): '{record['text']}'")

    results.sort(key=lambda x: x['similarity'], reverse=True)
    return results

# --- Initialization ---
_initialize_metadata()

# --- Test Harness ---
if __name__ == '__main__':
    print("\n--- Running Router Corrections Test ---")

    # Clear existing test data for a clean run
    if os.path.exists(ANNOY_INDEX_PATH):
        os.remove(ANNOY_INDEX_PATH)
    if os.path.exists(METADATA_PATH):
        os.remove(METADATA_PATH)
    
    # Re-initialize metadata list
    metadata = []
    _initialize_metadata()

    # 1. Add some sample corrections
    print("\n[Phase 1: Adding corrections]")
    add_correction(
        text="hey tomo what's up",
        correct_route="local",
        correct_intent="chat",
        wrong_route="phone_home"
    )
    add_correction(
        text="can you remind me to check the oven in 10 minutes",
        correct_route="local",
        correct_intent="set_reminder",
        wrong_route="phone_home"
    )
    add_correction(
        text="what was that thing I said about the slides",
        correct_route="local",
        correct_intent="memory_query",
        wrong_route="chat"
    )

    # 2. Query with similar phrases
    print("\n[Phase 2: Querying for corrections]")
    
    # Test case 1: High similarity
    print("\n--- Test Case 1: High Similarity ---")
    query1 = "hey tomo what is up"
    matches1 = query_corrections(query1, top_k=1, threshold=0.90)
    if matches1:
        print(f"Query '{query1}' matched with '{matches1[0]['text']}'")
        assert matches1[0]['correct_intent'] == 'chat'
    else:
        print(f"Query '{query1}' found no confident match.")

    # Test case 2: Lower similarity but should still match
    print("\n--- Test Case 2: Moderate Similarity ---")
    query2 = "remind me to check the oven"
    matches2 = query_corrections(query2, top_k=1, threshold=0.85)
    if matches2:
        print(f"Query '{query2}' matched with '{matches2[0]['text']}'")
        assert matches2[0]['correct_intent'] == 'set_reminder'
    else:
        print(f"Query '{query2}' found no confident match.")

    # Test case 3: No match
    print("\n--- Test Case 3: No Match ---")
    query3 = "what's the weather like"
    matches3 = query_corrections(query3, top_k=1, threshold=0.90)
    if not matches3:
        print(f"Query '{query3}' correctly found no confident match.")
    else:
        print(f"Query '{query3}' incorrectly matched with '{matches3[0]['text']}'")

    print("\n--- Test Complete ---")
