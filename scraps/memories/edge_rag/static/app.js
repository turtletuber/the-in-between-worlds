(function () {
    var TOAST_DURATION = 4000;
    var LOG_POLL_INTERVAL = 500;

    var logPanel;
    var logToggle;
    var logClose;
    var logStream;
    var logPollHandle = null;
    var logSessionStartId = null;

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatText(value) {
        if (value === null || value === undefined) {
            return '';
        }
        return escapeHtml(String(value)).replace(/\n/g, '<br>');
    }

    function formatCellValue(value) {
        if (value === null || value === undefined) {
            return '—';
        }
        if (Array.isArray(value) || typeof value === 'object') {
            try {
                return escapeHtml(JSON.stringify(value));
            } catch (err) {
                return escapeHtml(String(value));
            }
        }
        return escapeHtml(String(value));
    }

    function postJson(url, payload) {
        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(payload || {}),
        }).then(function (response) {
            if (!response.ok) {
                return response.json().catch(function () {
                    return { error: 'Request failed' };
                }).then(function (data) {
                    throw data;
                });
            }
            return response.json();
        });
    }

    function getJson(url) {
        return fetch(url, {
            headers: {
                'Accept': 'application/json',
            },
        }).then(function (response) {
            if (!response.ok) {
                return response.json().catch(function () {
                    return { error: 'Request failed' };
                }).then(function (data) {
                    throw data;
                });
            }
            return response.json();
        });
    }

    function serializeForm(form) {
        var data = new FormData(form);
        var payload = {};
        data.forEach(function (value, key) {
            payload[key] = value;
        });
        return payload;
    }

    function removeEmptyRow(tbody) {
        if (!tbody) {
            return;
        }
        var empty = tbody.querySelector('tr[data-empty]');
        if (empty) {
            empty.remove();
        }
    }

    function updateDocumentTable(documentRow) {
        if (!documentRow) {
            return;
        }
        var tbody = document.querySelector('#documents table tbody');
        if (!tbody) {
            return;
        }
        removeEmptyRow(tbody);
        var selector = 'tr[data-doc-id="' + documentRow.doc_id + '"]';
        var existing = tbody.querySelector(selector);
        var html =
            '<tr data-doc-id="' + escapeHtml(documentRow.doc_id) + '">' +
            '<td>' + escapeHtml(documentRow.doc_id) + '</td>' +
            '<td>' + formatCellValue(documentRow.thread_id) + '</td>' +
            '<td>' + formatCellValue(documentRow.annoy_id) + '</td>' +
            '<td>' + formatCellValue(documentRow.created_at) + '</td>' +
            '<td>' + formatCellValue(documentRow.embedding_dim) + '</td>' +
            '<td>' + formatCellValue(documentRow.embedding_time_ms) + '</td>' +
            '<td>' + formatCellValue(documentRow.retrieval_time_ms) + '</td>' +
            '<td>' + formatCellValue(documentRow.generation_time_ms) + '</td>' +
            '<td><div class="text-block">' + formatText(documentRow.text || '') + '</div></td>' +
            '</tr>';
        if (existing) {
            existing.outerHTML = html;
        } else {
            tbody.insertAdjacentHTML('afterbegin', html);
        }
    }

    function updateLastQueryCard(response) {
        var card = document.querySelector('#query .query-card');
        if (!card || !response) {
            return;
        }
        var embedTime = typeof response.embedding_time_ms === 'number' ? response.embedding_time_ms.toFixed(2) : '—';
        var retrievalTime = typeof response.retrieval_time_ms === 'number' ? response.retrieval_time_ms.toFixed(2) : '—';
        var metadata = response.metadata || {};
        var indexDocCount = formatCellValue(metadata.doc_count != null ? metadata.doc_count : '—');
        var indexUpdated = metadata.updated_at ? formatCellValue(metadata.updated_at) : '—';
        var resultsHtml = '';
        if (response.results && response.results.length) {
            response.results.forEach(function (item) {
                var doc = item.document || {};
                var similarity = typeof item.similarity === 'number' ? item.similarity.toFixed(4) : '—';
                var embedding = doc.embedding_time_ms != null ? doc.embedding_time_ms : '—';
                var retrieval = doc.retrieval_time_ms != null ? doc.retrieval_time_ms : '—';
                var generation = doc.generation_time_ms != null ? doc.generation_time_ms : '—';
                resultsHtml +=
                    '<div class="query-card">' +
                    '<p><strong>Document ' + escapeHtml(doc.doc_id || '') + '</strong> • Thread: ' +
                    formatCellValue(doc.thread_id) + ' • Similarity: ' + similarity + '</p>' +
                    '<div class="text-block">' + formatText(doc.text || '') + '</div>' +
                    '<div class="metrics">' +
                    '<span class="metric">Embedding ms: ' + formatCellValue(embedding) + '</span>' +
                    '<span class="metric">Retrieval ms: ' + formatCellValue(retrieval) + '</span>' +
                    '<span class="metric">Generation ms: ' + formatCellValue(generation) + '</span>' +
                    '</div>' +
                    '</div>';
            });
        } else {
            resultsHtml = '<p>No matches found.</p>';
        }
        card.innerHTML =
            '<h3>Last Query</h3>' +
            '<p><strong>Query:</strong> ' + formatCellValue(response.query_text || '') + '</p>' +
            '<div class="metrics">' +
            '<span class="metric">Top-K: ' + formatCellValue(response.top_k) + '</span>' +
            '<span class="metric">Embedding Time: ' + embedTime + ' ms</span>' +
            '<span class="metric">Retrieval Time: ' + retrievalTime + ' ms</span>' +
            '<span class="metric">Index Docs: ' + indexDocCount + '</span>' +
            '<span class="metric">Index Updated: ' + indexUpdated + '</span>' +
            '</div>' +
            '<h4>Results</h4>' +
            resultsHtml;
    }

    function renderQueryLogsTable(data) {
        var tbody = document.querySelector('#query-logs table tbody');
        if (!tbody) {
            return;
        }
        if (!data || !data.rows || !data.rows.length) {
            tbody.innerHTML = '<tr data-empty="query_logs"><td colspan="9">No queries logged yet.</td></tr>';
            return;
        }
        var columns = data.columns || [];
        var html = data.rows.map(function (row) {
            return '<tr>' + columns.map(function (column) {
                return '<td>' + formatCellValue(row[column]) + '</td>';
            }).join('') + '</tr>';
        }).join('');
        tbody.innerHTML = html;
    }

    function renderRawViewer(tableName, data) {
        var container = document.querySelector('#raw-viewer .raw-table-container');
        if (!container) {
            return;
        }
        if (!data || !data.rows || !data.rows.length) {
            container.innerHTML = '<div class="empty-message">No rows found in the ' + escapeHtml(tableName) + ' table.</div>';
            return;
        }
        var columns = data.columns || [];
        var header = columns.map(function (column) {
            return '<th>' + escapeHtml(column) + '</th>';
        }).join('');
        var body = data.rows.map(function (row) {
            return '<tr>' + columns.map(function (column) {
                return '<td>' + formatCellValue(row[column]) + '</td>';
            }).join('') + '</tr>';
        }).join('');
        container.innerHTML = '<table><thead><tr>' + header + '</tr></thead><tbody>' + body + '</tbody></table>';
    }

    function renderQueryResults(data) {
        var container = document.getElementById('query-results');
        if (!container) {
            return;
        }
        container.innerHTML = '';
        if (!data || !data.results || !data.results.length) {
            container.textContent = 'No results yet. Submit a query to see matches here.';
            return;
        }
        var frag = document.createDocumentFragment();
        data.results.forEach(function (item, index) {
            var doc = item.document || {};
            var card = document.createElement('article');
            card.className = 'result-card';

            var header = document.createElement('div');
            header.className = 'result-card-header';
            header.innerHTML =
                '<strong>#' + (index + 1) + ' · Doc ' + formatCellValue(doc.doc_id) + '</strong>' +
                '<span>Thread: ' + formatCellValue(doc.thread_id) + '</span>' +
                '<span>Sim: ' + (typeof item.similarity === 'number' ? item.similarity.toFixed(4) : '—') + '</span>';

            var metrics = document.createElement('div');
            metrics.className = 'metrics';
            metrics.innerHTML =
                '<span class="metric">Embedding ms: ' + formatCellValue(doc.embedding_time_ms) + '</span>' +
                '<span class="metric">Retrieval ms: ' + formatCellValue(doc.retrieval_time_ms) + '</span>' +
                '<span class="metric">Generation ms: ' + formatCellValue(doc.generation_time_ms) + '</span>';

            var textBlock = document.createElement('div');
            textBlock.className = 'text-block';
            textBlock.innerHTML = formatText(doc.text || '');

            card.appendChild(header);
            card.appendChild(metrics);
            card.appendChild(textBlock);
            frag.appendChild(card);
        });
        container.appendChild(frag);
    }

    function fetchTable(name, params) {
        var url = '/api/table/' + encodeURIComponent(name);
        if (params && params.limit != null) {
            url += '?limit=' + encodeURIComponent(params.limit);
            if (params.offset != null) {
                url += '&offset=' + encodeURIComponent(params.offset);
            }
        }
        return getJson(url);
    }

    function refreshRawViewer() {
        var table = getSelectedRawTable();
        if (!table) {
            return Promise.resolve();
        }
        if (table === 'query_logs') {
            return refreshQueryLogsTable();
        }
        return fetchTable(table)
            .then(function (data) {
                renderRawViewer(table, data);
            })
            .catch(function (error) {
                showToast(error.error || 'Failed to load table data.', 'error');
            });
    }

    function refreshQueryLogsTable() {
        return fetchTable('query_logs', { limit: 200 })
            .then(function (data) {
                renderQueryLogsTable(data);
                var current = getSelectedRawTable();
                if (current === 'query_logs') {
                    renderRawViewer(current, data);
                }
            })
            .catch(function (error) {
                showToast(error.error || 'Failed to load query logs.', 'error');
            });
    }

    function getSelectedRawTable() {
        var select = document.getElementById('raw_table');
        return select ? select.value : null;
    }

    function showToast(message, level) {
        var container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
        var toast = document.createElement('div');
        toast.className = 'toast ' + (level || 'info');
        toast.textContent = message;
        container.appendChild(toast);
        requestAnimationFrame(function () {
            toast.classList.add('show');
        });
        setTimeout(function () {
            toast.classList.remove('show');
            setTimeout(function () {
                toast.remove();
            }, 300);
        }, TOAST_DURATION);
    }

    function getNumericLogId(row) {
        if (!row || row.log_id == null) {
            return null;
        }
        var parsed = Number(row.log_id);
        return Number.isNaN(parsed) ? null : parsed;
    }

    function buildLogLine(row) {
        var parts = [];
        var timestamp = row.created_at ? escapeHtml(row.created_at) : '';
        if (timestamp) {
            parts.push(timestamp);
        }
        var eventType = row.event_type ? escapeHtml(String(row.event_type).toUpperCase()) : '';
        if (eventType) {
            parts.push('[' + eventType + ']');
        }
        var detail = row.detail ? '<strong>' + escapeHtml(row.detail) + '</strong>' : '';
        if (detail) {
            parts.push(detail);
        }
        var context = row.context_json ? escapeHtml(String(row.context_json)) : '';
        if (context) {
            parts.push(context);
        }
        return parts.join(' ');
    }

    function renderLogPanel(data) {
        if (!logStream) {
            return;
        }
        if (logSessionStartId === null) {
            logStream.textContent = '';
            return;
        }
        var rows = data && data.rows ? data.rows.slice() : [];
        if (!rows.length) {
            logStream.textContent = '';
            return;
        }
        var filtered = rows.filter(function (row) {
            var id = getNumericLogId(row);
            return id !== null && id >= logSessionStartId;
        });
        if (!filtered.length) {
            logStream.textContent = '';
            return;
        }
        var html = filtered
            .map(function (row) {
                return buildLogLine(row) + '\n----------------------------------------';
            })
            .join('\n');
        logStream.innerHTML = html;
    }

    function fetchLogs() {
        return fetchTable('system_logs', { limit: 50 })
            .then(function (data) {
                if (logSessionStartId === null && data && Array.isArray(data.rows) && data.rows.length) {
                    var openEntry = data.rows.find(function (row) {
                        return row && row.detail === 'Log panel opened';
                    });
                    var numericId = getNumericLogId(openEntry);
                    if (numericId !== null) {
                        logSessionStartId = numericId;
                    }
                }
                renderLogPanel(data);
            })
            .catch(function (error) {
                renderLogPanel({ rows: [] });
                showToast(error.error || 'Failed to load logs.', 'error');
            });
    }

    function isLogPanelOpen() {
        return logPanel && logPanel.classList.contains('open');
    }

    function openLogPanel() {
        if (!logPanel || isLogPanelOpen()) {
            return;
        }
        logPanel.classList.add('open');
        logPanel.setAttribute('aria-hidden', 'false');
        document.body.classList.add('logs-open');
        if (logStream) {
            logStream.textContent = '';
        }
        logSessionStartId = null;
        postJson('/api/logs/open')
            .catch(function (error) {
                showToast(error.error || 'Failed to notify log listener.', 'error');
            })
            .finally(function () {
                fetchLogs();
                logPollHandle = setInterval(fetchLogs, LOG_POLL_INTERVAL);
            });
    }

    function closeLogPanel() {
        if (!logPanel) {
            return;
        }
        logPanel.classList.remove('open');
        logPanel.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('logs-open');
        if (logPollHandle) {
            clearInterval(logPollHandle);
            logPollHandle = null;
        }
        logSessionStartId = null;
        postJson('/api/logs/close');
    }

    function toggleLogPanel() {
        if (isLogPanelOpen()) {
            closeLogPanel();
        } else {
            openLogPanel();
        }
    }

    function refreshLogsIfOpen() {
        if (isLogPanelOpen()) {
            return fetchLogs();
        }
        return Promise.resolve();
    }

    function hookRawViewerForm() {
        var rawForm = document.querySelector('#raw-viewer form');
        if (!rawForm) {
            return;
        }
        var rawSelect = rawForm.querySelector('#raw_table');
        var rawSlider = rawForm.querySelector('#raw_height');
        var hiddenHeight = rawForm.querySelector('input[name="raw_height"]');
        var heightValue = rawForm.querySelector('.height-value');
        var hiddenPin = rawForm.querySelector('input[name="raw_pin"]');

        function setRawHeight(value) {
            if (hiddenHeight) {
                hiddenHeight.value = value;
            }
            if (heightValue) {
                heightValue.textContent = value + 'vh';
            }
            document.body.style.setProperty('--raw-viewer-height', value + 'vh');
        }

        if (rawSlider) {
            rawSlider.addEventListener('input', function () {
                setRawHeight(rawSlider.value);
            });
            rawSlider.addEventListener('change', function () {
                setRawHeight(rawSlider.value);
                refreshRawViewer();
            });
            setRawHeight(rawSlider.value);
        }

        if (rawSelect) {
            rawSelect.addEventListener('change', function () {
                refreshRawViewer();
            });
        }

        rawForm.addEventListener('submit', function (event) {
            var submitter = event.submitter;
            if (submitter && submitter.name === 'raw_pin_toggle') {
                return;
            }
            event.preventDefault();
            if (hiddenPin) {
                hiddenPin.value = document.body.classList.contains('raw-pinned') ? 1 : 0;
            }
            refreshRawViewer();
        });
    }

    function hookForms() {
        document.body.classList.add('js-enabled');

        logPanel = document.getElementById('log-panel');
        logToggle = document.getElementById('log-toggle');
        logClose = document.getElementById('log-close');
        logStream = document.getElementById('log-stream');

        if (logToggle) {
            logToggle.addEventListener('click', toggleLogPanel);
        }
        if (logClose) {
            logClose.addEventListener('click', closeLogPanel);
        }

        hookRawViewerForm();

        var ingestForm = document.querySelector('#ingest form');
        if (ingestForm) {
            ingestForm.addEventListener('submit', function (event) {
                event.preventDefault();
                var payload = serializeForm(ingestForm);
                postJson('/api/ingest', payload)
                    .then(function (data) {
                        updateDocumentTable(data.document);
                        ingestForm.reset();
                        refreshRawViewer();
                        refreshLogsIfOpen();
                        showToast(data.fallback ? 'Stored with fallback embedding.' : 'Document stored.', 'success');
                    })
                    .catch(function (error) {
                        showToast(error.error || 'Failed to ingest document.', 'error');
                    });
            });
        }

        var queryForm = document.querySelector('#query form');
        if (queryForm) {
            queryForm.addEventListener('submit', function (event) {
                event.preventDefault();
                var payload = serializeForm(queryForm);
                postJson('/api/query', payload)
                    .then(function (data) {
                        updateLastQueryCard(data);
                        renderQueryResults(data);
                        refreshQueryLogsTable();
                        refreshRawViewer();
                        refreshLogsIfOpen();
                        showToast(data.fallback ? 'Query executed with fallback retrieval.' : 'Query completed.', 'success');
                    })
                    .catch(function (error) {
                        showToast(error.error || 'Failed to run query.', 'error');
                    });
            });
        }
    }

    document.addEventListener('DOMContentLoaded', hookForms);
})();
