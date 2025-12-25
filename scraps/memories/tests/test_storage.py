import unittest
from pathlib import Path
import shutil
import tempfile

import numpy as np

from edge_rag import storage


class StorageTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp_dir = tempfile.mkdtemp()
        self.db_path = Path(self.tmp_dir) / "edge_rag.db"

    def tearDown(self) -> None:
        shutil.rmtree(self.tmp_dir)

    def test_insert_and_fetch_document(self) -> None:
        embedding = np.arange(4, dtype=np.float32)
        doc = storage.insert_document(
            thread_id="thread-1",
            text="hello",
            embedding=embedding,
            db_path=self.db_path,
        )
        self.assertEqual(doc.thread_id, "thread-1")
        self.assertEqual(doc.text, "hello")
        np.testing.assert_array_equal(doc.embedding, embedding)
        self.assertEqual(doc.embedding_dim, 4)
        self.assertEqual(doc.annoy_id, doc.doc_id)

    def test_update_latencies(self) -> None:
        doc = storage.insert_document(
            thread_id="thread-2",
            text="latency",
            embedding=np.zeros(2, dtype=np.float32),
            db_path=self.db_path,
        )
        storage.update_document_latencies(
            doc.doc_id,
            embedding_time_ms=12.5,
            retrieval_time_ms=8.2,
            generation_time_ms=30.0,
            db_path=self.db_path,
        )
        refreshed = storage.get_document_by_id(doc.doc_id, db_path=self.db_path)
        self.assertAlmostEqual(refreshed.embedding_time_ms, 12.5)
        self.assertAlmostEqual(refreshed.retrieval_time_ms, 8.2)
        self.assertAlmostEqual(refreshed.generation_time_ms, 30.0)

    def test_log_query(self) -> None:
        doc = storage.insert_document(
            thread_id="thread-3",
            text="query target",
            embedding=np.ones(3, dtype=np.float32),
            db_path=self.db_path,
        )
        log = storage.log_query(
            thread_id="thread-3",
            query_text="query",
            top_k=5,
            embedding_time_ms=5.0,
            retrieval_time_ms=4.0,
            generation_time_ms=15.0,
            matched_doc_id=doc.doc_id,
            db_path=self.db_path,
        )
        self.assertEqual(log.thread_id, "thread-3")
        self.assertEqual(log.query_text, "query")
        self.assertEqual(log.top_k, 5)
        self.assertEqual(log.matched_doc_id, doc.doc_id)

    def test_list_index_metadata(self) -> None:
        storage.set_index_metadata(
            name="primary",
            metadata={"doc_count": 2, "vector_dim": 3},
            db_path=self.db_path,
        )
        entries = storage.list_index_metadata(db_path=self.db_path)
        self.assertEqual(len(entries), 1)
        entry = entries[0]
        self.assertEqual(entry["name"], "primary")
        self.assertEqual(entry["doc_count"], 2)
        self.assertEqual(entry["vector_dim"], 3)

    def test_index_metadata_round_trip(self) -> None:
        payload = {"trees": 10, "vector_dim": 3}
        storage.set_index_metadata("primary", payload, db_path=self.db_path)
        saved = storage.get_index_metadata("primary", db_path=self.db_path)
        self.assertEqual(saved["trees"], payload["trees"])
        self.assertEqual(saved["vector_dim"], payload["vector_dim"])
        self.assertIsNotNone(saved["updated_at"])

    def test_system_log_event(self) -> None:
        entry = storage.log_event(
            component="tests",
            process="unit",
            event_type="info",
            detail="test log",
            context={"key": "value"},
            db_path=self.db_path,
        )
        self.assertEqual(entry.component, "tests")
        self.assertEqual(entry.process, "unit")
        self.assertEqual(entry.event_type, "info")
        self.assertEqual(entry.detail, "test log")
        self.assertEqual(entry.context["key"], "value")
        logs = storage.list_system_logs(db_path=self.db_path)
        self.assertEqual(len(logs), 1)
        self.assertIsNone(storage.get_index_metadata("missing", db_path=self.db_path))


if __name__ == "__main__":
    unittest.main()
