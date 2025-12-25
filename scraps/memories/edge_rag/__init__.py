"""Edge RAG package exports."""

from edge_rag.web import HashEmbeddingProvider, create_app

__all__ = ["create_app", "HashEmbeddingProvider"]
