import shutil
import tempfile
import unittest
from pathlib import Path

import numpy as np

from edge_rag import index, storage


class IndexTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp_dir = tempfile.mkdtemp()
        self.db_path = Path(self.tmp_dir) / "edge_rag.db"
        self.index_path = Path(self.tmp_dir) / "edge_rag.ann"
        self.config = index.IndexConfig(vector_dim=3, num_trees=10, search_k=-1)

    def tearDown(self) -> None:
        shutil.rmtree(self.tmp_dir)

    def _insert_doc(self, values, thread="thread"):
        embedding = np.array(values, dtype=np.float32)
        return storage.insert_document(
            thread_id=thread,
            text="doc",
            embedding=embedding,
            db_path=self.db_path,
        )

    def test_build_index_creates_file_and_metadata(self) -> None:
        self._insert_doc([1.0, 0.0, 0.0])
        metadata = index.build_index(
            config=self.config,
            db_path=self.db_path,
            index_path=self.index_path,
        )
        self.assertTrue(self.index_path.exists())
        stored_meta = storage.get_index_metadata(index.INDEX_METADATA_NAME, db_path=self.db_path)
        self.assertIsNotNone(stored_meta)
        self.assertEqual(metadata["doc_count"], 1)
        self.assertEqual(stored_meta["doc_count"], 1)

    def test_ensure_index_rebuilds_when_documents_change(self) -> None:
        first = self._insert_doc([1.0, 0.0, 0.0])
        initial_meta = index.build_index(
            config=self.config,
            db_path=self.db_path,
            index_path=self.index_path,
        )
        initial_digest = initial_meta["doc_ids_digest"]
        # Add another document, expect rebuild when ensuring index
        self._insert_doc([0.0, 1.0, 0.0], thread="thread-2")
        _, refreshed_meta = index.ensure_index(
            config=self.config,
            db_path=self.db_path,
            index_path=self.index_path,
        )
        self.assertEqual(refreshed_meta.doc_count, 2)
        self.assertNotEqual(initial_digest, refreshed_meta.doc_ids_digest)
        self.assertTrue(self.index_path.exists())
        # Ensure original doc still retrievable by annoy id
        doc = storage.get_document_by_id(first.doc_id, db_path=self.db_path)
        self.assertIsNotNone(doc)

    def test_query_returns_expected_order(self) -> None:
        self._insert_doc([1.0, 0.0, 0.0], thread="A")
        self._insert_doc([0.0, 1.0, 0.0], thread="B")
        self._insert_doc([0.0, 0.0, 1.0], thread="C")
        index.build_index(
            config=self.config,
            db_path=self.db_path,
            index_path=self.index_path,
        )
        ann, _ = index.ensure_index(
            config=self.config,
            db_path=self.db_path,
            index_path=self.index_path,
        )
        query_vec = np.array([0.9, 0.1, 0.0], dtype=np.float32)
        results, latency_ms = index.query_with_documents(
            index=ann,
            embedding=query_vec,
            db_path=self.db_path,
            top_k=2,
        )
        self.assertGreaterEqual(latency_ms, 0.0)
        top_doc, top_result = results[0]
        self.assertEqual(top_doc.thread_id, "A")
        if len(results) > 1:
            self.assertGreater(top_result.similarity, results[1][1].similarity)


if __name__ == "__main__":
    unittest.main()
