import unittest
from pathlib import Path
import tempfile

import numpy as np

from edge_rag import create_app, index, storage


class FakeModel:
    def __init__(self, value: float = 1.0) -> None:
        self.value = value

    def encode(self, text, convert_to_numpy=True):  # pragma: no cover - mimics API
        vec = np.full(3, self.value, dtype=np.float32)
        if convert_to_numpy:
            return vec
        return vec.tolist()


class WebUITests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.tmp_dir.name) / "ui.db"
        self.index_path = Path(self.tmp_dir.name) / "ui.ann"
        self.model = FakeModel(1.0)
        self.index_config = index.IndexConfig(vector_dim=3, num_trees=2)
        self.app = create_app(
            db_path=str(self.db_path),
            secret_key="test",
            model=self.model,
            index_config=self.index_config,
            index_path=self.index_path,
        )
        self.client = self.app.test_client()

    def tearDown(self) -> None:
        self.tmp_dir.cleanup()

    def test_homepage_renders(self) -> None:
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Edge RAG Mini Control Panel", response.data)
        self.assertIn(b"Raw Table Viewer", response.data)
        self.assertIn(b"Pin to Bottom", response.data)

        pinned = self.client.get("/?raw_pin=1")
        self.assertEqual(pinned.status_code, 200)
        self.assertIn(b"Unpin", pinned.data)

    def test_ingest_and_query_flow(self) -> None:
        ingest_response = self.client.post(
            "/ingest",
            data={
                "text": "Example document body",
                "thread_id": "thread-alpha",
            },
            follow_redirects=True,
        )
        self.assertEqual(ingest_response.status_code, 200)
        documents = storage.list_documents(db_path=self.db_path)
        self.assertEqual(len(documents), 1)

        query_response = self.client.post(
            "/query",
            data={
                "query_text": "Example document",
                "top_k": "3",
                "query_thread_id": "thread-alpha",
            },
            follow_redirects=True,
        )
        self.assertEqual(query_response.status_code, 200)
        self.assertIn(b"Last Query", query_response.data)
        self.assertIn(b"documents", query_response.data)

        query_logs = storage.list_query_logs(db_path=self.db_path)
        self.assertEqual(len(query_logs), 1)
        self.assertEqual(query_logs[0].matched_doc_id, documents[0].doc_id)

    def test_api_ingest_and_query(self) -> None:
        ingest_response = self.client.post(
            "/api/ingest",
            json={
                "text": "API document",
                "thread_id": "api-thread",
            },
        )
        self.assertEqual(ingest_response.status_code, 200)
        data = ingest_response.get_json()
        self.assertIn("document", data)
        doc_id = data["document"]["doc_id"]

        query_response = self.client.post(
            "/api/query",
            json={
                "query_text": "API document",
                "top_k": 3,
                "thread_id": "api-thread",
            },
        )
        self.assertEqual(query_response.status_code, 200)
        query_data = query_response.get_json()
        self.assertEqual(query_data["query_text"], "API document")
        self.assertIn("metadata", query_data)
        if query_data["results"]:
            first = query_data["results"][0]["document"]["doc_id"]
            self.assertEqual(first, doc_id)

    def test_api_table_endpoint(self) -> None:
        self.client.post(
            "/api/ingest",
            json={
                "text": "Table document",
                "thread_id": "table-thread",
            },
        )
        table_response = self.client.get("/api/table/documents")
        self.assertEqual(table_response.status_code, 200)
        data = table_response.get_json()
        self.assertIn("columns", data)
        self.assertIn("rows", data)
        self.assertTrue(any(row["thread_id"] == "table-thread" for row in data["rows"]))

    def test_ui_logging_emits_system_logs(self) -> None:
        self.client.post(
            "/api/ingest",
            json={
                "text": "Log document",
                "thread_id": "log-thread",
            },
        )
        logs = storage.list_system_logs(db_path=self.db_path)
        self.assertTrue(any(log.process == "ui" for log in logs))
        system_log_response = self.client.get("/api/table/system_logs?limit=5")
        self.assertEqual(system_log_response.status_code, 200)


if __name__ == "__main__":
    unittest.main()
