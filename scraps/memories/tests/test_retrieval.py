import shutil
import tempfile
import unittest
from pathlib import Path

import numpy as np

from edge_rag import embeddings, ingestion, index, retrieval, storage


class FakeModel:
    def encode(self, text, convert_to_numpy=True):  # pragma: no cover
        mapping = {
            "alpha": np.array([1.0, 0.0, 0.0], dtype=np.float32),
            "beta": np.array([0.0, 1.0, 0.0], dtype=np.float32),
            "gamma": np.array([0.0, 0.0, 1.0], dtype=np.float32),
            "unknown": np.array([0.0, 0.0, 0.0], dtype=np.float32),
        }
        key = text.strip().lower().split()[0] if text.strip() else ""
        vec = mapping.get(key, np.ones(3, dtype=np.float32))
        return vec if convert_to_numpy else vec.tolist()


class RetrievalTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp_dir = tempfile.mkdtemp()
        self.db_path = Path(self.tmp_dir) / "edge_rag.db"
        self.index_path = Path(self.tmp_dir) / "edge_rag.ann"
        self.config = index.IndexConfig(vector_dim=3, num_trees=2)
        self.model = FakeModel()

    def tearDown(self) -> None:
        shutil.rmtree(self.tmp_dir)

    def test_retrieve_returns_ranked_results(self) -> None:
        ingestion.ingest_text(
            thread_id="thread-1",
            text="Alpha doc",
            model=self.model,
            db_path=self.db_path,
        )
        ingestion.ingest_text(
            thread_id="thread-2",
            text="Beta doc",
            model=self.model,
            db_path=self.db_path,
        )

        response = retrieval.retrieve(
            thread_id="query-thread",
            query_text="alpha",
            top_k=1,
            db_path=self.db_path,
            index_path=self.index_path,
            config=self.config,
            model=self.model,
        )
        self.assertEqual(response.query_text, "alpha")
        self.assertEqual(len(response.results), 1)
        self.assertEqual(response.results[0].document.thread_id, "thread-1")
        self.assertGreaterEqual(response.embedding_time_ms, 0.0)
        self.assertGreaterEqual(response.retrieval_time_ms, 0.0)
        self.assertGreaterEqual(response.total_time_ms, response.embedding_time_ms)

        logs = storage.list_query_logs(db_path=self.db_path)
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0].matched_doc_id, response.results[0].document.doc_id)

    def test_retrieve_logs_when_no_results(self) -> None:
        ingestion.ingest_text(
            thread_id="thread-1",
            text="Alpha doc",
            model=self.model,
            db_path=self.db_path,
        )
        index.build_index(
            config=self.config,
            db_path=self.db_path,
            index_path=self.index_path,
        )
        response = retrieval.retrieve(
            thread_id="query-thread",
            query_text="unknown",
            top_k=1,
            min_similarity=0.6,
            db_path=self.db_path,
            index_path=self.index_path,
            config=self.config,
            model=self.model,
        )
        self.assertEqual(response.results, [])
        logs = storage.list_query_logs(db_path=self.db_path)
        self.assertEqual(len(logs), 1)
        self.assertIsNone(logs[0].matched_doc_id)

    def test_similarity_threshold_filters_results(self) -> None:
        ingestion.ingest_text(
            thread_id="thread-1",
            text="Alpha doc",
            model=self.model,
            db_path=self.db_path,
        )
        response = retrieval.retrieve(
            thread_id="query-thread",
            query_text="alpha",
            top_k=1,
            min_similarity=0.5,
            db_path=self.db_path,
            index_path=self.index_path,
            config=self.config,
            model=self.model,
        )
        self.assertEqual(len(response.results), 1)
        response_low = retrieval.retrieve(
            thread_id="query-thread",
            query_text="alpha",
            top_k=1,
            min_similarity=1.0001,
            db_path=self.db_path,
            index_path=self.index_path,
            config=self.config,
            model=self.model,
        )
        self.assertEqual(response_low.results, [])

    def test_retrieve_thread_filters(self) -> None:
        ingestion.ingest_text(
            thread_id="thread-keep",
            text="alpha",
            model=self.model,
            db_path=self.db_path,
        )
        ingestion.ingest_text(
            thread_id="thread-other",
            text="beta",
            model=self.model,
            db_path=self.db_path,
        )

        response = retrieval.retrieve(
            thread_id="query-thread",
            query_text="alpha",
            top_k=2,
            thread_filters=["thread-keep"],
            db_path=self.db_path,
            index_path=self.index_path,
            config=self.config,
            model=self.model,
        )
        self.assertEqual(len(response.results), 1)
        self.assertEqual(response.results[0].document.thread_id, "thread-keep")

        response_none = retrieval.retrieve(
            thread_id="query-thread",
            query_text="alpha",
            top_k=2,
            thread_filters=["missing"],
            db_path=self.db_path,
            index_path=self.index_path,
            config=self.config,
            model=self.model,
        )
        self.assertEqual(response_none.results, [])

    def test_retrieve_raises_when_no_documents(self) -> None:
        with self.assertRaises(retrieval.RetrievalError):
            retrieval.retrieve(
                thread_id="query-thread",
                query_text="alpha",
                db_path=self.db_path,
                index_path=self.index_path,
                config=self.config,
                model=self.model,
            )
        logs = storage.list_query_logs(db_path=self.db_path)
        self.assertEqual(len(logs), 1)
        self.assertIsNone(logs[0].matched_doc_id)
        self.assertEqual(logs[0].embedding_time_ms, 0.0)
        self.assertEqual(logs[0].retrieval_time_ms, 0.0)


if __name__ == "__main__":
    unittest.main()
