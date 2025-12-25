import shutil
import tempfile
import unittest
from pathlib import Path

import numpy as np

from edge_rag import ingestion, storage


class FakeModel:
    def __init__(self, value: float = 1.0) -> None:
        self._value = value

    def encode(self, text, convert_to_numpy=True):  # pragma: no cover - mimic API
        vec = np.full(6, self._value, dtype=np.float32)
        if convert_to_numpy:
            return vec
        return vec.tolist()


class IngestionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp_dir = tempfile.mkdtemp()
        self.db_path = Path(self.tmp_dir) / "edge_rag.db"

    def tearDown(self) -> None:
        shutil.rmtree(self.tmp_dir)

    def test_ingest_text_persists_document(self) -> None:
        model = FakeModel(4.0)
        doc = ingestion.ingest_text(
            thread_id="thread-ing",
            text="hello world",
            model=model,
            db_path=self.db_path,
        )
        self.assertEqual(doc.thread_id, "thread-ing")
        self.assertEqual(doc.text, "hello world")
        np.testing.assert_array_equal(doc.embedding, np.full(6, 4.0, dtype=np.float32))
        stored = storage.get_document_by_id(doc.doc_id, db_path=self.db_path)
        self.assertEqual(stored.annoy_id, doc.annoy_id)

    def test_ingest_text_rejects_blank_input(self) -> None:
        with self.assertRaises(ValueError):
            ingestion.ingest_text(
                thread_id="thread-ing",
                text="   ",
                model=FakeModel(),
                db_path=self.db_path,
            )


if __name__ == "__main__":
    unittest.main()
