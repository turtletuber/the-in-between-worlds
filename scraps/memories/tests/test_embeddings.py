import shutil
import tempfile
import unittest
from pathlib import Path

import numpy as np

from edge_rag import embeddings, storage


class FakeModel:
    def __init__(self, value: float = 1.0) -> None:
        self._value = value

    def encode(self, text, convert_to_numpy=True):  # pragma: no cover - signature compat
        vec = np.full(4, self._value, dtype=np.float32)
        if convert_to_numpy:
            return vec
        return vec.tolist()


class EmbeddingTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp_dir = tempfile.mkdtemp()
        self.db_path = Path(self.tmp_dir) / "edge_rag.db"

    def tearDown(self) -> None:
        shutil.rmtree(self.tmp_dir)

    def test_embed_text_returns_vector_and_latency(self) -> None:
        model = FakeModel(2.0)
        result = embeddings.embed_text("hello", model=model, db_path=self.db_path)
        np.testing.assert_array_equal(result.embedding, np.full(4, 2.0, dtype=np.float32))
        self.assertEqual(result.embedding_dim, 4)
        self.assertGreaterEqual(result.embedding_time_ms, 0.0)

    def test_embed_text_rejects_empty_text(self) -> None:
        model = FakeModel()
        with self.assertRaises(ValueError):
            embeddings.embed_text("   ", model=model, db_path=self.db_path)

    def test_embed_and_store_persists_document(self) -> None:
        model = FakeModel(3.0)
        doc = embeddings.embed_and_store(
            thread_id="thread-emb",
            text="stored",
            model=model,
            db_path=self.db_path,
        )
        self.assertEqual(doc.text, "stored")
        np.testing.assert_array_equal(doc.embedding, np.full(4, 3.0, dtype=np.float32))
        self.assertIsNotNone(doc.embedding_time_ms)
        self.assertGreaterEqual(doc.embedding_time_ms, 0.0)
        fetched = storage.get_document_by_id(doc.doc_id, db_path=self.db_path)
        self.assertEqual(fetched.thread_id, "thread-emb")


if __name__ == "__main__":
    unittest.main()
